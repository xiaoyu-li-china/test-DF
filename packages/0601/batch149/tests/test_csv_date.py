import os
import tempfile
from datetime import date, datetime, timedelta
from unittest.mock import patch

import pytest

from nightstock import db
from nightstock.cli import cli


def test_csv_export_has_utf8_bom(cli_runner):
    db.add_purchase("烤肠", 50, 1.5, "批发")
    db.add_purchase("可乐", 30, 2.0, "")

    with cli_runner.isolated_filesystem():
        result = cli_runner.invoke(cli, ["stock", "--export", "csv"])
        assert result.exit_code == 0

        files = os.listdir(".")
        csv_file = next(f for f in files if f.endswith(".csv"))

        with open(csv_file, "rb") as f:
            header = f.read(3)

        assert header == b"\xef\xbb\xbf", "CSV 文件应该以 UTF-8 BOM 开头"

        with open(csv_file, "r", encoding="utf-8-sig") as f:
            content = f.read()
            assert "烤肠" in content
            assert "可乐" in content


def test_csv_export_headers_and_rows(cli_runner):
    db.add_purchase("臭豆腐", 40, 2.5, "老王")

    with cli_runner.isolated_filesystem():
        cli_runner.invoke(cli, ["stock", "--export", "csv"])

        csv_file = next(f for f in os.listdir(".") if f.endswith(".csv"))
        with open(csv_file, "r", encoding="utf-8-sig") as f:
            lines = f.readlines()

        assert len(lines) >= 2
        assert "品名" in lines[0]
        assert "数量" in lines[0]
        assert "臭豆腐" in lines[1]


def test_profit_csv_export(cli_runner, today):
    db.add_purchase("烤肠", 50, 1.5, "")
    db.add_sale("烤肠", 20, 5.0)

    with cli_runner.isolated_filesystem():
        result = cli_runner.invoke(cli, ["profit", "--export", "csv"])
        assert result.exit_code == 0

        csv_file = next(f for f in os.listdir(".") if f.endswith(".csv"))
        with open(csv_file, "rb") as f:
            assert f.read(3) == b"\xef\xbb\xbf"


def test_date_parameter_filter():
    d1 = "2026-06-01"
    d2 = "2026-06-02"

    with patch.object(db, "date") as mock_date:
        mock_date.today.return_value = date.fromisoformat(d1)
        db.add_purchase("烤肠", 50, 1.5, "")
        db.add_sale("烤肠", 10, 5.0)

    with patch.object(db, "date") as mock_date:
        mock_date.today.return_value = date.fromisoformat(d2)
        db.add_purchase("可乐", 30, 2.0, "")
        db.add_sale("可乐", 15, 6.0)

    buys_d1 = db.get_purchases(d1)
    assert len(buys_d1) == 1
    assert buys_d1[0][0] == "烤肠"

    buys_d2 = db.get_purchases(d2)
    assert len(buys_d2) == 1
    assert buys_d2[0][0] == "可乐"

    sales_d1 = db.get_sales(d1)
    assert len(sales_d1) == 1
    assert sales_d1[0][0] == "烤肠"

    profit_d1 = db.get_profit(d1)
    assert profit_d1[1] == 50.0
    assert profit_d1[2] == 15.0
    assert profit_d1[3] == 35.0


def test_cli_date_parameter(cli_runner):
    test_date = "2026-06-01"
    with patch.object(db, "date") as mock_date:
        mock_date.today.return_value = date.fromisoformat(test_date)
        db.add_purchase("烤肠", 50, 1.5, "")
        db.add_sale("烤肠", 10, 5.0)

    result = cli_runner.invoke(cli, ["profit", "-d", "2026-06-01"])
    assert result.exit_code == 0
    assert "烤肠" in result.output
    assert "35" in result.output

    result = cli_runner.invoke(cli, ["profit", "-d", "2026-01-01"])
    assert result.exit_code == 0
    assert "暂无销售记录" in result.output


def test_cli_buys_date_filter(cli_runner):
    with patch.object(db, "date") as mock_date:
        mock_date.today.return_value = date(2026, 6, 1)
        db.add_purchase("烤肠", 50, 1.5, "")

    with patch.object(db, "date") as mock_date:
        mock_date.today.return_value = date(2026, 6, 2)
        db.add_purchase("可乐", 30, 2.0, "")

    result = cli_runner.invoke(cli, ["buys", "-d", "2026-06-01"])
    assert result.exit_code == 0
    assert "烤肠" in result.output
    assert "可乐" not in result.output


def test_date_uses_local_date():
    with patch("nightstock.db.date") as mock_date:
        mock_date.today.return_value = date(2026, 6, 15)
        db.add_purchase("烤冷面", 20, 3.0, "")

    buys = db.get_purchases("2026-06-15")
    assert len(buys) == 1
    assert buys[0][4] == "2026-06-15"
