#!/usr/bin/env python3
"""
CreatorOS Standalone Scraper
Usage: python scraper.py --keywords fitness workout --platforms youtube instagram --max-results 8
Output: JSON array of creator objects to stdout
"""

import sys
import os
import json
import argparse
import urllib.request
import urllib.parse
import urllib.error

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
APIFY_TOKEN = os.environ.get("APIFY_TOKEN", "")


def yt_request(endpoint: str, params: dict) -> dict:
    params["key"] = YOUTUBE_API_KEY
    url = "https://www.googleapis.com/youtube/v3/" + endpoint + "?" + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        print(f"[YouTube API error] {e}", file=sys.stderr)
        return {"items": []}


def search_youtube(keywords: list[str], max_results: int) -> list[dict]:
    if not YOUTUBE_API_KEY:
        print("[YouTube] No API key found, skipping.", file=sys.stderr)
        return []

    query = " ".join(keywords)
    search = yt_request("search", {
        "part": "snippet",
        "type": "channel",
        "q": query,
        "maxResults": max_results,
        "relevanceLanguage": "en",
    })

    channel_ids = [item["id"]["channelId"] for item in search.get("items", []) if item.get("id", {}).get("channelId")]
    if not channel_ids:
        return []

    stats_data = yt_request("channels", {
        "part": "statistics,snippet",
        "id": ",".join(channel_ids),
    })

    creators = []
    for ch in stats_data.get("items", []):
        stats = ch.get("statistics", {})
        snippet = ch.get("snippet", {})
        subscribers = int(stats.get("subscriberCount", 0))
        view_count = int(stats.get("viewCount", 0))
        video_count = max(int(stats.get("videoCount", 1)), 1)
        avg_views = view_count / video_count
        engagement_rate = round((avg_views / max(subscribers, 1)) * 100, 2) if subscribers else 0

        custom_url = snippet.get("customUrl", "")
        handle = f"@{custom_url.lstrip('@')}" if custom_url else f"@{ch['id'][:12]}"
        thumbnails = snippet.get("thumbnails", {})
        avatar = (thumbnails.get("high") or thumbnails.get("medium") or thumbnails.get("default") or {}).get("url", "")

        creators.append({
            "id": ch["id"],
            "name": snippet.get("title", "Unknown"),
            "handle": handle,
            "platform": "YouTube",
            "profileUrl": f"https://www.youtube.com/channel/{ch['id']}",
            "avatarUrl": avatar,
            "subscribers": subscribers,
            "viewCount": view_count,
            "engagementRate": engagement_rate,
            "totalLikes": 0,
            "niche": query,
            "description": snippet.get("description", "")[:200],
            "country": snippet.get("country", ""),
        })

    return creators


def search_instagram(keywords: list[str], max_results: int) -> list[dict]:
    if not APIFY_TOKEN:
        print("[Instagram] No Apify token found, skipping.", file=sys.stderr)
        return []

    url = (
        "https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper"
        f"/run-sync-get-dataset-items?token={APIFY_TOKEN}&timeout=60"
    )
    payload = json.dumps({
        "hashtags": keywords[:3],
        "resultsLimit": max_results * 3,
        "proxy": {"useApifyProxy": True},
    }).encode()

    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            posts = json.loads(r.read().decode())
    except Exception as e:
        print(f"[Apify error] {e}", file=sys.stderr)
        return []

    seen: set[str] = set()
    creators = []
    for post in posts:
        username = post.get("ownerUsername", "")
        if not username or username in seen:
            continue
        seen.add(username)
        creators.append({
            "id": post.get("ownerId", username),
            "name": post.get("ownerFullName", username),
            "handle": f"@{username}",
            "platform": "Instagram",
            "profileUrl": f"https://www.instagram.com/{username}",
            "avatarUrl": "",
            "subscribers": post.get("ownerFollowersCount", 0),
            "viewCount": 0,
            "engagementRate": 0,
            "totalLikes": post.get("likesCount", 0),
            "niche": " ".join(keywords),
            "description": (post.get("caption") or "")[:200],
            "country": "",
        })
        if len(creators) >= max_results:
            break

    return creators


def main() -> None:
    parser = argparse.ArgumentParser(description="CreatorOS Scraper")
    parser.add_argument("--keywords", nargs="+", default=["lifestyle"], help="Search keywords")
    parser.add_argument("--platforms", nargs="+", default=["youtube"], help="Platforms to scrape")
    parser.add_argument("--max-results", type=int, default=8, dest="max_results")
    args = parser.parse_args()

    platforms = [p.lower() for p in args.platforms]
    all_creators: list[dict] = []

    if "youtube" in platforms:
        all_creators.extend(search_youtube(args.keywords, args.max_results))

    if "instagram" in platforms:
        all_creators.extend(search_instagram(args.keywords, min(args.max_results, 5)))

    print(json.dumps(all_creators, ensure_ascii=False))


if __name__ == "__main__":
    main()
