from __future__ import annotations

import argparse
import json
import sys

from tool809.parser import parse_file
from tool809.stats import compute


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="tool809", description="Parse Nginx combined logs and compute stats")
    parser.add_argument("logfile", help="Path to Nginx combined log file")
    parser.add_argument("-n", "--top", type=int, default=10, help="Number of top URLs (default: 10)")
    parser.add_argument("-o", "--output", choices=["text", "json"], default="text", help="Output format (default: text)")
    args = parser.parse_args(argv)

    entries = parse_file(args.logfile)
    result = compute(entries, top_n=args.top)

    if args.output == "json":
        doc = {
            "unique_ips": result.unique_ips,
            "status_distribution": result.status_distribution,
            "top_urls": [{"url": url, "count": count} for url, count in result.top_urls],
        }
        json.dump(doc, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")
    else:
        print(f"Unique IPs: {result.unique_ips}")
        print()
        print("Status code distribution:")
        for bucket in ("2xx", "3xx", "4xx", "5xx", "other"):
            if bucket in result.status_distribution:
                print(f"  {bucket}: {result.status_distribution[bucket]}")
        print()
        print(f"Top {args.top} URLs:")
        for url, count in result.top_urls:
            print(f"  {count:>6}  {url}")


if __name__ == "__main__":
    main()
