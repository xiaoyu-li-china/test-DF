import csv
import json
import sqlite3
import os
from datetime import datetime, date, timedelta
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

DB_PATH = Path.home() / ".nightstock" / "inventory.db"


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            supplier TEXT,
            stall_id TEXT NOT NULL DEFAULT 'default',
            date TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            cost_price REAL NOT NULL,
            stall_id TEXT NOT NULL DEFAULT 'default',
            date TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS stock_check (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            expected_qty INTEGER NOT NULL,
            actual_qty INTEGER NOT NULL,
            diff_qty INTEGER NOT NULL,
            stall_id TEXT NOT NULL DEFAULT 'default',
            date TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


def _has_column(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def get_connection():
    if not DB_PATH.exists():
        init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    if not _has_column(cursor, "purchases", "stall_id"):
        cursor.execute("ALTER TABLE purchases ADD COLUMN stall_id TEXT NOT NULL DEFAULT 'default'")
    if not _has_column(cursor, "sales", "stall_id"):
        cursor.execute("ALTER TABLE sales ADD COLUMN stall_id TEXT NOT NULL DEFAULT 'default'")

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='stock_check'")
    if not cursor.fetchone():
        cursor.execute("""
            CREATE TABLE stock_check (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                expected_qty INTEGER NOT NULL,
                actual_qty INTEGER NOT NULL,
                diff_qty INTEGER NOT NULL,
                stall_id TEXT NOT NULL DEFAULT 'default',
                date TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
    elif not _has_column(cursor, "stock_check", "stall_id"):
        cursor.execute("ALTER TABLE stock_check ADD COLUMN stall_id TEXT NOT NULL DEFAULT 'default'")

    conn.commit()
    return conn


def add_purchase(name, quantity, price, supplier, stall_id="default"):
    conn = get_connection()
    cursor = conn.cursor()
    today = date.today().isoformat()
    now = datetime.now().isoformat()
    cursor.execute(
        "INSERT INTO purchases (name, quantity, price, supplier, stall_id, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (name, quantity, price, supplier, stall_id, today, now)
    )
    conn.commit()
    conn.close()


def add_sale(name, quantity, price, stall_id="default"):
    conn = get_connection()
    cursor = conn.cursor()

    stock = get_stock_by_name(name, stall_id)
    if stock < quantity:
        conn.close()
        return False, f"库存不足！当前 {name} 库存: {stock}"

    cost_price = get_avg_cost_price(name, stall_id)
    today = date.today().isoformat()
    now = datetime.now().isoformat()
    cursor.execute(
        "INSERT INTO sales (name, quantity, price, cost_price, stall_id, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (name, quantity, price, cost_price, stall_id, today, now)
    )
    conn.commit()
    conn.close()
    return True, "销售记录已添加"


def get_stock_by_name(name, stall_id="default"):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COALESCE(p.total, 0) - COALESCE(s.total, 0)
        FROM (SELECT SUM(quantity) AS total FROM purchases WHERE name = ? AND stall_id = ?) p,
             (SELECT SUM(quantity) AS total FROM sales WHERE name = ? AND stall_id = ?) s
    """, (name, stall_id, name, stall_id))
    result = cursor.fetchone()[0]
    conn.close()
    return result


def get_avg_cost_price(name, stall_id="default"):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT CASE WHEN SUM(quantity) > 0
            THEN SUM(quantity * price) * 1.0 / SUM(quantity)
            ELSE 0 END
        FROM purchases WHERE name = ? AND stall_id = ?
    """, (name, stall_id))
    result = cursor.fetchone()[0]
    conn.close()
    return result if result else 0


def get_all_stock(stall_id="default"):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            p.name,
            COALESCE(p.total_qty, 0) - COALESCE(s.total_qty, 0) AS stock,
            CASE WHEN p.total_qty > 0
                THEN p.total_cost * 1.0 / p.total_qty
                ELSE 0 END AS avg_cost
        FROM (
            SELECT name, SUM(quantity) AS total_qty, SUM(quantity * price) AS total_cost
            FROM purchases WHERE stall_id = ?
            GROUP BY name
        ) p
        LEFT JOIN (
            SELECT name, SUM(quantity) AS total_qty
            FROM sales WHERE stall_id = ?
            GROUP BY name
        ) s ON p.name = s.name
        WHERE COALESCE(p.total_qty, 0) - COALESCE(s.total_qty, 0) > 0
        ORDER BY p.name
    """, (stall_id, stall_id))
    rows = cursor.fetchall()
    conn.close()
    return [(name, int(qty), cost) for name, qty, cost in rows]


def get_profit(target_date=None, stall_id="default"):
    if target_date is None:
        target_date = date.today().isoformat()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT name, quantity, price, cost_price FROM sales WHERE date = ? AND stall_id = ?",
        (target_date, stall_id)
    )
    sales = cursor.fetchall()
    conn.close()

    total_revenue = 0
    total_cost = 0
    details = []

    for name, qty, price, cost_price in sales:
        revenue = qty * price
        cost = qty * cost_price
        profit = revenue - cost
        total_revenue += revenue
        total_cost += cost
        details.append((name, qty, price, cost_price, profit))

    return details, total_revenue, total_cost, total_revenue - total_cost


def get_purchases(target_date=None, stall_id="default"):
    conn = get_connection()
    cursor = conn.cursor()

    if target_date:
        cursor.execute(
            "SELECT name, quantity, price, supplier, date FROM purchases WHERE date = ? AND stall_id = ? ORDER BY created_at",
            (target_date, stall_id)
        )
    else:
        cursor.execute(
            "SELECT name, quantity, price, supplier, date FROM purchases WHERE stall_id = ? ORDER BY created_at",
            (stall_id,)
        )

    rows = cursor.fetchall()
    conn.close()
    return rows


def get_sales(target_date=None, stall_id="default"):
    conn = get_connection()
    cursor = conn.cursor()

    if target_date:
        cursor.execute(
            "SELECT name, quantity, price, cost_price, date FROM sales WHERE date = ? AND stall_id = ? ORDER BY created_at",
            (target_date, stall_id)
        )
    else:
        cursor.execute(
            "SELECT name, quantity, price, cost_price, date FROM sales WHERE stall_id = ? ORDER BY created_at",
            (stall_id,)
        )

    rows = cursor.fetchall()
    conn.close()
    return rows


def export_csv(filepath, headers, rows):
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)


def add_stock_check(name, expected_qty, actual_qty, target_date=None, stall_id="default"):
    if target_date is None:
        target_date = date.today().isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    diff = actual_qty - expected_qty
    cursor.execute(
        """INSERT INTO stock_check (name, expected_qty, actual_qty, diff_qty, stall_id, date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (name, expected_qty, actual_qty, diff, stall_id, target_date, now)
    )
    conn.commit()
    conn.close()
    return diff


def get_stock_check(target_date=None, stall_id="default"):
    if target_date is None:
        target_date = date.today().isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT name, expected_qty, actual_qty, diff_qty
           FROM stock_check WHERE date = ? AND stall_id = ? ORDER BY created_at""",
        (target_date, stall_id)
    )
    rows = cursor.fetchall()
    conn.close()
    return rows


def ocr_receipt(image_path):
    try:
        import pytesseract
        from PIL import Image
        import re

        text = pytesseract.image_to_string(Image.open(image_path), lang="chi_sim+eng")
        items = []
        for line in text.split("\n"):
            m = re.search(r"([\u4e00-\u9fa5a-zA-Z]+).*?(\d+).*?([\d.]+)", line)
            if m:
                name, qty, price = m.group(1), int(m.group(2)), float(m.group(3))
                if 1 <= qty <= 1000 and 0.5 <= price <= 100:
                    items.append({"name": name, "quantity": qty, "price": price})
        return items
    except ImportError:
        return None
    except Exception as e:
        return []


def get_weekly_report(stall_id="default"):
    end = date.today()
    start = end - timedelta(days=7)
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """SELECT date, name, quantity, price, cost_price FROM sales
           WHERE date >= ? AND date <= ? AND stall_id = ? ORDER BY date""",
        (start.isoformat(), end.isoformat(), stall_id)
    )
    sales = cursor.fetchall()

    cursor.execute(
        """SELECT date, name, quantity, price FROM purchases
           WHERE date >= ? AND date <= ? AND stall_id = ? ORDER BY date""",
        (start.isoformat(), end.isoformat(), stall_id)
    )
    purchases = cursor.fetchall()
    conn.close()

    daily_profit = {}
    for d, _, qty, price, cost in sales:
        if d not in daily_profit:
            daily_profit[d] = {"revenue": 0, "cost": 0}
        daily_profit[d]["revenue"] += qty * price
        daily_profit[d]["cost"] += qty * cost

    total_revenue = sum(v["revenue"] for v in daily_profit.values())
    total_cost = sum(v["cost"] for v in daily_profit.values())
    total_purchase = sum(qty * price for _, _, qty, price in purchases)

    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "sales_count": len(sales),
        "purchase_count": len(purchases),
        "total_revenue": total_revenue,
        "total_cost": total_cost,
        "total_profit": total_revenue - total_cost,
        "total_purchase_cost": total_purchase,
        "daily": daily_profit
    }


def send_wechat_work_webhook(webhook_url, content):
    if requests is None:
        return False, "需要安装 requests: pip install requests"
    try:
        resp = requests.post(
            webhook_url,
            json={"msgtype": "markdown", "markdown": {"content": content}},
            timeout=10
        )
        return resp.status_code == 200, resp.text
    except Exception as e:
        return False, str(e)


WECHAT_CONFIG = Path.home() / ".nightstock" / "wechat.json"


def save_wechat_config(webhook_url):
    WECHAT_CONFIG.parent.mkdir(parents=True, exist_ok=True)
    with open(WECHAT_CONFIG, "w") as f:
        json.dump({"webhook": webhook_url}, f)


def load_wechat_config():
    if WECHAT_CONFIG.exists():
        with open(WECHAT_CONFIG) as f:
            return json.load(f)
    return None
