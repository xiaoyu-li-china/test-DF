from tool809.parser import parse_line, LogEntry


def test_parse_normal_line():
    line = (
        '192.168.1.1 - - [02/Jun/2026:10:15:30 +0800] '
        '"GET /index.html HTTP/1.1" 200 2326 "-" "Mozilla/5.0"'
    )
    entry = parse_line(line)
    assert isinstance(entry, LogEntry)
    assert entry.ip == "192.168.1.1"
    assert entry.method == "GET"
    assert entry.path == "/index.html"
    assert entry.status == 200
    assert entry.bytes_sent == 2326


def test_parse_post_request():
    line = (
        '10.0.0.2 - - [02/Jun/2026:10:15:31 +0800] '
        '"POST /api/login HTTP/1.1" 302 0 "-" "curl/8.1"'
    )
    entry = parse_line(line)
    assert entry is not None
    assert entry.method == "POST"
    assert entry.path == "/api/login"
    assert entry.status == 302


def test_parse_malformed_line_returns_none():
    assert parse_line("") is None
    assert parse_line("not a valid log line") is None


def test_parse_line_with_referer():
    line = (
        '192.168.1.1 - - [02/Jun/2026:10:15:32 +0800] '
        '"GET /style.css HTTP/1.1" 200 1520 '
        '"http://example.com/index.html" "Mozilla/5.0"'
    )
    entry = parse_line(line)
    assert entry is not None
    assert entry.referer == "http://example.com/index.html"
