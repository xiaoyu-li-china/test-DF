import base64
import io
import os
import uuid
import asyncio
import json
import httpx
from PIL import Image
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import (
    PHOTO_DIR,
    THUMBNAIL_DIR,
    Blacklist,
    WebhookConfig,
    WebhookLog,
    SessionLocal,
)


def process_photo(photo_base64: str) -> tuple[str, str]:
    if photo_base64.startswith('data:image'):
        photo_base64 = photo_base64.split(',', 1)[1]

    try:
        image_data = base64.b64decode(photo_base64)
    except Exception:
        raise ValueError('照片base64格式不正确')

    image = Image.open(io.BytesIO(image_data))
    image = image.convert('RGB')

    file_id = uuid.uuid4().hex
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    filename = f'{timestamp}_{file_id}.jpg'

    photo_path = os.path.join(PHOTO_DIR, filename)
    image.save(photo_path, 'JPEG', quality=85)

    thumbnail = image.copy()
    thumbnail.thumbnail((200, 200))
    thumbnail_path = os.path.join(THUMBNAIL_DIR, filename)
    thumbnail.save(thumbnail_path, 'JPEG', quality=85)

    return photo_path, thumbnail_path


def check_blacklist(db: Session, phone: str) -> Blacklist | None:
    return db.query(Blacklist).filter(Blacklist.phone == phone).first()


def _create_webhook_log(
    db: Session,
    visitor_id: int,
    room_number: str,
    webhook_url: str,
    payload: dict,
    max_retries: int,
) -> WebhookLog:
    log = WebhookLog(
        visitor_id=visitor_id,
        room_number=room_number,
        webhook_url=webhook_url,
        payload=json.dumps(payload, ensure_ascii=False),
        max_retries=max_retries,
        status="pending",
        retry_count=0,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def _update_webhook_log(
    db: Session,
    log_id: int,
    status: str,
    error_message: str | None = None,
) -> None:
    log = db.query(WebhookLog).filter(WebhookLog.id == log_id).first()
    if log:
        log.status = status
        log.retry_count = log.retry_count + 1
        log.last_attempt_at = datetime.utcnow()
        log.error_message = error_message
        db.commit()


async def _attempt_webhook(
    db: Session,
    log_id: int,
    webhook_url: str,
    payload: dict,
    attempt: int,
) -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(webhook_url, json=payload)
            if 200 <= resp.status_code < 300:
                _update_webhook_log(db, log_id, "success")
                return True
            else:
                _update_webhook_log(
                    db,
                    log_id,
                    "failed",
                    error_message=f"HTTP {resp.status_code}: {resp.text[:200]}",
                )
                return False
    except Exception as e:
        _update_webhook_log(db, log_id, "failed", error_message=str(e)[:200])
        return False


async def _webhook_worker(
    db: Session,
    log_id: int,
    webhook_url: str,
    payload: dict,
    max_retries: int,
    retry_delay_seconds: int,
) -> None:
    for attempt in range(max_retries):
        success = await _attempt_webhook(db, log_id, webhook_url, payload, attempt)
        if success:
            return
        if attempt < max_retries - 1:
            delay = retry_delay_seconds * (2 ** attempt)
            await asyncio.sleep(delay)


async def send_webhook_notification(
    db: Session,
    room_number: str,
    visitor_name: str,
    visitor_phone: str,
    visitor_id: int,
) -> bool:
    config = db.query(WebhookConfig).filter(WebhookConfig.room_number == room_number).first()
    if not config:
        return False

    payload = {
        'event': 'visitor_arrived',
        'room_number': room_number,
        'visitor_name': visitor_name,
        'visitor_phone': visitor_phone,
        'visitor_id': visitor_id,
        'message': f'您的访客 {visitor_name} 已到',
        'timestamp': datetime.utcnow().isoformat()
    }

    log = _create_webhook_log(
        db,
        visitor_id=visitor_id,
        room_number=room_number,
        webhook_url=config.webhook_url,
        payload=payload,
        max_retries=config.max_retries,
    )

    asyncio.create_task(
        _webhook_worker(
            SessionLocal(),
            log.id,
            config.webhook_url,
            payload,
            config.max_retries,
            config.retry_delay_seconds,
        )
    )
    return True


async def retry_failed_webhooks(db: Session, hours: int = 24) -> int:
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    failed_logs = (
        db.query(WebhookLog)
        .filter(
            WebhookLog.status == "failed",
            WebhookLog.retry_count < WebhookLog.max_retries,
            WebhookLog.created_at >= cutoff,
        )
        .all()
    )
    count = 0
    for log in failed_logs:
        payload = json.loads(log.payload)
        asyncio.create_task(
            _webhook_worker(
                SessionLocal(),
                log.id,
                log.webhook_url,
                payload,
                log.max_retries - log.retry_count,
                60,
            )
        )
        count += 1
    return count
