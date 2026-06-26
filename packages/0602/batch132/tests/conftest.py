import io
import os
import tempfile

import pytest
from PIL import Image

try:
    import barcode
    from barcode.writer import ImageWriter
except ImportError:
    pytest.skip("python-barcode not installed", allow_module_level=True)


def generate_barcode_image(isbn: str, angle: int = 0, bg_color: str = "white") -> Image.Image:
    ean = barcode.get("ean13", isbn, writer=ImageWriter())
    fp = io.BytesIO()
    ean.write(fp, options={"write_text": False, "quiet_zone": 2, "module_width": 0.5})
    fp.seek(0)
    img = Image.open(fp).convert("RGB")

    if bg_color != "white":
        bg = Image.new("RGB", img.size, bg_color)
        bg.paste(img, (0, 0), img.split()[3] if img.mode == "RGBA" else None)
        img = bg

    if angle:
        img = img.rotate(angle, expand=True)

    return img


def save_temp_barcode(isbn: str, angle: int = 0, suffix: str = ".png") -> str:
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    img = generate_barcode_image(isbn, angle)
    img.save(path)
    return path


@pytest.fixture
def temp_barcodes():
    paths = []

    def _make(isbn, angle=0, suffix=".png"):
        path = save_temp_barcode(isbn, angle, suffix)
        paths.append(path)
        return path

    yield _make

    for p in paths:
        if os.path.exists(p):
            os.unlink(p)
