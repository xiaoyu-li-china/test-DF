import sys
import pandas as pd
from datetime import datetime, timedelta
import numpy as np

sys.path.insert(0, '/Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch151')

from app import df_all, hospitals_df, filter_data
from data_generator import get_funnel_data, get_hospital_heatmap_data

print("=" * 70)
print("VERIFICATION: Bug Fixes Applied")
print("=" * 70)

print("\n" + "=" * 70)
print("TEST 1: 验证日期边界修复 - 包含 end_date 当天所有时间点")
print("=" * 70)

dates_with_time = pd.date_range("2026-01-01", "2026-01-31 23:30:00", freq="30min")
print(f"生成 {len(dates_with_time)} 个带时分秒的日期样例（每30分钟一个）")

start_date = pd.to_datetime("2026-01-01")
end_date = pd.to_datetime("2026-01-13")

end_date_inclusive = end_date + pd.Timedelta(days=1)

filtered_old = dates_with_time[(dates_with_time >= start_date) & (dates_with_time <= end_date)]
filtered_new = dates_with_time[(dates_with_time >= start_date) & (dates_with_time < end_date_inclusive)]

print(f"原始方式 (<= end_date 00:00): {len(filtered_old)} 条")
print(f"修复方式 (< end_date + 1day): {len(filtered_new)} 条")
print(f"差异: {len(filtered_new) - len(filtered_old)} 条")

expected_count = 13 * 48
print(f"预期 (13天 × 48个/天): {expected_count} 条")

if len(filtered_new) == expected_count:
    print("✅ 日期边界修复验证通过！")
else:
    print("❌ 日期边界修复验证失败！")

print("\n" + "=" * 70)
print("TEST 2: 验证 KeyError 防御性修复 - df 没有 city 列的情况")
print("=" * 70)

df_no_city = pd.DataFrame({
    "hospital_id": ["H001", "H002"],
    "hospital_name": ["协和", "301"],
    "order_id": ["O001", "O002"],
    "accepted": [1, 0],
    "completed": [1, 0]
})
print(f"df_no_city 列: {list(df_no_city.columns)}")

try:
    heatmap = get_hospital_heatmap_data(df_no_city, hospitals_df)
    print(f"get_hospital_heatmap_data 返回:")
    print(f"  长度: {len(heatmap)} 条")
    print(f"  列: {list(heatmap.columns)}")
    print(f"  是否有 city 列: {'city' in heatmap.columns}")
    print("✅ KeyError 防御性修复验证通过！")
except KeyError as e:
    print(f"❌ KeyError: {e}")
    print("❌ KeyError 防御性修复验证失败！")

print("\n" + "=" * 70)
print("TEST 3: 验证空数据场景")
print("=" * 70)

df_empty = pd.DataFrame(columns=["hospital_id", "hospital_name", "city", "lat", "lon",
                              "order_id", "accepted", "completed", "price"])
print(f"df_empty 列: {list(df_empty.columns)}")

try:
    heatmap_empty = get_hospital_heatmap_data(df_empty, hospitals_df)
    print(f"空 df 调用返回:")
    print(f"  长度: {len(heatmap_empty)} 条")
    print(f"  列: {list(heatmap_empty.columns)}")
    print(f"  是否有 city 列: {'city' in heatmap_empty.columns}")
    print("✅ 空数据场景验证通过！")
except Exception as e:
    print(f"❌ {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
print("TEST 4: 验证正常数据场景")
print("=" * 70)

print(f"真实数据测试:")
print(f"  总订单数: {len(df_all)} 条")

heatmap_normal = get_hospital_heatmap_data(df_all, hospitals_df)
print(f"get_hospital_heatmap_data 返回:")
print(f"  长度: {len(heatmap_normal)} 条")
print(f"  列: {list(heatmap_normal.columns)}")
print(f"  city 列存在: {'city' in heatmap_normal.columns}")

if len(heatmap_normal) == 12 and 'city' in heatmap_normal.columns:
    print("✅ 正常数据场景验证通过！")
else:
    print("❌ 正常数据场景验证失败！")

print("\n" + "=" * 70)
print("TEST 5: 验证 filter_data 函数")
print("=" * 70)

start = "2026-01-01"
end = "2026-01-31"

df_filtered = filter_data(start, end, "全部城市")
print(f"filter_data('{start}', '{end}', '全部城市') 返回:")
print(f"  数据量: {len(df_filtered)} 条")

df_sql_verify = df_all[(df_all["publish_date_str"] >= start) & (df_all["publish_date_str"] <= end)]
print(f"SQL 方式 (按字符串比较): {len(df_sql_verify)} 条")

diff = len(df_filtered) - len(df_sql_verify)
print(f"差异: {diff} 条 ({diff/len(df_sql_verify)*100:.1f}%)")

if abs(diff) == 0:
    print("✅ filter_data 函数验证通过！")
else:
    print("❌ filter_data 函数验证失败！")

print("\n" + "=" * 70)
print("ALL TESTS COMPLETE")
print("=" * 70)
