import io
import hashlib
from datetime import datetime
from unittest.mock import patch, MagicMock, AsyncMock

import pytest

from tests.conftest import create_test_image_bytes


class TestImageUpload:
    def test_upload_image_success(self, test_client, test_policy, auth_headers):
        image_bytes = create_test_image_bytes()
        files = {"file": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")}
        data = {
            "policy_number": test_policy.policy_number,
            "gps_latitude": 39.9042,
            "gps_longitude": 116.4074,
            "incident_location": "北京市朝阳区",
        }

        response = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response.status_code == 201
        result = response.json()
        assert result["policy_id"] == test_policy.id
        assert result["gps_latitude"] == 39.9042
        assert result["gps_longitude"] == 116.4074
        assert result["incident_location"] == "北京市朝阳区"
        assert result["status"] == "pending"
        assert result["file_url"] is not None
        assert "file_path" in result

    def test_upload_image_with_ocr_metadata(self, test_client, test_policy, auth_headers, mock_ocr):
        image_bytes = create_test_image_bytes()
        files = {"file": ("car.jpg", io.BytesIO(image_bytes), "image/jpeg")}
        data = {
            "policy_number": test_policy.policy_number,
        }

        response = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response.status_code == 201
        result = response.json()
        assert result["ocr_license_plate"] == "京A12345"
        assert result["ocr_vin_number"] == "LBV1Z3108KM000001"
        mock_ocr.assert_called_once()

    def test_upload_with_photo_timestamp(self, test_client, test_policy, auth_headers):
        image_bytes = create_test_image_bytes()
        photo_time = datetime(2024, 6, 2, 14, 30, 0).isoformat()
        files = {"file": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")}
        data = {
            "policy_number": test_policy.policy_number,
            "photo_timestamp": photo_time,
        }

        response = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response.status_code == 201
        result = response.json()
        assert result["photo_timestamp"] is not None

    def test_upload_nonexistent_policy(self, test_client, auth_headers):
        image_bytes = create_test_image_bytes()
        files = {"file": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")}
        data = {"policy_number": "NONEXISTENT"}

        response = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response.status_code == 404
        assert "保单不存在" in response.json()["detail"]

    def test_upload_non_image_file(self, test_client, test_policy, auth_headers):
        files = {"file": ("test.txt", io.BytesIO(b"not an image"), "text/plain")}
        data = {"policy_number": test_policy.policy_number}

        response = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response.status_code == 400
        assert "请上传图片文件" in response.json()["detail"]

    def test_upload_png_image(self, test_client, test_policy, auth_headers):
        image_bytes = create_test_image_bytes(format='PNG')
        files = {"file": ("test.png", io.BytesIO(image_bytes), "image/png")}
        data = {"policy_number": test_policy.policy_number}

        response = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response.status_code == 201
        result = response.json()
        assert "png" in result["file_path"] or "PNG" in result["file_name"]

    def test_upload_without_auth(self, test_client, test_policy):
        image_bytes = create_test_image_bytes()
        files = {"file": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")}
        data = {"policy_number": test_policy.policy_number}

        response = test_client.post(
            "/images/upload",
            files=files,
            data=data
        )

        assert response.status_code == 401


class TestGPSBoundary:
    @pytest.mark.parametrize("lat,lon,valid", [
        (39.9042, 116.4074, True),
        (0.0, 0.0, True),
        (90.0, 180.0, True),
        (-90.0, -180.0, True),
        (35.0, 135.0, True),
        (23.5, 121.0, True),
    ])
    def test_valid_gps_coordinates(self, test_client, test_policy, auth_headers, lat, lon, valid):
        image_bytes = create_test_image_bytes()
        files = {"file": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")}
        data = {
            "policy_number": test_policy.policy_number,
            "gps_latitude": lat,
            "gps_longitude": lon,
        }

        response = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response.status_code == 201
        result = response.json()
        assert result["gps_latitude"] == lat
        assert result["gps_longitude"] == lon

    def test_gps_northernmost_china(self, test_client, test_policy, auth_headers):
        image_bytes = create_test_image_bytes()
        files = {"file": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")}
        data = {
            "policy_number": test_policy.policy_number,
            "gps_latitude": 53.55,
            "gps_longitude": 123.43,
            "incident_location": "黑龙江漠河",
        }

        response = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response.status_code == 201
        result = response.json()
        assert result["gps_latitude"] == 53.55
        assert result["gps_longitude"] == 123.43

    def test_gps_southernmost_china(self, test_client, test_policy, auth_headers):
        image_bytes = create_test_image_bytes()
        files = {"file": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")}
        data = {
            "policy_number": test_policy.policy_number,
            "gps_latitude": 3.84,
            "gps_longitude": 112.33,
            "incident_location": "南海曾母暗沙",
        }

        response = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response.status_code == 201
        result = response.json()
        assert result["gps_latitude"] == 3.84
        assert result["gps_longitude"] == 112.33

    def test_upload_without_gps(self, test_client, test_policy, auth_headers):
        image_bytes = create_test_image_bytes()
        files = {"file": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")}
        data = {
            "policy_number": test_policy.policy_number,
            "incident_location": "出险地点",
        }

        response = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response.status_code == 201
        result = response.json()
        assert result["gps_latitude"] is None
        assert result["gps_longitude"] is None


class TestIdempotency:
    def test_upload_with_idempotency_key(self, test_client, test_policy, auth_headers):
        image_bytes = create_test_image_bytes()
        idempotency_key = "test-idempotency-key-12345"
        files = {"file": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")}
        data = {
            "policy_number": test_policy.policy_number,
            "idempotency_key": idempotency_key,
        }

        response1 = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response1.status_code == 201
        result1 = response1.json()
        image_id_1 = result1["id"]

        files["file"] = ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")
        response2 = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response2.status_code == 201
        result2 = response2.json()
        assert result2["id"] == image_id_1
        assert result2["idempotency_key"] == idempotency_key

    def test_upload_same_file_different_idempotency(self, test_client, test_policy, auth_headers):
        image_bytes = create_test_image_bytes(color='blue')
        files = {"file": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")}
        data = {
            "policy_number": test_policy.policy_number,
            "idempotency_key": "key-1",
        }

        response1 = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response1.status_code == 201
        id1 = response1.json()["id"]

        data["idempotency_key"] = "key-2"
        files["file"] = ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")
        response2 = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response2.status_code == 201
        id2 = response2.json()["id"]
        assert id2 != id1

    def test_upload_without_idempotency_key(self, test_client, test_policy, auth_headers):
        image_bytes = create_test_image_bytes(color='green')
        files = {"file": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")}
        data = {"policy_number": test_policy.policy_number}

        response = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response.status_code == 201
        result = response.json()
        assert result["idempotency_key"] is None

    def test_different_files_same_idempotency_key(self, test_client, test_policy, auth_headers):
        idempotency_key = "shared-key-001"

        image1 = create_test_image_bytes(color='red')
        files = {"file": ("red.jpg", io.BytesIO(image1), "image/jpeg")}
        data = {
            "policy_number": test_policy.policy_number,
            "idempotency_key": idempotency_key,
        }

        response1 = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response1.status_code == 201
        image1_id = response1.json()["id"]

        image2 = create_test_image_bytes(color='blue')
        files = {"file": ("blue.jpg", io.BytesIO(image2), "image/jpeg")}

        response2 = test_client.post(
            "/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )

        assert response2.status_code == 201
        result2 = response2.json()
        assert result2["id"] == image1_id
        assert "red" in result2["file_name"].lower()
