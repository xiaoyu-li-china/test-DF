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
print("TEST 1: 复现漏斗总数计算问题")
print("=" * 60)

total_published_sql = len(df_all)
total_accepted_sql = df_all["accepted"].sum()
total_completed_sql = df_all["completed"].sum()

print(f"SQL 直接统计:")
print(f"  需求发布:", total_published_sql)
print(f"  陪诊员接单:", total_accepted_sql)
print(f"  服务完成:", total_completed_sql)

funnel_df = get_funnel_data(df_all)
print(f"\n漏斗函数返回:")
print(f"  需求发布:", funnel_df.iloc[0]['count'])
print(f"  陪诊员接单:", funnel_df.iloc[1]['count'])
print(f"  服务完成:", funnel_df.iloc[2]['count'])

diff_published = total_published_sql - funnel_df.iloc[0]['count']
diff_accepted = total_accepted_sql - funnel_df.iloc[1]['count']
diff_completed = total_completed_sql - funnel_df.iloc[2]['count']

print(f"\n差值:")
print(f"  需求发布差异: {diff_published} ({diff_published/total_published_sql*100:.1f}%)")
print(f"  接单差异: {diff_accepted} ({diff_accepted/total_accepted_sql*100:.1f}%)")
print(f"  完成差异: {diff_completed} ({diff_completed/total_completed_sql*100:.1f}%)")

send_log("H3", "Test1: funnel vs SQL comparison", {
    "sql_published": int(total_published_sql),
    "sql_accepted": int(total_accepted_sql),
    "sql_completed": int(total_completed_sql),
    "funnel_published": int(funnel_df.iloc[0]['count']),
    "funnel_accepted": int(funnel_df.iloc[1]['count']),
    "funnel_completed": int(funnel_df.iloc[2]['count']),
    "diff_published_pct": float(diff_published/total_published_sql*100)
})

print("\n" + "=" * 60)
print("TEST 2: 复现「上周」空数据 KeyError 问题")
print("=" * 60)

last_week_start = datetime(2026, 5, 26)
last_week_end = datetime(2026, 6, 1)

print(f"上周日期范围:", last_week_start.date(), "to", last_week_end.date())

df_last_week = df_all[(df_all["publish_date"] >= last_week_start) & (df_all["publish_date"] <= last_week_end)]

print(f"上周数据量:", len(df_last_week))

send_log("H5", "Test2: last week data check", {
    "last_week_start": str(last_week_start),
    "last_week_end": str(last_week_end),
    "last_week_count": len(df_last_week)
})

print("\n尝试调用 get_hospital_heatmap_data...")

try:
    heatmap_df = get_hospital_heatmap_data(df_last_week, hospitals_df)
    print(f"heatmap_df 长度: {len(heatmap_df)}")
    print(f"heatmap_df 列: {list(heatmap_df.columns.tolist())}")
    print(f"是否有 city 列: {'city' in heatmap_df.columns}")
    
    if len(heatmap_df) > 0:
        print(f"尝试访问 heatmap_df['city']: 成功")
    else:
        print("heatmap_df 为空 DataFrame")
        print(f"尝试访问 heatmap_df['city']...")
        city_vals = heatmap_df["city"]
        print(f"成功，值为:", city_vals.tolist())
        
except Exception as e:
    print(f"ERROR:", type(e).__name__, ":", str(e))
    import traceback
    traceback.print_exc()
    send_log("H5", "Test2: KeyError reproduced", {
        "error_type": type(e).__name__,
        "error_msg": str(e),
        "traceback": traceback.format_exc()
    })

print("\n" + "=" * 60)
print("TEST 3: 测试日期过滤边界问题")
print("=" * 60)

start_date = datetime(2026, 1, 1)
end_date = datetime(2026, 1, 31)

df_dt = df_all[(df_all["publish_date"] >= start_date) & (df_all["publish_date"] <= end_date)]
print(f"用 datetime 过滤 1 月数据: {len(df_dt)} 条")

df_all["date_only"] = df_all["publish_date"].dt.date
start_date_str = "2026-01-01"
end_date_str = "2026-01-31"

df_str = df_all[(df_all["publish_date_str"] >= start_date_str) & (df_all["publish_date_str"] <= end_date_str)]
print(f"用字符串过滤 1 月数据: {len(df_str)} 条")

diff = len(df_dt) - len(df_str)
print(f"差异: {diff} 条 ({diff/len(df_dt)*100:.1f}%)")

send_log("H1", "Test3: date filter boundary test", {
    "datetime_filter_count": len(df_dt),
    "string_filter_count": len(df_str),
    "diff_count": diff,
    "diff_pct": float(diff/len(df_dt)*100),
    "start_date": str(start_date),
    "end_date": str(end_date)
})

print("\n" + "=" * 60)
print("TEST 4: 检查 publish_date 的时间分布")
print("=" * 60)

df_all["date_part"] = df_all["publish_date"].dt.normalize()
date_counts = df_all["date_part"].value_counts().sort_index()
print(f"日期范围:", date_counts.head(10))
print("...")
print(date_counts.tail(5))

send_log("H1", "Test4: date distribution", {
    "min_date": str(df_all["publish_date"].min()),
    "max_date": str(df_all["publish_date"].max()),
    "unique_dates": int(df_all["date_part"].nunique())
})

print("\n测试完成！请查看调试日志。")
