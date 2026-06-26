from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserCreate(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True


class ProtectedResourceCreate(BaseModel):
    name: str
    content: str


class ProtectedResourceResponse(BaseModel):
    id: int
    name: str
    content: str
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True
