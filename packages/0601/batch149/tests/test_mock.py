import os
import tempfile
from datetime import date
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from nightstock import db
from nightstock.cli import cli


def test_ocr_receipt_mocked(cli_runner):
    mock_items = [
        {"name": "烤肠", "quantity": 50, "price": 1.5},
        {"name": "可乐", "quantity": 30, "price": 2.0},
    ]

    with patch("nightstock.cli.ocr_receipt", return_value=mock_items):
        with cli_runner.isolated_filesystem():
            with open("test_receipt.jpg", "w") as f:
                f.write("fake image")

            result = cli_runner.invoke(
                cli, ["ocr", "test_receipt.jpg", "-y", "-s", "批发商"]
            )
            assert result.exit_code == 0
            assert "已录入 2 条" in result.output

            assert db.get_stock_by_name("烤肠") == 50
            assert db.get_stock_by_name("可乐") == 30


def test_ocr_no_deps(cli_runner):
    with patch("nightstock.cli.ocr_receipt", return_value=None):
        with cli_runner.isolated_filesystem():
            with open("test.jpg", "w") as f:
                f.write("x")
            result = cli_runner.invoke(cli, ["ocr", "test.jpg"])
            assert "请安装 OCR 依赖" in result.output


def test_ocr_no_items(cli_runner):
    with patch("nightstock.cli.ocr_receipt", return_value=[]):
        with cli_runner.isolated_filesystem():
            with open("test.jpg", "w") as f:
                f.write("x")
            result = cli_runner.invoke(cli, ["ocr", "test.jpg"])
            assert "未识别到商品" in result.output


def test_wechat_work_webhook_success():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = '{"errcode":0}'

    with patch("nightstock.db.requests") as mock_requests:
        mock_requests.post.return_value = mock_resp

        ok, msg = db.send_wechat_work_webhook(
            "https://qyapi.weixin.qq.com/cgi-bin/webhook/test",
            "测试内容"
        )

        assert ok is True
        mock_requests.post.assert_called_once()
        call_args = mock_requests.post.call_args
        assert call_args[0][0] == "https://qyapi.weixin.qq.com/cgi-bin/webhook/test"
        assert call_args[1]["json"]["msgtype"] == "markdown"


def test_wechat_work_webhook_failure():
    mock_resp = MagicMock()
    mock_resp.status_code = 400
    mock_resp.text = '{"errcode":1}'

    with patch("nightstock.db.requests") as mock_requests:
        mock_requests.post.return_value = mock_resp

        ok, msg = db.send_wechat_work_webhook("http://test", "内容")
        assert ok is False


def test_wechat_work_webhook_exception():
    with patch("nightstock.db.requests") as mock_requests:
        mock_requests.post.side_effect = Exception("网络错误")

        ok, msg = db.send_wechat_work_webhook("http://test", "内容")
        assert ok is False
        assert "网络错误" in msg


def test_wechat_work_no_requests():
    with patch("nightstock.db.requests", None):
        ok, msg = db.send_wechat_work_webhook("http://test", "内容")
        assert ok is False
        assert "安装 requests" in msg


def test_report_dry_run(cli_runner):
    db.add_purchase("烤肠", 50, 1.5, "")
    db.add_sale("烤肠", 20, 5.0)

    result = cli_runner.invoke(cli, ["report", "--dry-run"])
    assert result.exit_code == 0
    assert "夜市周报" in result.output
    assert "总营收" in result.output
    assert "毛利" in result.output


def test_report_save_webhook(cli_runner):
    with tempfile.TemporaryDirectory() as tmpdir:
        config_path = Path(tmpdir) / "wechat.json"
        with patch("nightstock.db.WECHAT_CONFIG", config_path):
            webhook = "https://qyapi.weixin.qq.com/test"
            result = cli_runner.invoke(
                cli, ["report", "--webhook", webhook, "--save", "--dry-run"]
            )
            assert result.exit_code == 0
            assert "Webhook 已保存" in result.output

            cfg = db.load_wechat_config()
            assert cfg["webhook"] == webhook


def test_report_send_wechat(cli_runner):
    mock_resp = MagicMock()
    mock_resp.status_code = 200

    with patch("nightstock.db.requests") as mock_requests:
        mock_requests.post.return_value = mock_resp

        result = cli_runner.invoke(
            cli, ["report", "--webhook", "https://test"]
        )
        assert result.exit_code == 0
        assert "已推送到企业微信" in result.output
        mock_requests.post.assert_called_once()


def test_stock_check_functionality(cli_runner):
    db.add_purchase("烤肠", 50, 1.5, "")
    db.add_purchase("可乐", 30, 2.0, "")

    result = cli_runner.invoke(
        cli, ["check", "-n", "烤肠", "-a", "48", "-n", "可乐", "-a", "25"]
    )
    assert result.exit_code == 0
    assert "烤肠: 50 → 48 (-2)" in result.output
    assert "可乐: 30 → 25 (-5)" in result.output

    checks = db.get_stock_check()
    assert len(checks) == 2
    assert ("烤肠", 50, 48, -2) in checks
    assert ("可乐", 30, 25, -5) in checks


def test_stock_check_view(cli_runner):
    db.add_purchase("烤肠", 50, 1.5, "")
    db.add_stock_check("烤肠", 50, 48)

    result = cli_runner.invoke(cli, ["check"])
    assert result.exit_code == 0
    assert "烤肠" in result.output
    assert "50" in result.output
    assert "48" in result.output
    assert "-2" in result.output


def test_weekly_report_data():
    with patch.object(db, "date") as mock_date:
        mock_date.today.return_value = date(2026, 6, 2)

        for i, d in enumerate(["2026-05-30", "2026-05-31", "2026-06-01"]):
            mock_date.today.return_value = date.fromisoformat(d)
            db.add_purchase(f"商品{i}", 10, 2.0, "")
            db.add_sale(f"商品{i}", 5, 5.0)

        mock_date.today.return_value = date(2026, 6, 2)
        report = db.get_weekly_report()

        assert report["start"] == "2026-05-26"
        assert report["end"] == "2026-06-02"
        assert report["sales_count"] == 3
        assert report["purchase_count"] == 3
        assert report["total_revenue"] == 75.0
        assert report["total_profit"] == 45.0
        assert len(report["daily"]) == 3
