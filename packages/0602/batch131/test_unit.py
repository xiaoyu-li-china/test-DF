import os
import json
import tempfile
import shutil
import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch, MagicMock

import delivery_route_map as drm


@pytest.fixture
def temp_cache_dir():
    """临时目录，用于隔离测试缓存文件"""
    original_cwd = os.getcwd()
    temp_dir = tempfile.mkdtemp()
    os.chdir(temp_dir)
    yield temp_dir
    os.chdir(original_cwd)
    shutil.rmtree(temp_dir, ignore_errors=True)


class TestGeocodingCache:
    """测试 geocoding 缓存读写"""

    def test_cache_key_stable(self, temp_cache_dir):
        """同一地址应生成相同缓存键"""
        addr = "北京市朝阳区某某街道123号"
        key1 = drm._cache_key(addr)
        key2 = drm._cache_key(addr)
        assert key1 == key2
        assert len(key1) == 64  # SHA-256

    def test_cache_key_different_addresses(self, temp_cache_dir):
        """不同地址应生成不同缓存键"""
        addr1 = "北京市朝阳区"
        addr2 = "北京市海淀区"
        assert drm._cache_key(addr1) != drm._cache_key(addr2)

    def test_cache_save_and_load(self, temp_cache_dir):
        """缓存应能正确保存和加载"""
        cache = {"abc123": {"address": "测试地址", "lat": 39.9, "lng": 116.4}}
        drm._save_geocache(cache)
        loaded = drm._load_geocache()
        assert loaded == cache

    def test_cache_empty_initial(self, temp_cache_dir):
        """初始无缓存文件时应返回空字典"""
        loaded = drm._load_geocache()
        assert loaded == {}

    @patch("delivery_route_map.requests.get")
    def test_geocode_cache_miss_then_hit(self, mock_get, temp_cache_dir):
        """缓存未命中时调 API，命中时直接返回（不调 API）"""
        mock_resp = MagicMock()
        mock_resp.json.return_value = [{"lat": "39.9042", "lon": "116.4074"}]
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        addr = "北京市东城区"

        lat1, lng1 = drm.geocode_address(addr)
        assert mock_get.call_count == 1
        assert lat1 == pytest.approx(39.9042)
        assert lng1 == pytest.approx(116.4074)

        lat2, lng2 = drm.geocode_address(addr)
        assert mock_get.call_count == 1  # 缓存命中，不再调用 API
        assert lat2 == pytest.approx(39.9042)
        assert lng2 == pytest.approx(116.4074)

    @patch("delivery_route_map.requests.get")
    def test_geocode_cache_contains_full_address(self, mock_get, temp_cache_dir):
        """缓存条目应同时存储完整地址做二次校验"""
        mock_resp = MagicMock()
        mock_resp.json.return_value = [{"lat": "39.9", "lon": "116.4"}]
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        drm.geocode_address("地址A")

        cache = drm._load_geocache()
        key = list(cache.keys())[0]
        assert cache[key]["address"] == "地址A"

    @patch("delivery_route_map.requests.get")
    def test_geocode_api_failure_returns_none(self, mock_get, temp_cache_dir):
        """API 失败时应返回 None, None"""
        mock_get.side_effect = Exception("Network error")

        lat, lng = drm.geocode_address("测试地址")
        assert lat is None
        assert lng is None

        cache = drm._load_geocache()
        key = list(cache.keys())[0]
        assert cache[key]["lat"] is None
        assert cache[key]["lng"] is None


class TestClusterBoundary:
    """测试聚类边界：2单/3单场景"""

    def test_cluster_with_exactly_min_size_not_merged(self):
        """片区站点数恰好等于 MIN_CLUSTER_SIZE 时不应被合并"""
        lats = [39.9] * 2 + [39.5] * 2
        lngs = [116.4] * 2 + [117.0] * 2
        df = pd.DataFrame({
            "纬度": lats,
            "经度": lngs,
            "订单量": [1] * 4,
        })
        df, centers, _ = drm.cluster_sites(df, 2)
        df_new, centers_new = drm.merge_small_clusters(df, centers, min_size=2)

        assert len(centers_new) == 2
        assert len(df_new["cluster"].unique()) == 2

    def test_cluster_below_min_size_gets_merged(self):
        """片区站点数低于 MIN_CLUSTER_SIZE 时应被合并"""
        lats = [39.9] * 3 + [39.5]
        lngs = [116.4] * 3 + [117.0]
        df = pd.DataFrame({
            "纬度": lats,
            "经度": lngs,
            "订单量": [1] * 4,
        })
        df, centers, _ = drm.cluster_sites(df, 2)
        df_new, centers_new = drm.merge_small_clusters(df, centers, min_size=2)

        assert len(centers_new) == 1
        assert len(df_new["cluster"].unique()) == 1
        assert len(df_new) == 4

    def test_cluster_2_vs_3_scenario(self):
        """2单片区 vs 3单片区：2单应被合并到3单"""
        lats = [39.9] * 3 + [39.8] * 2
        lngs = [116.4] * 3 + [116.5] * 2
        df = pd.DataFrame({
            "纬度": lats,
            "经度": lngs,
            "订单量": [1] * 5,
        })
        df, centers, _ = drm.cluster_sites(df, 2)
        df_new, centers_new = drm.merge_small_clusters(df, centers, min_size=3)

        cluster_counts = df_new["cluster"].value_counts().to_dict()
        assert len(centers_new) == 1
        assert cluster_counts[0] == 5

    def test_cluster_all_below_min_size(self):
        """所有片区都小于 min_size 时应全部保留为零散点"""
        lats = [39.9, 39.8, 39.7]
        lngs = [116.4, 116.5, 116.6]
        df = pd.DataFrame({
            "纬度": lats,
            "经度": lngs,
            "订单量": [1, 1, 1],
        })
        df, centers, _ = drm.cluster_sites(df, 3)
        df_new, centers_new = drm.merge_small_clusters(df, centers, min_size=2)

        assert len(centers_new) == 3
        assert len(df_new["cluster"].unique()) == 3

    def test_cluster_ids_remapped_after_merge(self):
        """合并后 cluster ID 应重新编号为连续整数"""
        lats = [39.9] * 3 + [39.5]
        lngs = [116.4] * 3 + [117.0]
        df = pd.DataFrame({
            "纬度": lats,
            "经度": lngs,
            "订单量": [1] * 4,
        })
        df, centers, _ = drm.cluster_sites(df, 2)
        df_new, _ = drm.merge_small_clusters(df, centers, min_size=2)

        unique_clusters = sorted(df_new["cluster"].unique())
        assert unique_clusters == [0]


class TestRouteNodeCount:
    """测试路线节点数是否等于有效订单数"""

    def test_nearest_neighbor_returns_all_points(self):
        """最近邻算法应返回所有点的索引"""
        points = [(39.9, 116.4), (39.8, 116.5), (39.7, 116.6)]
        route = drm.nearest_neighbor_route(points, start=0)
        assert len(route) == 3
        assert set(route) == {0, 1, 2}

    def test_nearest_neighbor_single_point(self):
        """单点场景应返回 [0]"""
        points = [(39.9, 116.4)]
        route = drm.nearest_neighbor_route(points, start=0)
        assert route == [0]

    def test_nearest_neighbor_empty(self):
        """空点列表应返回空列表"""
        points = []
        route = drm.nearest_neighbor_route(points, start=0)
        assert route == []

    def test_route_indices_cover_all_sites_in_cluster(self):
        """每个片区的路线节点数应等于该片区站点数"""
        np.random.seed(42)
        lats = np.random.uniform(39.8, 40.0, 10)
        lngs = np.random.uniform(116.3, 116.5, 10)
        df = pd.DataFrame({
            "纬度": lats,
            "经度": lngs,
            "订单量": np.random.randint(1, 8, 10),
        })
        df, centers, _ = drm.cluster_sites(df, 2)
        df, centers = drm.merge_small_clusters(df, centers, min_size=2)

        cluster_groups = {}
        for idx, row in df.iterrows():
            cid = int(row["cluster"])
            if cid not in cluster_groups:
                cluster_groups[cid] = []
            cluster_groups[cid].append(row)

        for cid, rows in cluster_groups.items():
            points = [(r["纬度"], r["经度"]) for r in rows]
            start_idx = drm.find_kitchen_nearest_point(points, 39.9, 116.4)
            route_indices = drm.nearest_neighbor_route(points, start_idx)

            assert len(route_indices) == len(rows), \
                f"片区 {cid}: 路线节点数 {len(route_indices)} != 站点数 {len(rows)}"
            assert len(set(route_indices)) == len(rows), \
                f"片区 {cid}: 路线有重复节点"

    def test_full_pipeline_route_count_matches_data(self):
        """完整流程：总路线节点数应等于总有效订单数"""
        np.random.seed(42)
        n_records = 15
        df = pd.DataFrame({
            "纬度": np.random.uniform(39.8, 40.0, n_records),
            "经度": np.random.uniform(116.3, 116.5, n_records),
            "订单量": np.random.randint(1, 8, n_records),
        })

        df, centers, _ = drm.cluster_sites(df, 3)
        df, centers = drm.merge_small_clusters(df, centers, min_size=2)

        total_route_nodes = 0
        cluster_groups = {}
        for idx, row in df.iterrows():
            cid = int(row["cluster"])
            if cid not in cluster_groups:
                cluster_groups[cid] = []
            cluster_groups[cid].append(row)

        for cid, rows in cluster_groups.items():
            points = [(r["纬度"], r["经度"]) for r in rows]
            start_idx = drm.find_kitchen_nearest_point(points, 39.9, 116.4)
            route_indices = drm.nearest_neighbor_route(points, start_idx)
            total_route_nodes += len(route_indices)

        assert total_route_nodes == n_records, \
            f"总路线节点数 {total_route_nodes} != 总订单数 {n_records}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
