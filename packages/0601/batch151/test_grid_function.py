import data_generator
import pandas as pd
import numpy as np

# 测试 get_grid_heatmap_data 函数
df, hospitals_df = data_generator.generate_orders(num_orders=1000)

# 选择一个医院进行测试
hospital = hospitals_df.iloc[0]
print(f'测试医院: {hospital["hospital_name"]} ({hospital["hospital_id"]})')
print(f'医院坐标: {hospital["lat"]:.4f}, {hospital["lon"]:.4f}')

# 测试网格函数
grid_df = data_generator.get_grid_heatmap_data(df, hospital['lat'], hospital['lon'], grid_size_meters=500)
print(f'\n网格数据形状: {grid_df.shape}')
print(f'网格列名: {grid_df.columns.tolist()}')
print(f'总订单数: {grid_df["order_count"].sum()}')
print(f'有订单的网格数: {(grid_df["order_count"] > 0).sum()}')
print(f'\n网格数据前5行:')
print(grid_df[grid_df['order_count'] > 0].head())

# 验证网格数量是否为 11x11 = 121
assert grid_df.shape == (121, 3), f"网格数量应为 121, 实际为 {grid_df.shape[0]}"
assert set(grid_df.columns) == {'grid_lat', 'grid_lon', 'order_count'}, "列名不正确"

print('\n✅ get_grid_heatmap_data 函数测试通过!')

# 测试 app 导入
print('\n测试 app 导入...')
import app
print('✅ app 导入成功!')

# 测试 order_lat 和 order_lon 是否存在
print(f'\n订单数据列名: {df.columns.tolist()}')
assert 'order_lat' in df.columns, "缺少 order_lat 列"
assert 'order_lon' in df.columns, "缺少 order_lon 列"
print('✅ order_lat 和 order_lon 列存在!')
