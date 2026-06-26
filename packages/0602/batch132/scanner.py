import ctypes.util
import os
import re
import sys
from pathlib import Path

_DARWIN_ZBAR_PATHS = ["/opt/homebrew/lib/libzbar.dylib", "/usr/local/lib/libzbar.dylib"]

if sys.platform == "darwin":
    _orig_find = ctypes.util.find_library
    def _patched_find(name):
        if name == "zbar":
            for p in _DARWIN_ZBAR_PATHS:
                if os.path.isfile(p):
                    return p
        return _orig_find(name)
    ctypes.util.find_library = _patched_find

from PIL import Image
from pyzbar.pyzbar import decode


def _extract_isbn(raw: str) -> str | None:
    cleaned = raw.replace("-", "").replace(" ", "")
    if re.match(r"^97[89]\d{10}$", cleaned):
        return cleaned
    if re.match(r"^\d{9}[\dXx]$", cleaned) and _is_valid_isbn10(cleaned):
        return _isbn10_to_13(cleaned)
    return None


def _is_valid_isbn10(isbn10: str) -> bool:
    total = 0
    for i in range(9):
        total += (10 - i) * int(isbn10[i])
    check_char = isbn10[9].upper()
    check_val = 10 if check_char == "X" else int(check_char)
    return (total + check_val) % 11 == 0


def _isbn10_to_13(isbn10: str) -> str:
    prefix = "978" + isbn10[:9]
    total = sum(int(d) * (1 if i % 2 == 0 else 3) for i, d in enumerate(prefix))
    check = (10 - total % 10) % 10
    return prefix + str(check)


def _try_decode(img) -> str | None:
    for obj in decode(img):
        isbn = _extract_isbn(obj.data.decode("utf-8", errors="ignore"))
        if isbn:
            return isbn
    return None


def scan_from_image(image_path: str) -> str | None:
    img = Image.open(image_path)
    for angle in [0, 90, 180, 270]:
        rotated = img.rotate(angle, expand=True) if angle else img
        isbn = _try_decode(rotated)
        if isbn:
            return isbn
    return None


def scan_from_camera() -> str | None:
    try:
        import cv2
    except ImportError:
        print("摄像头功能需要 opencv-python，请运行: pip install opencv-python")
        return None

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("无法打开摄像头")
        return None

    print("摄像头已开启，将书背面 ISBN 条码对准摄像头，按 'q' 退出...")
    isbn = None
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        decoded = decode(frame)
        for obj in decoded:
            found = _extract_isbn(obj.data.decode("utf-8", errors="ignore"))
            if found:
                isbn = found
                break
        if isbn:
            break
        cv2.imshow("bookscan - press q to quit", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    return isbn


def scan_folder(folder_path: str) -> list[tuple[str, str | None]]:
    folder = Path(folder_path)
    results: list[tuple[str, str | None]] = []
    exts = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff"}
    for f in sorted(folder.iterdir()):
        if f.is_file() and f.suffix.lower() in exts:
            isbn = scan_from_image(str(f))
            results.append((str(f), isbn))
    return results
