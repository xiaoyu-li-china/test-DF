#!/usr/bin/env python3
import argparse
import csv
import re
import sys

from database import get_connection, insert_book, list_books
from lookup import lookup_isbn
from scanner import scan_folder, scan_from_camera, scan_from_image

_SHELF_PATTERN = re.compile(r"^[A-Za-z]-\d{2}-\d{2}$")


def _validate_shelf(shelf: str) -> str:
    if not _SHELF_PATTERN.match(shelf):
        print(f"错误: 货架号 '{shelf}' 格式不正确，应为 A-03-12 格式")
        sys.exit(1)
    return shelf


def _parse_price(price_str: str, field: str) -> float:
    try:
        return float(price_str)
    except ValueError:
        print(f"错误: {field} '{price_str}' 不是有效数字")
        sys.exit(1)


def _print_book(book: dict) -> None:
    print(f"  ISBN:      {book['isbn']}")
    print(f"  书名:      {book['title']}")
    print(f"  作者:      {book['authors']}")
    print(f"  出版社:    {book['publishers']}")
    print(f"  出版日期:  {book['publish_date']}")
    print(f"  页数:      {book['pages']}")
    if book.get("cost_price"):
        print(f"  进货价:    ¥{book['cost_price']:.2f}")
    if book.get("sell_price"):
        print(f"  售价:      ¥{book['sell_price']:.2f}")
    if book.get("shelf"):
        print(f"  货架:      {book['shelf']}")
    if book.get("cover_url"):
        print(f"  封面:      {book['cover_url']}")


def _process_isbn(isbn: str, conn, dry_run: bool, extra: dict | None = None) -> bool:
    print(f"ISBN: {isbn}，正在查询 Open Library...")
    book = lookup_isbn(isbn)
    if not book:
        print(f"  ⚠️  Open Library 未找到 ISBN {isbn} 的信息")
        return False

    if extra:
        book.update(extra)

    print("\n📚 查询结果:")
    _print_book(book)

    if dry_run:
        print("  [DRY-RUN] 预览模式，未写入数据库\n")
        return True

    row_id = insert_book(conn, book)
    print(f"  ✅ 已写入数据库 (row id={row_id})\n")
    return True


def cmd_scan(args) -> None:
    extra = {}
    if args.cost:
        extra["cost_price"] = _parse_price(args.cost, "进货价")
    if args.price:
        extra["sell_price"] = _parse_price(args.price, "售价")
    if args.shelf:
        extra["shelf"] = _validate_shelf(args.shelf)

    conn = None if args.dry_run else get_connection(args.db)

    if args.folder:
        results = scan_folder(args.folder)
        success = 0
        print(f"扫描文件夹 {args.folder}，共 {len(results)} 张图片\n")
        for path, isbn in results:
            print(f"[{path.split('/')[-1]}]")
            if isbn:
                if _process_isbn(isbn, conn, args.dry_run, extra):
                    success += 1
            else:
                print("  ❌ 未能识别 ISBN 条码\n")
        print(f"完成：{success}/{len(results)} 张成功")
        if conn:
            conn.close()
        return

    isbn = None
    if args.image:
        isbn = scan_from_image(args.image)
        if not isbn:
            print(f"未能从图片 {args.image} 中识别 ISBN 条码")
            sys.exit(1)
    elif args.camera:
        isbn = scan_from_camera()
        if not isbn:
            print("未能从摄像头中识别 ISBN 条码")
            sys.exit(1)
    elif args.isbn:
        isbn = args.isbn

    if not isbn:
        print("请提供 --image、--camera、--folder 或直接传入 ISBN")
        sys.exit(1)

    _process_isbn(isbn, conn, args.dry_run, extra)
    if conn:
        conn.close()


def cmd_list(args) -> None:
    conn = get_connection(args.db)
    books = list_books(conn)
    conn.close()
    if not books:
        print("数据库中暂无图书记录")
        return
    print(f"共 {len(books)} 本书记录:\n")
    for i, b in enumerate(books, 1):
        print(f"#{i}")
        _print_book(b)
        print()


def cmd_export(args) -> None:
    conn = get_connection(args.db)
    books = list_books(conn)
    conn.close()
    if not books:
        print("数据库中暂无图书记录")
        return

    if args.format == "csv":
        fieldnames = [
            "id", "isbn", "title", "authors", "publishers", "publish_date",
            "pages", "cover_url", "cost_price", "sell_price", "shelf", "added_at",
        ]
        with open(args.output, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(books)
        print(f"已导出 {len(books)} 条记录到 {args.output}")


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="bookscan",
        description="二手书店 ISBN 扫码入库工具",
    )
    sub = parser.add_subparsers(dest="command")

    scan_p = sub.add_parser("scan", help="扫码/查询/入库")
    scan_p.add_argument("--image", help="从图片文件扫码 ISBN")
    scan_p.add_argument("--camera", action="store_true", help="打开摄像头扫码 ISBN")
    scan_p.add_argument("--folder", help="批量扫描文件夹中的所有图片")
    scan_p.add_argument("isbn", nargs="?", help="直接传入 ISBN 号")
    scan_p.add_argument("--cost", help="进货价，例如 --cost 12.5")
    scan_p.add_argument("--price", help="售价，例如 --price 25")
    scan_p.add_argument("--shelf", help="货架号，格式 A-03-12")
    scan_p.add_argument("--dry-run", action="store_true", help="仅预览，不写入数据库")
    scan_p.add_argument("--db", help="SQLite 数据库路径 (默认 ./books.db)")
    scan_p.set_defaults(func=cmd_scan)

    list_p = sub.add_parser("list", help="列出数据库中的所有图书")
    list_p.add_argument("--db", help="SQLite 数据库路径 (默认 ./books.db)")
    list_p.set_defaults(func=cmd_list)

    export_p = sub.add_parser("export", help="导出库存数据用于盘点")
    export_p.add_argument("--format", default="csv", choices=["csv"], help="导出格式 (默认 csv)")
    export_p.add_argument("-o", "--output", default="inventory.csv", help="输出文件名 (默认 inventory.csv)")
    export_p.add_argument("--db", help="SQLite 数据库路径 (默认 ./books.db)")
    export_p.set_defaults(func=cmd_export)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)
    args.func(args)


if __name__ == "__main__":
    main()
