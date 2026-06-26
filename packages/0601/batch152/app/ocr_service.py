import re
import logging
from io import BytesIO
from typing import Optional, Tuple
from PIL import Image
from .config import settings

logger = logging.getLogger(__name__)

try:
    import pytesseract
    if settings.TESSERACT_CMD:
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract not available, OCR will be disabled")


LICENSE_PLATE_PATTERNS = [
    r'[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-Z0-9]{5}',
    r'[A-Z]{2}[A-Z0-9]{5}',
    r'[A-Z]{1,2}\d{5,6}',
]

VIN_PATTERNS = [
    r'[A-HJ-NPR-Z0-9]{17}',
]


def clean_text(text: str) -> str:
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', '', text)
    return text.upper()


def extract_license_plate(text: str) -> Optional[str]:
    cleaned = clean_text(text)
    for pattern in LICENSE_PLATE_PATTERNS:
        matches = re.findall(pattern, cleaned)
        if matches:
            return matches[0]
    return None


def extract_vin_number(text: str) -> Optional[str]:
    cleaned = clean_text(text)
    for pattern in VIN_PATTERNS:
        matches = re.findall(pattern, cleaned)
        for match in matches:
            if len(match) == 17 and 'I' not in match and 'O' not in match and 'Q' not in match:
                return match
    return None


def perform_ocr(image_data: bytes) -> Tuple[Optional[str], Optional[str], str]:
    if not settings.OCR_ENABLED or not TESSERACT_AVAILABLE:
        return None, None, ""

    try:
        image = Image.open(BytesIO(image_data))
        text = pytesseract.image_to_string(image, lang=settings.TESSERACT_LANG)

        license_plate = extract_license_plate(text)
        vin_number = extract_vin_number(text)

        logger.info(f"OCR completed - Plate: {license_plate}, VIN: {vin_number}")
        return license_plate, vin_number, text.strip()
    except Exception as e:
        logger.error(f"OCR error: {e}")
        return None, None, ""
