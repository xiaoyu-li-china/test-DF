import os
import tempfile
from pathlib import Path

import pytest

from scanner import scan_from_image, scan_folder


class TestScanFromImage:
    def test_scan_0_degrees(self, temp_barcodes):
        path = temp_barcodes("9780439358064", angle=0)
        assert scan_from_image(path) == "9780439358064"

    def test_scan_90_degrees(self, temp_barcodes):
        path = temp_barcodes("9780439358064", angle=90)
        assert scan_from_image(path) == "9780439358064"

    def test_scan_180_degrees(self, temp_barcodes):
        path = temp_barcodes("9780439358064", angle=180)
        assert scan_from_image(path) == "9780439358064"

    def test_scan_270_degrees(self, temp_barcodes):
        path = temp_barcodes("9780439358064", angle=270)
        assert scan_from_image(path) == "9780439358064"

    def test_scan_jpeg_format(self, temp_barcodes):
        path = temp_barcodes("9780140328721", angle=0, suffix=".jpg")
        assert scan_from_image(path) == "9780140328721"

    def test_scan_nonexistent_file(self):
        with pytest.raises(FileNotFoundError):
            scan_from_image("/nonexistent/file.png")


class TestScanFolder:
    def test_scan_folder_multiple_images(self, temp_barcodes):
        with tempfile.TemporaryDirectory() as tmpdir:
            paths = []
            for i, angle in enumerate([0, 90, 180]):
                p = os.path.join(tmpdir, f"book{i}.png")
                Path(temp_barcodes("9780439358064", angle)).rename(p)
                paths.append(p)

            results = scan_folder(tmpdir)
            assert len(results) == 3
            success = [isbn for _, isbn in results if isbn == "9780439358064"]
            assert len(success) == 3

    def test_scan_folder_mixed_success_fail(self, temp_barcodes):
        with tempfile.TemporaryDirectory() as tmpdir:
            p1 = os.path.join(tmpdir, "book1.png")
            Path(temp_barcodes("9780439358064", 0)).rename(p1)

            from PIL import Image

            no_barcode = Image.new("RGB", (200, 200), color="red")
            no_barcode.save(os.path.join(tmpdir, "blank.jpg"))

            results = scan_folder(tmpdir)
            assert len(results) == 2
            isbns = [isbn for _, isbn in results if isbn]
            assert len(isbns) == 1
            assert isbns[0] == "9780439358064"

    def test_scan_folder_sorted(self, temp_barcodes):
        with tempfile.TemporaryDirectory() as tmpdir:
            for name in ["zebra.png", "apple.jpg", "mango.jpeg"]:
                p = os.path.join(tmpdir, name)
                Path(temp_barcodes("9780439358064", 0)).rename(p)

            results = scan_folder(tmpdir)
            names = [Path(p).name for p, _ in results]
            assert names == ["apple.jpg", "mango.jpeg", "zebra.png"]

    def test_scan_empty_folder(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            results = scan_folder(tmpdir)
            assert results == []

    def test_scan_folder_ignores_non_images(self, temp_barcodes):
        with tempfile.TemporaryDirectory() as tmpdir:
            p = os.path.join(tmpdir, "book1.png")
            Path(temp_barcodes("9780439358064", 0)).rename(p)
            with open(os.path.join(tmpdir, "notes.txt"), "w") as f:
                f.write("not an image")

            results = scan_folder(tmpdir)
            assert len(results) == 1
            assert results[0][1] == "9780439358064"
