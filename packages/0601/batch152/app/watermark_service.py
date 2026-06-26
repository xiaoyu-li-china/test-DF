import logging
from io import BytesIO
from datetime import datetime
from typing import Tuple
from PIL import Image, ImageDraw, ImageFont
from .config import settings

logger = logging.getLogger(__name__)


def get_watermark_position(
    image_size: Tuple[int, int],
    text_size: Tuple[int, int],
    position: str,
    margin: int = 20
) -> Tuple[int, int]:
    img_width, img_height = image_size
    text_width, text_height = text_size

    positions = {
        "top-left": (margin, margin),
        "top-right": (img_width - text_width - margin, margin),
        "bottom-left": (margin, img_height - text_height - margin),
        "bottom-right": (img_width - text_width - margin, img_height - text_height - margin),
        "center": ((img_width - text_width) // 2, (img_height - text_height) // 2),
    }
    return positions.get(position, positions["bottom-right"])


def try_load_font(size: int) -> ImageFont.FreeTypeFont:
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/System/Library/Fonts/PingFang.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
    ]
    for path in font_paths:
        try:
            return ImageFont.truetype(path, size)
        except (IOError, OSError):
            continue
    return ImageFont.load_default()


def add_watermark(
    image_data: bytes,
    surveyor_username: str,
    photo_time: datetime,
    content_type: str
) -> bytes:
    if not settings.WATERMARK_ENABLED:
        return image_data

    try:
        image = Image.open(BytesIO(image_data))
        if image.mode != 'RGBA':
            image = image.convert('RGBA')

        watermark = Image.new('RGBA', image.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(watermark)

        font = try_load_font(settings.WATERMARK_FONT_SIZE)
        time_str = photo_time.strftime("%Y-%m-%d %H:%M:%S")
        watermark_text = f"查勘员: {surveyor_username} | 拍摄时间: {time_str}"

        try:
            bbox = draw.textbbox((0, 0), watermark_text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
        except AttributeError:
            text_width, text_height = draw.textsize(watermark_text, font=font)

        position = get_watermark_position(
            image.size,
            (text_width, text_height),
            settings.WATERMARK_POSITION
        )

        alpha = int(255 * settings.WATERMARK_OPACITY)
        draw.text(position, watermark_text, font=font, fill=(0, 0, 0, alpha))
        draw.text((position[0] + 1, position[1] + 1), watermark_text, font=font, fill=(255, 255, 255, alpha // 2))

        result = Image.alpha_composite(image, watermark)

        output = BytesIO()
        if 'jpeg' in content_type.lower() or 'jpg' in content_type.lower():
            result = result.convert('RGB')
            result.save(output, format='JPEG', quality=95)
        elif 'png' in content_type.lower():
            result.save(output, format='PNG')
        else:
            result = result.convert('RGB')
            result.save(output, format='JPEG', quality=95)

        return output.getvalue()
    except Exception as e:
        logger.error(f"Watermark error: {e}")
        return image_data
