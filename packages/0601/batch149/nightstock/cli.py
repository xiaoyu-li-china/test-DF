import os
from datetime import date
import click
from tabulate import tabulate
from .db import (
    add_purchase, add_sale, get_all_stock, get_profit,
    get_purchases, get_sales, get_stock_by_name, export_csv,
    add_stock_check, get_stock_check, ocr_receipt,
    get_weekly_report, send_wechat_work_webhook,
    save_wechat_config, load_wechat_config
)


STALL_OPT = click.option(
    "--stall-id", default="default", show_default=True, help="摊位 ID"
)


@click.group()
def cli():
    """夜市摆摊库存和毛利管理工具"""
    pass


@cli.command()
@click.argument("name")
@click.argument("quantity", type=int)
@click.argument("price", type=float)
@click.option("-s", "--supplier", default="", help="供应商")
@STALL_OPT
def buy(name, quantity, price, supplier, stall_id):
    """记录进货: buy 品名 数量 单价 [-s 供应商] [--stall-id ID]"""
    add_purchase(name, quantity, price, supplier, stall_id)
    click.echo(f"✓ 已进货: {name} x{quantity} @ ¥{price:.2f}")
    if supplier:
        click.echo(f"  供应商: {supplier}")
    if stall_id != "default":
        click.echo(f"  摊位: {stall_id}")


@cli.command()
@click.argument("name")
@click.argument("quantity", type=int)
@click.argument("price", type=float)
@STALL_OPT
def sell(name, quantity, price, stall_id):
    """记录销售: sell 品名 数量 售价 [--stall-id ID]"""
    success, msg = add_sale(name, quantity, price, stall_id)
    if success:
        click.echo(f"✓ 已销售: {name} x{quantity} @ ¥{price:.2f}")
        if stall_id != "default":
            click.echo(f"  摊位: {stall_id}")
    else:
        click.echo(f"✗ {msg}", err=True)


@cli.command()
@click.option("--export", "export_fmt", type=click.Choice(["csv"]), help="导出格式")
@STALL_OPT
def stock(export_fmt, stall_id):
    """查看当前库存 [--stall-id ID]"""
    items = get_all_stock(stall_id)
    if not items:
        click.echo("库存为空")
        return

    headers = ["品名", "数量", "成本单价", "库存总值"]
    table = [(name, qty, f"¥{cost:.2f}", f"¥{qty*cost:.2f}")
             for name, qty, cost in items]

    if export_fmt == "csv":
        csv_rows = [(name, qty, f"{cost:.2f}", f"{qty*cost:.2f}")
                    for name, qty, cost in items]
        suffix = f"_{stall_id}" if stall_id != "default" else ""
        filename = f"nightstock_stock_{date.today().isoformat()}{suffix}.csv"
        export_csv(filename, headers, csv_rows)
        click.echo(f"✓ 已导出: {filename}")
        return

    if stall_id != "default":
        click.echo(f"摊位: {stall_id}")
    click.echo(tabulate(table, headers=headers, tablefmt="simple"))
    total_value = sum(qty * cost for _, qty, cost in items)
    click.echo(f"\n库存总价值: ¥{total_value:.2f}")


@cli.command()
@click.option("-d", "--date", "target_date", help="查询指定日期 (YYYY-MM-DD)")
@click.option("--export", "export_fmt", type=click.Choice(["csv"]), help="导出格式")
@STALL_OPT
def profit(target_date, export_fmt, stall_id):
    """查看毛利 [--date 日期] [--stall-id ID]"""
    details, revenue, cost, profit_val = get_profit(target_date, stall_id)

    date_label = target_date or date.today().isoformat()
    headers = ["品名", "数量", "售价", "成本", "毛利"]

    if export_fmt == "csv":
        csv_rows = [(name, qty, f"{price:.2f}", f"{cost_p:.2f}", f"{p:.2f}")
                    for name, qty, price, cost_p, p in details]
        csv_rows.append(("合计", "", "", f"{revenue:.2f}", f"{profit_val:.2f}"))
        suffix = f"_{stall_id}" if stall_id != "default" else ""
        filename = f"nightstock_profit_{date_label}{suffix}.csv"
        export_csv(filename, headers, csv_rows)
        click.echo(f"✓ 已导出: {filename}")
        return

    stall_label = f" (摊位: {stall_id})" if stall_id != "default" else ""
    click.echo(f"=== {date_label}{stall_label} 销售明细 ===")
    if not details:
        click.echo("暂无销售记录")
    else:
        table = [(name, qty, f"¥{price:.2f}", f"¥{cost_p:.2f}", f"¥{p:.2f}")
                 for name, qty, price, cost_p, p in details]
        click.echo(tabulate(table, headers=headers, tablefmt="simple"))

    click.echo(f"\n=== {date_label} 汇总 ===")
    click.echo(f"总营收: ¥{revenue:.2f}")
    click.echo(f"总成本: ¥{cost:.2f}")
    click.echo(f"毛  利: ¥{profit_val:.2f}")


@cli.command()
@click.option("-d", "--date", "target_date", help="查询指定日期 (YYYY-MM-DD)")
@click.option("--export", "export_fmt", type=click.Choice(["csv"]), help="导出格式")
@STALL_OPT
def buys(target_date, export_fmt, stall_id):
    """查看进货记录 [--date 日期] [--stall-id ID]"""
    rows = get_purchases(target_date, stall_id)
    if not rows:
        click.echo("暂无进货记录")
        return

    headers = ["品名", "数量", "单价", "供应商", "日期"]

    if export_fmt == "csv":
        csv_rows = [(name, qty, f"{price:.2f}", supplier or "", d)
                    for name, qty, price, supplier, d in rows]
        suffix = f"_{stall_id}" if stall_id != "default" else ""
        filename = f"nightstock_buys_{target_date or date.today().isoformat()}{suffix}.csv"
        export_csv(filename, headers, csv_rows)
        click.echo(f"✓ 已导出: {filename}")
        return

    if stall_id != "default":
        click.echo(f"摊位: {stall_id}")
    table = [(name, qty, f"¥{price:.2f}", supplier or "-", d)
             for name, qty, price, supplier, d in rows]
    click.echo(tabulate(table, headers=headers, tablefmt="simple"))


@cli.command()
@click.option("-d", "--date", "target_date", help="查询指定日期 (YYYY-MM-DD)")
@click.option("--export", "export_fmt", type=click.Choice(["csv"]), help="导出格式")
@STALL_OPT
def sells(target_date, export_fmt, stall_id):
    """查看销售记录 [--date 日期] [--stall-id ID]"""
    rows = get_sales(target_date, stall_id)
    if not rows:
        click.echo("暂无销售记录")
        return

    headers = ["品名", "数量", "售价", "成本", "日期"]

    if export_fmt == "csv":
        csv_rows = [(name, qty, f"{price:.2f}", f"{cost_p:.2f}", d)
                    for name, qty, price, cost_p, d in rows]
        suffix = f"_{stall_id}" if stall_id != "default" else ""
        filename = f"nightstock_sells_{target_date or date.today().isoformat()}{suffix}.csv"
        export_csv(filename, headers, csv_rows)
        click.echo(f"✓ 已导出: {filename}")
        return

    if stall_id != "default":
        click.echo(f"摊位: {stall_id}")
    table = [(name, qty, f"¥{price:.2f}", f"¥{cost_p:.2f}", d)
             for name, qty, price, cost_p, d in rows]
    click.echo(tabulate(table, headers=headers, tablefmt="simple"))


@cli.command("check")
@click.option("-n", "--name", multiple=True, help="逐个盘点: -n 烤肠 -n 可乐")
@click.option("-a", "--actual", multiple=True, type=int, help="对应实盘数量")
@click.option("-d", "--date", "target_date", help="指定盘点日期")
@click.option("-i", "--interactive", is_flag=True, help="交互式盘点")
@STALL_OPT
def stock_check_cmd(name, actual, target_date, interactive, stall_id):
    """收摊盘点: 对比账面库存和实盘 [--stall-id ID]"""
    stock = get_all_stock(stall_id)
    stock_map = {n: q for n, q, _ in stock}

    if interactive:
        click.echo(f"=== 交互式盘点 (摊位: {stall_id}) ===")
        for n, expected in stock_map.items():
            a = click.prompt(f"{n} (账面 {expected})", type=int)
            diff = add_stock_check(n, expected, a, target_date, stall_id)
            sign = "+" if diff > 0 else ""
            click.echo(f"  {n}: {expected} → {a} ({sign}{diff})")
        return

    if name and actual:
        if len(name) != len(actual):
            click.echo("✗ 品名和数量不匹配", err=True)
            return
        for n, a in zip(name, actual):
            expected = stock_map.get(n, 0)
            diff = add_stock_check(n, expected, a, target_date, stall_id)
            sign = "+" if diff > 0 else ""
            click.echo(f"✓ {n}: {expected} → {a} ({sign}{diff})")
        return

    rows = get_stock_check(target_date, stall_id)
    if not rows:
        click.echo("暂无盘点记录")
        click.echo("\n用法:")
        click.echo("  交互式: ns check -i")
        click.echo("  批量:   ns check -n 烤肠 -a 30 -n 可乐 -a 20")
        return

    if stall_id != "default":
        click.echo(f"摊位: {stall_id}")
    table = [(n, e, a, f"+{d}" if d > 0 else str(d)) for n, e, a, d in rows]
    headers = ["品名", "账面", "实盘", "差异"]
    click.echo(tabulate(table, headers=headers, tablefmt="simple"))
    total_diff = sum(d for _, _, _, d in rows)
    click.echo(f"\n总差异: {total_diff}")


@cli.command()
@click.argument("image_path", type=click.Path(exists=True))
@click.option("-s", "--supplier", default="", help="供应商")
@click.option("-y", "--yes", is_flag=True, help="直接确认录入")
@STALL_OPT
def ocr(image_path, supplier, yes, stall_id):
    """小票OCR识别进货 [--stall-id ID]"""
    items = ocr_receipt(image_path)
    if items is None:
        click.echo("✗ 请安装 OCR 依赖: pip install nightstock[ocr]")
        return
    if not items:
        click.echo("✗ 未识别到商品")
        return

    click.echo("=== 识别结果 ===")
    for i, item in enumerate(items, 1):
        click.echo(f"{i}. {item['name']} x{item['quantity']} @ ¥{item['price']:.2f}")

    if yes or click.confirm("确认录入？"):
        for item in items:
            add_purchase(item["name"], item["quantity"], item["price"], supplier, stall_id)
        click.echo(f"✓ 已录入 {len(items)} 条进货记录")


@cli.command()
@click.option("--webhook", help="企业微信机器人 Webhook URL")
@click.option("--save", is_flag=True, help="保存 Webhook 配置")
@click.option("--dry-run", is_flag=True, help="只显示不推送")
@STALL_OPT
def report(webhook, save, dry_run, stall_id):
    """生成周报并推送企业微信 [--stall-id ID]"""
    if save and webhook:
        save_wechat_config(webhook)
        click.echo("✓ Webhook 已保存")

    cfg = load_wechat_config()
    hook_url = webhook or (cfg.get("webhook") if cfg else None)

    r = get_weekly_report(stall_id)
    daily_md = "\n".join(
        f"> {d}: 营收 ¥{v['revenue']:.0f} / 成本 ¥{v['cost']:.0f} / 毛利 ¥{v['revenue']-v['cost']:.0f}"
        for d, v in sorted(r["daily"].items())
    )
    stall_label = f" (摊位: {stall_id})" if stall_id != "default" else ""
    md = f"""### 夜市周报 ({r['start']} ~ {r['end']}){stall_label}

**核心指标**
| 指标 | 数值 |
|------|------|
| 总营收 | ¥{r['total_revenue']:.0f} |
| 总成本 | ¥{r['total_cost']:.0f} |
| **毛利** | **¥{r['total_profit']:.0f}** |
| 进货笔数 | {r['purchase_count']} |
| 销售笔数 | {r['sales_count']} |

**每日明细**
{daily_md}

💡 累计投入进货成本 ¥{r['total_purchase_cost']:.0f}
"""

    if dry_run or not hook_url:
        click.echo(md)
        return

    ok, msg = send_wechat_work_webhook(hook_url, md)
    if ok:
        click.echo("✓ 已推送到企业微信")
    else:
        click.echo(f"✗ 推送失败: {msg}")


if __name__ == "__main__":
    cli()
