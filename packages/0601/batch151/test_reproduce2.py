import sys
import pandas as pd
from datetime import datetime, timedelta
import json
import urllib.request

sys.path.insert(0, '/Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch151')

from app import df_all, hospitals_df
from data_generator import get_funnel_data, get_hospital_heatmap_data

def send_log(hypothesis_id, msg, data):
    try:
        with open('.dbg/funnel-city-bug.env') as f:
            c = f.read()
        url = next((l.split('=',1)[1] for l in c.split('\n') if l.startswith('DEBUG_SERVER_URL=')), 'http://127.0.0.1:7777/event')
        session = next((l.split('=',1)[1] for l in c.split('\n') if l.startswith('DEBUG_SESSION_ID=')), 'funnel-city-bug')
    except:
        url = 'http://127.0.0.1:7777/event'
        session = 'funnel-city-bug'
    
    payload = {
        "sessionId": session,
        "runId": "pre-fix",
        "hypothesisId": hypothesis_id,
        "test_reproduce": True,
        "msg": f"[DEBUG] " + msg,
        "data": data
    }
    
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"Content-Type":"application/json"})
        urllib.request.urlopen(req).read()
    except Exception as e:
        print(f"Log send failed:", e)

print("=" * 60)
print("TEST 1: 用完全空的数据复现 KeyError")
print("=" * 60)

empty_start = datetime(2025, 1, 1)
empty_end = datetime(2025, 1, 7)

print(f"空数据日期范围:", empty_start.date(), "to", empty_end.date())

df_empty = df_all[(df_all["publish_date"] >= empty_start) & (df_all["publish_date"] <= empty_end)]
print(f"空数据量:", len(df_empty))

send_log("H5", "Test1: empty df check", {
    "empty_start": str(empty_start),
    "empty_end": str(empty_end),
    "empty_count": len(df_empty)
})

print("\n调用 get_hospital_heatmap_data 处理空 df...")
try:
    heatmap_empty = get_hospital_heatmap_data(df_empty, hospitals_df)
    print(f"返回 heatmap_empty 长度: {len(heatmap_empty)}")
    print(f"heatmap_empty 列: {list(heatmap_empty.columns)}")
    print(f"是否有 city 列: {'city' in heatmap_empty.columns}")
    
    if len(heatmap_empty) == 0:
        print("\n现在模拟 app.py 中的逻辑...")
        print("检查 len(heatmap_df) > 0:", len(heatmap_empty) > 0)
        print("进入 else 分支...")
        
        print("\n但是如果某些代码路径在 len==0 时仍访问 city 列...")
        print(f"尝试访问 heatmap_empty['city']...")
        city_vals = heatmap_empty["city"]
        print(f"成功，类型:", type(city_vals))
        print(f"值:", city_vals.tolist())
        
except Exception as e:
    print(f"ERROR:", type(e).__name__, ":", str(e))
    import traceback
    traceback.print_exc()
    send_log("H5", "Test1: KeyError with empty df", {
        "error_type": type(e).__name__,
        "error_msg": str(e),
        "traceback": traceback.format_exc(),
        "heatmap_empty_len": len(heatmap_empty) if 'heatmap_empty' in locals() else -1,
        "heatmap_empty_columns": list(heatmap_empty.columns) if 'heatmap_empty' in locals() else []
    })

print("\n" + "=" * 60)
print("TEST 2: 分析 groupby 空 DataFrame 的行为")
print("=" * 60)

empty_df = pd.DataFrame(columns=["hospital_id", "hospital_name", "city", "lat", "lon", 
                                  "order_id", "accepted", "completed", "price"])
print(f"空 DataFrame 列: {list(empty_df.columns)}")

print("\n执行 groupby...")
try:
    grouped = empty_df.groupby(["hospital_id", "hospital_name", "city", "lat", "lon"]).agg({
        "order_id": "count",
        "accepted": "sum",
        "completed": "sum",
        "price": "sum"
    }).reset_index()
    
    print(f"groupby 后长度: {len(grouped)}")
    print(f"groupby 后列: {list(grouped.columns)}")
    
    print("\n重命名列...")
    grouped.columns = ["hospital_id", "hospital_name", "city", "lat", "lon", 
                       "total_orders", "accepted_orders", "completed_orders", "total_amount"]
    
    print(f"重命名后列: {list(grouped.columns)}")
    print(f"是否有 city 列: {'city' in grouped.columns}")
    
    send_log("H2", "Test2: groupby empty df behavior", {
        "grouped_len": len(grouped),
        "grouped_columns": list(grouped.columns),
        "has_city": 'city' in grouped.columns
    })
    
except Exception as e:
    print(f"ERROR:", type(e).__name__, ":", str(e))
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("TEST 3: 检查日期过滤的边界问题（含时分秒）")
print("=" * 60)

print(f"df_all publish_date 类型: {df_all['publish_date'].dtype}")
print(f"df_all publish_date 样例 (前3条):")
for i in range(3):
    print(f"  {df_all['publish_date'].iloc[i]}")

start_date_str = "2026-01-01"
end_date_str = "2026-01-31"

start_dt = pd.to_datetime(start_date_str)
end_dt = pd.to_datetime(end_date_str)

print(f"\nstart_dt (pd.to_datetime): {start_dt} (type: {type(start_dt)})")
print(f"end_dt (pd.to_datetime): {end_dt} (type: {type(end_dt)})")

df_dt = df_all[(df_all["publish_date"] >= start_dt) & (df_all["publish_date"] <= end_dt)]
print(f"\n用 datetime 过滤 (>= start_dt, <= end_dt): {len(df_dt)} 条")

end_dt_end_of_day = pd.to_datetime(end_date_str) + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)
print(f"\nend_dt_end_of_day: {end_dt_end_of_day}")

df_dt2 = df_all[(df_all["publish_date"] >= start_dt) & (df_all["publish_date"] <= end_dt_end_of_day)]
print(f"用 datetime 过滤 (>= start_dt, <= end_of_day): {len(df_dt2)} 条")

df_str = df_all[(df_all["publish_date_str"] >= start_date_str) & (df_all["publish_date_str"] <= end_date_str)]
print(f"用字符串过滤: {len(df_str)} 条")

diff = len(df_dt2) - len(df_dt)
print(f"\n差异: {diff} 条 ({diff/len(df_dt2)*100:.1f}%)")

send_log("H1", "Test3: datetime boundary analysis", {
    "datetime_filter_normal": len(df_dt),
    "datetime_filter_end_of_day": len(df_dt2),
    "string_filter": len(df_str),
    "diff_count": diff,
    "diff_pct": float(diff/len(df_dt2)*100) if len(df_dt2) > 0 else 0,
    "start_dt": str(start_dt),
    "end_dt": str(end_dt),
    "end_dt_end_of_day": str(end_dt_end_of_day),
    "publish_date_dtype": str(df_all['publish_date'].dtype)
})

print("\n" + "=" * 60)
print("TEST 4: 检查 completed 计算逻辑差异")
print("=" * 60)

print(f"\ndf_all['completed'] 取值分布:")
print(df_all["completed"].value_counts())

print(f"\ndf_all 中 accepted==0 的 completed 取值分布:")
print(df_all[df_all["accepted"] == 0]["completed"].value_counts())

print(f"\ndf_all 中 accepted==1 的 completed 取值分布:")
print(df_all[df_all["accepted"] == 1]["completed"].value_counts())

completed_count1 = df_all["completed"].sum()
completed_count2 = df_all[df_all["accepted"] == 1]["completed"].sum()
completed_count3 = df_all[(df_all["accepted"] == 1) & (df_all["completed"] == 1)]["completed"].sum()

print(f"\n不同计算方式的 completed 总数:")
print(f"  方式1 (全部.sum()): {completed_count1}")
print(f"  方式2 (accepted==1 后 .sum()): {completed_count2}")
print(f"  方式3 (accepted==1 & completed==1 后 .sum()): {completed_count3}")

print(f"\n方式1 - 方式2 = {completed_count1 - completed_count2} ({(completed_count1 - completed_count2)/completed_count1*100:.1f}%)")

send_log("H3", "Test4: completed calculation logic", {
    "completed_all_sum": int(completed_count1),
    "completed_accepted_sum": int(completed_count2),
    "completed_double_filter_sum": int(completed_count3),
    "diff": int(completed_count1 - completed_count2),
    "diff_pct": float((completed_count1 - completed_count2)/completed_count1*100),
    "accepted_0_completed_counts": df_all[df_all["accepted"] == 0]["completed"].value_counts().to_dict()
})

print("\n测试完成！")
