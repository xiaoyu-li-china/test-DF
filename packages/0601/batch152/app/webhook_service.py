import json
import logging
import hashlib
import hmac
from datetime import datetime
from typing import Dict, Any, Optional
import httpx
from .config import settings
from . import models

logger = logging.getLogger(__name__)


def generate_signature(payload: Dict[str, Any], secret: str) -> str:
    payload_str = json.dumps(payload, sort_keys=True, separators=(',', ':'))
    signature = hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature


async def send_webhook_notification(
    event_type: str,
    policy: models.Policy,
    images_data: Dict[str, Any]
) -> bool:
    if not settings.WEBHOOK_ENABLED:
        logger.info("Webhook is disabled, skipping notification")
        return False

    payload = {
        "event_type": event_type,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "policy": {
            "policy_number": policy.policy_number,
            "policy_holder_name": policy.policy_holder_name,
            "insurance_type": policy.insurance_type,
        },
        "images": images_data,
    }

    signature = generate_signature(payload, settings.WEBHOOK_SECRET)
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Event-Type": event_type,
    }

    try:
        async with httpx.AsyncClient(timeout=settings.WEBHOOK_TIMEOUT) as client:
            response = await client.post(
                settings.WEBHOOK_URL,
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            logger.info(f"Webhook sent successfully for policy {policy.policy_number}")
            return True
    except httpx.HTTPError as e:
        logger.error(f"Webhook HTTP error: {e}")
        return False
    except Exception as e:
        logger.error(f"Webhook unexpected error: {e}")
        return False


def check_images_complete(policy_id: int, db) -> bool:
    from . import crud
    from .models import ImageStatus

    images = db.query(models.ClaimImage).filter(
        models.ClaimImage.policy_id == policy_id,
        models.ClaimImage.status != ImageStatus.NEEDS_RESHOOT
    ).all()

    valid_images = [img for img in images if img.status in (ImageStatus.PENDING, ImageStatus.APPROVED)]
    return len(valid_images) >= settings.REQUIRED_IMAGE_COUNT


async def notify_if_images_complete(policy: models.Policy, db) -> bool:
    if check_images_complete(policy.id, db):
        images = db.query(models.ClaimImage).filter(
            models.ClaimImage.policy_id == policy.id
        ).all()

        images_info = {
            "total_count": len(images),
            "required_count": settings.REQUIRED_IMAGE_COUNT,
            "is_complete": True,
            "images": [
                {
                    "id": img.id,
                    "file_name": img.file_name,
                    "status": img.status.value,
                    "ocr_license_plate": img.ocr_license_plate,
                    "ocr_vin_number": img.ocr_vin_number,
                    "created_at": img.created_at.isoformat() if img.created_at else None,
                }
                for img in images
            ]
        }

        return await send_webhook_notification(
            event_type="images_ready_for_review",
            policy=policy,
            images_data=images_info
        )
    return False
