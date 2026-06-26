import os
import sys
import subprocess
import time

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pottery_inventory.db')

if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

from database import init_db, add_material, add_transaction, get_material_by_id, search_materials

init_db()

print("="*60)
print("测试 1: 并发出库 (使用 subprocess 模拟独立进程)")
print("="*60)

mat_id = add_material("测试泥", "泥料", "kg", 2)
add_transaction(mat_id, "入库", 10, "测试员")
mat = get_material_by_id(mat_id)
print(f"初始库存: {mat['quantity']} kg")

worker_script = '''
import os
import sys
import time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import add_transaction

mid = int(sys.argv[1])
qty = float(sys.argv[2])
name = sys.argv[3]
delay = float(sys.argv[4])

time.sleep(delay)
try:
    add_transaction(mid, "出库", qty, name)
    print(f"{name} 完成")
except Exception as e:
    print(f"{name} 出错: {e}")
'''

with open('/tmp/worker.py', 'w') as f:
    f.write(worker_script)

p1 = subprocess.Popen([sys.executable, '/tmp/worker.py', str(mat_id), '3', '窗口1', '0.1'])
p2 = subprocess.Popen([sys.executable, '/tmp/worker.py', str(mat_id), '3', '窗口2', '0.1'])

p1.wait()
p2.wait()

time.sleep(0.3)
mat = get_material_by_id(mat_id)
print(f"\n最终库存: {mat['quantity']} kg")
print(f"预期库存: 4.0 kg (10 - 3 - 3)")
print(f"结果: {'✓ 正确' if mat['quantity'] == 4.0 else '✗ 错误! 存在并发问题'}")

print("\n" + "="*60)
print("测试 2: 搜索匹配 (模拟GUI输入)")
print("="*60)

os.remove(DB_PATH)
init_db()

mat2_id = add_material("高白泥（25kg）", "泥料", "袋", 0)
print(f"已添加物料: 高白泥（25kg）")

test_keywords = [
    "高白泥",
    "高白泥 ",
    " 高白泥",
    "高白",
    "泥",
    "25kg",
]

for kw in test_keywords:
    result = search_materials(kw, "")
    print(f"\n搜索 '{kw}' (repr={repr(kw)})，找到 {len(result)} 条:")
    for r in result:
        print(f"  ✓ {r['name']}")
    if not result:
        print(f"  ✗ 无结果")

print("\n" + "="*60)
print("测试 3: 检查SQLite LIKE对中文括号的支持")
print("="*60)

import sqlite3
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

test_cases = [
    ("%高白泥%",),
    ("%高白%",),
    ("%（25kg）%",),
]

for param in test_cases:
    cursor.execute("SELECT name FROM materials WHERE name LIKE ?", param)
    rows = cursor.fetchall()
    print(f"LIKE '{param[0]}': {[r[0] for r in rows]}")

conn.close()

print("\n" + "="*60)
print("测试完成")
print("="*60)
