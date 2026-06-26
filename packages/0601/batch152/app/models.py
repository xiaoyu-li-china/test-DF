from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


class UserRole(str, enum.Enum):
    SURVEYOR = "surveyor"
    ADMIN = "admin"


class ImageStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "已通过"
    NEEDS_RESHOOT = "需补拍"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.SURVEYOR, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    images = relationship("ClaimImage", back_populates="uploaded_by")


class Policy(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, index=True)
    policy_number = Column(String, unique=True, index=True, nullable=False)
    policy_holder_name = Column(String, nullable=False)
    insurance_type = Column(String, nullable=False)
    insured_amount = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    images = relationship("ClaimImage", back_populates="policy")


class ClaimImage(Base):
    __tablename__ = "claim_images"

    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("policies.id"), nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String, index=True, nullable=True)
    idempotency_key = Column(String, unique=True, index=True, nullable=True)

    gps_latitude = Column(Float, nullable=True)
    gps_longitude = Column(Float, nullable=True)
    photo_timestamp = Column(DateTime(timezone=True), nullable=True)
    incident_location = Column(String, nullable=True)

    ocr_license_plate = Column(String, nullable=True)
    ocr_vin_number = Column(String, nullable=True)
    ocr_raw_text = Column(String, nullable=True)
    ocr_processed = Column(String, nullable=True)

    status = Column(Enum(ImageStatus), default=ImageStatus.PENDING, nullable=False)
    remark = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    policy = relationship("Policy", back_populates="images")
    uploaded_by = relationship("User", back_populates="images")
