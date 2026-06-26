import io
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import math

def generate_hospitals():
    hospitals = [
        {"hospital_id": "H001", "hospital_name": "北京协和医院", "city": "北京", "lat": 39.9139, "lon": 116.4074},
        {"hospital_id": "H002", "hospital_name": "北京301医院", "city": "北京", "lat": 39.9087, "lon": 116.3399},
        {"hospital_id": "H003", "hospital_name": "北京大学第一医院", "city": "北京", "lat": 39.9389, "lon": 116.3756},
        {"hospital_id": "H004", "hospital_name": "上海瑞金医院", "city": "上海", "lat": 31.2048, "lon": 121.4590},
        {"hospital_id": "H005", "hospital_name": "上海中山医院", "city": "上海", "lat": 31.1939, "lon": 121.4370},
        {"hospital_id": "H006", "hospital_name": "复旦大学附属华山医院", "city": "上海", "lat": 31.2139, "lon": 121.4460},
        {"hospital_id": "H007", "hospital_name": "广州中山一院", "city": "广州", "lat": 23.1349, "lon": 113.2960},
        {"hospital_id": "H008", "hospital_name": "南方医科大学南方医院", "city": "广州", "lat": 23.1649, "lon": 113.3260},
        {"hospital_id": "H009", "hospital_name": "广东省人民医院", "city": "广州", "lat": 23.1309, "lon": 113.2870},
        {"hospital_id": "H010", "hospital_name": "深圳人民医院", "city": "深圳", "lat": 22.5431, "lon": 114.0579},
        {"hospital_id": "H011", "hospital_name": "北京大学深圳医院", "city": "深圳", "lat": 22.5531, "lon": 114.0279},
        {"hospital_id": "H012", "hospital_name": "杭州市第一人民医院", "city": "杭州", "lat": 30.2741, "lon": 120.1551},
    ]
    return pd.DataFrame(hospitals)

def generate_orders(start_date="2026-01-01", end_date="2026-05-31", num_orders=5000):
    hospitals_df = generate_hospitals()
    
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    date_range = (end_dt - start_dt).days
    
    order_ids = [f"O{str(i).zfill(6)}" for i in range(1, num_orders + 1)]
    dates = [start_dt + timedelta(days=np.random.randint(0, date_range + 1)) for _ in range(num_orders)]
    
    hospital_ids = np.random.choice(hospitals_df["hospital_id"], num_orders, 
                                    p=[0.12, 0.10, 0.08, 0.12, 0.10, 0.08, 0.09, 0.07, 0.06, 0.06, 0.05, 0.07])
    
    service_types = np.random.choice(["陪诊", "取药", "代问诊", "体检陪同"], num_orders, 
                                     p=[0.45, 0.25, 0.20, 0.10])
    
    df = pd.DataFrame({
        "order_id": order_ids,
        "publish_date": dates,
        "hospital_id": hospital_ids,
        "service_type": service_types,
    })
    
    df = df.merge(hospitals_df, on="hospital_id", how="left")
    
    accept_rate = 0.85
    complete_rate = 0.90
    
    df["accepted"] = np.random.choice([1, 0], num_orders, p=[accept_rate, 1 - accept_rate])
    df["accepted_date"] = df.apply(
        lambda x: x["publish_date"] + timedelta(minutes=np.random.randint(5, 120)) if x["accepted"] == 1 else pd.NaT,
        axis=1
    )
    
    df["completed"] = df.apply(
        lambda x: np.random.choice([1, 0], p=[complete_rate, 1 - complete_rate]) if x["accepted"] == 1 else 0,
        axis=1
    )
    df["completed_date"] = df.apply(
        lambda x: x["accepted_date"] + timedelta(hours=np.random.randint(1, 8)) if x["completed"] == 1 else pd.NaT,
        axis=1
    )
    
    df["price"] = np.where(
        df["service_type"] == "陪诊",
        np.random.randint(198, 598, num_orders),
        np.where(
            df["service_type"] == "取药",
            np.random.randint(49, 149, num_orders),
            np.where(
                df["service_type"] == "代问诊",
                np.random.randint(99, 299, num_orders),
                np.random.randint(149, 399, num_orders)
            )
        )
    )
    
    df["publish_date_str"] = df["publish_date"].dt.strftime("%Y-%m-%d")
    df["publish_ym"] = df["publish_date"].dt.to_period("M").astype(str)
    
    lat_per_meter = 1 / 111320
    df["offset_distance"] = np.random.uniform(0, 2500, num_orders)
    df["offset_angle"] = np.random.uniform(0, 2 * math.pi, num_orders)
    df["order_lat"] = df["lat"] + df["offset_distance"] * np.cos(df["offset_angle"]) * lat_per_meter
    df["order_lon"] = df.apply(
        lambda x: x["lon"] + x["offset_distance"] * np.sin(x["offset_angle"]) * lat_per_meter / math.cos(math.radians(x["lat"])),
        axis=1
    )
    df = df.drop(columns=["offset_distance", "offset_angle"])
    
    return df, hospitals_df

def get_funnel_data(df):
    total_published = len(df)
    total_accepted = df["accepted"].sum()
    total_completed = df["completed"].sum()
    
    funnel_data = [
        {"stage": "需求发布", "count": total_published, "color": "#1f77b4"},
        {"stage": "陪诊员接单", "count": total_accepted, "color": "#ff7f0e"},
        {"stage": "服务完成", "count": total_completed, "color": "#2ca02c"},
    ]
    return pd.DataFrame(funnel_data)

def calculate_sla_compliance(df, sla_minutes=15):
    if len(df) == 0:
        return pd.DataFrame(columns=["date", "total_accepted", "sla_met", "sla_rate"])
    
    accepted_df = df[df["accepted"] == 1].copy()
    
    if len(accepted_df) == 0:
        return pd.DataFrame(columns=["date", "total_accepted", "sla_met", "sla_rate"])
    
    accepted_df["response_time_minutes"] = (
        accepted_df["accepted_date"] - accepted_df["publish_date"]
    ).dt.total_seconds() / 60
    
    accepted_df["sla_met"] = (accepted_df["response_time_minutes"] <= sla_minutes).astype(int)
    accepted_df["date"] = accepted_df["publish_date"].dt.date
    
    sla_daily = accepted_df.groupby("date").agg(
        total_accepted=("order_id", "count"),
        sla_met=("sla_met", "sum")
    ).reset_index()
    
    sla_daily["sla_rate"] = (sla_daily["sla_met"] / sla_daily["total_accepted"] * 100).round(1)
    
    return sla_daily

def get_hospital_heatmap_data(df, hospitals_df):
    required_columns = ["hospital_id", "hospital_name", "city", "lat", "lon", "order_id", "accepted", "completed", "price"]
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        return pd.DataFrame(columns=["hospital_id", "hospital_name", "city", "lat", "lon", 
                                     "total_orders", "accepted_orders", "completed_orders", 
                                     "total_amount", "accept_rate", "complete_rate", "avg_price"])
    
    grouped = df.groupby(["hospital_id", "hospital_name", "city", "lat", "lon"]).agg({
        "order_id": "count",
        "accepted": "sum",
        "completed": "sum",
        "price": "sum"
    }).reset_index()
    
    grouped.columns = ["hospital_id", "hospital_name", "city", "lat", "lon", 
                       "total_orders", "accepted_orders", "completed_orders", "total_amount"]
    
    if len(grouped) > 0:
        grouped["accept_rate"] = (grouped["accepted_orders"] / grouped["total_orders"] * 100).round(1)
        grouped["complete_rate"] = (grouped["completed_orders"] / grouped["accepted_orders"] * 100).round(1)
        grouped["avg_price"] = (grouped["total_amount"] / grouped["total_orders"]).round(0)
    else:
        grouped["accept_rate"] = []
        grouped["complete_rate"] = []
        grouped["avg_price"] = []
    
    return grouped

def get_grid_heatmap_data(df, hospital_lat, hospital_lon, grid_size_meters=500):
    if len(df) == 0 or "order_lat" not in df.columns or "order_lon" not in df.columns:
        return pd.DataFrame(columns=["grid_lat", "grid_lon", "order_count"])
    
    lat_per_meter = 1 / 111320
    lon_per_meter = 1 / (111320 * math.cos(math.radians(hospital_lat)))
    
    grid_count = 11
    half_grid = grid_count // 2
    
    grid_centers = []
    for i in range(-half_grid, half_grid + 1):
        for j in range(-half_grid, half_grid + 1):
            grid_lat = hospital_lat + i * grid_size_meters * lat_per_meter
            grid_lon = hospital_lon + j * grid_size_meters * lon_per_meter
            grid_centers.append({
                "grid_lat": grid_lat,
                "grid_lon": grid_lon,
                "grid_i": i,
                "grid_j": j
            })
    
    grid_df = pd.DataFrame(grid_centers)
    
    df = df.copy()
    df["grid_i"] = np.round((df["order_lat"] - hospital_lat) / (grid_size_meters * lat_per_meter)).astype(int)
    df["grid_j"] = np.round((df["order_lon"] - hospital_lon) / (grid_size_meters * lon_per_meter)).astype(int)
    
    df = df[(df["grid_i"] >= -half_grid) & (df["grid_i"] <= half_grid) & 
            (df["grid_j"] >= -half_grid) & (df["grid_j"] <= half_grid)]
    
    order_counts = df.groupby(["grid_i", "grid_j"]).size().reset_index(name="order_count")
    
    grid_df = grid_df.merge(order_counts, on=["grid_i", "grid_j"], how="left")
    grid_df["order_count"] = grid_df["order_count"].fillna(0).astype(int)
    
    return grid_df[["grid_lat", "grid_lon", "order_count"]]

def export_dashboard_pdf(funnel_fig, heatmap_fig, sla_fig, kpi_data, filename):
    from PyPDF2 import PdfMerger
    merger = PdfMerger()
    
    figs = [funnel_fig, heatmap_fig, sla_fig]
    
    for fig in figs:
        pdf_bytes = fig.to_image(format="pdf", width=1200, height=800, scale=2)
        merger.append(io.BytesIO(pdf_bytes))
    
    output = io.BytesIO()
    merger.write(output)
    merger.close()
    
    output.seek(0)
    return output.getvalue()


if __name__ == "__main__":
    df, hospitals_df = generate_orders()
    print(f"生成订单数据: {len(df)} 条")
    print(f"医院数量: {len(hospitals_df)} 家")
    print("\n漏斗数据:")
    print(get_funnel_data(df))
    print("\n热力图数据 (前5条):")
    print(get_hospital_heatmap_data(df, hospitals_df).head())
