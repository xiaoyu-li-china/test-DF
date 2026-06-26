from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/agri_insurance"
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_SECURE: bool = False
    MINIO_BUCKET_NAME: str = "claim-images"

    OCR_ENABLED: bool = True
    TESSERACT_CMD: str = "/usr/bin/tesseract"
    TESSERACT_LANG: str = "chi_sim+eng"

    WATERMARK_ENABLED: bool = True
    WATERMARK_FONT_SIZE: int = 24
    WATERMARK_OPACITY: float = 0.6
    WATERMARK_POSITION: str = "bottom-right"

    WEBHOOK_ENABLED: bool = True
    WEBHOOK_URL: str = "http://claim-system.example.com/webhook/image-ready"
    WEBHOOK_SECRET: str = "your-webhook-secret"
    WEBHOOK_TIMEOUT: int = 10
    REQUIRED_IMAGE_COUNT: int = 3

    class Config:
        env_file = ".env"


settings = Settings()
