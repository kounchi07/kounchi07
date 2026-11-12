"""Story engine: proven Short-form stories that are not saturated yet.

  stories                       harvest top story-Shorts channels, rank proven-but-open stories
  stories --channels @zackdfilms @someone   add specific channels to the harvest
  saturation "lake peigneur oil rig"        how crowded one story is (one search, ~100 units)

How it works
  1. Seed: search YouTube for story Shorts that pulled big views recently; keep the channels
     behind them (plus any --channels you pass). Each search costs 100 units.
  2. Harvest: pull each channel's uploads with views (about 12 units per 300 videos).
  3. Cluster: group videos telling the same story, even when titles differ.
  4. Proven: a story whose best version reached --min-views (default 1M).
  5. Saturation: for the top candidates, search the story and count how many different
     channels posted it as a Short in the last 12 months, and how recently.
  6. Rank: big proven views, few channels, and no recent wave of copies rank highest.

Everything is cached, so re-running the same day is nearly free.
"""

import argparse
import html
import json
import math
import re
import statistics
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import tubescout as ts

STORY_QUERIES = [
    "true story", "survived days", "rescued after days", "the man who", "the boy who",
    "the girl who", "incredible true story", "real story animation", "story explained 3d",
    "what happened next", "the day", "the only survivor",
]
# Story-Shorts channels found while researching (true stories, disasters, survival, history,
# "3D explained"). Harvesting a channel costs ~12 units per 300 videos.
DEFAULT_CHANNELS = [
    "UCvz84_Q0BbvZThy75mbd-Dg",  # Zack D. Films
    "UC7riD81Z3wcSvLit4iIoeBQ",  # Athena_Explains
    "UCvTMhxvINRGer7ZcUmR7vSg",  # History Explained
    "UCfXGwgiYQk7t129WMMOAxEA",  # Global Secrets
    "UCg5An0K_fhl6XDazrAzaQDQ",  # True Tales
    "UCrffjcmk2RSXofb4BvoqwbA",  # World explained
    "UCcgtRIsCjR-hdH0x3DL6EqQ",  # THE AVIATION V
    "UCRE10DTmcWuZadSUv5St01A",  # Air Disaster
    "UCy5iyW68YKqGggnaGl5iNHQ",  # MidnightLoop
    "UCC_UFbcBpX7ZNUZKBBVz66w",  # Deepigma
    "UC_OFRuPGQOxECnSK8RzLkgA",  # Stenio
    "UCsuRXTnGPvrXCIPVaxyC0IA",  # TechComputings
    "UCTHCKgpHRzonXHSoSPQuM5Q",  # KareemScope
    "UCVfs13DIVXKc4RoqpS_nknA",  # LrjcunnyAviation
    "UCBXlwFiTDmcRKA6nuVL1wlg",  # HistoZilla
    "UCc8xYSB4a5JMPD7wL1tU3Hg",  # History Snap92
    "UCgRvekxdBgNZsIX0dsJIwDw",  # Heartfelt Chronicles
    "UCuWUxetLCQmw3NYV5qmj45w",  # True Campside Stories
    "UC3IYXCSThbYxcChG8kkB9Dw",  # Frozen Mystery
    "UC8wGV7tnX68rxxXxstp6jhQ",  # Afterhour Theory
]

# A title has to read like a story: a number, a dramatic past-tense event, or "The X who/that…".
STORY_SIGNAL = re.compile(
    r"\d|\b(survived?|surviving|rescued?|trapped|stuck|buried|lost|found|saved?|escaped?|vanished|"
    r"disappeared|died|killed|crash(?:ed)?|sank|sunk|swallowed|drained|exploded|fell|stranded|attacked|"
    r"discovered|stole|hid|hidden|cursed|banned|mystery|secret|disaster|tragedy|miracle|accident|"
    r"incident|experiment|hoax|scam|heist|prisoner|prison|soldier|pilot|plane|ship|island|cave|well)\b"
    r"|^(the|this|a|an)\s+\w+(\s+\w+)?\s+(who|that|which)\b|\bwhat if\b|\bwhy\b",
    re.I)


def is_story(title):
    return bool(STORY_SIGNAL.search(title))

# Words that describe the *telling*, not the story itself.
FILLER = set("""shorts short story stories true real incredible amazing crazy insane shocking viral
facts fact history historical animation animated explained explain 3d video full part movie film
untold strange weird unbelievable actually literally happened happens happen what how why who when
where this that these those the a an and or of in on at to for with from by is are was were be been
he she they his her their him them you your we our it its i my me man woman boy girl guy kid child
people person one day days time times years year after before into out up down over under then just
only never ever still even also very really got get gets getting went go goes made make makes did do
does done had has have will would could should can can't don't didn't no not nobody everyone
everything something someone thing things way new old first last best worst""".split())


def story_tokens(title):
    t = re.sub(r"#\w+", " ", title.lower().replace("’", "'"))
    t = re.sub(r"[^\w\s']", " ", t)
    out = set()
    for w in t.split():
        w = w.strip("'")
        if w.endswith("'s"):
            w = w[:-2]
        if len(w) < 3 and not w.isdigit():
            continue
        if w in FILLER or w in ts.STOPWORDS:
            continue
        if re.fullmatch(r"[a-z0-9']+", w):  # English/latin only; other scripts can't be matched
            out.add(w)
    return out


def jaccard(a, b):
    return len(a & b) / len(a | b) if a and b else 0.0


def same_story(a, b):
    shared = len(a & b)
    return shared >= 2 and jaccard(a, b) >= 0.3


# ---------------------------------------------------------------- harvest

def seed_channels(key, a):
    found = defaultdict(int)
    for q in a.queries or STORY_QUERIES:
        sub = argparse.Namespace(query=q, days=a.seed_days, pages=1, order="viewCount",
                                 max_subs=a.max_subs, min_views=a.min_views // 2, duration="short",
                                 no_shorts=False, lang="en", region=None)
        print(f"  seed search: {q}", file=sys.stderr)
        after = (datetime.now(timezone.utc) - timedelta(days=a.seed_days)).strftime("%Y-%m-%dT00:00:00Z")
        data = ts.api("search", key, part="id", q=q, type="video", order="viewCount", maxResults=50,
                      publishedAfter=after, relevanceLanguage="en", videoDuration="short")
        ids = [i["id"]["videoId"] for i in data.get("items", [])]
        for v in ts.video_details(ids, key):
            if v["seconds"] <= 180 and v["views"] >= a.min_views // 2:
                found[v["channel_id"]] = max(found[v["channel_id"]], v["views"])
    return sorted(found, key=lambda c: -found[c])[:a.max_channels]


def harvest(key, channel_ids, per_channel):
    info = ts.channel_info(channel_ids, key)
    vids = []
    for cid, c in info.items():
        if c["subs"] == 0 and c["views"] == 0:
            continue
        ups = ts.video_details(ts.upload_ids(c["uploads"], key, per_channel), key)
        shorts = [v for v in ups if 0 < v["seconds"] <= 180]
        for v in shorts:
            v["subs"] = c["subs"]
        vids += shorts
        print(f"  harvested {len(shorts):>4} Shorts from {c['title']}", file=sys.stderr)
    return vids, info


def cluster(vids):
    """Greedy clustering, biggest video first; inverted index keeps it fast."""
    clusters, index = [], defaultdict(list)
    for v in sorted(vids, key=lambda v: -v["views"]):
        toks = story_tokens(v["title"] + " " + v.get("desc_first", ""))
        v["tokens"] = toks
        if len(toks) < 2:
            continue
        cand = {ci for t in toks for ci in index.get(t, ())}
        best = None
        for ci in cand:
            if same_story(toks, clusters[ci]["tokens"]):
                best = ci
                break
        if best is None:
            clusters.append({"tokens": set(toks), "videos": [v]})
            ci = len(clusters) - 1
            for t in toks:
                index[t].append(ci)
        else:
            clusters[best]["videos"].append(v)
    return clusters


# ---------------------------------------------------------------- saturation

def saturation(key, tokens, ref_title, days=365):
    """Search the story; count distinct channels whose Short tells the same story."""
    q = " ".join(sorted(tokens, key=lambda t: (-len(t), t))[:6])
    after = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%dT00:00:00Z")
    data = ts.api("search", key, part="id", q=q, type="video", order="relevance", maxResults=50,
                  publishedAfter=after, videoDuration="short")
    ids = [i["id"]["videoId"] for i in data.get("items", [])]
    same = [v for v in ts.video_details(ids, key)
            if v["seconds"] <= 180 and same_story(tokens, story_tokens(v["title"]))]
    if not same:
        return {"query": q, "videos": 0, "channels": 0, "last30": 0, "best": 0, "median": 0,
                "latest": None, "best_title": None, "hits100k": 0, "small_hits": 0}
    subs = ts.channel_info({v["channel_id"] for v in same}, key)
    for v in same:
        v["subs"] = subs.get(v["channel_id"], {}).get("subs", 0)
    recent = [v for v in same if ts.age_days(v["published"]) <= 30]
    top = max(same, key=lambda v: v["views"])
    small_hits = [v for v in same if v["views"] >= 100_000 and v.get("subs", 0) < 50_000]
    return {"query": q, "videos": len(same), "channels": len({v["channel_id"] for v in same}),
            "last30": len(recent), "best": top["views"], "best_title": top["title"],
            "hits100k": sum(v["views"] >= 100_000 for v in same), "small_hits": len(small_hits),
            "median": statistics.median(v["views"] for v in same),
            "latest": max(v["published"] for v in same)[:10]}


def verdict(s):
    """What matters is a *current* wave of copies (viewers just saw it) and whether retellings
    still get watched. Lots of copies a year ago is fine if nobody is posting it now."""
    if s["channels"] <= 5 and s["last30"] <= 1:
        return "🟢 OPEN"
    if s["last30"] <= 1 and s["channels"] <= 20 and s["median"] >= 20_000:
        return "🟢 RIPE"
    if s["last30"] <= 3 and s["channels"] <= 35:
        return "🟡 WARM"
    return "🔴 CROWDED"


# ---------------------------------------------------------------- commands

def cmd_stories(a):
    key = ts.need_key()
    before = ts.units_today()
    chans = []
    if a.seed:
        print("1/4 Searching for more story-Shorts channels…", file=sys.stderr)
        chans = seed_channels(key, a)
    else:
        print("1/4 Using the built-in story channels (add --seed to search for more)…", file=sys.stderr)
    for ref in (a.channels or []) + DEFAULT_CHANNELS:
        try:
            cid = ts.resolve_channel(ref, key)
            if cid not in chans:
                chans.append(cid)
        except SystemExit:
            print(f"  ! could not find {ref}", file=sys.stderr)
    print(f"2/4 Harvesting {len(chans)} channels…", file=sys.stderr)
    vids, info = harvest(key, chans, a.per_channel)
    vids = [v for v in vids if is_story(v["title"])]
    med = defaultdict(list)
    for v in vids:
        med[v["channel_id"]].append(v["views"])
    med = {c: statistics.median(x) for c, x in med.items()}
    for v in vids:
        v["outlier"] = v["views"] / max(med.get(v["channel_id"], 1), 1)
    print(f"3/4 Grouping {len(vids)} Shorts into stories…", file=sys.stderr)
    clusters = cluster(vids)
    proven = []
    for c in clusters:
        vs = c["videos"]
        top = max(vs, key=lambda v: v["views"])
        # Proven = big in absolute terms, or a huge outlier for its channel (works for small channels).
        if not (top["views"] >= a.min_views or (top["outlier"] >= 10 and top["views"] >= 300_000)):
            continue
        # Mega-hits exhaust their audience: copies of 40M-view stories median a few thousand views.
        if top["views"] > a.max_views:
            continue
        # Skip stories still inside their copy wave; older proven stories are ripe for retelling.
        if ts.age_days(top["published"]) < a.min_age:
            continue
        proven.append({"tokens": c["tokens"], "top": top, "versions": len(vs),
                       "corpus_channels": len({v["channel_id"] for v in vs})})
    # Least-covered inside the harvest first, then biggest; only the best get a (paid) search.
    proven.sort(key=lambda p: (p["corpus_channels"], -p["top"]["views"]))
    proven = sorted(proven[:a.check * 3], key=lambda p: -p["top"]["views"])[:a.check]
    print(f"4/4 Checking saturation for {len(proven)} proven stories (~100 units each)…", file=sys.stderr)
    rows = []
    for p in proven:
        s = saturation(key, p["tokens"], p["top"]["title"])
        s["channels"] = max(s["channels"], p["corpus_channels"])
        age = ts.age_days(p["top"]["published"])
        crowd = 1 + s["channels"] + 2 * s["last30"]
        score = math.log10(max(p["top"]["views"], 10)) * 10 / crowd ** 0.6
        rows.append({**p, "sat": s, "verdict": verdict(s), "score": score, "age": age})
    order = {"🟢 OPEN": 0, "🟢 RIPE": 1, "🟡 WARM": 2, "🔴 CROWDED": 3}
    rows.sort(key=lambda r: (order[r["verdict"]], -r["sat"]["median"], -r["score"]))

    print(f"\n{'':10} {'proven':>7} {'chans':>5} {'last30':>6} {'copies':>7}  story (best version)")
    for r in rows:
        s = r["sat"]
        print(f"{r['verdict']:10} {ts.fmt(r['top']['views']):>7} {s['channels']:>5} {s['last30']:>6} "
              f"{ts.fmt(s['median']):>7}  "
              f"{r['top']['title'][:70]}  — {r['top']['channel']}, {r['age']:.0f}d ago")
    print(f"\nUnits used: {ts.units_today() - before}")
    write_report(rows, len(vids), len(chans))
    (ts.REPORTS / "stories.json").write_text(json.dumps(
        [{"verdict": r["verdict"], "title": r["top"]["title"], "views": r["top"]["views"],
          "video": r["top"]["id"], "channel": r["top"]["channel"], "saturation": r["sat"],
          "tokens": sorted(r["tokens"])} for r in rows], indent=1))


def write_report(rows, n_vids, n_chans):
    sec = [f"<p class=muted>{n_vids:,} Shorts harvested from {n_chans} story channels. "
           "<b>Proven</b> = best version's views. <b>Channels</b> = different channels that posted this "
           "story as a Short in the last 12 months. <b>Last 30d</b> = copies in the past month (a fresh "
           "wave means viewers just saw it).</p><div class=wrap><table><tr><th></th><th>Verdict</th>"
           "<th>Story (best version)</th><th>Proven</th><th>Channels</th><th>Last 30d</th>"
           "<th>Copies' median views</th><th>Latest</th></tr>"]
    for r in rows:
        v, s = r["top"], r["sat"]
        url = f"https://www.youtube.com/shorts/{v['id']}"
        sec.append(f"<tr><td><a href='{url}'><img loading=lazy src='https://i.ytimg.com/vi/{v['id']}/mqdefault.jpg'>"
                   f"</a></td><td>{r['verdict']}</td><td><a href='{url}'>{html.escape(v['title'])}</a><br>"
                   f"<span class=muted>{ts.channel_link(v)} · {r['age']:.0f} days ago</span></td>"
                   f"<td class=n>{ts.fmt(v['views'])}</td><td class=n>{s['channels']}</td>"
                   f"<td class=n>{s['last30']}</td><td class=n>{ts.fmt(s['median'])}</td>"
                   f"<td>{s['latest'] or '-'}</td></tr>")
    sec.append("</table></div>")
    path = ts.write_report("stories", "Story engine: proven stories that aren't saturated", sec)
    print(f"Report: {path}")


def cmd_saturation(a):
    key = ts.need_key()
    toks = story_tokens(a.story)
    if len(toks) < 2:
        sys.exit("Describe the story with at least two specific words (names, places, objects).")
    s = saturation(key, toks, a.story, a.days)
    print(f"\n“{a.story}”  →  {verdict(s)}")
    print(f"  {s['videos']} matching Shorts from {s['channels']} channels in the last {a.days} days; "
          f"{s['last30']} in the last 30 days (latest {s['latest']}).")
    if s["best"]:
        print(f"  Best: {ts.fmt(s['best'])} views — {s['best_title']}. Median: {ts.fmt(s['median'])}.")


# ---------------------------------------------------------------- breaking stories

FRESH_QUERIES = [
    "rescued", "survived", "trapped", "missing found", "plane emergency", "pilot", "crash",
    "sinkhole", "stranded", "heist", "escaped", "discovered", "attack", "miracle", "shocking news",
]


# Fast-moving Shorts that aren't stories you can retell: games, sports, edits, trends.
NOT_STORY = re.compile(
    r"beamng|roblox|fortnite|minecraft|gmod|gta\b|\bedit\b|anime|attack on titan|motogp|motocross|"
    r"\bufc\b|\bnba\b|\bnfl\b|football|cricket|trend|challenge|prank|asmr|gameplay|\bbaldi\b|"
    r"steal ?an ?egg|caylus|surron|ebike|\bfyp|tiktok", re.I)
NOT_STORY_CATEGORIES = {"10", "17", "20"}  # Music, Sports, Gaming


def fresh_same_story(a, b, rare_words):
    """Within a 72h window one shared rare word (a name, a place, an aircraft) is enough.
    Rare = outside the top-10k English words, so 'pilot' or 'crash' never qualify."""
    return same_story(a, b) or bool(a & b & rare_words)


def fresh_verdict(n_channels):
    if n_channels <= 2:
        return "🚀 EARLY"
    if n_channels <= 5:
        return "⚡ HEATING"
    return "🔥 CROWDING"


def cmd_fresh(a):
    """Shorts from the last N hours gaining views fast, grouped by story, with copy counts."""
    key = ts.need_key()
    before = ts.units_today()
    # Hour-rounded window so a rerun within the same hour hits the cache.
    since = datetime.now(timezone.utc) - timedelta(hours=a.hours)
    after = since.strftime("%Y-%m-%dT%H:00:00Z")
    ids = {}
    for q in a.queries or FRESH_QUERIES:
        print(f"  scanning: {q}", file=sys.stderr)
        params = dict(part="id", q=q, type="video", order="viewCount", maxResults=50,
                      publishedAfter=after, videoDuration="short")
        if a.lang:
            params["relevanceLanguage"] = a.lang
        data = ts.api("search", key, **params)
        for i in data.get("items", []):
            ids[i["id"]["videoId"]] = q
    vids = [v for v in ts.video_details(list(ids), key) if v["seconds"] <= 180]
    if a.lang == "en":
        vids = [v for v in vids if sum(ord(ch) > 0x24F for ch in v["title"]) <= len(v["title"]) * 0.1]
    vids = [v for v in vids if is_story(v["title"]) and not NOT_STORY.search(v["title"])
            and v.get("category") not in NOT_STORY_CATEGORIES
            and (not a.lang or (v.get("audio_lang") or a.lang).startswith(a.lang))
            and ts.age_days(v["published"]) * 24 <= a.hours]
    chans = ts.channel_info({v["channel_id"] for v in vids}, key)
    for v in vids:
        hours = max(ts.age_days(v["published"]) * 24, 0.5)
        subs = chans.get(v["channel_id"], {}).get("subs", 0)
        v["hours"], v["vph"], v["subs"] = hours, v["views"] / hours, subs
        # Views far beyond the subscriber count = YouTube is pushing it to new viewers.
        v["reach"] = v["views"] / max(subs, 100)
    vids = [v for v in vids if v["views"] >= a.min_views]

    # Group by story; a story's copy count is how many channels already posted it in the window.
    common = ts.common_words()
    df = defaultdict(int)
    for v in vids:
        for t in story_tokens(v["title"]):
            df[t] += 1
    rare_words = {t for t, n in df.items() if n >= 2 and len(t) >= 5 and not t.isdigit()
                  and t not in common}
    groups = []
    for v in sorted(vids, key=lambda v: -v["vph"]):
        toks = story_tokens(v["title"])
        for g in groups:
            if fresh_same_story(toks, g["seed"], rare_words):
                g["videos"].append(v)
                break
        else:
            groups.append({"seed": set(toks), "videos": [v]})
    rows = []
    for g in groups:
        vs = g["videos"]
        top = max(vs, key=lambda v: v["vph"])
        n = len({v["channel_id"] for v in vs})
        score = math.log10(max(top["vph"], 1)) * math.log10(max(top["reach"], 1.1) * 10) / n ** 0.5
        rows.append({"top": top, "channels": n, "verdict": fresh_verdict(n), "score": score,
                     "total_views": sum(v["views"] for v in vs)})
    rows.sort(key=lambda r: -r["score"])
    rows = rows[:a.limit]

    print(f"\n{'':12} {'views/hr':>8} {'views':>7} {'reach':>6} {'chans':>5} {'age':>5}  story")
    for r in rows:
        v = r["top"]
        print(f"{r['verdict']:12} {ts.fmt(v['vph']):>8} {ts.fmt(v['views']):>7} {v['reach']:>5.0f}x "
              f"{r['channels']:>5} {v['hours']:>4.0f}h  {v['title'][:70]}  — {v['channel']} "
              f"({ts.fmt(v['subs'])} subs)")
    print(f"\nReach = views ÷ subscribers (high = YouTube is pushing it to new people).")
    print(f"Units used: {ts.units_today() - before}")

    sec = [f"<p class=muted>Story Shorts published in the last {a.hours} hours, ranked by speed (views per "
           "hour), reach (views ÷ the channel's subscribers) and how few channels have covered the story "
           "so far. 🚀 EARLY = 1–2 channels: make your version today, with your own angle and a "
           "stronger title. Always check the facts in real news reports first.</p>"
           "<div class=wrap><table><tr><th></th><th>Verdict</th><th>Story</th><th>Views/hr</th>"
           "<th>Views</th><th>Reach</th><th>Channels</th><th>Age</th></tr>"]
    for r in rows:
        v = r["top"]
        url = f"https://www.youtube.com/shorts/{v['id']}"
        sec.append(f"<tr><td><a href='{url}'><img loading=lazy src='https://i.ytimg.com/vi/{v['id']}/mqdefault.jpg'>"
                   f"</a></td><td>{r['verdict']}</td><td><a href='{url}'>{html.escape(v['title'])}</a><br>"
                   f"<span class=muted>{ts.channel_link(v)} · {ts.fmt(v['subs'])} subs</span></td>"
                   f"<td class=n>{ts.fmt(v['vph'])}</td><td class=n>{ts.fmt(v['views'])}</td>"
                   f"<td class=n>{v['reach']:.0f}x</td><td class=n>{r['channels']}</td>"
                   f"<td class=n>{v['hours']:.0f}h</td></tr>")
    sec.append("</table></div>")
    path = ts.write_report("fresh", f"Breaking stories: last {a.hours} hours", sec)
    (ts.REPORTS / "fresh.json").write_text(json.dumps(
        [{"verdict": r["verdict"], "title": r["top"]["title"], "video": r["top"]["id"],
          "channel": r["top"]["channel"], "subs": r["top"]["subs"], "views": r["top"]["views"],
          "views_per_hour": round(r["top"]["vph"]), "reach": round(r["top"]["reach"], 1),
          "channels_covering": r["channels"], "hours_old": round(r["top"]["hours"], 1)} for r in rows],
        indent=1))
    print(f"Report: {path}")


def add_commands(sub):
    f = sub.add_parser("fresh", help="breaking story Shorts from the last 72h, before the copies arrive")
    f.add_argument("--hours", type=int, default=72, help="look-back window")
    f.add_argument("--queries", nargs="*", help="event keywords to scan (100 units each)")
    f.add_argument("--min-views", type=int, default=20_000)
    f.add_argument("--limit", type=int, default=30)
    f.add_argument("--lang", default="en", help="'' to include every language")
    f.set_defaults(fn=cmd_fresh)

    s = sub.add_parser("stories", help="proven story Shorts that aren't saturated yet")
    s.add_argument("--channels", nargs="*", help="extra channels to harvest (@handles or UC… ids)")
    s.add_argument("--seed", action="store_true", help="also search YouTube for more story channels (~1,200 units)")
    s.add_argument("--queries", nargs="*", help="seed searches (default: built-in story list)")
    s.add_argument("--seed-days", type=int, default=120, help="seed search window")
    s.add_argument("--max-channels", type=int, default=20)
    s.add_argument("--max-subs", type=int, default=50_000_000)
    s.add_argument("--per-channel", type=int, default=300, help="uploads harvested per channel")
    s.add_argument("--min-views", type=int, default=300_000, help="'proven' threshold")
    s.add_argument("--max-views", type=int, default=8_000_000,
                   help="skip mega-hits whose audience is used up (copies of 40M stories get ~1K views)")
    s.add_argument("--min-age", type=int, default=180,
                   help="only stories whose best version is at least N days old (past the copy wave)")
    s.add_argument("--check", type=int, default=15, help="stories to saturation-check (100 units each)")
    s.set_defaults(fn=cmd_stories)
    t = sub.add_parser("saturation", help="how crowded one story is right now")
    t.add_argument("story", help="specific words: names, places, objects")
    t.add_argument("--days", type=int, default=365)
    t.set_defaults(fn=cmd_saturation)
