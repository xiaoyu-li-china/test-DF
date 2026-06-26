import pytest

from scanner import _extract_isbn, _is_valid_isbn10, _isbn10_to_13


class TestIsbn10Validation:
    def test_valid_isbn10_with_x(self):
        assert _is_valid_isbn10("043935806X") is True
        assert _is_valid_isbn10("006051518X") is True

    def test_valid_isbn10_lowercase_x(self):
        assert _is_valid_isbn10("043935806x") is True

    def test_valid_isbn10_numeric_check(self):
        assert _is_valid_isbn10("0140328726") is True

    def test_invalid_isbn10_wrong_check_digit(self):
        assert _is_valid_isbn10("0439358060") is False

    def test_invalid_isbn10_wrong_length(self):
        with pytest.raises(IndexError):
            _is_valid_isbn10("043935806")


class TestIsbn10To13Conversion:
    def test_convert_isbn10_with_x(self):
        assert _isbn10_to_13("043935806X") == "9780439358064"

    def test_convert_isbn10_numeric(self):
        assert _isbn10_to_13("0140328726") == "9780140328721"


class TestExtractIsbn:
    def test_extract_isbn13_direct(self):
        assert _extract_isbn("9780140328721") == "9780140328721"

    def test_extract_isbn10_with_x_converts(self):
        assert _extract_isbn("043935806X") == "9780439358064"

    def test_extract_isbn10_lowercase_x(self):
        assert _extract_isbn("043935806x") == "9780439358064"

    def test_extract_isbn10_numeric_converts(self):
        assert _extract_isbn("0140328726") == "9780140328721"

    def test_extract_with_hyphens_and_spaces(self):
        assert _extract_isbn("978-014-032-8721") == "9780140328721"
        assert _extract_isbn("0 439 35806 X") == "9780439358064"

    def test_extract_invalid_isbn10_returns_none(self):
        assert _extract_isbn("0439358060") is None

    def test_extract_non_isbn_returns_none(self):
        assert _extract_isbn("12345678") is None
        assert _extract_isbn("notanisbn") is None
        assert _extract_isbn("") is None

    def test_extract_isbn13_prefix_979(self):
        assert _extract_isbn("9790123456789") == "9790123456789"
