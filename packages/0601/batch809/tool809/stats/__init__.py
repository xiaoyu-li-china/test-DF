from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

from tool809.parser import LogEntry


@dataclass
class StatsResult:
    unique_ips: int = 0
    status_distribution: dict[str, int] = field(default_factory=dict)
    top_urls: list[tuple[str, int]] = field(default_factory=list)


def _status_bucket(code: int) -> str:
    if 200 <= code < 300:
        return "2xx"
    if 300 <= code < 400:
        return "3xx"
    if 400 <= code < 500:
        return "4xx"
    if 500 <= code < 600:
        return "5xx"
    return "other"


def compute(entries: list[LogEntry], top_n: int = 10) -> StatsResult:
    if not entries:
        return StatsResult()

    unique_ips = len({e.ip for e in entries})

    bucket_counter: Counter[str] = Counter()
    for e in entries:
        bucket_counter[_status_bucket(e.status)] += 1

    url_counter: Counter[str] = Counter()
    for e in entries:
        url_counter[e.path] += 1
    top_urls = url_counter.most_common(top_n)

    return StatsResult(
        unique_ips=unique_ips,
        status_distribution=dict(bucket_counter),
        top_urls=top_urls,
    )
