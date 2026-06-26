from minio import Minio
from minio.error import S3Error
from io import BytesIO
from typing import Optional, Tuple
import uuid
from .config import settings


class MinioStorage:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except S3Error as e:
            print(f"MinIO bucket error: {e}")

    def upload_file(
        self,
        file_data: BytesIO,
        file_name: str,
        content_type: str,
        file_size: int,
        policy_number: str
    ) -> Tuple[str, str]:
        unique_id = str(uuid.uuid4())
        file_ext = file_name.split('.')[-1].lower() if '.' in file_name else 'jpg'
        object_name = f"{policy_number}/{unique_id}.{file_ext}"

        self.client.put_object(
            bucket_name=self.bucket_name,
            object_name=object_name,
            data=file_data,
            length=file_size,
            content_type=content_type
        )

        return object_name, self.get_file_url(object_name)

    def get_file_url(self, object_name: str, expires: int = 3600) -> str:
        try:
            return self.client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                expires=expires
            )
        except S3Error:
            return ""

    def delete_file(self, object_name: str) -> bool:
        try:
            self.client.remove_object(self.bucket_name, object_name)
            return True
        except S3Error:
            return False


storage = MinioStorage()
