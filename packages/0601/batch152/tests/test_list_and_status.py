import io
from datetime import datetime, timezone, timedelta

import pytest

from tests.conftest import create_test_image_bytes


class TestImageList:
    def test_get_policy_images_empty(self, test_client, test_policy, auth_headers):
        response = test_client.get(
            f"/images/policy/{test_policy.policy_number}",
            headers=auth_headers
        )

        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)
        assert len(result) == 0

    def test_get_policy_images_with_data(self, test_client, test_policy, auth_headers, db_session, test_user):
        from app import crud, schemas

        for i in range(3):
            img_bytes = create_test_image_bytes(color=(i * 50, 100, 150))
            from app.routers.images import calculate_file_hash
            file_hash = calculate_file_hash(img_bytes)
            crud.create_claim_image(
                db_session,
                policy_id=test_policy.id,
                uploaded_by_id=test_user.id,
                file_name=f"photo{i}.jpg",
                file_path=f"test/{test_policy.policy_number}/photo{i}.jpg",
                content_type="image/jpeg",
                file_size=len(img_bytes),
                file_hash=file_hash,
                gps_latitude=39.9042,
                gps_longitude=116.4074,
                photo_timestamp=datetime.now(),
                incident_location="北京"
            )

        response = test_client.get(
            f"/images/policy/{test_policy.policy_number}",
            headers=auth_headers
        )

        assert response.status_code == 200
        result = response.json()
        assert len(result) == 3
        assert result[0]["status"] == "pending"
        assert "file_url" in result[0]

    def test_get_policy_images_nonexistent(self, test_client, auth_headers):
        response = test_client.get(
            "/images/policy/NONEXISTENT",
            headers=auth_headers
        )

        assert response.status_code == 404

    def test_get_policy_images_sorted_by_created(self, test_client, test_policy, auth_headers, db_session, test_user):
        from app import crud
        from app.routers.images import calculate_file_hash

        for i in range(5):
            img_bytes = create_test_image_bytes(color=(i * 50, 100, 150))
            file_hash = calculate_file_hash(img_bytes)
            crud.create_claim_image(
                db_session,
                policy_id=test_policy.id,
                uploaded_by_id=test_user.id,
                file_name=f"photo{i}.jpg",
                file_path=f"test/{test_policy.policy_number}/photo{i}.jpg",
                content_type="image/jpeg",
                file_size=len(img_bytes),
                file_hash=file_hash,
            )

        response = test_client.get(
            f"/images/policy/{test_policy.policy_number}",
            headers=auth_headers
        )

        result = response.json()
        assert len(result) == 5
        assert result[0]["id"] > result[-1]["id"]

    def test_get_single_image(self, test_client, test_policy, auth_headers, db_session, test_user):
        from app import crud
        from app.routers.images import calculate_file_hash

        img_bytes = create_test_image_bytes()
        file_hash = calculate_file_hash(img_bytes)
        db_image = crud.create_claim_image(
            db_session,
            policy_id=test_policy.id,
            uploaded_by_id=test_user.id,
            file_name="single_photo.jpg",
            file_path="test/single_photo.jpg",
            content_type="image/jpeg",
            file_size=len(img_bytes),
            file_hash=file_hash,
            ocr_license_plate="京B67890",
            ocr_vin_number="LSVAM4187JN123456",
        )

        response = test_client.get(
            f"/images/{db_image.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        result = response.json()
        assert result["id"] == db_image.id
        assert result["file_name"] == "single_photo.jpg"
        assert result["ocr_license_plate"] == "京B67890"
        assert result["ocr_vin_number"] == "LSVAM4187JN123456"

    def test_get_single_image_nonexistent(self, test_client, auth_headers):
        response = test_client.get(
            "/images/99999",
            headers=auth_headers
        )

        assert response.status_code == 404
        assert "影像不存在" in response.json()["detail"]


class TestImageStatus:
    def test_approve_image(self, test_client, test_policy, auth_headers, db_session, test_user):
        from app import crud
        from app.routers.images import calculate_file_hash

        img_bytes = create_test_image_bytes()
        file_hash = calculate_file_hash(img_bytes)
        db_image = crud.create_claim_image(
            db_session,
            policy_id=test_policy.id,
            uploaded_by_id=test_user.id,
            file_name="to_approve.jpg",
            file_path="test/to_approve.jpg",
            content_type="image/jpeg",
            file_size=len(img_bytes),
            file_hash=file_hash,
        )

        response = test_client.patch(
            f"/images/{db_image.id}/status",
            json={"status": "已通过", "remark": "照片清晰，信息完整"},
            headers=auth_headers
        )

        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "已通过"
        assert result["remark"] == "照片清晰，信息完整"

    def test_mark_needs_reshoot(self, test_client, test_policy, auth_headers, db_session, test_user):
        from app import crud
        from app.routers.images import calculate_file_hash

        img_bytes = create_test_image_bytes()
        file_hash = calculate_file_hash(img_bytes)
        db_image = crud.create_claim_image(
            db_session,
            policy_id=test_policy.id,
            uploaded_by_id=test_user.id,
            file_name="blurry_photo.jpg",
            file_path="test/blurry_photo.jpg",
            content_type="image/jpeg",
            file_size=len(img_bytes),
            file_hash=file_hash,
        )

        response = test_client.patch(
            f"/images/{db_image.id}/status",
            json={"status": "需补拍", "remark": "照片模糊，请重新拍摄"},
            headers=auth_headers
        )

        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "需补拍"
        assert result["remark"] == "照片模糊，请重新拍摄"

    def test_update_status_without_remark(self, test_client, test_policy, auth_headers, db_session, test_user):
        from app import crud
        from app.routers.images import calculate_file_hash

        img_bytes = create_test_image_bytes()
        file_hash = calculate_file_hash(img_bytes)
        db_image = crud.create_claim_image(
            db_session,
            policy_id=test_policy.id,
            uploaded_by_id=test_user.id,
            file_name="simple.jpg",
            file_path="test/simple.jpg",
            content_type="image/jpeg",
            file_size=len(img_bytes),
            file_hash=file_hash,
        )

        response = test_client.patch(
            f"/images/{db_image.id}/status",
            json={"status": "已通过"},
            headers=auth_headers
        )

        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "已通过"
        assert result["remark"] is None

    def test_update_status_nonexistent_image(self, test_client, auth_headers):
        response = test_client.patch(
            "/images/99999/status",
            json={"status": "已通过"},
            headers=auth_headers
        )

        assert response.status_code == 404

    def test_update_status_invalid_status(self, test_client, test_policy, auth_headers, db_session, test_user):
        from app import crud
        from app.routers.images import calculate_file_hash

        img_bytes = create_test_image_bytes()
        file_hash = calculate_file_hash(img_bytes)
        db_image = crud.create_claim_image(
            db_session,
            policy_id=test_policy.id,
            uploaded_by_id=test_user.id,
            file_name="test.jpg",
            file_path="test/test.jpg",
            content_type="image/jpeg",
            file_size=len(img_bytes),
            file_hash=file_hash,
        )

        response = test_client.patch(
            f"/images/{db_image.id}/status",
            json={"status": "invalid_status"},
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_full_workflow_upload_then_approve(self, test_client, test_policy, auth_headers):
        img_bytes = create_test_image_bytes()
        files = {"file": ("workflow.jpg", io.BytesIO(img_bytes), "image/jpeg")}
        data = {
            "policy_number": test_policy.policy_number,
            "gps_latitude": 39.9042,
            "gps_longitude": 116.4074,
        }

        upload_response = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert upload_response.status_code == 201
        image_id = upload_response.json()["id"]

        list_response = test_client.get(
            f"/images/policy/{test_policy.policy_number}",
            headers=auth_headers
        )
        assert list_response.status_code == 200
        assert len(list_response.json()) == 1
        assert list_response.json()[0]["status"] == "pending"

        approve_response = test_client.patch(
            f"/images/{image_id}/status",
            json={"status": "已通过", "remark": "审核通过"},
            headers=auth_headers
        )
        assert approve_response.status_code == 200
        assert approve_response.json()["status"] == "已通过"

        final_list = test_client.get(
            f"/images/policy/{test_policy.policy_number}",
            headers=auth_headers
        )
        assert final_list.json()[0]["status"] == "已通过"
        assert final_list.json()[0]["remark"] == "审核通过"

    def test_multiple_status_updates(self, test_client, test_policy, auth_headers, db_session, test_user):
        from app import crud
        from app.routers.images import calculate_file_hash

        img_bytes = create_test_image_bytes()
        file_hash = calculate_file_hash(img_bytes)
        db_image = crud.create_claim_image(
            db_session,
            policy_id=test_policy.id,
            uploaded_by_id=test_user.id,
            file_name="multi_status.jpg",
            file_path="test/multi_status.jpg",
            content_type="image/jpeg",
            file_size=len(img_bytes),
            file_hash=file_hash,
        )

        response1 = test_client.patch(
            f"/images/{db_image.id}/status",
            json={"status": "需补拍", "remark": "第一次审核：模糊"},
            headers=auth_headers
        )
        assert response1.json()["status"] == "需补拍"

        response2 = test_client.patch(
            f"/images/{db_image.id}/status",
            json={"status": "已通过", "remark": "补拍后清晰"},
            headers=auth_headers
        )
        assert response2.json()["status"] == "已通过"
        assert response2.json()["remark"] == "补拍后清晰"
