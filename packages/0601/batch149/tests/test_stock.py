import os
from datetime import date, datetime, timedelta
from unittest.mock import patch, MagicMock

import pytest

from nightstock import db
from nightstock.cli import cli


def test_add_purchase_accumulates_stock():
    db.add_purchase("烤肠", 50, 1.5, "批发A")
    db.add_purchase("烤肠", 30, 2.0, "批发B")

    stock = db.get_stock_by_name("烤肠")
    assert stock == 80, "同一品名两次进货应该累加"

    items = db.get_all_stock()
    assert len(items) == 1
    name, qty, cost = items[0]
    assert name == "烤肠"
    assert qty == 80
    assert abs(cost - (50 * 1.5 + 30 * 2.0) / 80) < 0.01, "加权平均成本应该正确"


def test_sell_reduces_stock():
    db.add_purchase("可乐", 30, 2.0, "")
    db.add_sale("可乐", 10, 5.0)

    assert db.get_stock_by_name("可乐") == 20


def test_sell_insufficient_stock_rejected():
    db.add_purchase("烤冷面", 10, 3.0, "")

    success, msg = db.add_sale("烤冷面", 20, 10.0)
    assert not success
    assert "库存不足" in msg


def test_multiple_products_stock():
    db.add_purchase("烤肠", 50, 1.5, "")
    db.add_purchase("可乐", 30, 2.0, "")
    db.add_purchase("烤冷面", 40, 3.0, "")

    items = db.get_all_stock()
    assert len(items) == 3
    names = {n for n, _, _ in items}
    assert names == {"烤肠", "可乐", "烤冷面"}


def test_avg_cost_price_no_purchase():
    assert db.get_avg_cost_price("不存在") == 0.0


def test_cli_buy_command(cli_runner):
    result = cli_runner.invoke(cli, ["buy", "烤肠", "50", "1.5", "-s", "批发"])
    assert result.exit_code == 0
    assert "已进货" in result.output

    assert db.get_stock_by_name("烤肠") == 50


def test_cli_sell_command(cli_runner):
    db.add_purchase("可乐", 30, 2.0, "")
    result = cli_runner.invoke(cli, ["sell", "可乐", "10", "5.0"])
    assert result.exit_code == 0
    assert "已销售" in result.output
    assert db.get_stock_by_name("可乐") == 20


def test_cli_sell_insufficient(cli_runner):
    db.add_purchase("烤冷面", 10, 3.0, "")
    result = cli_runner.invoke(cli, ["sell", "烤冷面", "20", "10.0"])
    assert "库存不足" in result.output


def test_cli_stock_command(cli_runner):
    db.add_purchase("烤肠", 50, 1.5, "")
    result = cli_runner.invoke(cli, ["stock"])
    assert result.exit_code == 0
    assert "烤肠" in result.output
    assert "50" in result.output
