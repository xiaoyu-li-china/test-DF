import tempfile
import os
import base64
from io import BytesIO
from unittest.mock import patch, AsyncMock
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db, Visitor, Blacklist, User, WebhookConfig, WebhookLog
from main import app
from auth import get_password_hash, create_access_token, SECRET_KEY, ALGORITHM
from schemas import VisitorStatus, VisitorResponse


@pytest.fixture
def db_engine():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name

    db_url = f"sqlite:///{db_path}"
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def set_pragma(conn, record):
        cursor = conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    os.unlink(db_path)


@pytest.fixture
def db_session(db_engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSessionLocal()

    hashed = get_password_hash("testpass")
    user = User(username="testsec", hashed_password=hashed)
    session.add(user)
    session.commit()

    yield session
    session.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    resp = client.post(
        "/token",
        data={"username": "testsec", "password": "testpass"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_photo_base64():
    from PIL import Image
    img = Image.new("RGB", (100, 100), color="red")
    buf = BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode()


class TestRegisterAndCheckout:
    def test_register_visitor(self, client, auth_headers):
        resp = client.post(
            "/visitors/register",
            json={
                "name": "张三",
                "phone": "13800138000",
                "room_number": "1-101",
                "estimated_stay": 120,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "张三"
        assert data["phone"] == "13800138000"
        assert data["is_checked_out"] is False
        assert data["photo_path"] is None

    def test_register_with_photo(self, client, auth_headers, tmp_path):
        photo_b64 = _make_photo_base64()
        with patch("utils.PHOTO_DIR", str(tmp_path / "photos")), \
             patch("utils.THUMBNAIL_DIR", str(tmp_path / "thumbnails")):
            os.makedirs(str(tmp_path / "photos"), exist_ok=True)
            os.makedirs(str(tmp_path / "thumbnails"), exist_ok=True)
            resp = client.post(
                "/visitors/register",
                json={
                    "name": "李四",
                    "phone": "13911112222",
                    "room_number": "2-202",
                    "estimated_stay": 60,
                    "photo_base64": photo_b64,
                },
                headers=auth_headers,
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["photo_path"] is not None
        assert data["thumbnail_path"] is not None

    def test_checkout_visitor(self, client, auth_headers):
        reg = client.post(
            "/visitors/register",
            json={
                "name": "王五",
                "phone": "13700001111",
                "room_number": "3-303",
                "estimated_stay": 30,
            },
            headers=auth_headers,
        )
        visitor_id = reg.json()["id"]

        resp = client.patch(
            f"/visitors/{visitor_id}/checkout",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_checked_out"] is True
        assert data["check_out_time"] is not None

    def test_checkout_already_checked_out(self, client, auth_headers):
        reg = client.post(
            "/visitors/register",
            json={
                "name": "赵六",
                "phone": "13600002222",
                "room_number": "4-404",
                "estimated_stay": 45,
            },
            headers=auth_headers,
        )
        visitor_id = reg.json()["id"]

        client.patch(f"/visitors/{visitor_id}/checkout", headers=auth_headers)

        resp = client.patch(
            f"/visitors/{visitor_id}/checkout",
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_checkout_nonexistent_visitor(self, client, auth_headers):
        resp = client.patch("/visitors/99999/checkout", headers=auth_headers)
        assert resp.status_code == 404

    def test_today_visitors(self, client, auth_headers):
        client.post(
            "/visitors/register",
            json={
                "name": "孙七",
                "phone": "13500003333",
                "room_number": "5-505",
                "estimated_stay": 90,
            },
            headers=auth_headers,
        )
        resp = client.get("/visitors/today", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert any(v["name"] == "孙七" for v in data)

    def test_register_invalid_phone(self, client, auth_headers):
        resp = client.post(
            "/visitors/register",
            json={
                "name": "无效手机",
                "phone": "1234",
                "room_number": "1-101",
                "estimated_stay": 30,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 422


class TestJWTExpiration:
    def test_expired_token_rejected(self, client):
        expired_token = create_access_token(
            data={"sub": "testsec"},
            expires_delta=timedelta(seconds=-1),
        )
        resp = client.post(
            "/visitors/register",
            json={
                "name": "过期测试",
                "phone": "13800138000",
                "room_number": "1-101",
                "estimated_stay": 30,
            },
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert resp.status_code == 401

    def test_invalid_token_rejected(self, client):
        resp = client.post(
            "/visitors/register",
            json={
                "name": "无效令牌",
                "phone": "13800138000",
                "room_number": "1-101",
                "estimated_stay": 30,
            },
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert resp.status_code == 401

    def test_no_token_rejected(self, client):
        resp = client.post(
            "/visitors/register",
            json={
                "name": "无令牌",
                "phone": "13800138000",
                "room_number": "1-101",
                "estimated_stay": 30,
            },
        )
        assert resp.status_code == 401


class TestBlacklist:
    def test_add_blacklist(self, client, auth_headers):
        resp = client.post(
            "/blacklist",
            json={"phone": "13900001111", "reason": "不良记录"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["phone"] == "13900001111"
        assert data["reason"] == "不良记录"

    def test_add_duplicate_blacklist(self, client, auth_headers):
        client.post(
            "/blacklist",
            json={"phone": "13900002222", "reason": "测试"},
            headers=auth_headers,
        )
        resp = client.post(
            "/blacklist",
            json={"phone": "13900002222", "reason": "重复"},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_blacklist_blocks_registration(self, client, auth_headers):
        client.post(
            "/blacklist",
            json={"phone": "13900009999", "reason": "禁止入内"},
            headers=auth_headers,
        )
        resp = client.post(
            "/visitors/register",
            json={
                "name": "黑名单人",
                "phone": "13900009999",
                "room_number": "1-101",
                "estimated_stay": 30,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 403
        assert "黑名单" in resp.json()["detail"]

    def test_delete_blacklist(self, client, auth_headers):
        client.post(
            "/blacklist",
            json={"phone": "13900008888", "reason": "临时"},
            headers=auth_headers,
        )
        resp = client.delete("/blacklist/13900008888", headers=auth_headers)
        assert resp.status_code == 204

        resp = client.post(
            "/visitors/register",
            json={
                "name": "解封人",
                "phone": "13900008888",
                "room_number": "1-101",
                "estimated_stay": 30,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200

    def test_list_blacklist(self, client, auth_headers):
        client.post(
            "/blacklist",
            json={"phone": "13900007777", "reason": "列表测试"},
            headers=auth_headers,
        )
        resp = client.get("/blacklist", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1

    def test_delete_nonexistent_blacklist(self, client, auth_headers):
        resp = client.delete("/blacklist/13999999999", headers=auth_headers)
        assert resp.status_code == 404


class TestVisitorStatus:
    def test_registered_status(self, client, auth_headers):
        resp = client.post(
            "/visitors/register",
            json={
                "name": "状态测试1",
                "phone": "13800138001",
                "room_number": "1-101",
                "estimated_stay": 120,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == VisitorStatus.REGISTERED.value

    def test_overdue_status(self, client, auth_headers, db_session):
        visitor = Visitor(
            name="超时测试",
            phone="13800138002",
            room_number="2-202",
            estimated_stay=30,
            check_in_time=datetime.utcnow() - timedelta(minutes=60),
            is_checked_out=False,
        )
        db_session.add(visitor)
        db_session.commit()

        resp = client.get("/visitors/today", headers=auth_headers)
        assert resp.status_code == 200
        visitors = resp.json()
        target = next(v for v in visitors if v["phone"] == "13800138002")
        assert target["status"] == VisitorStatus.OVERDUE.value

    def test_checked_out_status(self, client, auth_headers):
        reg = client.post(
            "/visitors/register",
            json={
                "name": "签离状态测试",
                "phone": "13800138003",
                "room_number": "3-303",
                "estimated_stay": 120,
            },
            headers=auth_headers,
        )
        visitor_id = reg.json()["id"]

        resp = client.patch(
            f"/visitors/{visitor_id}/checkout",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == VisitorStatus.CHECKED_OUT.value

    def test_status_present_in_response(self, client, auth_headers):
        reg = client.post(
            "/visitors/register",
            json={
                "name": "状态字段测试",
                "phone": "13800138004",
                "room_number": "4-404",
                "estimated_stay": 60,
            },
            headers=auth_headers,
        )
        assert "status" in reg.json()

    def test_filter_by_status(self, client, auth_headers):
        for i in range(3):
            client.post(
                "/visitors/register",
                json={
                    "name": f"状态过滤{i}",
                    "phone": f"1380013801{i}",
                    "room_number": f"1-10{i}",
                    "estimated_stay": 60,
                },
                headers=auth_headers,
            )

        reg = client.post(
            "/visitors/register",
            json={
                "name": "待签离",
                "phone": "13800138020",
                "room_number": "5-505",
                "estimated_stay": 60,
            },
            headers=auth_headers,
        )
        vid = reg.json()["id"]
        client.patch(f"/visitors/{vid}/checkout", headers=auth_headers)

        resp = client.get(
            "/visitors/today",
            params={"status_filter": VisitorStatus.CHECKED_OUT.value},
            headers=auth_headers,
        )
        data = resp.json()
        assert len(data) >= 1
        assert all(v["status"] == VisitorStatus.CHECKED_OUT.value for v in data)


class TestWebhookRetry:
    def test_create_webhook_config_with_retry_params(self, client, auth_headers):
        resp = client.post(
            "/webhook-config",
            json={
                "room_number": "6-606",
                "webhook_url": "https://example.com/webhook",
                "max_retries": 5,
                "retry_delay_seconds": 30,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["max_retries"] == 5
        assert data["retry_delay_seconds"] == 30

    def test_webhook_log_created(self, client, auth_headers, db_session):
        client.post(
            "/webhook-config",
            json={
                "room_number": "7-707",
                "webhook_url": "https://example.com/webhook2",
                "max_retries": 3,
                "retry_delay_seconds": 10,
            },
            headers=auth_headers,
        )

        with patch("utils.httpx.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.post.return_value = AsyncMock(status_code=200)
            mock_client.return_value = mock_instance

            resp = client.post(
                "/visitors/register",
                json={
                    "name": "Webhook测试",
                    "phone": "13800138050",
                    "room_number": "7-707",
                    "estimated_stay": 60,
                },
                headers=auth_headers,
            )
            assert resp.status_code == 200

        logs = db_session.query(WebhookLog).filter(
            WebhookLog.room_number == "7-707"
        ).all()
        assert len(logs) >= 1
        assert logs[0].max_retries == 3

    def test_list_webhook_logs(self, client, auth_headers, db_session):
        log = WebhookLog(
            visitor_id=999,
            room_number="8-808",
            webhook_url="https://example.com/test",
            payload='{"test":"data"}',
            status="success",
            retry_count=1,
            max_retries=3,
        )
        db_session.add(log)
        db_session.commit()

        resp = client.get("/webhook-logs", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1

    def test_filter_webhook_logs_by_status(self, client, auth_headers, db_session):
        log1 = WebhookLog(
            visitor_id=1,
            room_number="9-909",
            webhook_url="https://example.com/test1",
            payload='{"test":"1"}',
            status="success",
            retry_count=1,
            max_retries=3,
        )
        log2 = WebhookLog(
            visitor_id=2,
            room_number="9-909",
            webhook_url="https://example.com/test2",
            payload='{"test":"2"}',
            status="failed",
            retry_count=3,
            max_retries=3,
        )
        db_session.add_all([log1, log2])
        db_session.commit()

        resp = client.get(
            "/webhook-logs",
            params={"status": "failed"},
            headers=auth_headers,
        )
        data = resp.json()
        assert all(log["status"] == "failed" for log in data)

    def test_manual_retry_webhooks(self, client, auth_headers, db_session):
        from datetime import timedelta as td
        log = WebhookLog(
            visitor_id=3,
            room_number="10-1010",
            webhook_url="https://example.com/test3",
            payload='{"test":"3"}',
            status="failed",
            retry_count=1,
            max_retries=3,
            created_at=datetime.utcnow() - td(hours=1),
        )
        db_session.add(log)
        db_session.commit()

        resp = client.post(
            "/webhook-logs/retry",
            params={"hours": 24},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "retried" in data
        assert data["retried"] >= 1
