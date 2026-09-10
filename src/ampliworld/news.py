from __future__ import annotations

import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


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

