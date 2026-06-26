from tool809.parser import LogEntry
from tool809.stats import compute, _status_bucket


def _make_entry(ip: str, path: str, status: int) -> LogEntry:
    return LogEntry(
        ip=ip,
        time="02/Jun/2026:10:15:30 +0800",
        method="GET",
        path=path,
        status=status,
        bytes_sent=100,
        referer="-",
        user_agent="test",
    )


def test_status_bucket_4xx():
    assert _status_bucket(400) == "4xx"
    assert _status_bucket(403) == "4xx"
    assert _status_bucket(404) == "4xx"
    assert _status_bucket(499) == "4xx"


def test_status_bucket_5xx():
    assert _status_bucket(500) == "5xx"
    assert _status_bucket(502) == "5xx"
    assert _status_bucket(503) == "5xx"
    assert _status_bucket(599) == "5xx"


def test_status_bucket_other_ranges():
    assert _status_bucket(200) == "2xx"
    assert _status_bucket(301) == "3xx"
    assert _status_bucket(100) == "other"


def test_unique_ips():
    entries = [
        _make_entry("1.1.1.1", "/", 200),
        _make_entry("1.1.1.1", "/a", 200),
        _make_entry("2.2.2.2", "/", 200),
    ]
    result = compute(entries)
    assert result.unique_ips == 2


def test_status_distribution():
    entries = [
        _make_entry("1.1.1.1", "/", 200),
        _make_entry("1.1.1.1", "/a", 404),
        _make_entry("2.2.2.2", "/", 500),
        _make_entry("3.3.3.3", "/b", 403),
        _make_entry("4.4.4.4", "/c", 302),
    ]
    result = compute(entries)
    assert result.status_distribution["2xx"] == 1
    assert result.status_distribution["3xx"] == 1
    assert result.status_distribution["4xx"] == 2
    assert result.status_distribution["5xx"] == 1


def test_top_urls():
    entries = [
        _make_entry("1.1.1.1", "/", 200),
        _make_entry("2.2.2.2", "/", 200),
        _make_entry("3.3.3.3", "/", 200),
        _make_entry("4.4.4.4", "/about", 200),
    ]
    result = compute(entries, top_n=5)
    assert result.top_urls[0] == ("/", 3)
    assert result.top_urls[1] == ("/about", 1)


def test_empty_entries():
    result = compute([])
    assert result.unique_ips == 0
    assert result.status_distribution == {}
    assert result.top_urls == []


def test_4xx_5xx_bucketing_from_log_entries():
    entries = [
        _make_entry("a", "/x", 400),
        _make_entry("b", "/y", 404),
        _make_entry("c", "/z", 403),
        _make_entry("d", "/u", 500),
        _make_entry("e", "/v", 503),
        _make_entry("f", "/w", 200),
    ]
    result = compute(entries)
    assert result.status_distribution["4xx"] == 3
    assert result.status_distribution["5xx"] == 2
    assert result.status_distribution["2xx"] == 1
