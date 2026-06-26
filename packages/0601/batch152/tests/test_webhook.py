import io
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock, AsyncMock, call

import pytest

from tests.conftest import create_test_image_bytes


class TestWebhookNotification:
    def test_webhook_signature_generation(self):
        from app.webhook_service import generate_signature

        payload = {"test": "data", "number": 123}
        secret = "test-secret-key"

        sig1 = generate_signature(payload, secret)
        sig2 = generate_signature(payload, secret)

        assert sig1 == sig2
        assert len(sig1) == 64

        different_payload = {"test": "different"}
        sig3 = generate_signature(different_payload, secret)
        assert sig1 != sig3

        sig4 = generate_signature(payload, "different-secret")
        assert sig1 != sig4

    def test_check_images_complete_insufficient(self, db_session, test_policy, test_user):
        from app.webhook_service import check_images_complete
        from app import crud
        from app.routers.images import calculate_file_hash
        from app.models import ImageStatus

        assert check_images_complete(test_policy.id, db_session) is False

        img_bytes = create_test_image_bytes()
        file_hash = calculate_file_hash(img_bytes)

        crud.create_claim_image(
            db_session,
            policy_id=test_policy.id,
            uploaded_by_id=test_user.id,
            file_name="only1.jpg",
            file_path="test/only1.jpg",
            content_type="image/jpeg",
            file_size=len(img_bytes),
            file_hash=file_hash,
        )

        assert check_images_complete(test_policy.id, db_session) is False

    def test_check_images_complete_with_enough_valid(self, db_session, test_policy, test_user):
        from app.webhook_service import check_images_complete
        from app import crud
        from app.routers.images import calculate_file_hash
        from app.models import ImageStatus

        for i in range(3):
            img_bytes = create_test_image_bytes(color=(i * 50, 100, 150))
            file_hash = calculate_file_hash(img_bytes)
            crud.create_claim_image(
                db_session,
                policy_id=test_policy.id,
                uploaded_by_id=test_user.id,
                file_name=f"valid{i}.jpg",
                file_path=f"test/valid{i}.jpg",
                content_type="image/jpeg",
                file_size=len(img_bytes),
                file_hash=file_hash,
            )

        assert check_images_complete(test_policy.id, db_session) is True

    def test_check_images_complete_exclude_needs_reshoot(self, db_session, test_policy, test_user):
        from app.webhook_service import check_images_complete
        from app import crud
        from app.routers.images import calculate_file_hash
        from app.models import ImageStatus

        for i in range(3):
            img_bytes = create_test_image_bytes(color=(i * 50, 100, 150))
            file_hash = calculate_file_hash(img_bytes)
            image = crud.create_claim_image(
                db_session,
                policy_id=test_policy.id,
                uploaded_by_id=test_user.id,
                file_name=f"photo{i}.jpg",
                file_path=f"test/photo{i}.jpg",
                content_type="image/jpeg",
                file_size=len(img_bytes),
                file_hash=file_hash,
            )
            if i == 0:
                crud.update_image_status(db_session, image.id, ImageStatus.NEEDS_RESHOOT)

        assert check_images_complete(test_policy.id, db_session) is False

        img_bytes = create_test_image_bytes(color=(200, 50, 100))
        file_hash = calculate_file_hash(img_bytes)
        crud.create_claim_image(
            db_session,
            policy_id=test_policy.id,
            uploaded_by_id=test_user.id,
            file_name="extra.jpg",
            file_path="test/extra.jpg",
            content_type="image/jpeg",
            file_size=len(img_bytes),
            file_hash=file_hash,
        )

        assert check_images_complete(test_policy.id, db_session) is True

    @pytest.mark.asyncio
    async def test_send_webhook_notification(self, test_policy, mock_webhook):
        from app.webhook_service import send_webhook_notification

        images_data = {
            "total_count": 3,
            "required_count": 3,
            "is_complete": True,
            "images": []
        }

        result = await send_webhook_notification(
            event_type="images_ready_for_review",
            policy=test_policy,
            images_data=images_data
        )

        assert result is True
        mock_webhook.return_value.__aenter__.return_value.post.assert_called_once()

        call_args = mock_webhook.return_value.__aenter__.return_value.post.call_args
        assert call_args[1]["json"]["event_type"] == "images_ready_for_review"
        assert call_args[1]["json"]["policy"]["policy_number"] == test_policy.policy_number
        assert "X-Webhook-Signature" in call_args[1]["headers"]

    @pytest.mark.asyncio
    async def test_webhook_disabled(self, test_policy, mock_webhook):
        from app.webhook_service import send_webhook_notification
        from app.config import settings

        original_value = settings.WEBHOOK_ENABLED
        settings.WEBHOOK_ENABLED = False

        try:
            result = await send_webhook_notification(
                event_type="test",
                policy=test_policy,
                images_data={}
            )
            assert result is False
            mock_webhook.return_value.__aenter__.return_value.post.assert_not_called()
        finally:
            settings.WEBHOOK_ENABLED = original_value

    def test_manual_trigger_webhook_not_enough_images(self, test_client, test_policy, auth_headers):
        response = test_client.post(
            f"/images/trigger-webhook/{test_policy.policy_number}",
            headers=auth_headers
        )

        assert response.status_code == 200
        result = response.json()
        assert result["policy_number"] == test_policy.policy_number
        assert result["webhook_triggered"] is False
        assert "未达到" in result["message"]

    def test_manual_trigger_webhook_nonexistent_policy(self, test_client, auth_headers):
        response = test_client.post(
            "/images/trigger-webhook/NONEXISTENT",
            headers=auth_headers
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_notify_if_images_complete_true(self, db_session, test_policy, test_user, mock_webhook):
        from app.webhook_service import notify_if_images_complete
        from app import crud
        from app.routers.images import calculate_file_hash

        for i in range(3):
            img_bytes = create_test_image_bytes(color=(i * 50, 100, 150))
            file_hash = calculate_file_hash(img_bytes)
            crud.create_claim_image(
                db_session,
                policy_id=test_policy.id,
                uploaded_by_id=test_user.id,
                file_name=f"photo{i}.jpg",
                file_path=f"test/photo{i}.jpg",
                content_type="image/jpeg",
                file_size=len(img_bytes),
                file_hash=file_hash,
            )

        result = await notify_if_images_complete(test_policy, db_session)
        assert result is True

    @pytest.mark.asyncio
    async def test_notify_if_images_complete_false(self, db_session, test_policy, test_user, mock_webhook):
        from app.webhook_service import notify_if_images_complete

        result = await notify_if_images_complete(test_policy, db_session)
        assert result is False

    def test_daily_stats_endpoint(self, test_client, auth_headers):
        from freezegun import freeze_time

        test_date = datetime(2024, 6, 2, 12, 0, 0, tzinfo=timezone(timedelta(hours=8)))

        with freeze_time(test_date):
            response = test_client.get(
                "/images/stats/daily",
                headers=auth_headers
            )

        assert response.status_code == 200
        result = response.json()
        assert result["date"] == "2024-06-02"
        assert result["upload_count"] == 0
        assert result["total_size_bytes"] == 0

    def test_daily_stats_with_data(self, test_client, test_policy, auth_headers, db_session, test_user):
        from app import crud
        from app.routers.images import calculate_file_hash
        from freezegun import freeze_time

        test_time = datetime(2024, 6, 2, 14, 30, 0, tzinfo=timezone(timedelta(hours=8)))

        with freeze_time(test_time):
            for i in range(5):
                img_bytes = create_test_image_bytes(color=(i * 50, 100, 150))
                file_hash = calculate_file_hash(img_bytes)
                crud.create_claim_image(
                    db_session,
                    policy_id=test_policy.id,
                    uploaded_by_id=test_user.id,
                    file_name=f"stat{i}.jpg",
                    file_path=f"test/stat{i}.jpg",
                    content_type="image/jpeg",
                    file_size=102400,
                    file_hash=file_hash,
                )

            response = test_client.get(
                "/images/stats/daily",
                headers=auth_headers
            )

        assert response.status_code == 200
        result = response.json()
        assert result["upload_count"] == 5
        assert result["total_size_bytes"] == 5 * 102400
        assert result["pending_count"] == 5

    def test_daily_stats_specific_date(self, test_client, auth_headers):
        response = test_client.get(
            "/images/stats/daily?target_date=2024-06-01",
            headers=auth_headers
        )

        assert response.status_code == 200
        result = response.json()
        assert result["date"] == "2024-06-01"

    def test_daily_stats_with_timezone(self, test_client, test_policy, auth_headers, db_session, test_user):
        from app import crud
        from app.routers.images import calculate_file_hash
        from freezegun import freeze_time

        test_time_utc = datetime(2024, 6, 1, 23, 50, 0, tzinfo=timezone.utc)

        with freeze_time(test_time_utc):
            img_bytes = create_test_image_bytes()
            file_hash = calculate_file_hash(img_bytes)
            crud.create_claim_image(
                db_session,
                policy_id=test_policy.id,
                uploaded_by_id=test_user.id,
                file_name="late_night.jpg",
                file_path="test/late_night.jpg",
                content_type="image/jpeg",
                file_size=50000,
                file_hash=file_hash,
            )

            response = test_client.get(
                "/images/stats/daily?target_date=2024-06-02&timezone_offset=8",
                headers=auth_headers
            )

        assert response.status_code == 200
        result = response.json()
        assert result["upload_count"] == 1

    def test_webhook_payload_structure(self):
        from app.webhook_service import generate_signature
        from app.config import settings

        test_payload = {
            "event_type": "images_ready_for_review",
            "timestamp": "2024-06-02T06:30:25.123Z",
            "policy": {
                "policy_number": "TEST001",
                "policy_holder_name": "测试农户",
                "insurance_type": "水稻种植保险"
            },
            "images": {
                "total_count": 5,
                "required_count": 3,
                "is_complete": True,
                "images": []
            }
        }

        signature = generate_signature(test_payload, settings.WEBHOOK_SECRET)

        assert signature is not None
        assert len(signature) == 64

        for key in ["event_type", "timestamp", "policy", "images"]:
            assert key in test_payload
        for key in ["policy_number", "policy_holder_name", "insurance_type"]:
            assert key in test_payload["policy"]
        for key in ["total_count", "required_count", "is_complete", "images"]:
            assert key in test_payload["images"]
