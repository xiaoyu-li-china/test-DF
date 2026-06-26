import os
import sys
import subprocess
import time

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pottery_inventory.db')

if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

from database import init_db, add_material, add_transaction, get_material_by_id

init_db()

print("="*60)
print("测试: 并发出库")
print("="*60)

mat_id = add_material("测试泥", "泥料", "kg", 2)
add_transaction(mat_id, "入库", 10, "测试员")
mat = get_material_by_id(mat_id)
print(f"初始库存: {mat['quantity']} kg")

p1 = subprocess.Popen([sys.executable, 'worker.py', str(mat_id), '3', '窗口1', '0.1'])
p2 = subprocess.Popen([sys.executable, 'worker.py', str(mat_id), '3', '窗口2', '0.1'])

p1.wait()
p2.wait()

time.sleep(0.3)
mat = get_material_by_id(mat_id)
print(f"\n最终库存: {mat['quantity']} kg")
print(f"预期库存: 4.0 kg (10 - 3 - 3)")
print(f"结果: {'✓ 正确' if mat['quantity'] == 4.0 else '✗ 错误! 存在并发问题'}")
