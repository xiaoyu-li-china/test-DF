import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import os
import csv

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pottery_inventory.db')

MATERIAL_TYPES = ['泥料', '釉料', '成品']


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            material_type TEXT NOT NULL,
            quantity REAL NOT NULL DEFAULT 0,
            unit TEXT NOT NULL,
            low_stock_threshold REAL NOT NULL DEFAULT 0,
            barcode TEXT,
            batch_number TEXT,
            firing_temp REAL,
            expiry_date TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            material_id INTEGER NOT NULL,
            transaction_type TEXT NOT NULL,
            quantity REAL NOT NULL,
            operator TEXT NOT NULL,
            note TEXT,
            scan_barcode TEXT,
            batch_number TEXT,
            firing_temp REAL,
            client_id TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (material_id) REFERENCES materials (id)
        )
    ''')

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(material_type)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_materials_barcode ON materials(barcode)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_transactions_material_id ON transactions(material_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)')

    conn.commit()
    conn.close()


def migrate_db():
    conn = get_connection()
    cursor = conn.cursor()

    existing_cols = [row[1] for row in cursor.execute("PRAGMA table_info(materials)").fetchall()]
    new_cols_materials = [
        ('barcode', 'TEXT'),
        ('batch_number', 'TEXT'),
        ('firing_temp', 'REAL'),
        ('expiry_date', 'TEXT'),
    ]
    for col_name, col_type in new_cols_materials:
        if col_name not in existing_cols:
            cursor.execute(f'ALTER TABLE materials ADD COLUMN {col_name} {col_type}')

    existing_cols = [row[1] for row in cursor.execute("PRAGMA table_info(transactions)").fetchall()]
    new_cols_trans = [
        ('scan_barcode', 'TEXT'),
        ('batch_number', 'TEXT'),
        ('firing_temp', 'REAL'),
        ('client_id', 'TEXT'),
    ]
    for col_name, col_type in new_cols_trans:
        if col_name not in existing_cols:
            cursor.execute(f'ALTER TABLE transactions ADD COLUMN {col_name} {col_type}')

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(material_type)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_materials_barcode ON materials(barcode)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_transactions_material_id ON transactions(material_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)')

    conn.commit()
    conn.close()


def add_material(name: str, material_type: str, unit: str, low_stock_threshold: float = 0,
                 barcode: str = '', batch_number: str = '', firing_temp: float = None,
                 expiry_date: str = '') -> int:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    cursor.execute('''
        INSERT INTO materials (name, material_type, quantity, unit, low_stock_threshold,
                               barcode, batch_number, firing_temp, expiry_date, created_at, updated_at)
        VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (name, material_type, unit, low_stock_threshold,
          barcode or None, batch_number or None, firing_temp, expiry_date or None, now, now))

    material_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return material_id


def get_material_by_barcode(barcode: str) -> Optional[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM materials WHERE barcode = ?', (barcode.strip(),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_all_materials() -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM materials ORDER BY material_type, name')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_material_by_id(material_id: int) -> Optional[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM materials WHERE id = ?', (material_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def update_material(material_id: int, name: str, unit: str, low_stock_threshold: float,
                    barcode: str = '', batch_number: str = '', firing_temp: float = None,
                    expiry_date: str = ''):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    cursor.execute('''
        UPDATE materials 
        SET name = ?, unit = ?, low_stock_threshold = ?, barcode = ?, 
            batch_number = ?, firing_temp = ?, expiry_date = ?, updated_at = ?
        WHERE id = ?
    ''', (name, unit, low_stock_threshold, barcode or None, batch_number or None,
          firing_temp, expiry_date or None, now, material_id))

    conn.commit()
    conn.close()


def delete_material(material_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM transactions WHERE material_id = ?', (material_id,))
    cursor.execute('DELETE FROM materials WHERE id = ?', (material_id,))
    conn.commit()
    conn.close()


def add_transaction(material_id: int, transaction_type: str, quantity: float, operator: str,
                    note: str = '', scan_barcode: str = '', batch_number: str = '',
                    firing_temp: float = None, client_id: str = ''):
    conn = get_connection()
    conn.execute('BEGIN IMMEDIATE')
    cursor = conn.cursor()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if transaction_type == '入库':
        cursor.execute('''
            UPDATE materials SET quantity = quantity + ?, updated_at = ? WHERE id = ?
        ''', (quantity, now, material_id))
    else:
        cursor.execute('''
            UPDATE materials SET quantity = quantity - ?, updated_at = ? WHERE id = ? AND quantity >= ?
        ''', (quantity, now, material_id, quantity))

        if cursor.rowcount == 0:
            conn.rollback()
            conn.close()
            raise ValueError('库存不足')

    cursor.execute('''
        INSERT INTO transactions (material_id, transaction_type, quantity, operator, note,
                                  scan_barcode, batch_number, firing_temp, client_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (material_id, transaction_type, quantity, operator, note,
          scan_barcode or None, batch_number or None, firing_temp, client_id or None, now))

    conn.commit()
    conn.close()


def get_transactions(material_id: Optional[int] = None, start_date: str = '', end_date: str = '') -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()

    query = '''
        SELECT t.*, m.name as material_name, m.material_type, m.unit
        FROM transactions t
        JOIN materials m ON t.material_id = m.id
        WHERE 1=1
    '''
    params = []

    if material_id:
        query += ' AND t.material_id = ?'
        params.append(material_id)
    if start_date:
        query += ' AND t.created_at >= ?'
        params.append(start_date)
    if end_date:
        query += ' AND t.created_at <= ?'
        params.append(end_date + ' 23:59:59')

    query += ' ORDER BY t.created_at DESC LIMIT 500'

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def export_monthly_report(year: int, month: int, output_path: str) -> str:
    start_date = f'{year}-{month:02d}-01'
    if month == 12:
        end_date = f'{year + 1}-01-01'
    else:
        end_date = f'{year}-{month + 1:02d}-01'

    transactions = get_transactions(start_date=start_date, end_date=end_date)
    materials = get_all_materials()
    material_map = {m['id']: m for m in materials}

    with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)

        writer.writerow([f'{year}年{month}月 - 陶艺工作室库存月报表'])
        writer.writerow([])

        writer.writerow(['一、出入库明细'])
        writer.writerow(['时间', '物料名称', '类型', '数量', '单位', '操作员', '备注', '批次号', '烧制温度'])
        for t in transactions:
            writer.writerow([
                t['created_at'],
                t['material_name'],
                t['transaction_type'],
                t['quantity'],
                t['unit'],
                t['operator'],
                t['note'] or '',
                t['batch_number'] or '',
                t['firing_temp'] if t['firing_temp'] else '',
            ])

        writer.writerow([])
        writer.writerow(['二、当前库存汇总'])
        writer.writerow(['物料类型', '物料名称', '当前库存', '单位', '预警值', '条码', '批次号', '烧制温度'])
        for m in materials:
            writer.writerow([
                m['material_type'],
                m['name'],
                m['quantity'],
                m['unit'],
                m['low_stock_threshold'],
                m['barcode'] or '',
                m['batch_number'] or '',
                m['firing_temp'] if m['firing_temp'] else '',
            ])

        writer.writerow([])
        writer.writerow(['三、低库存预警'])
        low_stock = get_low_stock_materials()
        if low_stock:
            writer.writerow(['物料类型', '物料名称', '当前库存', '单位', '预警值'])
            for m in low_stock:
                writer.writerow([
                    m['material_type'],
                    m['name'],
                    m['quantity'],
                    m['unit'],
                    m['low_stock_threshold'],
                ])
        else:
            writer.writerow(['暂无低库存物料'])

    return output_path


def get_low_stock_materials() -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM materials 
        WHERE quantity <= low_stock_threshold AND low_stock_threshold > 0
        ORDER BY material_type, name
    ''')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def search_materials(keyword: str = '', material_type: str = '', barcode: str = '') -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()

    keyword = keyword.strip()
    barcode = barcode.strip()

    query = 'SELECT * FROM materials WHERE 1=1'
    params = []

    if barcode:
        query += ' AND barcode = ?'
        params.append(barcode)
    elif keyword:
        query += ' AND (name LIKE ? OR barcode LIKE ?)'
        params.append(f'%{keyword}%')
        params.append(f'%{keyword}%')

    if material_type and material_type != '全部':
        query += ' AND material_type = ?'
        params.append(material_type)

    query += ' ORDER BY material_type, name'

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
