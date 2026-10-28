#!/usr/bin/env python3
"""TubeScout: free, self-hosted YouTube video-idea research.

Does the core of what paid "outlier finder" tools do:

  suggest  <seed>          What people type into YouTube search (no API key).
  channel  <@handle|URL>   Break down a channel: which videos popped, which
                           title formats it repeats, how it turns hits into series.
  outliers <query>         Search a niche for recent videos that got far more views
                           than their channel normally gets (needs a free API key).
  ideas    <query>         outliers + autocomplete -> list of title formats to test.
  niches   [seeds...]      Scan many niches; rank by new channels breaking through.
  transcripts <targets>    Save transcripts of videos / a channel's top videos.
  download <targets>       Download video, audio, subtitles, thumbnails (yt-dlp).
  quota                    API units used today; every response is cached in cache.db.

Every command writes an HTML report to ./reports/.

A free YouTube Data API v3 key (Google Cloud console) unlocks `outliers`, `ideas`
and full channel history. Put it in a .env file as YOUTUBE_API_KEY=... or export it.
Without a key, `suggest` works fully and `channel` uses the public RSS feed
(the latest 15 uploads).
"""

import argparse
import hashlib
import html
import json
import os
import re
import sqlite3
import statistics
import string
import sys
import time
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

API = "https://www.googleapis.com/youtube/v3"
SUGGEST_URL = "https://suggestqueries.google.com/complete/search"
RSS_URL = "https://www.youtube.com/feeds/videos.xml"
HERE = Path(__file__).resolve().parent
REPORTS = HERE / "reports"
CACHE_DB = HERE / "cache.db"
FRESH = False  # --fresh: ignore cached responses (still writes new ones)

# How long a cached answer stays good, in hours. Video/channel stats move, search
# results drift slowly, autocomplete and transcripts barely change.
TTL_HOURS = {"search": 24, "videos": 6, "channels": 24, "playlistItems": 6,
             "suggest": 24 * 7, "transcript": 24 * 365}
# YouTube Data API quota cost per call (10,000 free units/day, resets midnight Pacific).
QUOTA_COST = {"search": 100}
UA = {"User-Agent": "Mozilla/5.0 (TubeScout)"}

STOPWORDS = set("""a an the and or of in on at to for with from by is are was were be i you
your my we our it its this that these those how what why when who vs not no do does did
into out up as so if than then just about after before over under can will 1 2 3""".split())


# ---------------------------------------------------------------- helpers

def load_key():
    key = os.environ.get("YOUTUBE_API_KEY")
    if key:
        return key
    for env in (Path.cwd() / ".env", Path(__file__).resolve().parent / ".env"):
        if env.exists():
            for line in env.read_text().splitlines():
                if line.strip().startswith("YOUTUBE_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"\'')
    return None


def need_key():
    key = load_key()
    if not key:
        sys.exit("This command needs a free YouTube Data API key.\n"
                 "Get one: console.cloud.google.com -> new project -> enable "
                 "'YouTube Data API v3' -> Credentials -> API key.\n"
                 "Then: echo YOUTUBE_API_KEY=yourkey > tubescout/.env")
    return key


_db = None


def db():
    global _db
    if _db is None:
        _db = sqlite3.connect(CACHE_DB)
        _db.execute("CREATE TABLE IF NOT EXISTS cache (k TEXT PRIMARY KEY, kind TEXT, at REAL, v TEXT)")
        _db.execute("CREATE TABLE IF NOT EXISTS quota (day TEXT PRIMARY KEY, units INTEGER)")
    return _db


def cache_get(kind, ident):
    k = hashlib.sha1(f"{kind}|{ident}".encode()).hexdigest()
    if FRESH:
        return k, None
    row = db().execute("SELECT at, v FROM cache WHERE k=?", (k,)).fetchone()
    if row and time.time() - row[0] < TTL_HOURS.get(kind, 24) * 3600:
        return k, json.loads(row[1])
    return k, None


def cache_put(k, kind, value):
    db().execute("REPLACE INTO cache VALUES (?,?,?,?)", (k, kind, time.time(), json.dumps(value)))
    db().commit()


def quota_day():
    # YouTube resets quota at midnight Pacific; UTC-8 is close enough for a counter.
    return (datetime.now(timezone.utc) - timedelta(hours=8)).strftime("%Y-%m-%d")


def spend(units):
    db().execute("INSERT INTO quota VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET units = units + ?",
                 (quota_day(), units, units))
    db().commit()


def api(endpoint, key, **params):
    ident = json.dumps({"e": endpoint, **params}, sort_keys=True)
    k, hit = cache_get(endpoint, ident)
    if hit is not None:
        return hit
    r = requests.get(f"{API}/{endpoint}", params={**params, "key": key}, timeout=30)
    data = r.json()
    if "error" in data:
        sys.exit(f"YouTube API error: {data['error'].get('message')}")
    spend(QUOTA_COST.get(endpoint, 1))
    cache_put(k, endpoint, data)
    return data


def chunks(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def parse_duration(iso):
    m = re.match(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    if not m:
        return 0
    d, h, mi, s = (int(x or 0) for x in m.groups())
    return d * 86400 + h * 3600 + mi * 60 + s


def age_days(published):
    dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
    return max((datetime.now(timezone.utc) - dt).total_seconds() / 86400, 0.1)


def fmt(n):
    n = float(n)
    for unit, div in (("B", 1e9), ("M", 1e6), ("K", 1e3)):
        if abs(n) >= div:
            return f"{n / div:.1f}{unit}"
    return f"{n:.0f}"


def title_template(title):
    """'Zombie Outbreak: 60 Days Locked Inside a School (Part 2)'
    -> 'zombie outbreak: N days locked inside a school'"""
    t = title.lower()
    t = re.sub(r"\(?\s*part\s*\d+\s*\)?", "", t)
    t = re.sub(r"[#|].*$", "", t)
    t = re.sub(r"\$?\d[\d,.]*(?:\s?(?:k|m|%)\b)?", "N", t)
    return re.sub(r"\s+", " ", t).strip(" -:")


def format_family(titles):
    """Group titles by their shared opening words (the 'format'), e.g.
    'zombie outbreak: N days ...'. Returns {prefix: [titles]} for repeated prefixes."""
    families = defaultdict(list)
    for t in titles:
        words = title_template(t).split()
        for n in (4, 3, 2):
            if len(words) > n:
                families[" ".join(words[:n]) + " …"].append(t)
                families["… " + " ".join(words[-n:])].append(t)
    # keep the longest prefix that still covers >= 2 titles, drop sub-prefixes
    keep = {}
    for prefix, items in sorted(families.items(), key=lambda kv: -len(kv[0])):
        if len(items) < 2:
            continue
        if any((k.startswith(prefix.rstrip(" …")) or k.endswith(prefix.lstrip("… ")))
               and len(v) == len(items) for k, v in keep.items()):
            continue
        keep[prefix] = items
    return dict(sorted(keep.items(), key=lambda kv: -len(kv[1])))


def top_words(titles, n=25):
    c = Counter()
    for t in titles:
        words = re.findall(r"[a-z']+", t.lower())
        c.update(w for w in words if w not in STOPWORDS and len(w) > 2)
        c.update(" ".join(p) for p in zip(words, words[1:])
                 if not (set(p) & STOPWORDS))
    return c.most_common(n)


# ---------------------------------------------------------------- data sources

def autocomplete(q, lang="en", region="US"):
    k, hit = cache_get("suggest", f"{q}|{lang}|{region}")
    if hit is not None:
        return hit
    r = requests.get(SUGGEST_URL, params={"client": "firefox", "ds": "yt", "q": q,
                                          "hl": lang, "gl": region},
                     headers=UA, timeout=15)
    try:
        out = r.json()[1]
    except (ValueError, IndexError):
        return []
    cache_put(k, "suggest", out)
    return out


def expand_suggestions(seed, deep=True, **kw):
    """Alphabet-soup expansion: seed, 'seed a'..'seed z', question prefixes."""
    queries = [seed]
    if deep:
        queries += [f"{seed} {c}" for c in string.ascii_lowercase]
        queries += [f"{p} {seed}" for p in ("how to", "why", "what if", "best",
                                            "i survived", "24 hours", "100 days")]
    seen, out = set(), []
    for q in queries:
        for s in autocomplete(q, **kw):
            if s not in seen:
                seen.add(s)
                out.append(s)
    return out


def resolve_channel(ref, key=None):
    """Accept @handle, channel URL, or UC... id. Returns channel id."""
    ref = ref.strip()
    m = re.search(r"(UC[\w-]{22})", ref)
    if m:
        return m.group(1)
    handle = re.search(r"@([\w.\-]+)", ref)
    handle = "@" + (handle.group(1) if handle else ref.lstrip("@"))
    if key:
        items = api("channels", key, part="id", forHandle=handle).get("items")
        if items:
            return items[0]["id"]
    page = requests.get(f"https://www.youtube.com/{handle}", headers=UA, timeout=20).text
    m = (re.search(r'"externalId":"(UC[\w-]{22})"', page)
         or re.search(r'channel_id=(UC[\w-]{22})', page)
         or re.search(r'"browseId":"(UC[\w-]{22})"', page))
    if not m:
        sys.exit(f"Could not find channel {ref}")
    return m.group(1)


def rss_videos(channel_id):
    ns = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015",
          "m": "http://search.yahoo.com/mrss/"}
    root = ET.fromstring(requests.get(RSS_URL, params={"channel_id": channel_id},
                                      headers=UA, timeout=20).content)
    title = root.findtext("a:title", "", ns)
    vids = []
    for e in root.findall("a:entry", ns):
        stats = e.find("m:group/m:community/m:statistics", ns)
        vid = e.findtext("yt:videoId", "", ns)
        vids.append({
            "id": vid,
            "title": e.findtext("a:title", "", ns),
            "published": e.findtext("a:published", "", ns),
            "views": int(stats.get("views", 0)) if stats is not None else 0,
            "thumb": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
            "channel": title, "channel_id": channel_id,
        })
    return title, vids


def video_details(ids, key):
    out = []
    for batch in chunks(list(ids), 50):
        data = api("videos", key, part="snippet,statistics,contentDetails", id=",".join(batch))
        for v in data.get("items", []):
            st, sn = v.get("statistics", {}), v["snippet"]
            out.append({
                "id": v["id"], "title": sn["title"], "published": sn["publishedAt"],
                "channel": sn["channelTitle"], "channel_id": sn["channelId"],
                "views": int(st.get("viewCount", 0)), "likes": int(st.get("likeCount", 0)),
                "comments": int(st.get("commentCount", 0)),
                "seconds": parse_duration(v["contentDetails"].get("duration")),
                "thumb": f"https://i.ytimg.com/vi/{v['id']}/hqdefault.jpg",
                "tags": sn.get("tags", []),
                "audio_lang": sn.get("defaultAudioLanguage"), "category": sn.get("categoryId"),
            })
    return out


def channel_info(ids, key):
    info = {}
    for batch in chunks(sorted(ids), 50):
        data = api("channels", key, part="snippet,statistics,contentDetails", id=",".join(batch))
        for c in data.get("items", []):
            st = c["statistics"]
            info[c["id"]] = {
                "title": c["snippet"]["title"],
                "created": c["snippet"]["publishedAt"],
                "subs": int(st.get("subscriberCount", 0)),
                "views": int(st.get("viewCount", 0)),
                "videos": int(st.get("videoCount", 0)),
                "uploads": c["contentDetails"]["relatedPlaylists"]["uploads"],
            }
    return info


def upload_ids(playlist, key, limit=50):
    ids, token = [], None
    while len(ids) < limit:
        data = api("playlistItems", key, part="contentDetails", playlistId=playlist,
                   maxResults=min(50, limit - len(ids)), **({"pageToken": token} if token else {}))
        ids += [i["contentDetails"]["videoId"] for i in data.get("items", [])]
        token = data.get("nextPageToken")
        if not token:
            break
    return ids


def channel_baseline(chan, key, sample=30):
    """Median views of a channel's recent uploads = what a 'normal' video gets."""
    vids = video_details(upload_ids(chan["uploads"], key, sample), key)
    views = [v["views"] for v in vids if age_days(v["published"]) > 2] or [v["views"] for v in vids]
    return statistics.median(views) if views else 0


# ---------------------------------------------------------------- scoring

def score(videos, baselines, chans):
    for v in videos:
        base = baselines.get(v["channel_id"]) or 1
        c = chans.get(v["channel_id"], {})
        v["outlier"] = v["views"] / max(base, 1)
        v["per_day"] = v["views"] / age_days(v["published"])
        v["subs"] = c.get("subs", 0)
        v["views_per_sub"] = v["views"] / max(c.get("subs", 0), 1)
        v["channel_age_days"] = age_days(c["created"]) if c.get("created") else None
        v["baseline"] = base
    return videos


# ---------------------------------------------------------------- HTML report

CSS = """
:root{--bg:#fff;--fg:#14141a;--muted:#666a75;--card:#f5f6f8;--line:#e3e5ea;--hot:#d6336c;--ok:#2b8a3e}
@media (prefers-color-scheme:dark){:root{--bg:#121318;--fg:#ececf1;--muted:#9aa0ac;--card:#1c1e25;--line:#2b2e37;--hot:#ff6b9a;--ok:#69db7c}}
body{background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;margin:0;padding:24px 16px;max-width:1100px;margin:auto}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:28px 0 8px}.muted{color:var(--muted)}
table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}
th{color:var(--muted);font-weight:600}td.n{text-align:right;font-variant-numeric:tabular-nums}
img{width:120px;border-radius:6px;display:block}.hot{color:var(--hot);font-weight:700}
.chips span{display:inline-block;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:2px 10px;margin:3px;font-size:13px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:8px 0}
a{color:inherit}.wrap{overflow-x:auto}
"""


def write_report(name, title, sections):
    REPORTS.mkdir(exist_ok=True)
    safe = re.sub(r"[^\w-]+", "-", name).strip("-").lower()[:60]
    path = REPORTS / f"{safe}.html"
    body = "".join(sections)
    path.write_text(f"<!doctype html><html><head><meta charset=utf-8>"
                    f"<meta name=viewport content='width=device-width,initial-scale=1'>"
                    f"<title>{html.escape(title)}</title><style>{CSS}</style></head><body>"
                    f"<h1>{html.escape(title)}</h1><p class=muted>Generated "
                    f"{datetime.now():%Y-%m-%d %H:%M} by TubeScout</p>{body}</body></html>")
    return path


def video_table(videos, cols):
    head = "".join(f"<th>{c}</th>" for c, _ in cols)
    rows = []
    for v in videos:
        url = f"https://www.youtube.com/watch?v={v['id']}"
        cells = [f"<td><a href='{url}'><img loading=lazy src='{v['thumb']}'></a></td>",
                 f"<td><a href='{url}'>{html.escape(v['title'])}</a><br>"
                 f"<span class=muted>{html.escape(v.get('channel', ''))}</span></td>"]
        cells += [f"<td class=n>{fn(v)}</td>" for _, fn in cols[2:]]
        rows.append("<tr>" + "".join(cells) + "</tr>")
    return f"<div class=wrap><table><tr>{head}</tr>{''.join(rows)}</table></div>"


def chips(items):
    return "<div class=chips>" + "".join(f"<span>{html.escape(str(i))}</span>" for i in items) + "</div>"


def families_html(fams, views_by_title=None):
    out = []
    for prefix, items in list(fams.items())[:10]:
        extra = ""
        if views_by_title:
            tot = sum(views_by_title.get(t, 0) for t in items)
            extra = f" &middot; {fmt(tot)} views total"
        out.append(f"<div class=card><b>{html.escape(prefix)}</b> "
                   f"<span class=muted>({len(items)} videos{extra})</span>"
                   f"<ul>{''.join(f'<li>{html.escape(t)}</li>' for t in items[:8])}</ul></div>")
    return "".join(out) or "<p class=muted>No repeated format found.</p>"


CATEGORIES = {"1": "Film & Animation", "2": "Autos", "10": "Music", "15": "Pets", "17": "Sports",
              "19": "Travel", "20": "Gaming", "22": "People & Blogs", "23": "Comedy",
              "24": "Entertainment", "25": "News & Politics", "26": "Howto & Style",
              "27": "Education", "28": "Science & Technology"}


def settings_audit(vids):
    """Upload settings that quietly hurt reach. Only flags things the API can see."""
    out = []
    no_lang = [v for v in vids if not v.get("audio_lang")]
    if no_lang:
        out.append(f"{len(no_lang)}/{len(vids)} videos have no 'Video language' set. Set it "
                   "(Studio > Details > Language) so YouTube knows who to show them to and doesn't "
                   "default captions/dubs to another language.")
    cats = Counter(CATEGORIES.get(v.get("category"), v.get("category")) for v in vids)
    if cats:
        out.append("Categories: " + ", ".join(f"{c} ×{n}" for c, n in cats.most_common()))
    no_tags = sum(1 for v in vids if not v.get("tags"))
    if no_tags > len(vids) / 2:
        out.append(f"{no_tags}/{len(vids)} videos have no tags (minor, but helps with misspellings).")
    lengths = [v["seconds"] for v in vids if v.get("seconds")]
    if lengths:
        out.append(f"Median length {statistics.median(lengths) / 60:.1f} min "
                   f"(range {min(lengths) // 60}-{max(lengths) // 60} min). Compare with the "
                   "channels winning your niche.")
    return out


# ---------------------------------------------------------------- commands

def cmd_suggest(a):
    sugg = expand_suggestions(a.seed, deep=not a.quick, lang=a.lang, region=a.region)
    print(f"{len(sugg)} searches people type for '{a.seed}':\n")
    for s in sugg:
        print("  " + s)
    words = top_words(sugg, 30)
    print("\nMost repeated words/phrases (= what the audience cares about):")
    print("  " + ", ".join(f"{w} ({n})" for w, n in words))
    path = write_report(f"suggest-{a.seed}", f"Searches for “{a.seed}”", [
        "<h2>Recurring words &amp; phrases</h2>", chips(f"{w} · {n}" for w, n in words),
        f"<h2>All {len(sugg)} autocomplete searches</h2>", chips(sugg)])
    print(f"\nReport: {path}")


def cmd_channel(a):
    key = load_key()
    cid = resolve_channel(a.channel, key)
    chan = None
    if key:
        chan = channel_info([cid], key)[cid]
        vids = video_details(upload_ids(chan["uploads"], key, a.limit), key)
        name = chan["title"]
    else:
        name, vids = rss_videos(cid)
        print("(No API key: using the public RSS feed, latest 15 uploads only.)\n")
    if not vids:
        sys.exit("No videos found.")

    settled = [v["views"] for v in vids if age_days(v["published"]) > 2] or [v["views"] for v in vids]
    median = statistics.median(settled)
    for v in vids:
        v["outlier"] = v["views"] / max(median, 1)
        v["per_day"] = v["views"] / age_days(v["published"])
    by_date = sorted(vids, key=lambda v: v["published"])
    ranked = sorted(vids, key=lambda v: -v["outlier"])
    fams = format_family([v["title"] for v in vids])
    views_by_title = {v["title"]: v["views"] for v in vids}

    # Sequels: titles that reuse an earlier video's template (Part 2, 60 days...)
    sequels = [v for v in vids if re.search(r"part\s*\d|\b(2|ii|returns|again)\b", v["title"], re.I)]
    span = age_days(by_date[0]["published"])
    total = sum(v["views"] for v in vids)

    print(f"{name}  ({cid})")
    if chan:
        print(f"Subs {fmt(chan['subs'])} · total views {fmt(chan['views'])} · "
              f"{chan['videos']} videos · created {chan['created'][:10]}")
    print(f"Analysed {len(vids)} uploads over {span:.0f} days "
          f"(~{len(vids) / max(span / 7, 1):.1f}/week), {fmt(total)} views, median {fmt(median)}\n")
    print("Breakouts (views vs this channel's median):")
    for v in ranked[:10]:
        print(f"  {v['outlier']:5.1f}x  {fmt(v['views']):>7}  {v['published'][:10]}  {v['title']}")
    print("\nRepeated title formats:")
    for p, items in list(fams.items())[:6]:
        print(f"  [{len(items)}] {p}")
    if sequels:
        print(f"\n{len(sequels)} sequels/follow-ups — this channel milks its winners:")
        for v in sequels[:8]:
            print(f"  {fmt(v['views']):>7}  {v['title']}")
    checks = settings_audit(vids) if chan else []
    if checks:
        print("\nSettings check:")
        for c in checks:
            print("  - " + c)

    cols = [("", None), ("Video", None),
            ("Outlier", lambda v: f"<span class={'hot' if v['outlier'] >= 2 else ''}>{v['outlier']:.1f}x</span>"),
            ("Views", lambda v: fmt(v["views"])), ("Views/day", lambda v: fmt(v["per_day"])),
            ("Published", lambda v: v["published"][:10])]
    head = (f"<p>{len(vids)} uploads over {span:.0f} days · {fmt(total)} views · median "
            f"{fmt(median)} per video" + (f" · {fmt(chan['subs'])} subscribers" if chan else "") + "</p>")
    path = write_report(f"channel-{name}", f"Channel breakdown: {name}", [
        head, *(["<h2>Settings check</h2><ul>" + "".join(f"<li>{html.escape(c)}</li>" for c in checks)
                 + "</ul>"] if checks else []),
        "<h2>Title formats it repeats</h2>", families_html(fams, views_by_title),
        "<h2>Breakouts, ranked by outlier score</h2>", video_table(ranked, cols),
        "<h2>Upload timeline (oldest first)</h2>", video_table(by_date, cols),
        "<h2>Title vocabulary</h2>", chips(f"{w} · {n}" for w, n in top_words([v['title'] for v in vids]))])
    print(f"\nReport: {path}")


def find_outliers(a, key):
    # Whole days only, so repeat runs on the same day hit the cache.
    after = (datetime.now(timezone.utc) - timedelta(days=a.days)).strftime("%Y-%m-%dT00:00:00Z")
    ids, token = [], None
    for _ in range(a.pages):
        params = dict(part="id", q=a.query, type="video", order=a.order, maxResults=50,
                      publishedAfter=after, relevanceLanguage=a.lang)
        if a.region:
            params["regionCode"] = a.region
        if a.duration:
            params["videoDuration"] = a.duration
        if token:
            params["pageToken"] = token
        data = api("search", key, **params)
        ids += [i["id"]["videoId"] for i in data.get("items", [])]
        token = data.get("nextPageToken")
        if not token:
            break
    vids = video_details(dict.fromkeys(ids), key)
    if a.no_shorts:
        vids = [v for v in vids if v["seconds"] > 180]
    if a.lang == "en":  # relevanceLanguage is only a hint; drop titles in other scripts/languages
        vids = [v for v in vids if v.get("audio_lang", "en") in (None, "") or v["audio_lang"].startswith("en")]
        vids = [v for v in vids if sum(ord(ch) > 0x24F for ch in v["title"]) <= len(v["title"]) * 0.1]
    chans = channel_info({v["channel_id"] for v in vids}, key)
    chans = {k: c for k, c in chans.items() if c["subs"] <= a.max_subs}
    vids = [v for v in vids if v["channel_id"] in chans and v["views"] >= a.min_views]
    print(f"Scoring {len(vids)} videos from {len(chans)} channels…", file=sys.stderr)
    baselines = {cid: channel_baseline(c, key) for cid, c in chans.items()}
    vids = score(vids, baselines, chans)
    return sorted(vids, key=lambda v: -v["outlier"]), chans


def outlier_cols():
    return [("", None), ("Video", None),
            ("Outlier", lambda v: f"<span class={'hot' if v['outlier'] >= 3 else ''}>{v['outlier']:.1f}x</span>"),
            ("Views", lambda v: fmt(v["views"])), ("Views/day", lambda v: fmt(v["per_day"])),
            ("Subs", lambda v: fmt(v["subs"])),
            ("Ch. age", lambda v: f"{v['channel_age_days']:.0f}d" if v["channel_age_days"] else "?"),
            ("Length", lambda v: f"{v['seconds'] // 60}m")]


def print_outliers(vids, n=25):
    print(f"{'score':>6} {'views':>7} {'subs':>7} {'ch.age':>6}  title / channel")
    for v in vids[:n]:
        age = f"{v['channel_age_days']:.0f}d" if v["channel_age_days"] else "?"
        print(f"{v['outlier']:5.1f}x {fmt(v['views']):>7} {fmt(v['subs']):>7} {age:>6}  "
              f"{v['title'][:70]}  — {v['channel']}")


def cmd_outliers(a):
    key = need_key()
    vids, _ = find_outliers(a, key)
    vids = [v for v in vids if v["outlier"] >= a.min_score]
    print_outliers(vids)
    new = [v for v in vids if v["channel_age_days"] and v["channel_age_days"] < 120]
    path = write_report(f"outliers-{a.query}", f"Outliers for “{a.query}” (last {a.days} days)", [
        f"<p class=muted>Outlier = views ÷ the channel's median views. 3x+ means the topic/packaging "
        f"did the work, not the channel's size.</p>",
        "<h2>New channels (under 120 days old) that are popping</h2>",
        video_table(new[:25], outlier_cols()) if new else "<p class=muted>None found.</p>",
        "<h2>All outliers</h2>", video_table(vids[:100], outlier_cols()),
        "<h2>Formats the outliers share</h2>", families_html(format_family([v["title"] for v in vids[:60]])),
        "<h2>Words in outlier titles</h2>", chips(f"{w} · {n}" for w, n in top_words([v['title'] for v in vids[:60]]))])
    (REPORTS / f"{path.stem}.json").write_text(json.dumps(vids, indent=1))
    print(f"\nReport: {path}")


def cmd_ideas(a):
    key = need_key()
    vids, _ = find_outliers(a, key)
    winners = [v for v in vids if v["outlier"] >= a.min_score][:20]
    if not winners:
        sys.exit("No strong outliers found; try a broader query, more --days, or a lower --min-score.")
    print(f"Top {len(winners)} outliers for '{a.query}'. Building idea list…\n")
    ideas = []
    for v in winners:
        tpl = title_template(v["title"])
        stem = " ".join(tpl.replace("N", "").split()[:3])
        demand = autocomplete(stem, lang=a.lang)[:8] if stem else []
        ideas.append({"video": v, "template": tpl, "stem": stem, "demand": demand})
        print(f"{v['outlier']:.1f}x  {v['title']}")
        print(f"      format : {tpl}")
        if demand:
            print(f"      people also search: {', '.join(demand[:6])}")
        print()
    sections = ["<p class=muted>Each card: a video that beat its channel's normal views, the reusable "
                "format behind it, and what people are searching around that format. Your job: keep the "
                "format, change the setting/subject to one of the searches, make it better.</p>"]
    for i in ideas:
        v = i["video"]
        sections.append(
            f"<div class=card><a href='https://www.youtube.com/watch?v={v['id']}'>"
            f"<img src='{v['thumb']}' style='float:right;margin-left:12px'></a>"
            f"<b class=hot>{v['outlier']:.1f}x</b> {html.escape(v['title'])} "
            f"<span class=muted>— {html.escape(v['channel'])}, {fmt(v['subs'])} subs, {fmt(v['views'])} views</span>"
            f"<p><b>Format:</b> {html.escape(i['template'])}</p>"
            f"<b>Search demand around it:</b>{chips(i['demand']) if i['demand'] else ' <span class=muted>none</span>'}"
            f"<div style='clear:both'></div></div>")
    path = write_report(f"ideas-{a.query}", f"Video ideas from “{a.query}”", sections)
    print(f"Report: {path}")


# Faceless, narration-led formats that can be made with AI images/animation + voiceover.
NICHE_SEEDS = [
    "brand downfall story", "what happened to company", "finally getting what it deserves",
    "animated survival story", "zombie apocalypse survival day", "stickman story animation",
    "history explained animation", "dark history story", "true crime animated",
    "what if scenario animated", "mythology stories animated", "bible stories animated",
    "scary stories animated", "reddit stories animated", "revenge story animated",
    "space documentary", "lost civilizations", "conspiracy explained", "billionaire story",
    "scam explained story", "prison survival story", "ocean mysteries",
]


def cmd_niches(a):
    key = need_key()
    seeds = a.seeds or NICHE_SEEDS
    rows = []
    for q in seeds:
        print(f"• {q}", file=sys.stderr)
        sub = argparse.Namespace(query=q, days=a.days, pages=1, order="viewCount",
                                 max_subs=a.max_subs, min_views=5_000, duration=None,
                                 no_shorts=True, lang=a.lang, region=None)
        vids, chans = find_outliers(sub, key)
        hits = [v for v in vids if v["outlier"] >= 3]
        new = [v for v in hits if v["channel_age_days"] and v["channel_age_days"] < 180]
        rows.append({"niche": q, "outliers": len(hits), "new_channels": len({v["channel_id"] for v in new}),
                     "median_views": statistics.median([v["views"] for v in hits]) if hits else 0,
                     "best": hits[0] if hits else None, "new": new[:5]})
    rows.sort(key=lambda r: (-r["new_channels"], -r["outliers"], -r["median_views"]))
    print(f"\n{'niche':38} {'outliers':>8} {'new ch.':>7} {'med.views':>9}  best example")
    for r in rows:
        b = r["best"]
        print(f"{r['niche'][:38]:38} {r['outliers']:>8} {r['new_channels']:>7} {fmt(r['median_views']):>9}  "
              + (f"{b['outlier']:.0f}x {b['title'][:50]}" if b else "-"))
    sections = ["<p class=muted>Outliers = videos at 3x+ their channel's median, last "
                f"{a.days} days, channels under {fmt(a.max_subs)} subs. 'New ch.' = channels under 180 days "
                "old with an outlier: the clearest sign a newcomer can still break in.</p>",
                "<div class=wrap><table><tr><th>Niche</th><th>Outliers</th><th>New channels popping</th>"
                "<th>Median outlier views</th></tr>"]
    for r in rows:
        sections.append(f"<tr><td>{html.escape(r['niche'])}</td><td class=n>{r['outliers']}</td>"
                        f"<td class=n>{r['new_channels']}</td><td class=n>{fmt(r['median_views'])}</td></tr>")
    sections.append("</table></div>")
    for r in rows:
        if r["new"]:
            sections += [f"<h2>{html.escape(r['niche'])}: new channels popping</h2>",
                         video_table(r["new"], outlier_cols())]
    path = write_report("niches", "Niche scan: where new channels are breaking through", sections)
    print(f"\nReport: {path}")


def ydl_opts(cookies_browser=None, **extra):
    opts = {"quiet": True, "no_warnings": True, **extra}
    if cookies_browser:  # e.g. "chrome", "firefox": fixes "Sign in to confirm you're not a bot"
        opts["cookiesfrombrowser"] = (cookies_browser,)
    return opts


def vtt_to_lines(vtt):
    """WebVTT auto-captions repeat each phrase across cues; keep each new line once."""
    lines, seen, stamp = [], set(), "0:00"
    for raw in vtt.splitlines():
        m = re.match(r"(\d+):(\d\d):(\d\d)\.\d+ -->", raw)
        if m:
            h, mi, sec = map(int, m.groups())
            stamp = f"{h * 60 + mi}:{sec:02d}"
            continue
        text = re.sub(r"<[^>]+>", "", raw).strip()
        if not text or text == "WEBVTT" or text in seen or re.match(r"^(Kind|Language):", text):
            continue
        seen.add(text)
        lines.append(f"[{stamp}] {text}")
    return lines


def transcript_via_ytdlp(video_id, cookies_browser=None):
    try:
        import yt_dlp
    except ImportError:
        return None
    url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        with yt_dlp.YoutubeDL(ydl_opts(cookies_browser, skip_download=True)) as ydl:
            info = ydl.extract_info(url, download=False)
            tracks = {**info.get("automatic_captions", {}), **info.get("subtitles", {})}
            lang = next((l for l in ("en", "en-US", "en-GB", "en-orig") if l in tracks), None)
            vtt = next((t for t in tracks.get(lang, []) if t.get("ext") == "vtt"), None) if lang else None
            if not vtt:
                return None
            return vtt_to_lines(ydl.urlopen(vtt["url"]).read().decode("utf-8", "replace"))
    except Exception as e:  # yt-dlp raises DownloadError for bot checks, private videos, etc.
        print(f"  ! {video_id}: yt-dlp: {str(e)[:150]}", file=sys.stderr)
        return None


def fetch_transcript(video_id, cookies_browser=None):
    k, hit = cache_get("transcript", video_id)
    if hit is not None:
        return hit
    lines = None
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        parts = YouTubeTranscriptApi().fetch(video_id, languages=["en", "en-US", "en-GB"])
        lines = [f"[{int(p.start) // 60}:{int(p.start) % 60:02d}] {p.text}" for p in parts]
    except Exception as e:  # ImportError or any of the library's "no transcript" errors
        print(f"  · {video_id}: transcript API failed ({type(e).__name__}), trying yt-dlp…", file=sys.stderr)
        lines = transcript_via_ytdlp(video_id, cookies_browser)
    if not lines:
        print(f"  ! {video_id}: no transcript. On a server/VPN YouTube blocks this; run it on your own "
              "computer, or add --cookies-from-browser chrome", file=sys.stderr)
        return None
    cache_put(k, "transcript", lines)
    return lines


def resolve_targets(refs, top):
    """Video URLs/ids pass through; @channels expand to their `top` most-viewed uploads."""
    key = load_key()
    targets = []
    for ref in refs:
        if ref.startswith("@") or "/channel/" in ref or ref.startswith("UC") or "/@" in ref:
            key = key or need_key()
            cid = resolve_channel(ref, key)
            chan = channel_info([cid], key)[cid]
            vids = video_details(upload_ids(chan["uploads"], key, 50), key)
            targets += sorted(vids, key=lambda v: -v["views"])[:top]
        else:
            vid = re.search(r"(?:v=|youtu\.be/|shorts/)([\w-]{11})", ref)
            targets.append({"id": vid.group(1) if vid else ref, "title": ref, "views": 0})
    return targets


def cmd_transcripts(a):
    targets = resolve_targets(a.targets, a.top)
    outdir = REPORTS / "transcripts"
    outdir.mkdir(parents=True, exist_ok=True)
    saved = 0
    for v in targets:
        lines = fetch_transcript(v["id"], a.cookies_from_browser)
        if not lines:
            continue
        saved += 1
        safe = re.sub(r"[^\w-]+", "-", v["title"]).strip("-")[:60]
        path = outdir / f"{v['id']}-{safe}.txt"
        path.write_text(f"{v['title']}\nhttps://www.youtube.com/watch?v={v['id']}\n"
                        f"views: {v.get('views', 0)}\n\n" + "\n".join(lines))
        hook = " ".join(l.split("] ", 1)[1] for l in lines[:12])
        print(f"{path.name}\n   hook: {hook[:220]}…\n")
    print(f"Saved {saved}/{len(targets)} to {outdir}. Paste them into Claude with prompts/script-breakdown.md.")


def cmd_download(a):
    try:
        import yt_dlp
    except ImportError:
        sys.exit("pip install yt-dlp   (and for best results install deno: https://deno.com)")
    targets = resolve_targets(a.targets, a.top)
    outdir = REPORTS / "downloads"
    extra = {"outtmpl": str(outdir / "%(channel)s" / "%(title).80s [%(id)s].%(ext)s"),
             "writethumbnail": True, "writeinfojson": a.info,
             "writesubtitles": True, "writeautomaticsub": True,
             "subtitleslangs": ["en", "en-US", "en-orig"], "subtitlesformat": "vtt",
             "ignoreerrors": True, "quiet": False}
    if a.audio:
        extra |= {"format": "bestaudio/best"}
    elif a.subs_only:
        extra |= {"skip_download": True}
    else:
        extra |= {"format": f"bv*[height<={a.max_height}]+ba/b[height<={a.max_height}]/b",
                  "merge_output_format": "mp4"}
    urls = [f"https://www.youtube.com/watch?v={v['id']}" for v in targets]
    with yt_dlp.YoutubeDL(ydl_opts(a.cookies_from_browser, **extra)) as ydl:
        failed = ydl.download(urls)
    print(f"\nSaved to {outdir}" + (" (some downloads failed: see errors above. If YouTube says "
                                     "'Sign in to confirm you're not a bot', add --cookies-from-browser "
                                     "chrome, or run from your own computer, not a server)" if failed else ""))


def cmd_quota(a):
    rows = db().execute("SELECT day, units FROM quota ORDER BY day DESC LIMIT 7").fetchall()
    today = dict(rows).get(quota_day(), 0)
    n = db().execute("SELECT COUNT(*) FROM cache").fetchone()[0]
    print(f"Today: {today} / 10,000 units used ({10_000 - today} left). Cached responses: {n}.")
    for day, units in rows:
        print(f"  {day}: {units}")
    if a.clear:
        db().execute("DELETE FROM cache")
        db().commit()
        print("Cache cleared.")


# ---------------------------------------------------------------- CLI

def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--fresh", action="store_true", help="ignore the cache and refetch everything")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("suggest", help="YouTube autocomplete expansion (no key)")
    s.add_argument("seed")
    s.add_argument("--quick", action="store_true", help="only the seed, no a-z expansion")
    s.add_argument("--lang", default="en")
    s.add_argument("--region", default="US")
    s.set_defaults(fn=cmd_suggest)

    c = sub.add_parser("channel", help="break down a channel's hits and formats")
    c.add_argument("channel", help="@handle, channel URL or UC... id")
    c.add_argument("--limit", type=int, default=100, help="uploads to analyse (API key mode)")
    c.set_defaults(fn=cmd_channel)

    for name, fn, help_ in (("outliers", cmd_outliers, "find videos beating their channel's average"),
                            ("ideas", cmd_ideas, "outliers -> reusable formats + search demand")):
        o = sub.add_parser(name, help=help_)
        o.add_argument("query")
        o.add_argument("--days", type=int, default=30, help="only videos published in the last N days")
        o.add_argument("--pages", type=int, default=2, help="50 results per page, 100 quota units each")
        o.add_argument("--order", default="viewCount", choices=["viewCount", "relevance", "date"])
        o.add_argument("--max-subs", type=int, default=500_000, help="ignore channels bigger than this")
        o.add_argument("--min-views", type=int, default=10_000)
        o.add_argument("--min-score", type=float, default=2.0, help="minimum outlier multiple")
        o.add_argument("--duration", choices=["short", "medium", "long"], help="YouTube length filter")
        o.add_argument("--no-shorts", action="store_true", help="drop videos under 3 minutes")
        o.add_argument("--lang", default="en")
        o.add_argument("--region", default=None)
        o.set_defaults(fn=fn)

    n = sub.add_parser("niches", help="scan many niches, rank by new channels breaking through")
    n.add_argument("seeds", nargs="*", help="niche searches (default: built-in faceless storytelling list)")
    n.add_argument("--days", type=int, default=45)
    n.add_argument("--max-subs", type=int, default=250_000)
    n.add_argument("--lang", default="en")
    n.set_defaults(fn=cmd_niches)

    t = sub.add_parser("transcripts", help="save transcripts of videos or a channel's top videos")
    t.add_argument("targets", nargs="+", help="video URLs/ids or @channel handles")
    t.add_argument("--top", type=int, default=5, help="for channels: how many top videos")
    t.add_argument("--cookies-from-browser", metavar="BROWSER", help="chrome/firefox/edge/safari")
    t.set_defaults(fn=cmd_transcripts)

    d = sub.add_parser("download", help="download videos/audio/subtitles/thumbnails with yt-dlp")
    d.add_argument("targets", nargs="+", help="video URLs/ids or @channel handles")
    d.add_argument("--top", type=int, default=3, help="for channels: how many top videos")
    d.add_argument("--audio", action="store_true", help="audio only")
    d.add_argument("--subs-only", action="store_true", help="only subtitles + thumbnail, no video")
    d.add_argument("--max-height", type=int, default=1080, help="max video resolution")
    d.add_argument("--info", action="store_true", help="also save full metadata .info.json")
    d.add_argument("--cookies-from-browser", metavar="BROWSER", help="chrome/firefox/edge/safari")
    d.set_defaults(fn=cmd_download)

    q = sub.add_parser("quota", help="show API units used today and cache size")
    q.add_argument("--clear", action="store_true", help="delete all cached responses")
    q.set_defaults(fn=cmd_quota)

    a = p.parse_args()
    global FRESH
    FRESH = a.fresh
    a.fn(a)


if __name__ == "__main__":
    main()
