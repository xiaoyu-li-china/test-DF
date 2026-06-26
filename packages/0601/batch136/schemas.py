from pydantic import BaseModel, field_validator, model_validator
from datetime import datetime, timedelta
from typing import Optional
from enum import Enum
import re


class VisitorStatus(str, Enum):
    REGISTERED = "registered"
    CHECKED_OUT = "checked_out"
    OVERDUE = "overdue"


VISITOR_STATUS_DESC = {
    "registered": "已登记 - 访客已登记，正在小区内",
    "checked_out": "已签离 - 访客已离开小区",
    "overdue": "超时未离 - 访客超过预计停留时间仍未签离",
}


def validate_phone(v: str) -> str:
    if not re.match(r'^1[3-9]\d{9}$', v):
        raise ValueError('手机号格式不正确')
    return v


class VisitorCreate(BaseModel):
    name: str
    phone: str
    room_number: str
    estimated_stay: int
    photo_base64: Optional[str] = None

    @field_validator('phone')
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_phone(v)


class VisitorResponse(BaseModel):
    id: int
    name: str
    phone: str
    room_number: str
    estimated_stay: int
    photo_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    is_checked_out: bool
    status: VisitorStatus = VisitorStatus.REGISTERED

    model_config = {"from_attributes": True}

    @model_validator(mode='after')
    def compute_status(self) -> 'VisitorResponse':
        if self.is_checked_out:
            self.status = VisitorStatus.CHECKED_OUT
            return self
        expected_departure = self.check_in_time + timedelta(minutes=self.estimated_stay)
        if datetime.utcnow() > expected_departure:
            self.status = VisitorStatus.OVERDUE
        else:
            self.status = VisitorStatus.REGISTERED
        return self


class VisitorCheckOut(BaseModel):
    id: int


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class BlacklistCreate(BaseModel):
    phone: str
    reason: Optional[str] = None

    @field_validator('phone')
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_phone(v)


class BlacklistResponse(BaseModel):
    id: int
    phone: str
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WebhookConfigCreate(BaseModel):
    room_number: str
    webhook_url: str
    max_retries: Optional[int] = 3
    retry_delay_seconds: Optional[int] = 60


class WebhookConfigResponse(BaseModel):
    id: int
    room_number: str
    webhook_url: str
    max_retries: int
    retry_delay_seconds: int
    created_at: datetime

    class Config:
        from_attributes = True


class WebhookLogResponse(BaseModel):
    id: int
    visitor_id: int
    room_number: str
    webhook_url: str
    status: str
    retry_count: int
    max_retries: int
    last_attempt_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
