from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Tuple
from datetime import datetime, date, timezone
from . import models, schemas
from .auth import get_password_hash
from .models import ImageStatus


def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_policy(db: Session, policy_id: int):
    return db.query(models.Policy).filter(models.Policy.id == policy_id).first()


def get_policy_by_number(db: Session, policy_number: str):
    return db.query(models.Policy).filter(models.Policy.policy_number == policy_number).first()


def create_policy(db: Session, policy: schemas.PolicyCreate):
    db_policy = models.Policy(
        policy_number=policy.policy_number,
        policy_holder_name=policy.policy_holder_name,
        insurance_type=policy.insurance_type,
        insured_amount=policy.insured_amount
    )
    db.add(db_policy)
    db.commit()
    db.refresh(db_policy)
    return db_policy


def get_image_by_idempotency_key(db: Session, idempotency_key: str):
    return db.query(models.ClaimImage).filter(
        models.ClaimImage.idempotency_key == idempotency_key
    ).first()


def get_image_by_file_hash(db: Session, file_hash: str, policy_id: int):
    return db.query(models.ClaimImage).filter(
        models.ClaimImage.file_hash == file_hash,
        models.ClaimImage.policy_id == policy_id
    ).first()


def create_claim_image(
    db: Session,
    policy_id: int,
    uploaded_by_id: int,
    file_name: str,
    file_path: str,
    content_type: str,
    file_size: int,
    file_hash: Optional[str] = None,
    idempotency_key: Optional[str] = None,
    gps_latitude: Optional[float] = None,
    gps_longitude: Optional[float] = None,
    photo_timestamp: Optional[datetime] = None,
    incident_location: Optional[str] = None,
    ocr_license_plate: Optional[str] = None,
    ocr_vin_number: Optional[str] = None,
    ocr_raw_text: Optional[str] = None
):
    db_image = models.ClaimImage(
        policy_id=policy_id,
        uploaded_by_id=uploaded_by_id,
        file_name=file_name,
        file_path=file_path,
        content_type=content_type,
        file_size=file_size,
        file_hash=file_hash,
        idempotency_key=idempotency_key,
        gps_latitude=gps_latitude,
        gps_longitude=gps_longitude,
        photo_timestamp=photo_timestamp,
        incident_location=incident_location,
        ocr_license_plate=ocr_license_plate,
        ocr_vin_number=ocr_vin_number,
        ocr_raw_text=ocr_raw_text,
        status=ImageStatus.PENDING
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image


def get_images_by_policy_number(db: Session, policy_number: str) -> List[models.ClaimImage]:
    policy = get_policy_by_number(db, policy_number)
    if not policy:
        return []
    return db.query(models.ClaimImage).filter(models.ClaimImage.policy_id == policy.id).order_by(models.ClaimImage.created_at.desc()).all()


def get_image_by_id(db: Session, image_id: int):
    return db.query(models.ClaimImage).filter(models.ClaimImage.id == image_id).first()


def update_image_status(
    db: Session,
    image_id: int,
    status: ImageStatus,
    remark: Optional[str] = None
):
    db_image = get_image_by_id(db, image_id)
    if db_image:
        db_image.status = status
        if remark is not None:
            db_image.remark = remark
        db.commit()
        db.refresh(db_image)
    return db_image


def get_daily_stats(db: Session, target_date: date, tz_offset_hours: int = 8) -> Tuple[int, int, int, int, int]:
    from datetime import timedelta

    tz = timezone(timedelta(hours=tz_offset_hours))
    start_of_day = datetime(target_date.year, target_date.month, target_date.day, tzinfo=tz)
    end_of_day = start_of_day + timedelta(days=1)

    start_utc = start_of_day.astimezone(timezone.utc)
    end_utc = end_of_day.astimezone(timezone.utc)

    query = db.query(models.ClaimImage).filter(
        models.ClaimImage.created_at >= start_utc,
        models.ClaimImage.created_at < end_utc
    )

    images = query.all()

    upload_count = len(images)
    total_size = sum(img.file_size for img in images)
    approved_count = sum(1 for img in images if img.status == ImageStatus.APPROVED)
    pending_count = sum(1 for img in images if img.status == ImageStatus.PENDING)
    needs_reshoot_count = sum(1 for img in images if img.status == ImageStatus.NEEDS_RESHOOT)

    return upload_count, total_size, approved_count, pending_count, needs_reshoot_count
