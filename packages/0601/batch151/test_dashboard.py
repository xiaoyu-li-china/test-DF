import sys
import pytest
import pandas as pd
from datetime import datetime, timedelta
import numpy as np

sys.path.insert(0, '/Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch151')

from data_generator import (
    generate_orders,
    generate_hospitals,
    get_funnel_data,
    calculate_sla_compliance,
    get_hospital_heatmap_data
)
from app import filter_data


@pytest.fixture(scope="module")
def sample_data():
    df, hospitals_df = generate_orders()
    return df, hospitals_df


@pytest.fixture
def small_test_df():
    dates = pd.date_range("2026-01-01 08:00:00", periods=10, freq="2h")
    df = pd.DataFrame({
        "order_id": [f"O{i:04d}" for i in range(10)],
        "hospital_id": ["H001", "H002", "H001", "H003", "H002", "H001", "H002", "H003", "H001", "H002"],
        "hospital_name": ["协和", "301", "协和", "中山", "301", "协和", "301", "中山", "协和", "301"],
        "city": ["北京", "北京", "北京", "上海", "北京", "北京", "北京", "上海", "北京", "北京"],
        "lat": [39.9, 39.9, 39.9, 31.2, 39.9, 39.9, 39.9, 31.2, 39.9, 39.9],
        "lon": [116.4, 116.3, 116.4, 121.5, 116.3, 116.4, 116.3, 121.5, 116.4, 116.3],
        "publish_date": dates,
        "accepted": [1, 1, 1, 1, 0, 1, 1, 0, 1, 1],
        "completed": [1, 1, 0, 1, 0, 1, 0, 0, 1, 1],
        "price": [298, 398, 258, 328, 198, 288, 268, 158, 308, 278],
        "publish_date_str": dates.strftime("%Y-%m-%d").tolist()
    })
    
    df["accepted_date"] = df.apply(
        lambda x: x["publish_date"] + timedelta(minutes=[10, 20, 5, 12, 0, 8, 25, 0, 3, 18][x.name]),
        axis=1
    )
    df["completed_date"] = df.apply(
        lambda x: x["accepted_date"] + timedelta(hours=3) if x["completed"] == 1 else pd.NaT,
        axis=1
    )
    
    return df


@pytest.fixture
def hospitals_df():
    return pd.DataFrame([
        {"hospital_id": "H001", "hospital_name": "协和", "city": "北京", "lat": 39.9, "lon": 116.4},
        {"hospital_id": "H002", "hospital_name": "301", "city": "北京", "lat": 39.9, "lon": 116.3},
        {"hospital_id": "H003", "hospital_name": "中山", "city": "上海", "lat": 31.2, "lon": 121.5},
    ])


class TestFunnelData:

    def test_funnel_data_correct_counts(self, small_test_df):
        funnel = get_funnel_data(small_test_df)
        
        assert len(funnel) == 3
        assert list(funnel["stage"]) == ["需求发布", "陪诊员接单", "服务完成"]
        assert funnel.iloc[0]["count"] == 10
        assert funnel.iloc[1]["count"] == 8
        assert funnel.iloc[2]["count"] == 6

    def test_funnel_data_no_accepted_orders(self, small_test_df):
        df = small_test_df.copy()
        df["accepted"] = 0
        df["completed"] = 0
        
        funnel = get_funnel_data(df)
        
        assert funnel.iloc[0]["count"] == 10
        assert funnel.iloc[1]["count"] == 0
        assert funnel.iloc[2]["count"] == 0

    def test_funnel_data_empty_df(self):
        df = pd.DataFrame(columns=["order_id", "accepted", "completed"])
        
        funnel = get_funnel_data(df)
        
        assert len(funnel) == 3
        assert funnel.iloc[0]["count"] == 0
        assert funnel.iloc[1]["count"] == 0
        assert funnel.iloc[2]["count"] == 0

    def test_funnel_data_has_color_column(self, small_test_df):
        funnel = get_funnel_data(small_test_df)
        
        assert "color" in funnel.columns
        assert funnel.iloc[0]["color"] == "#1f77b4"
        assert funnel.iloc[1]["color"] == "#ff7f0e"
        assert funnel.iloc[2]["color"] == "#2ca02c"


class TestSlaCompliance:

    def test_sla_compliance_calculation(self, small_test_df):
        sla = calculate_sla_compliance(small_test_df, sla_minutes=15)
        
        assert len(sla) > 0
        assert all(sla["total_accepted"] >= sla["sla_met"])
        assert all(sla["sla_rate"] >= 0)
        assert all(sla["sla_rate"] <= 100)

    def test_sla_compliance_edge_cases(self, small_test_df):
        sla = calculate_sla_compliance(small_test_df, sla_minutes=15)
        
        df_3_min = small_test_df.copy()
        df_3_min["accepted_date"] = df_3_min["publish_date"] + timedelta(minutes=3)
        df_3_min["accepted"] = 1
        
        sla_all_met = calculate_sla_compliance(df_3_min, sla_minutes=15)
        assert all(sla_all_met["sla_rate"] == 100.0)

    def test_sla_compliance_exact_15_minutes(self, small_test_df):
        df = small_test_df.copy()
        df["accepted"] = 1
        df["accepted_date"] = df["publish_date"] + timedelta(minutes=15)
        
        sla = calculate_sla_compliance(df, sla_minutes=15)
        assert all(sla["sla_rate"] == 100.0)

    def test_sla_compliance_over_15_minutes(self, small_test_df):
        df = small_test_df.copy()
        df["accepted"] = 1
        df["accepted_date"] = df["publish_date"] + timedelta(minutes=16)
        
        sla = calculate_sla_compliance(df, sla_minutes=15)
        assert all(sla["sla_rate"] == 0.0)

    def test_sla_compliance_empty_df(self):
        df = pd.DataFrame(columns=["accepted", "accepted_date", "publish_date", "order_id"])
        
        sla = calculate_sla_compliance(df)
        
        assert len(sla) == 0
        assert list(sla.columns) == ["date", "total_accepted", "sla_met", "sla_rate"]

    def test_sla_compliance_no_accepted_orders(self, small_test_df):
        df = small_test_df.copy()
        df["accepted"] = 0
        
        sla = calculate_sla_compliance(df)
        
        assert len(sla) == 0
        assert list(sla.columns) == ["date", "total_accepted", "sla_met", "sla_rate"]

    def test_sla_compliance_custom_sla_minutes(self, small_test_df):
        sla_5 = calculate_sla_compliance(small_test_df, sla_minutes=5)
        sla_30 = calculate_sla_compliance(small_test_df, sla_minutes=30)
        
        total_sla_met_5 = sla_5["sla_met"].sum() if len(sla_5) > 0 else 0
        total_sla_met_30 = sla_30["sla_met"].sum() if len(sla_30) > 0 else 0
        
        assert total_sla_met_5 <= total_sla_met_30


class TestFilterData:

    def test_filter_data_date_range_inclusive(self, small_test_df):
        df = filter_data("2026-01-01", "2026-01-01", "全部城市", df_source=small_test_df)
        
        assert len(df) == 8
        for idx, row in df.iterrows():
            assert row["publish_date"].strftime("%Y-%m-%d") == "2026-01-01"

    def test_filter_data_date_boundary_fix(self):
        dates = pd.date_range("2026-01-13 00:00:00", "2026-01-13 23:30:00", freq="30min")
        df = pd.DataFrame({
            "order_id": [f"O{i:04d}" for i in range(len(dates))],
            "hospital_id": ["H001"] * len(dates),
            "hospital_name": ["协和"] * len(dates),
            "city": ["北京"] * len(dates),
            "lat": [39.9] * len(dates),
            "lon": [116.4] * len(dates),
            "publish_date": dates,
            "accepted": [1] * len(dates),
            "completed": [1] * len(dates),
            "price": [298] * len(dates),
            "publish_date_str": dates.strftime("%Y-%m-%d").tolist(),
            "accepted_date": dates,
            "completed_date": dates
        })
        
        filtered = filter_data("2026-01-01", "2026-01-13", "全部城市", df_source=df)
        
        assert len(filtered) == len(dates), f"Expected {len(dates)}, got {len(filtered)}"

    def test_filter_data_city_filter(self, small_test_df):
        df_beijing = filter_data("2026-01-01", "2026-01-02", "北京", df_source=small_test_df)
        df_shanghai = filter_data("2026-01-01", "2026-01-02", "上海", df_source=small_test_df)
        
        assert len(df_beijing) == 8
        assert len(df_shanghai) == 2
        assert all(df_beijing["city"] == "北京")
        assert all(df_shanghai["city"] == "上海")

    def test_filter_data_all_cities(self, small_test_df):
        df = filter_data("2026-01-01", "2026-01-02", "全部城市", df_source=small_test_df)
        
        assert len(df) == 10

    def test_filter_data_city_not_exists(self, small_test_df):
        df = filter_data("2026-01-01", "2026-01-02", "深圳", df_source=small_test_df)
        
        assert len(df) == 0

    def test_filter_data_date_out_of_range(self, small_test_df):
        df = filter_data("2025-01-01", "2025-12-31", "全部城市", df_source=small_test_df)
        
        assert len(df) == 0

    def test_filter_data_string_dates(self, small_test_df):
        df_str = filter_data("2026-01-01", "2026-01-02", "全部城市", df_source=small_test_df)
        df_dt = filter_data(pd.to_datetime("2026-01-01"), pd.to_datetime("2026-01-02"), "全部城市", df_source=small_test_df)
        
        assert len(df_str) == len(df_dt)


class TestHospitalHeatmapData:

    def test_heatmap_data_correct_aggregation(self, small_test_df, hospitals_df):
        heatmap = get_hospital_heatmap_data(small_test_df, hospitals_df)
        
        assert len(heatmap) == 3
        assert "city" in heatmap.columns
        assert "lat" in heatmap.columns
        assert "lon" in heatmap.columns
        
        h001 = heatmap[heatmap["hospital_id"] == "H001"].iloc[0]
        assert h001["total_orders"] == 4
        assert h001["accepted_orders"] == 4
        assert h001["completed_orders"] == 3
        assert h001["city"] == "北京"

    def test_heatmap_data_missing_columns(self, hospitals_df):
        df_no_city = pd.DataFrame({
            "hospital_id": ["H001"],
            "hospital_name": ["协和"],
            "order_id": ["O001"],
            "accepted": [1],
            "completed": [1]
        })
        
        heatmap = get_hospital_heatmap_data(df_no_city, hospitals_df)
        
        assert len(heatmap) == 0
        assert "city" in heatmap.columns

    def test_heatmap_data_empty_df(self, hospitals_df):
        df = pd.DataFrame(columns=[
            "hospital_id", "hospital_name", "city", "lat", "lon",
            "order_id", "accepted", "completed", "price"
        ])
        
        heatmap = get_hospital_heatmap_data(df, hospitals_df)
        
        assert len(heatmap) == 0
        assert "city" in heatmap.columns

    def test_heatmap_data_computed_metrics(self, small_test_df, hospitals_df):
        heatmap = get_hospital_heatmap_data(small_test_df, hospitals_df)
        
        h001 = heatmap[heatmap["hospital_id"] == "H001"].iloc[0]
        
        expected_accept_rate = (4 / 4) * 100
        expected_complete_rate = (3 / 4) * 100
        expected_avg_price = (298 + 258 + 288 + 308) / 4
        
        assert abs(h001["accept_rate"] - expected_accept_rate) < 0.1
        assert abs(h001["complete_rate"] - expected_complete_rate) < 0.1
        assert abs(h001["avg_price"] - expected_avg_price) < 1

    def test_heatmap_data_all_columns_present(self, small_test_df, hospitals_df):
        heatmap = get_hospital_heatmap_data(small_test_df, hospitals_df)
        
        expected_columns = [
            "hospital_id", "hospital_name", "city", "lat", "lon",
            "total_orders", "accepted_orders", "completed_orders",
            "total_amount", "accept_rate", "complete_rate", "avg_price"
        ]
        
        assert list(heatmap.columns) == expected_columns

    def test_heatmap_data_no_external_api_calls(self, small_test_df, hospitals_df, monkeypatch):
        import urllib.request
        
        def mock_urlopen(*args, **kwargs):
            pytest.fail("不应调用外部 API")
        
        monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)
        
        heatmap = get_hospital_heatmap_data(small_test_df, hospitals_df)
        
        assert len(heatmap) == 3

    def test_heatmap_data_plotly_data_only(self, small_test_df, hospitals_df):
        heatmap = get_hospital_heatmap_data(small_test_df, hospitals_df)
        
        for col in ["lat", "lon", "total_orders", "accept_rate"]:
            assert col in heatmap.columns
        
        assert all(pd.notna(heatmap["lat"]))
        assert all(pd.notna(heatmap["lon"]))
        assert all(heatmap["lat"] >= -90)
        assert all(heatmap["lat"] <= 90)
        assert all(heatmap["lon"] >= -180)
        assert all(heatmap["lon"] <= 180)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
