from __future__ import annotations

import re
from dataclasses import dataclass

_NGINX_COMBINED_RE = re.compile(
    r'(?P<ip>\S+)\s'
    r'\S+\s'
    r'\S+\s'
    r'\[(?P<time>[^\]]+)\]\s'
    r'"(?P<request>[^"]*)"\s'
    r'(?P<status>\d{3})\s'
    r'(?P<bytes>\d+)\s'
    r'"(?P<referer>[^"]*)"\s'
    r'"(?P<user_agent>[^"]*)"'
)


@dataclass
class LogEntry:
    ip: str
    time: str
    method: str
    path: str
    status: int
    bytes_sent: int
    referer: str
    user_agent: str


def parse_line(line: str) -> LogEntry | None:
    line = line.strip()
    if not line:
        return None
    m = _NGINX_COMBINED_RE.match(line)
    if not m:
        return None
    request = m.group("request")
    parts = request.split(" ", 2)
    method = parts[0] if len(parts) >= 1 else ""
    path = parts[1] if len(parts) >= 2 else request
    return LogEntry(
        ip=m.group("ip"),
        time=m.group("time"),
        method=method,
        path=path,
        status=int(m.group("status")),
        bytes_sent=int(m.group("bytes")),
        referer=m.group("referer"),
        user_agent=m.group("user_agent"),
    )


def parse_file(path: str) -> list[LogEntry]:
    entries: list[LogEntry] = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            entry = parse_line(line)
            if entry is not None:
                entries.append(entry)
    return entries
