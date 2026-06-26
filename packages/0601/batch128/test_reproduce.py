import os
import sys
import multiprocessing
import time

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pottery_inventory.db')

if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
    print("旧数据库已删除")

from database import init_db, add_material, add_transaction, get_material_by_id, search_materials

init_db()

print("\n" + "="*60)
print("测试 1: 并发出库")
print("="*60)

mat_id = add_material("测试泥", "泥料", "kg", 2)
add_transaction(mat_id, "入库", 10, "测试员")

mat = get_material_by_id(mat_id)
print(f"初始库存: {mat['quantity']} kg")

def worker(mid, qty, worker_name, delay):
    time.sleep(delay)
    try:
        add_transaction(mid, "出库", qty, worker_name)
        print(f"{worker_name} 出库 {qty} kg 完成")
    except Exception as e:
        print(f"{worker_name} 出错: {e}")

p1 = multiprocessing.Process(target=worker, args=(mat_id, 3, "窗口1", 0.1))
p2 = multiprocessing.Process(target=worker, args=(mat_id, 3, "窗口2", 0.1))

p1.start()
p2.start()
p1.join()
p2.join()

time.sleep(0.5)
mat = get_material_by_id(mat_id)
print(f"\n最终库存: {mat['quantity']} kg")
print(f"预期库存: 4.0 kg (10 - 3 - 3)")
print(f"结果: {'✓ 正确' if mat['quantity'] == 4.0 else '✗ 错误! 存在并发问题'}")

print("\n" + "="*60)
print("测试 2: 搜索匹配")
print("="*60)

mat2_id = add_material("高白泥（25kg）", "泥料", "袋", 0)
print(f"已添加物料: 高白泥（25kg）")

result1 = search_materials("高白泥", "")
print(f"\n搜索 '高白泥'，找到 {len(result1)} 条结果:")
for r in result1:
    print(f"  - {r['name']}")
print(f"结果: {'✓ 正确' if len(result1) == 1 else '✗ 错误! 搜索不到'}")

result2 = search_materials("高白泥（25kg）", "")
print(f"\n搜索 '高白泥（25kg）'，找到 {len(result2)} 条结果:")
for r in result2:
    print(f"  - {r['name']}")

print("\n" + "="*60)
print("测试完成")
print("="*60)
