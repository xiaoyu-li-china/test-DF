from datetime import date
from unittest.mock import patch

import pytest

from nightstock import db
from nightstock.cli import cli


def test_stall_isolation():
    db.add_purchase("烤肠", 100, 1.5, "", stall_id="east")
    db.add_purchase("烤肠", 80, 1.4, "", stall_id="west")

    assert db.get_stock_by_name("烤肠", "east") == 100
    assert db.get_stock_by_name("烤肠", "west") == 80
    assert db.get_stock_by_name("烤肠") == 0

    east_stock = db.get_all_stock("east")
    west_stock = db.get_all_stock("west")
    default_stock = db.get_all_stock()

    assert len(east_stock) == 1
    assert east_stock[0][0] == "烤肠"
    assert east_stock[0][1] == 100
    assert abs(east_stock[0][2] - 1.5) < 0.01

    assert len(west_stock) == 1
    assert west_stock[0][0] == "烤肠"
    assert west_stock[0][1] == 80
    assert abs(west_stock[0][2] - 1.4) < 0.01

    assert len(default_stock) == 0


def test_stall_sell_reduces_correct_stock():
    db.add_purchase("可乐", 30, 2.0, "", stall_id="east")
    db.add_purchase("可乐", 50, 2.0, "", stall_id="west")

    ok, msg = db.add_sale("可乐", 20, 5.0, stall_id="east")
    assert ok is True

    assert db.get_stock_by_name("可乐", "east") == 10
    assert db.get_stock_by_name("可乐", "west") == 50


def test_stall_insufficient_stock():
    db.add_purchase("烤冷面", 10, 3.0, "", stall_id="east")

    ok, msg = db.add_sale("烤冷面", 20, 10.0, stall_id="east")
    assert ok is False
    assert "库存不足" in msg
    assert "10" in msg


def test_stall_profit_separate():
    db.add_purchase("臭豆腐", 40, 2.5, "", stall_id="east")
    db.add_sale("臭豆腐", 20, 6.0, stall_id="east")

    db.add_purchase("臭豆腐", 30, 3.0, "", stall_id="west")
    db.add_sale("臭豆腐", 10, 7.0, stall_id="west")

    _, east_rev, east_cost, east_profit = db.get_profit(stall_id="east")
    _, west_rev, west_cost, west_profit = db.get_profit(stall_id="west")
    _, def_rev, def_cost, def_profit = db.get_profit()

    assert east_profit == 20 * (6.0 - 2.5)
    assert west_profit == 10 * (7.0 - 3.0)
    assert def_profit == 0


def test_cli_stall_buy(cli_runner):
    result = cli_runner.invoke(
        cli, ["buy", "烤肠", "50", "1.5", "--stall-id", "east"]
    )
    assert result.exit_code == 0
    assert "摊位: east" in result.output

    items = db.get_all_stock("east")
    assert len(items) == 1
    assert items[0][0] == "烤肠"
    assert items[0][1] == 50


def test_cli_stall_stock(cli_runner):
    db.add_purchase("可乐", 30, 2.0, "", stall_id="west")

    result = cli_runner.invoke(cli, ["stock", "--stall-id", "west"])
    assert result.exit_code == 0
    assert "摊位: west" in result.output
    assert "可乐" in result.output
    assert "30" in result.output

    result = cli_runner.invoke(cli, ["stock"])
    assert result.exit_code == 0
    assert "摊位:" not in result.output
    assert "库存为空" in result.output or "可乐" not in result.output


def test_cli_stall_sell(cli_runner):
    db.add_purchase("烤冷面", 20, 3.0, "", stall_id="south")

    result = cli_runner.invoke(
        cli, ["sell", "烤冷面", "10", "10.0", "--stall-id", "south"]
    )
    assert result.exit_code == 0
    assert "摊位: south" in result.output

    assert db.get_stock_by_name("烤冷面", "south") == 10


def test_cli_stall_profit(cli_runner):
    db.add_purchase("臭豆腐", 40, 2.5, "", stall_id="east")
    db.add_sale("臭豆腐", 20, 6.0, stall_id="east")

    result = cli_runner.invoke(cli, ["profit", "--stall-id", "east"])
    assert result.exit_code == 0
    assert "摊位: east" in result.output
    assert "臭豆腐" in result.output
    assert "70" in result.output


def test_stall_purchases_sales_records():
    db.add_purchase("烤肠", 50, 1.5, "批发A", stall_id="east")
    db.add_purchase("烤肠", 30, 1.6, "批发B", stall_id="west")
    db.add_sale("烤肠", 20, 5.0, stall_id="east")
    db.add_sale("烤肠", 10, 5.0, stall_id="west")

    east_buys = db.get_purchases(stall_id="east")
    west_buys = db.get_purchases(stall_id="west")
    assert len(east_buys) == 1
    assert east_buys[0][0] == "烤肠"
    assert len(west_buys) == 1

    east_sells = db.get_sales(stall_id="east")
    west_sells = db.get_sales(stall_id="west")
    assert len(east_sells) == 1
    assert east_sells[0][1] == 20
    assert len(west_sells) == 1


def test_stall_weekly_report():
    with patch.object(db, "date") as mock_date:
        mock_date.today.return_value = date(2026, 6, 2)

        db.add_purchase("烤肠", 50, 1.5, "", stall_id="east")
        db.add_sale("烤肠", 20, 5.0, stall_id="east")

        db.add_purchase("可乐", 30, 2.0, "", stall_id="west")
        db.add_sale("可乐", 15, 6.0, stall_id="west")

    east_report = db.get_weekly_report(stall_id="east")
    west_report = db.get_weekly_report(stall_id="west")

    assert east_report["total_revenue"] == 100.0
    assert east_report["total_profit"] == 70.0
    assert east_report["sales_count"] == 1

    assert west_report["total_revenue"] == 90.0
    assert west_report["total_profit"] == 60.0
    assert west_report["sales_count"] == 1


def test_cli_stall_check(cli_runner):
    db.add_purchase("烤肠", 50, 1.5, "", stall_id="east")
    db.add_purchase("可乐", 30, 2.0, "", stall_id="east")

    result = cli_runner.invoke(
        cli, ["check", "-n", "烤肠", "-a", "48", "-n", "可乐", "-a", "28", "--stall-id", "east"]
    )
    assert result.exit_code == 0
    assert "烤肠: 50 → 48 (-2)" in result.output
    assert "可乐: 30 → 28 (-2)" in result.output

    checks = db.get_stock_check(stall_id="east")
    assert len(checks) == 2
