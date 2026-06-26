from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional
from .models import UserRole, ImageStatus


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserBase(BaseModel):
    username: str
    full_name: str
    role: UserRole = UserRole.SURVEYOR


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PolicyBase(BaseModel):
    policy_number: str
    policy_holder_name: str
    insurance_type: str
    insured_amount: float


class PolicyCreate(PolicyBase):
    pass


class PolicyResponse(PolicyBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ImageBase(BaseModel):
    gps_latitude: Optional[float] = Field(None, description="GPS 纬度")
    gps_longitude: Optional[float] = Field(None, description="GPS 经度")
    photo_timestamp: Optional[datetime] = Field(None, description="照片拍摄时间戳")
    incident_location: Optional[str] = Field(None, description="出险地点")


class ImageUpload(ImageBase):
    policy_number: str = Field(..., description="保单号")
    idempotency_key: Optional[str] = Field(None, description="幂等性键，防止重复上传")


class ImageStatusUpdate(BaseModel):
    status: ImageStatus = Field(..., description="审核状态")
    remark: Optional[str] = Field(None, description="审核备注")


class ImageResponse(ImageBase):
    id: int
    policy_id: int
    uploaded_by_id: int
    file_name: str
    file_path: str
    content_type: str
    file_size: int
    file_hash: Optional[str] = None
    idempotency_key: Optional[str] = None
    ocr_license_plate: Optional[str] = None
    ocr_vin_number: Optional[str] = None
    ocr_raw_text: Optional[str] = None
    status: ImageStatus
    remark: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    file_url: Optional[str] = None

    class Config:
        from_attributes = True


class DailyStatsResponse(BaseModel):
    date: date
    upload_count: int
    total_size_bytes: int
    approved_count: int
    pending_count: int
    needs_reshoot_count: int
