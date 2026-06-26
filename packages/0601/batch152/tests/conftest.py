import os
import io
import json
import hashlib
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timezone, timedelta
from io import BytesIO

import pytest
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from moto import mock_aws
import boto3

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, get_db
from app.config import settings
from app import models, crud, schemas
from app.models import UserRole, ImageStatus
from main import app

TEST_DATABASE_URL = "sqlite:///./test.db"
TEST_BUCKET = "test-claim-images"


@pytest.fixture(scope="function")
def db_engine():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test.db"):
        os.remove("./test.db")


@pytest.fixture(scope="function")
def db_session(db_engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def mock_s3():
    with mock_aws():
        s3 = boto3.client("s3", region_name="us-east-1")
        s3.create_bucket(Bucket=TEST_BUCKET)
        yield s3


@pytest.fixture(scope="function")
def mock_storage(mock_s3):
    class FakeStorage:
        def __init__(self):
            self.bucket_name = TEST_BUCKET
            self.files = {}

        def upload_file(self, file_data, file_name, content_type, file_size, policy_number):
            import uuid
            unique_id = str(uuid.uuid4())
            file_ext = file_name.split('.')[-1].lower() if '.' in file_name else 'jpg'
            object_name = f"{policy_number}/{unique_id}.{file_ext}"

            content = file_data.read() if hasattr(file_data, 'read') else file_data
            mock_s3.put_object(
                Bucket=TEST_BUCKET,
                Key=object_name,
                Body=content,
                ContentType=content_type
            )

            self.files[object_name] = content
            return object_name, f"http://minio/{TEST_BUCKET}/{object_name}"

        def get_file_url(self, object_name, expires=3600):
            return f"http://minio/{TEST_BUCKET}/{object_name}"

        def delete_file(self, object_name):
            if object_name in self.files:
                del self.files[object_name]
                mock_s3.delete_object(Bucket=TEST_BUCKET, Key=object_name)
            return True

    return FakeStorage()


@pytest.fixture(scope="function")
def mock_ocr():
    with patch('app.ocr_service.perform_ocr') as mock:
        mock.return_value = ("京A12345", "LBV1Z3108KM000001", "京A12345 识别文本 LBV1Z3108KM000001")
        yield mock


@pytest.fixture(scope="function")
def mock_webhook():
    with patch('app.webhook_service.httpx.AsyncClient') as mock_client:
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_instance = MagicMock()
        mock_instance.post = AsyncMock(return_value=mock_response)
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=False)
        mock_client.return_value = mock_instance
        yield mock_client


@pytest.fixture(scope="function")
def mock_watermark():
    def fake_watermark(image_data, surveyor_username, photo_time, content_type):
        return image_data
    with patch('app.watermark_service.add_watermark', side_effect=fake_watermark) as mock:
        yield mock


@pytest.fixture(scope="function")
def test_client(db_session, mock_storage, mock_ocr, mock_webhook, mock_watermark):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_storage():
        return mock_storage

    app.dependency_overrides[get_db] = override_get_db

    with patch('app.routers.images.storage', mock_storage), \
         patch('app.routers.images.perform_ocr', mock_ocr), \
         patch('app.routers.images.notify_if_images_complete', AsyncMock(return_value=True)):
        client = TestClient(app)
        yield client

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_user(db_session):
    user = crud.create_user(
        db_session,
        schemas.UserCreate(
            username="test_surveyor",
            full_name="测试查勘员",
            password="test123",
            role=UserRole.SURVEYOR
        )
    )
    return user


@pytest.fixture(scope="function")
def test_policy(db_session):
    policy = crud.create_policy(
        db_session,
        schemas.PolicyCreate(
            policy_number="TEST2024000001",
            policy_holder_name="测试农户",
            insurance_type="水稻种植保险",
            insured_amount=50000.0
        )
    )
    return policy


@pytest.fixture(scope="function")
def auth_headers(test_client, test_user):
    response = test_client.post(
        "/token",
        data={"username": test_user.username, "password": "test123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_test_image_bytes(format='JPEG', size=(800, 600), color='red'):
    img = Image.new('RGB', size, color)
    buf = BytesIO()
    img.save(buf, format=format)
    buf.seek(0)
    return buf.read()
