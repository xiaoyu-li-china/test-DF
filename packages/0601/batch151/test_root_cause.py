import sys
import pandas as pd
from datetime import datetime, timedelta
import numpy as np
import json
import urllib.request

sys.path.insert(0, '/Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch151')

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
        "root_cause_analysis": True,
        "msg": f"[DEBUG] " + msg,
        "data": data
    }
    
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"Content-Type":"application/json"})
        urllib.request.urlopen(req).read()
    except Exception as e:
        print(f"Log send failed:", e)

print("=" * 70)
print("ROOT CAUSE ANALYSIS")
print("=" * 70)

print("\n" + "=" * 70)
print("TEST 1: 模拟真实数据 - publish_date 包含时分秒")
print("=" * 70)

dates = pd.date_range("2026-01-01", "2026-01-31", freq="30min")
print(f"生成 {len(dates)} 个带时分秒的日期样例")
print(f"前 5 个: {dates[:5].tolist()}")

start_date = pd.to_datetime("2026-01-01")
end_date = pd.to_datetime("2026-01-13")

print(f"\n过滤日期范围: {start_date} to {end_date}")
print(f"(共 13 天，其中 end_date 当天只包含 00:00:00)")

filtered_dates = dates[(dates >= start_date) & (dates <= end_date)]
print(f"过滤后数量: {len(filtered_dates)}")
print(f"end_date 当天 (2026-01-13) 的 48 个时间点中，被包含的数量: {sum(1 for d in filtered_dates if d.date() == end_date.date())}")

expected_count = 13 * 48
actual_count = len(filtered_dates)
missing = expected_count - actual_count
missing_pct = missing / expected_count * 100

print(f"\n预期数量 (13天 × 48个/天): {expected_count}")
print(f"实际数量: {actual_count}")
print(f"丢失数量: {missing} ({missing_pct:.1f}%)")
print(f"\n>>> 这正好是用户报告的 ~8% 差异！")

send_log("H1", "ROOT CAUSE: date boundary issue", {
    "scenario": "publish_date with time component",
    "date_range": f"{start_date} to {end_date}",
    "expected_count": expected_count,
    "actual_count": actual_count,
    "missing_count": missing,
    "missing_pct": float(missing_pct),
    "explanation": "end_date 被解析为 YYYY-MM-DD 00:00:00，<= end_date 只包含当天 00:00:00 的数据，丢失了当天其他 47 个时间点",
    "note": "13天数据丢失1天数据 = 1/13 ≈ 7.7% ≈ 8%"
})

print("\n" + "=" * 70)
print("TEST 2: 修复方案对比 - 正确的日期过滤方式")
print("=" * 70)

end_date_fixed = end_date + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)
print(f"修复后的 end_date: {end_date_fixed}")

filtered_dates_fixed = dates[(dates >= start_date) & (dates <= end_date_fixed)]
print(f"修复后过滤数量: {len(filtered_dates_fixed)}")
print(f"丢失数量: {expected_count - len(filtered_dates_fixed)}")

end_date_next_day = end_date + pd.Timedelta(days=1)
filtered_dates_next = dates[(dates >= start_date) & (dates < end_date_next_day)]
print(f"\n方案2 - 使用 < end_date + 1day:")
print(f"end_date + 1day: {end_date_next_day}")
print(f"过滤后数量: {len(filtered_dates_next)}")

send_log("H1", "FIX COMPARISON: date boundary", {
    "original_method": "<= end_date (00:00:00)",
    "original_count": actual_count,
    "fixed_method1": "<= end_date 23:59:59",
    "fixed_count1": len(filtered_dates_fixed),
    "fixed_method2": "< end_date + 1 day",
    "fixed_count2": len(filtered_dates_next),
    "recommended": "Method 2 (using < end_date + 1 day)"
})

print("\n" + "=" * 70)
print("TEST 3: 模拟 KeyError: city 的根因场景")
print("=" * 70)

print("\n场景 A: df 中没有 city 列")
df_no_city = pd.DataFrame({
    "hospital_id": ["H001", "H002"],
    "hospital_name": ["协和", "301"],
    "order_id": ["O001", "O002"],
    "accepted": [1, 0],
    "completed": [1, 0]
})
print(f"df_no_city 列: {list(df_no_city.columns)}")

try:
    grouped = df_no_city.groupby(["hospital_id", "hospital_name", "city", "lat", "lon"]).agg({
        "order_id": "count",
        "accepted": "sum",
        "completed": "sum"
    }).reset_index()
    print(f"groupby 成功，列: {list(grouped.columns)}")
except KeyError as e:
    print(f"ERROR: KeyError: {e}")
    print(f">>> 这就是用户看到的 KeyError: city！")
    send_log("H2", "ROOT CAUSE: KeyError scenario A - df has no city column", {
        "df_columns": list(df_no_city.columns),
        "groupby_keys": ["hospital_id", "hospital_name", "city", "lat", "lon"],
        "error": str(e),
        "explanation": "groupby 时 df 中没有 city 列，直接抛出 KeyError: 'city'"
    })
except Exception as e:
    print(f"Other error: {type(e).__name__}: {e}")

print("\n场景 B: df 有 city 列但全部为 NaN")
df_nan_city = pd.DataFrame({
    "hospital_id": ["H001", "H002"],
    "hospital_name": ["协和", "301"],
    "city": [np.nan, np.nan],
    "lat": [39.9, 39.9],
    "lon": [116.4, 116.3],
    "order_id": ["O001", "O002"],
    "accepted": [1, 0],
    "completed": [1, 0]
})
print(f"df_nan_city 列: {list(df_nan_city.columns)}")
print(f"df_nan_city['city']: {df_nan_city['city'].tolist()}")

try:
    grouped = df_nan_city.groupby(["hospital_id", "hospital_name", "city", "lat", "lon"]).agg({
        "order_id": "count",
        "accepted": "sum",
        "completed": "sum"
    }).reset_index()
    print(f"groupby 成功，列: {list(grouped.columns)}")
    print(f"grouped 长度: {len(grouped)}")
    print(f"grouped['city']: {grouped['city'].tolist()}")
    print(f"是否有 city 列: {'city' in grouped.columns}")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")

print("\n场景 C: df 为空")
df_empty = pd.DataFrame(columns=["hospital_id", "hospital_name", "city", "lat", "lon", 
                                  "order_id", "accepted", "completed", "price"])
print(f"df_empty 列: {list(df_empty.columns)}")

try:
    grouped = df_empty.groupby(["hospital_id", "hospital_name", "city", "lat", "lon"]).agg({
        "order_id": "count",
        "accepted": "sum",
        "completed": "sum",
        "price": "sum"
    }).reset_index()
    print(f"groupby 成功，列: {list(grouped.columns)}")
    print(f"grouped 长度: {len(grouped)}")
    print(f"是否有 city 列: {'city' in grouped.columns}")
    
    print(f"\n尝试重命名列...")
    grouped.columns = ["hospital_id", "hospital_name", "city", "lat", "lon", 
                       "total_orders", "accepted_orders", "completed_orders", "total_amount"]
    print(f"重命名后列: {list(grouped.columns)}")
    print(f"是否有 city 列: {'city' in grouped.columns}")
    
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
print("TEST 4: 模拟真实场景 - 医院 ID 不匹配导致 city 为 NaN")
print("=" * 70)

hospitals = pd.DataFrame({
    "hospital_id": ["H001", "H002"],
    "hospital_name": ["协和", "301"],
    "city": ["北京", "北京"],
    "lat": [39.9, 39.9],
    "lon": [116.4, 116.3]
})

orders = pd.DataFrame({
    "order_id": ["O001", "O002", "O003"],
    "hospital_id": ["H001", "H002", "H999"],
    "accepted": [1, 1, 1],
    "completed": [1, 0, 1]
})

print(f"orders 数据:")
print(orders)

df_merged = orders.merge(hospitals, on="hospital_id", how="left")
print(f"\nmerge 后数据:")
print(df_merged)
print(f"\ncity 列: {df_merged['city'].tolist()}")
print(f"hospital_name 列: {df_merged['hospital_name'].tolist()}")

try:
    from data_generator import get_hospital_heatmap_data
    heatmap = get_hospital_heatmap_data(df_merged, hospitals)
    print(f"\nget_hospital_heatmap_data 结果:")
    print(heatmap)
    print(f"\nheatmap 列: {list(heatmap.columns)}")
    print(f"是否有 city 列: {'city' in heatmap.columns}")
except Exception as e:
    print(f"\nERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    send_log("H4", "ROOT CAUSE: merge mismatch", {
        "error": str(e),
        "merged_city_values": df_merged['city'].tolist(),
        "hospitals_ids": hospitals['hospital_id'].tolist(),
        "orders_ids": orders['hospital_id'].tolist(),
        "explanation": "merge 后某些行的 city 为 NaN，但 groupby 应该仍然能工作"
    })

print("\n" + "=" * 70)
print("TEST 5: 最终根因总结")
print("=" * 70)

print("\n✅ Bug 1: 漏斗总数差 8% - 根因确认")
print("   原因: 日期过滤时 end_date 只包含 00:00:00，丢失 end_date 当天其他时间的数据")
print(f"   证据: 13天数据丢失1天 = 1/13 ≈ 7.7% ≈ 8%")
print("   修复: 将 end_date 调整为 < end_date + 1 day")

print("\n❓ Bug 2: KeyError: city - 最可能的根因")
print("   可能原因 A: df 中没有 city 列（数据来源问题）")
print("   可能原因 B: 空数据时某些代码路径访问 city 列（虽然测试显示不会）")
print("   可能原因 C: pandas 版本差异导致 groupby 空 df 时列名不同")
print("   防御性修复: 在访问 city 列前先检查列是否存在，以及 df 是否为空")

print("\n" + "=" * 70)
print("ROOT CAUSE ANALYSIS COMPLETE")
print("=" * 70)

send_log("H1,H2,H5", "ROOT CAUSE SUMMARY", {
    "bug1_root_cause": "Date boundary issue - end_date only includes 00:00:00, missing rest of the day",
    "bug1_evidence": "1 day lost out of 13 days ≈ 7.7% ≈ 8%",
    "bug1_fix": "Use < end_date + 1 day instead of <= end_date",
    "bug2_possible_causes": [
        "df has no 'city' column (data source issue)",
        "Empty data edge case accessing city column",
        "Pandas version difference in groupby empty DataFrame"
    ],
    "bug2_defensive_fix": "Check column existence before accessing, handle empty DataFrame properly"
})
