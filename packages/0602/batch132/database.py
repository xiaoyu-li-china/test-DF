import sqlite3
from pathlib import Path

_DEFAULT_DB = Path(__file__).resolve().parent / "books.db"

_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS books (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    isbn        TEXT    NOT NULL UNIQUE,
    title       TEXT    NOT NULL DEFAULT '',
    authors     TEXT    NOT NULL DEFAULT '',
    publishers  TEXT    NOT NULL DEFAULT '',
    publish_date TEXT   NOT NULL DEFAULT '',
    pages       INTEGER NOT NULL DEFAULT 0,
    cover_url   TEXT    NOT NULL DEFAULT '',
    cost_price  REAL    NOT NULL DEFAULT 0,
    sell_price  REAL    NOT NULL DEFAULT 0,
    shelf       TEXT    NOT NULL DEFAULT '',
    added_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

_ALTER_COLUMNS = [
    ("cost_price", "REAL NOT NULL DEFAULT 0"),
    ("sell_price", "REAL NOT NULL DEFAULT 0"),
    ("shelf", "TEXT NOT NULL DEFAULT ''"),
]


def _migrate_schema(conn: sqlite3.Connection) -> None:
    cur = conn.execute("PRAGMA table_info(books)")
    existing = {row["name"] for row in cur.fetchall()}
    for col, definition in _ALTER_COLUMNS:
        if col not in existing:
            conn.execute(f"ALTER TABLE books ADD COLUMN {col} {definition}")
    conn.commit()


def get_connection(db_path: str | None = None) -> sqlite3.Connection:
    path = db_path or str(_DEFAULT_DB)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute(_CREATE_TABLE_SQL)
    _migrate_schema(conn)
    return conn


def insert_book(conn: sqlite3.Connection, book: dict) -> int:
    sql = """
    INSERT OR REPLACE INTO books
        (isbn, title, authors, publishers, publish_date, pages, cover_url,
         cost_price, sell_price, shelf)
    VALUES
        (:isbn, :title, :authors, :publishers, :publish_date, :pages, :cover_url,
         :cost_price, :sell_price, :shelf)
    """
    data = {
        "isbn": book["isbn"],
        "title": book.get("title", ""),
        "authors": book.get("authors", ""),
        "publishers": book.get("publishers", ""),
        "publish_date": book.get("publish_date", ""),
        "pages": book.get("pages", 0),
        "cover_url": book.get("cover_url", ""),
        "cost_price": book.get("cost_price", 0) or 0,
        "sell_price": book.get("sell_price", 0) or 0,
        "shelf": book.get("shelf", "") or "",
    }
    cur = conn.execute(sql, data)
    conn.commit()
    return cur.lastrowid


def list_books(conn: sqlite3.Connection) -> list[dict]:
    cur = conn.execute("SELECT * FROM books ORDER BY added_at DESC")
    return [dict(row) for row in cur.fetchall()]
