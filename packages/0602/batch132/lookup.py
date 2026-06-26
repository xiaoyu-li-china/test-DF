import requests

OPENLIBRARY_API = "https://openlibrary.org/api/books"


def lookup_isbn(isbn: str) -> dict | None:
    params = {
        "bibkeys": f"ISBN:{isbn}",
        "format": "json",
        "jscmd": "data",
    }
    try:
        resp = requests.get(OPENLIBRARY_API, params=params, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"查询 Open Library 失败: {exc}")
        return None

    data = resp.json()
    key = f"ISBN:{isbn}"
    if key not in data:
        return None

    book = data[key]
    authors = ", ".join(a.get("name", "") for a in book.get("authors", []))
    publishers = ", ".join(p.get("name", "") for p in book.get("publishers", []))
    return {
        "isbn": isbn,
        "title": book.get("title", ""),
        "authors": authors,
        "publishers": publishers,
        "publish_date": book.get("publish_date", ""),
        "pages": book.get("number_of_pages", 0) or 0,
        "cover_url": book.get("cover", {}).get("medium", ""),
    }
