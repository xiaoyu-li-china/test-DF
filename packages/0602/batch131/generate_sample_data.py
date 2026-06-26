import pandas as pd
import numpy as np

np.random.seed(42)

CENTERS = [
    {"name": "朝阳片区", "lat": 39.921, "lng": 116.443, "n": 18},
    {"name": "海淀片区", "lat": 39.959, "lng": 116.298, "n": 15},
    {"name": "丰台片区", "lat": 39.858, "lng": 116.286, "n": 12},
    {"name": "东城片区", "lat": 39.928, "lng": 116.416, "n": 10},
]

rows = []
for area in CENTERS:
    for i in range(area["n"]):
        lat = area["lat"] + np.random.uniform(-0.012, 0.012)
        lng = area["lng"] + np.random.uniform(-0.015, 0.015)
        orders = np.random.randint(1, 8)
        name = f"{area['name']}{i+1}号点"
        time_slot = np.random.choice(["10:30", "11:30"], p=[0.4, 0.6])
        rows.append({
            "姓名": f"老人{i+1:03d}",
            "地址": name,
            "片区": area["name"],
            "纬度": round(lat, 6),
            "经度": round(lng, 6),
            "订单量": orders,
            "配送时段": time_slot,
        })

df = pd.DataFrame(rows)
df.to_excel("orders_sample.xlsx", index=False)
print(f"已生成 {len(df)} 条模拟订单数据 → orders_sample.xlsx")
