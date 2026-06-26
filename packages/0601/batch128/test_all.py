import os
import subprocess
from datetime import datetime

if os.path.exists('pottery_inventory.db'):
    os.remove('pottery_inventory.db')

from database import (
    init_db, migrate_db, add_material, add_transaction,
    search_materials, get_material_by_barcode, export_monthly_report
)

print("=" * 60)
print("测试 1: 数据库初始化和迁移")
print("=" * 60)
init_db()
migrate_db()
print("✓ 数据库初始化完成")

print("\n" + "=" * 60)
print("测试 2: 添加物料（含条码、批次、温度）")
print("=" * 60)
mid = add_material('高白泥（25kg）', '泥料', '袋', 2, '6901234567890', 'Y2026A01', 1230)
print(f"✓ 添加物料 ID={mid}")

print("\n" + "=" * 60)
print("测试 3: 入库（关联批次和温度）")
print("=" * 60)
add_transaction(mid, '入库', 50, '测试员', batch_number='Y2026A01', firing_temp=1230)
print("✓ 入库 50 袋")

print("\n" + "=" * 60)
print("测试 4: 条码查询")
print("=" * 60)
mat = get_material_by_barcode('6901234567890')
print(f"✓ 条码查询: {mat['name']}, 库存={mat['quantity']}")

print("\n" + "=" * 60)
print("测试 5: 搜索「高白泥」（含空格处理）")
print("=" * 60)
for kw in ['高白泥', '高白泥 ', ' 高白泥', ' 高白泥 ']:
    r = search_materials(kw, '')
    ok = len(r) == 1
    print(f"  搜索 '{kw}' → {len(r)} 条 {'✓' if ok else '✗'}")

print("\n" + "=" * 60)
print("测试 6: 出库（条码追溯）")
print("=" * 60)
add_transaction(mid, '出库', 3, '测试员', scan_barcode='6901234567890',
                batch_number='Y2026A01', client_id='测试机')
mat = get_material_by_barcode('6901234567890')
print(f"✓ 出库后库存: {mat['quantity']} (预期 47)")
assert mat['quantity'] == 47, f"库存错误: {mat['quantity']} != 47"

print("\n" + "=" * 60)
print("测试 7: 并发出库（原子更新）")
print("=" * 60)
result = subprocess.run(['python3', 'test_concurrency2.py'], capture_output=True, text=True)
print(result.stdout)
assert "✓ 正确" in result.stdout, "并发测试失败"

print("\n" + "=" * 60)
print("测试 8: 导出月报表")
print("=" * 60)
now = datetime.now()
path = export_monthly_report(now.year, now.month, '测试月报.csv')
print(f"✓ 报表导出: {path}")
assert os.path.exists(path), "报表文件不存在"

print("\n" + "=" * 60)
print("✅ 所有测试通过!")
print("=" * 60)

if os.path.exists('测试月报.csv'):
    os.remove('测试月报.csv')
