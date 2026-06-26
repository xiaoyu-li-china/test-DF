import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from collections import defaultdict
import folium
from folium import plugins
import os
import json
import hashlib
import math
import time

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

EXCEL_PATH = "orders_sample.xlsx"
N_CLUSTERS = 4
OUTPUT_HTML = "delivery_route_map.html"
OUTPUT_PNG = "delivery_route_map.png"
MIN_CLUSTER_SIZE = 2
PNG_WIDTH = 1920
PNG_HEIGHT = 1080

KITCHEN_LAT = 39.9042
KITCHEN_LNG = 116.4074
KITCHEN_NAME = "社区中央厨房"

GEOCACHE_FILE = ".geocache.json"

CLUSTER_COLORS = [
    "#e6194b",
    "#3cb44b",
    "#4363d8",
    "#f58231",
    "#911eb4",
    "#42d4f4",
    "#f032e6",
    "#bfef45",
    "#fabed4",
    "#469990",
]

CLUSTER_NAMES = [
    "A片区", "B片区", "C片区", "D片区",
    "E片区", "F片区", "G片区", "H片区",
]

RADIUS_MIN = 4
RADIUS_MAX = 18
RADIUS_SCALE = 3.0


def _cache_key(address):
    return hashlib.sha256(address.strip().encode("utf-8")).hexdigest()


def _load_geocache():
    if os.path.exists(GEOCACHE_FILE):
        with open(GEOCACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_geocache(cache):
    with open(GEOCACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def geocode_address(address):
    cache = _load_geocache()
    key = _cache_key(address)
    if key in cache:
        entry = cache[key]
        if entry["address"] == address:
            return entry["lat"], entry["lng"]
    try:
        if not HAS_REQUESTS:
            raise ImportError("requests not available")
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": address, "format": "json", "limit": 1, "countrycodes": "cn"}
        headers = {"User-Agent": "CommunityMealDelivery/1.0"}
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if data:
            lat, lng = float(data[0]["lat"]), float(data[0]["lon"])
        else:
            lat, lng = None, None
    except Exception:
        lat, lng = None, None
    cache[key] = {"address": address, "lat": lat, "lng": lng}
    _save_geocache(cache)
    time.sleep(1)
    return lat, lng


def ensure_coordinates(df):
    has_lat = "纬度" in df.columns
    has_lng = "经度" in df.columns
    has_addr = "地址" in df.columns
    if has_lat and has_lng:
        df.dropna(subset=["纬度", "经度"], inplace=True)
        return df
    if not has_addr:
        raise ValueError("Excel 中既无「纬度/经度」列，也无「地址」列，无法定位")
    print("  ⚠ 未检测到纬度/经度列，尝试对「地址」列进行地理编码...")
    lats, lngs = [], []
    for addr in df["地址"]:
        lat, lng = geocode_address(str(addr))
        lats.append(lat)
        lngs.append(lng)
        status = "✓" if lat else "✗"
        print(f"    {status} {addr} → ({lat}, {lng})")
    df["纬度"] = lats
    df["经度"] = lngs
    before = len(df)
    df.dropna(subset=["纬度", "经度"], inplace=True)
    after = len(df)
    if before != after:
        print(f"  ⚠ {before - after} 条记录地理编码失败，已剔除")
    return df


def load_data(path):
    if not os.path.exists(path):
        print(f"[错误] 找不到 {path}，请先运行 generate_sample_data.py 生成模拟数据")
        raise FileNotFoundError(path)
    df = pd.read_excel(path)
    required = {"订单量"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Excel 缺少必要列: {missing}")
    df = ensure_coordinates(df)
    if len(df) == 0:
        raise ValueError("有效坐标记录为 0，无法生成地图")
    if "配送时段" not in df.columns:
        print("  ⚠ 未检测到「配送时段」列，热力图将使用总订单量")
        df["配送时段"] = "总览"
    return df


def cluster_sites(df, n_clusters):
    actual_k = min(n_clusters, len(df))
    coords = df[["纬度", "经度"]].values
    kmeans = KMeans(n_clusters=actual_k, random_state=42, n_init=10)
    df["cluster"] = kmeans.fit_predict(coords)
    centers = kmeans.cluster_centers_
    return df, centers, actual_k


def merge_small_clusters(df, centers, min_size):
    cluster_counts = df["cluster"].value_counts().to_dict()
    small_ids = [cid for cid, cnt in cluster_counts.items() if cnt < min_size]
    if not small_ids:
        return df, centers
    print(f"  ⚠ 以下片区站点不足 {min_size}，将合并到最近片区: {small_ids}")
    for cid in small_ids:
        mask = df["cluster"] == cid
        small_pts = df.loc[mask, ["纬度", "经度"]].values
        best_cid = None
        best_dist = float("inf")
        for other_cid in range(len(centers)):
            if other_cid == cid or other_cid in small_ids:
                continue
            if cluster_counts.get(other_cid, 0) < min_size:
                continue
            d = np.sum((small_pts - centers[other_cid]) ** 2, axis=1).mean()
            if d < best_dist:
                best_dist = d
                best_cid = other_cid
        if best_cid is not None:
            df.loc[mask, "cluster"] = best_cid
            print(f"    片区{cid} → 合并至片区{best_cid}")
        else:
            print(f"    片区{cid}: 无可合并目标，保留为零散点")
    remaining = sorted(df["cluster"].unique())
    remap = {old: new for new, old in enumerate(remaining)}
    df["cluster"] = df["cluster"].map(remap)
    new_centers = np.array([centers[old] for old in remaining])
    return df, new_centers


def nearest_neighbor_route(points, start):
    n = len(points)
    if n <= 1:
        return list(range(n))
    visited = [False] * n
    route = []
    current = start
    for _ in range(n):
        visited[current] = True
        route.append(current)
        best_dist = float("inf")
        best_j = -1
        for j in range(n):
            if not visited[j]:
                d = (points[current][0] - points[j][0]) ** 2 + (
                    points[current][1] - points[j][1]
                ) ** 2
                if d < best_dist:
                    best_dist = d
                    best_j = j
        if best_j == -1:
            break
        current = best_j
    return route


def find_kitchen_nearest_point(points, kitchen_lat, kitchen_lng):
    best_idx = 0
    best_dist = float("inf")
    for i, (lat, lng) in enumerate(points):
        d = (lat - kitchen_lat) ** 2 + (lng - kitchen_lng) ** 2
        if d < best_dist:
            best_dist = d
            best_idx = i
    return best_idx


def order_radius(orders):
    raw = RADIUS_MIN + math.sqrt(max(orders, 0)) * RADIUS_SCALE
    return min(max(raw, RADIUS_MIN), RADIUS_MAX)


def build_heatmap_data(df):
    slots = sorted(df["配送时段"].dropna().unique())
    result = {}
    for slot in slots:
        mask = df["配送时段"] == slot
        data = []
        for _, row in df[mask].iterrows():
            data.append([row["纬度"], row["经度"], int(row["订单量"])])
        result[slot] = data
    all_data = []
    for _, row in df.iterrows():
        all_data.append([row["纬度"], row["经度"], int(row["订单量"])])
    result["全时段"] = all_data
    return result


def build_map(df, centers, heatmap_data):
    m = folium.Map(
        location=[df["纬度"].mean(), df["经度"].mean()],
        zoom_start=12,
        tiles="OpenStreetMap",
    )

    folium.TileLayer(
        tiles="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
        attr="高德地图",
        name="高德-标准",
        max_zoom=18,
        subdomains="1234",
    ).add_to(m)

    folium.TileLayer(
        tiles="https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}",
        attr="高德卫星",
        name="高德-卫星",
        max_zoom=18,
        subdomains="1234",
    ).add_to(m)

    feature_group_routes = folium.FeatureGroup(name="配送路线", show=True)
    feature_group_sites = folium.FeatureGroup(name="配送站点", show=True)
    feature_group_centers = folium.FeatureGroup(name="片区中心", show=True)

    folium.Marker(
        location=[KITCHEN_LAT, KITCHEN_LNG],
        popup=folium.Popup(f"<b>{KITCHEN_NAME}</b><br>配送起点", max_width=250),
        icon=folium.Icon(color="red", icon="cutlery", prefix="fa"),
    ).add_to(feature_group_centers)

    cluster_groups = defaultdict(list)
    for idx, row in df.iterrows():
        cluster_groups[row["cluster"]].append(row)

    for cluster_id, rows in cluster_groups.items():
        color = CLUSTER_COLORS[cluster_id % len(CLUSTER_COLORS)]
        cname = CLUSTER_NAMES[cluster_id] if cluster_id < len(CLUSTER_NAMES) else f"片区{cluster_id+1}"

        cluster_center = centers[cluster_id]
        total_orders = sum(r["订单量"] for r in rows)

        folium.Marker(
            location=[cluster_center[0], cluster_center[1]],
            popup=folium.Popup(
                f"<b>📍 {cname}</b><br>站点数: {len(rows)}<br>总订单量: {total_orders}",
                max_width=250,
            ),
            icon=folium.Icon(color="blue", icon="flag", prefix="fa"),
        ).add_to(feature_group_centers)

        points = [(r["纬度"], r["经度"]) for r in rows]
        start_idx = find_kitchen_nearest_point(points, KITCHEN_LAT, KITCHEN_LNG)
        route_indices = nearest_neighbor_route(points, start_idx)

        route_coords = [[KITCHEN_LAT, KITCHEN_LNG]]
        for ri in route_indices:
            route_coords.append([points[ri][0], points[ri][1]])
        route_coords.append([KITCHEN_LAT, KITCHEN_LNG])

        folium.PolyLine(
            locations=route_coords,
            color=color,
            weight=3.5,
            opacity=0.8,
            popup=f"{cname} 配送路线 ({len(rows)} 站)",
            tooltip=f"{cname} 路线",
        ).add_to(feature_group_routes)

        for order_num, ri in enumerate(route_indices, start=1):
            r = rows[ri]
            name = r.get("地址", f"站点{ri+1}")
            if pd.isna(name):
                name = f"站点{ri+1}"
            elder = r.get("姓名", "—")
            if pd.isna(elder):
                elder = "—"
            orders = int(r["订单量"])
            slot = r.get("配送时段", "—")
            if pd.isna(slot):
                slot = "—"

            radius = order_radius(orders)
            folium.CircleMarker(
                location=[r["纬度"], r["经度"]],
                radius=radius,
                color=color,
                fill=True,
                fill_color=color,
                fill_opacity=0.55,
                popup=folium.Popup(
                    f"<b>{name}</b><br>老人: {elder}<br>订单量: {orders}<br>时段: {slot}<br>配送序号: {order_num}/{len(route_indices)}",
                    max_width=250,
                ),
                tooltip=f"#{order_num} {name} ({orders}单, {slot})",
            ).add_to(feature_group_sites)

            folium.Marker(
                location=[r["纬度"], r["经度"]],
                icon=folium.DivIcon(
                    html=f'<div style="font-size:9px;color:{color};font-weight:bold;white-space:nowrap;">{order_num}</div>',
                    icon_size=(20, 12),
                    icon_anchor=(10, -8),
                ),
            ).add_to(feature_group_sites)

    feature_group_routes.add_to(m)
    feature_group_sites.add_to(m)
    feature_group_centers.add_to(m)

    gradient = {
        0.2: "blue",
        0.4: "lime",
        0.6: "yellow",
        0.8: "orange",
        1.0: "red",
    }

    for slot, data in sorted(heatmap_data.items()):
        if len(data) == 0:
            continue
        hm = plugins.HeatMap(
            data,
            name=f"🔥 {slot} 热力图",
            min_opacity=0.3,
            max_opacity=0.7,
            radius=35,
            blur=20,
            gradient=gradient,
            show=(slot == "全时段"),
        )
        hm.add_to(m)

    folium.LayerControl().add_to(m)

    title_html = """
    <div style="position:fixed;top:10px;left:50%;transform:translateX(-50%);
                z-index:9999;background:white;padding:8px 18px;border-radius:8px;
                box-shadow:0 2px 6px rgba(0,0,0,.3);font-size:14px;font-weight:bold;">
        🍜 社区老年助餐配送路线图
    </div>
    """
    m.get_root().html.add_child(folium.Element(title_html))

    legend_items = ""
    for cluster_id in sorted(cluster_groups.keys()):
        color = CLUSTER_COLORS[cluster_id % len(CLUSTER_COLORS)]
        cname = CLUSTER_NAMES[cluster_id] if cluster_id < len(CLUSTER_NAMES) else f"片区{cluster_id+1}"
        total = sum(r["订单量"] for r in cluster_groups[cluster_id])
        legend_items += (
            f'<li><span style="background:{color};width:14px;height:14px;'
            f'display:inline-block;border-radius:50%;margin-right:6px;"></span>'
            f"{cname}（{len(cluster_groups[cluster_id])}站 / {total}单）</li>"
        )

    legend_html = f"""
    <div style="position:fixed;bottom:30px;right:10px;z-index:9999;
                background:white;padding:10px 14px;border-radius:8px;
                box-shadow:0 2px 6px rgba(0,0,0,.3);font-size:12px;">
        <b>片区图例</b>
        <ul style="list-style:none;padding-left:0;margin:6px 0 0 0;">
            {legend_items}
        </ul>
        <div style="margin-top:6px;color:#888;">⭕ 圆圈大小 ∝ √订单量</div>
        <div style="color:#888;">🔢 数字 = 配送顺序</div>
        <div style="color:#888;">🗂️ 右上角图层切换热力图</div>
    </div>
    """
    m.get_root().html.add_child(folium.Element(legend_html))

    return m


def export_png(html_path, png_path, width=PNG_WIDTH, height=PNG_HEIGHT):
    print(f"\n🖼️  导出 PNG: {width}x{height}")
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
    except ImportError:
        print("  ⚠ selenium 未安装，跳过 PNG 导出")
        print("  💡 如需要导出 PNG，请安装: pip install selenium")
        return False

    try:
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument(f"--window-size={width},{height}")
        options.add_argument("--hide-scrollbars")
        options.add_argument("--force-device-scale-factor=1")

        driver = webdriver.Chrome(options=options)
        abs_html = os.path.abspath(html_path)
        driver.get(f"file://{abs_html}")

        time.sleep(4)

        driver.save_screenshot(png_path)
        driver.quit()

        abs_png = os.path.abspath(png_path)
        print(f"✅ PNG 已保存: {abs_png}")
        return True
    except Exception as e:
        print(f"  ⚠ PNG 导出失败: {e}")
        return False


def main():
    print("=" * 50)
    print("  社区老年助餐配送路线可视化")
    print("=" * 50)

    print(f"\n📂 读取数据: {EXCEL_PATH}")
    df = load_data(EXCEL_PATH)
    print(f"   共 {len(df)} 条有效记录, 总订单量 {int(df['订单量'].sum())}")
    if "配送时段" in df.columns:
        slot_counts = df["配送时段"].value_counts().to_dict()
        print(f"   时段分布: {slot_counts}")

    print(f"\n🔍 执行 KMeans 聚类 (k={N_CLUSTERS})...")
    df, centers, actual_k = cluster_sites(df, N_CLUSTERS)
    for cid in range(actual_k):
        mask = df["cluster"] == cid
        print(
            f"   {CLUSTER_NAMES[cid]}: {mask.sum()} 个站点, "
            f"总订单 {int(df.loc[mask, '订单量'].sum())}, "
            f"中心 ({centers[cid][0]:.4f}, {centers[cid][1]:.4f})"
        )

    print(f"\n🔗 合并站点不足 {MIN_CLUSTER_SIZE} 的片区...")
    df, centers = merge_small_clusters(df, centers, MIN_CLUSTER_SIZE)
    final_k = len(centers)
    print(f"   最终片区数: {final_k}")

    for cid in range(final_k):
        mask = df["cluster"] == cid
        cname = CLUSTER_NAMES[cid] if cid < len(CLUSTER_NAMES) else f"片区{cid+1}"
        print(
            f"   {cname}: {mask.sum()} 个站点, "
            f"总订单 {int(df.loc[mask, '订单量'].sum())}, "
            f"中心 ({centers[cid][0]:.4f}, {centers[cid][1]:.4f})"
        )

    print("\n� 构建热力图数据...")
    heatmap_data = build_heatmap_data(df)
    print(f"   时段数: {len(heatmap_data)} → {list(heatmap_data.keys())}")

    print("\n�🗺️  生成地图...")
    m = build_map(df, centers, heatmap_data)
    m.save(OUTPUT_HTML)
    abs_path = os.path.abspath(OUTPUT_HTML)
    print(f"\n✅ 地图已保存: {abs_path}")
    print("   请用浏览器打开查看，右上角切换热力图层")

    export_png(OUTPUT_HTML, OUTPUT_PNG)


if __name__ == "__main__":
    main()
