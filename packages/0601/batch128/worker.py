import os
import sys
import time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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
