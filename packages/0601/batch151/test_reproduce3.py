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
print("TEST 1: 模拟「上周 + 特定城市」空数据场景")
print("=" * 60)

empty_start = datetime(2025, 1, 1)
empty_end = datetime(2025, 1, 7)
city = "北京"

print(f"日期范围:", empty_start.date(), "to", empty_end.date())
print(f"城市筛选:", city)

df_filtered = df_all[(df_all["publish_date"] >= empty_start) & (df_all["publish_date"] <= empty_end)]
df_filtered = df_filtered[df_filtered["city"] == city]

print(f"过滤后数据量:", len(df_filtered))

send_log("H5", "Test1: empty + specific city", {
    "start_date": str(empty_start),
    "end_date": str(empty_end),
    "city": city,
    "filtered_count": len(df_filtered)
})

print("\n调用 get_hospital_heatmap_data...")
try:
    heatmap_df = get_hospital_heatmap_data(df_filtered, hospitals_df)
    print(f"heatmap_df 长度: {len(heatmap_df)}")
    print(f"heatmap_df 列: {list(heatmap_df.columns)}")
    print(f"是否有 city 列: {'city' in heatmap_df.columns}")
    
except Exception as e:
    print(f"ERROR in get_hospital_heatmap_data:", type(e).__name__, ":", str(e))
    import traceback
    traceback.print_exc()
    send_log("H5", "Test1: Error in heatmap function", {
        "error_type": type(e).__name__,
        "error_msg": str(e),
        "traceback": traceback.format_exc()
    })

print("\n" + "=" * 60)
print("TEST 2: 模拟 app.py 中的完整逻辑")
print("=" * 60)

print("\n模拟 update_dashboard 函数逻辑...")
try:
    df = df_filtered
    
    total_published = len(df)
    total_accepted = df["accepted"].sum()
    total_completed = df["completed"].sum()
    
    print(f"KPI: published={total_published}, accepted={total_accepted}, completed={total_completed}")
    
    funnel_df = get_funnel_data(df)
    print(f"漏斗: {funnel_df['count'].tolist()}")
    
    heatmap_df = get_hospital_heatmap_data(df, hospitals_df)
    print(f"\nheatmap_df 长度: {len(heatmap_df)}")
    
    if len(heatmap_df) > 0:
        print("进入 if len > 0 分支...")
        max_orders = heatmap_df["total_orders"].max()
        heatmap_df["size"] = heatmap_df["total_orders"].apply(
            lambda x: max(15, int(x / max_orders * 60))
        )
        print("添加 hover_text...")
        heatmap_df["hover_text"] = heatmap_df.apply(
            lambda row: f"<b>{row['hospital_name']}</b><br>"
                       f"城市: {row['city']}<br>"
                       f"总订单数: {row['total_orders']}<br>",
            axis=1
        )
        print("hover_text 添加成功")
        
        print(f"\ncity 参数: {city}")
        print(f"city != '全部城市': {city != '全部城市'}")
        
        if city != "全部城市":
            print(f"尝试访问 heatmap_df['city'] == '{city}'...")
            city_data = heatmap_df[heatmap_df["city"] == city]
            print(f"city_data 长度: {len(city_data)}")
            
    else:
        print("进入 else 分支（空数据）...")
        print("创建空图表...")
        
except Exception as e:
    print(f"\nERROR:", type(e).__name__, ":", str(e))
    import traceback
    traceback.print_exc()
    send_log("H5", "Test2: Error in full logic", {
        "error_type": type(e).__name__,
        "error_msg": str(e),
        "traceback": traceback.format_exc(),
        "city": city,
        "heatmap_len": len(heatmap_df) if 'heatmap_df' in locals() else -1,
        "heatmap_columns": list(heatmap_df.columns) if 'heatmap_df' in locals() else []
    })

print("\n" + "=" * 60)
print("TEST 3: 检查 8% 偏差的可能来源")
print("=" * 60)

print("\n模拟 SQL 按日期字符串统计 vs 代码按 datetime 统计...")
print("假设 SQL 统计 2026-01-01 到 2026-01-31 的数据")

start_date_str = "2026-01-01"
end_date_str = "2026-01-31"

df_sql = df_all[(df_all["publish_date_str"] >= start_date_str) & (df_all["publish_date_str"] <= end_date_str)]
print(f"SQL 方式（按字符串）: {len(df_sql)} 条")

start_dt = pd.to_datetime(start_date_str)
end_dt = pd.to_datetime(end_date_str)

df_code1 = df_all[(df_all["publish_date"] >= start_dt) & (df_all["publish_date"] <= end_dt)]
print(f"代码方式1 (<= end_dt 00:00): {len(df_code1)} 条")

print(f"\n差异: {len(df_sql) - len(df_code1)} 条 ({(len(df_sql) - len(df_code1))/len(df_sql)*100:.1f}%)")

print("\n" + "=" * 60)
print("TEST 4: 检查 groupby 后重命名列的问题")
print("=" * 60)

print("当 df 为空时，groupby 后的列名...")
empty_df = pd.DataFrame(columns=["hospital_id", "hospital_name", "city", "lat", "lon", 
                                  "order_id", "accepted", "completed", "price"])

grouped = empty_df.groupby(["hospital_id", "hospital_name", "city", "lat", "lon"]).agg({
    "order_id": "count",
    "accepted": "sum",
    "completed": "sum",
    "price": "sum"
}).reset_index()

print(f"groupby 后列: {list(grouped.columns)}")
print(f"列数: {len(grouped.columns)}")

grouped.columns = ["hospital_id", "hospital_name", "city", "lat", "lon", 
                   "total_orders", "accepted_orders", "completed_orders", "total_amount"]

print(f"重命名后列: {list(grouped.columns)}")
print(f"列数: {len(grouped.columns)}")

print(f"\n现在添加衍生列...")
try:
    grouped["accept_rate"] = (grouped["accepted_orders"] / grouped["total_orders"] * 100).round(1)
    grouped["complete_rate"] = (grouped["completed_orders"] / grouped["accepted_orders"] * 100).round(1)
    grouped["avg_price"] = (grouped["total_amount"] / grouped["total_orders"]).round(0)
    print(f"添加衍生列后列: {list(grouped.columns)}")
except Exception as e:
    print(f"ERROR 添加衍生列:", type(e).__name__, ":", str(e))
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("TEST 5: 检查 pd.to_datetime 处理字符串的时区问题")
print("=" * 60)

date_str = "2026-01-31"
dt1 = pd.to_datetime(date_str)
dt2 = pd.to_datetime(date_str + "T00:00:00")
dt3 = pd.to_datetime(date_str + " 23:59:59")

print(f"pd.to_datetime('{date_str}'): {dt1}")
print(f"pd.to_datetime('{date_str}T00:00:00'): {dt2}")
print(f"pd.to_datetime('{date_str} 23:59:59'): {dt3}")

print(f"\ndt1 == dt2: {dt1 == dt2}")
print(f"dt1 <= dt2: {dt1 <= dt2}")
print(f"dt1 <= dt3: {dt1 <= dt3}")

print("\n" + "=" * 60)
print("TEST 6: 检查 Dash 回调传入的日期格式")
print("=" * 60)

print("模拟 Dash DatePickerRange 返回的日期格式...")
dash_start_date = "2026-01-01T00:00:00"
dash_end_date = "2026-01-31T00:00:00"

print(f"Dash 返回: start={dash_start_date}, end={dash_end_date}")

start_parsed = pd.to_datetime(dash_start_date)
end_parsed = pd.to_datetime(dash_end_date)

print(f"pd.to_datetime 后: start={start_parsed}, end={end_parsed}")

df_dash = df_all[(df_all["publish_date"] >= start_parsed) & (df_all["publish_date"] <= end_parsed)]
df_expected = df_all[(df_all["publish_date_str"] >= "2026-01-01") & (df_all["publish_date_str"] <= "2026-01-31")]

print(f"Dash 方式过滤: {len(df_dash)} 条")
print(f"预期（全月）: {len(df_expected)} 条")
print(f"差异: {len(df_expected) - len(df_dash)} 条 ({(len(df_expected) - len(df_dash))/len(df_expected)*100:.1f}%)")

print(f"\npublish_date 样例:")
sample_dates = df_all["publish_date"].sample(5).tolist()
for d in sample_dates:
    print(f"  {d} (type: {type(d)})")

print(f"\nstart_parsed 类型: {type(start_parsed)}")
print(f"publish_date.dtype: {df_all['publish_date'].dtype}")

send_log("H1", "Test6: Dash date format analysis", {
    "dash_start_date": dash_start_date,
    "dash_end_date": dash_end_date,
    "start_parsed": str(start_parsed),
    "end_parsed": str(end_parsed),
    "dash_filter_count": len(df_dash),
    "expected_count": len(df_expected),
    "diff_count": len(df_expected) - len(df_dash),
    "diff_pct": float((len(df_expected) - len(df_dash))/len(df_expected)*100) if len(df_expected) > 0 else 0,
    "publish_date_dtype": str(df_all['publish_date'].dtype)
})

print("\n测试完成！")
