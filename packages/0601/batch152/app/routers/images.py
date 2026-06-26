from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from io import BytesIO
import hashlib
from ..database import get_db
from .. import schemas, crud, models
from ..auth import get_current_user
from ..storage import storage
from ..ocr_service import perform_ocr
from ..watermark_service import add_watermark
from ..webhook_service import notify_if_images_complete

router = APIRouter(prefix="/images", tags=["理赔影像"])


def calculate_file_hash(file_content: bytes) -> str:
    return hashlib.sha256(file_content).hexdigest()


@router.post("/upload", response_model=schemas.ImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(..., description="现场照片文件"),
    policy_number: str = Form(..., description="保单号"),
    gps_latitude: Optional[float] = Form(None, description="GPS 纬度"),
    gps_longitude: Optional[float] = Form(None, description="GPS 经度"),
    photo_timestamp: Optional[datetime] = Form(None, description="照片拍摄时间戳"),
    incident_location: Optional[str] = Form(None, description="出险地点"),
    idempotency_key: Optional[str] = Form(None, description="幂等性键，前端生成唯一ID防止重复上传"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    policy = crud.get_policy_by_number(db, policy_number=policy_number)
    if not policy:
        raise HTTPException(status_code=404, detail="保单不存在")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="请上传图片文件")

    if idempotency_key:
        existing_image = crud.get_image_by_idempotency_key(db, idempotency_key=idempotency_key)
        if existing_image:
            response = schemas.ImageResponse.model_validate(existing_image)
            response.file_url = storage.get_file_url(existing_image.file_path)
            return response

    original_content = await file.read()
    file_hash = calculate_file_hash(original_content)

    existing_by_hash = crud.get_image_by_file_hash(db, file_hash=file_hash, policy_id=policy.id)
    if existing_by_hash:
        response = schemas.ImageResponse.model_validate(existing_by_hash)
        response.file_url = storage.get_file_url(existing_by_hash.file_path)
        return response

    license_plate, vin_number, ocr_text = perform_ocr(original_content)

    actual_photo_time = photo_timestamp or datetime.now()
    watermarked_content = add_watermark(
        image_data=original_content,
        surveyor_username=current_user.username,
        photo_time=actual_photo_time,
        content_type=file.content_type or "image/jpeg"
    )

    file_size = len(watermarked_content)
    file_data = BytesIO(watermarked_content)

    try:
        object_name, file_url = storage.upload_file(
            file_data=file_data,
            file_name=file.filename or "image.jpg",
            content_type=file.content_type or "image/jpeg",
            file_size=file_size,
            policy_number=policy_number
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")

    db_image = crud.create_claim_image(
        db=db,
        policy_id=policy.id,
        uploaded_by_id=current_user.id,
        file_name=file.filename or "image.jpg",
        file_path=object_name,
        content_type=file.content_type or "image/jpeg",
        file_size=file_size,
        file_hash=file_hash,
        idempotency_key=idempotency_key,
        gps_latitude=gps_latitude,
        gps_longitude=gps_longitude,
        photo_timestamp=actual_photo_time,
        incident_location=incident_location,
        ocr_license_plate=license_plate,
        ocr_vin_number=vin_number,
        ocr_raw_text=ocr_text
    )

    await notify_if_images_complete(policy, db)

    response = schemas.ImageResponse.model_validate(db_image)
    response.file_url = file_url
    return response


@router.get("/policy/{policy_number}", response_model=List[schemas.ImageResponse])
def get_policy_images(
    policy_number: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    policy = crud.get_policy_by_number(db, policy_number=policy_number)
    if not policy:
        raise HTTPException(status_code=404, detail="保单不存在")

    images = crud.get_images_by_policy_number(db, policy_number=policy_number)
    response_list = []
    for img in images:
        img_response = schemas.ImageResponse.model_validate(img)
        img_response.file_url = storage.get_file_url(img.file_path)
        response_list.append(img_response)
    return response_list


@router.get("/{image_id}", response_model=schemas.ImageResponse)
def get_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_image = crud.get_image_by_id(db, image_id=image_id)
    if not db_image:
        raise HTTPException(status_code=404, detail="影像不存在")

    response = schemas.ImageResponse.model_validate(db_image)
    response.file_url = storage.get_file_url(db_image.file_path)
    return response


@router.patch("/{image_id}/status", response_model=schemas.ImageResponse)
async def update_image_status(
    image_id: int,
    status_update: schemas.ImageStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_image = crud.get_image_by_id(db, image_id=image_id)
    if not db_image:
        raise HTTPException(status_code=404, detail="影像不存在")

    updated_image = crud.update_image_status(
        db=db,
        image_id=image_id,
        status=status_update.status,
        remark=status_update.remark
    )

    policy = crud.get_policy(db, policy_id=updated_image.policy_id)
    if policy:
        await notify_if_images_complete(policy, db)

    response = schemas.ImageResponse.model_validate(updated_image)
    response.file_url = storage.get_file_url(updated_image.file_path)
    return response


@router.post("/trigger-webhook/{policy_number}", status_code=status.HTTP_200_OK)
async def manual_trigger_webhook(
    policy_number: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    policy = crud.get_policy_by_number(db, policy_number=policy_number)
    if not policy:
        raise HTTPException(status_code=404, detail="保单不存在")

    success = await notify_if_images_complete(policy, db)
    return {
        "policy_number": policy_number,
        "webhook_triggered": success,
        "message": "影像齐全检测并发送通知" if success else "影像未达到齐全条件"
    }


@router.get("/stats/daily", response_model=schemas.DailyStatsResponse)
def get_daily_upload_stats(
    target_date: Optional[date] = None,
    timezone_offset: int = 8,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if target_date is None:
        from datetime import datetime as dt, timezone as tz, timedelta
        tz_info = tz(timedelta(hours=timezone_offset))
        target_date = dt.now(tz_info).date()

    upload_count, total_size, approved_count, pending_count, needs_reshoot_count = crud.get_daily_stats(
        db=db,
        target_date=target_date,
        tz_offset_hours=timezone_offset
    )

    return schemas.DailyStatsResponse(
        date=target_date,
        upload_count=upload_count,
        total_size_bytes=total_size,
        approved_count=approved_count,
        pending_count=pending_count,
        needs_reshoot_count=needs_reshoot_count
    )
