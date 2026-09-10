from __future__ import annotations

import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


WORLD_NEWS_QUERIES = (
    "war security geopolitics sanctions",
    "politics policy election regulation tariffs",
    "economy inflation interest rates banking credit",
    "currency dollar euro yen foreign exchange",
    "food restaurants grocery consumer spending",
    "travel airlines hotels tourism bookings",
    "fashion apparel luxury consumer demand",
    "electronics smartphones computers semiconductor demand",
    "energy oil gas gold uranium copper mining",
    "healthcare biotech drugs disease",
    "technology AI software cloud cybersecurity",
    "climate weather disaster agriculture supply chain",
)


def fetch_google_news(query: str, limit: int = 10) -> list[dict[str, str]]:
    params = urllib.parse.urlencode({"q": query, "hl": "en-US", "gl": "US", "ceid": "US:en"})
    url = f"https://news.google.com/rss/search?{params}"
    request = urllib.request.Request(url, headers={"User-Agent": "AmpliWorld/0.1 research"})
    with urllib.request.urlopen(request, timeout=20) as response:
        root = ET.fromstring(response.read())
    items = []
    for item in root.findall("./channel/item")[:limit]:
        items.append(
            {
                "title": item.findtext("title", default=""),
                "url": item.findtext("link", default=""),
                "published": item.findtext("pubDate", default=""),
                "source": item.findtext("source", default=""),
            }
        )
    return items


def fetch_world_news(limit_per_domain: int = 5) -> list[dict[str, str]]:
    unique: dict[str, dict[str, str]] = {}
    for query in WORLD_NEWS_QUERIES:
        for item in fetch_google_news(query, limit_per_domain):
            item["query_domain"] = query
            unique[item["url"] or item["title"]] = item
    return list(unique.values())
