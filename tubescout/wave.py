"""Regional wave finder: what is taking off right now for one country's audience.

  wave NG US                 Nigeria and the United States (any ISO country codes work)
  wave NG --days 3           tighter window

For each country it combines:
  - YouTube's own "most popular" chart for that region (1 unit per 50 videos)
  - the most-viewed Shorts and long videos published in the last N days, as YouTube
    ranks them for that region (100 units per search)
Then it scores each video by views per hour and reach (views / channel subscribers) and
pulls out the topics and title formats that several different channels are riding at once.
A wave = the same subject or format rising on 2+ channels, especially small ones.
"""

import html
import json
import math
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

import tubescout as ts
import stories as st

NAMES = {"NG": "Nigeria", "US": "United States", "GB": "United Kingdom", "GH": "Ghana",
         "KE": "Kenya", "ZA": "South Africa", "CA": "Canada", "IN": "India"}
# Extra region-flavoured searches; plain keywords YouTube localises with regionCode.
EXTRA = {"NG": ["nigeria", "naija", "lagos", "nollywood", "skit"], "US": ["story", "explained"]}
SKIP_CATEGORIES = {"10"}  # Music videos dominate every chart and aren't something to retell


def collect(key, region, days, extra):
    after = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%dT00:00:00Z")
    ids = {}
    token = None
    for _ in range(4):  # chart: up to 200 videos, 1 unit a page
        p = dict(part="id", chart="mostPopular", regionCode=region, maxResults=50)
        if token:
            p["pageToken"] = token
        try:
            data = ts.api("videos", key, **p)
        except SystemExit as e:
            print(f"  ({region} chart unavailable: {e})", file=sys.stderr)
            break
        for i in data.get("items", []):
            ids[i["id"]] = "chart"
        token = data.get("nextPageToken")
        if not token:
            break
    searches = [("", "short"), ("", "medium"), ("", "long")] + [(q, "short") for q in extra]
    for q, dur in searches:
        print(f"  {region}: top {dur} videos {('for ' + q) if q else ''}", file=sys.stderr)
        p = dict(part="id", type="video", order="viewCount", maxResults=50, regionCode=region,
                 publishedAfter=after, videoDuration=dur)
        if q:
            p["q"] = q
        for i in ts.api("search", key, **p).get("items", []):
            ids.setdefault(i["id"]["videoId"], f"search:{dur}")
    vids = ts.video_details(list(ids), key)
    chans = ts.api_channels_country(key, {v["channel_id"] for v in vids})
    out = []
    for v in vids:
        if v.get("category") in SKIP_CATEGORIES:
            continue
        c = chans.get(v["channel_id"], {})
        hours = max(ts.age_days(v["published"]) * 24, 1)
        v.update(source=ids[v["id"]], hours=hours, vph=v["views"] / hours, subs=c.get("subs", 0),
                 country=c.get("country"), reach=v["views"] / max(c.get("subs", 0), 100),
                 short=v["seconds"] <= 180, channel_age=ts.age_days(c["created"]) if c.get("created") else None)
        if hours <= days * 24 + 24 or v["source"] == "chart":
            out.append(v)
    return out


def waves(vids):
    """Subjects and formats shared by 2+ channels in this batch."""
    common = ts.common_words()
    by_tok, by_fmt = defaultdict(list), defaultdict(list)
    for v in vids:
        for t in st.story_tokens(v["title"]):
            if len(t) >= 4 and not t.isdigit() and t not in common:
                by_tok[t].append(v)
        words = ts.title_template(v["title"]).split()
        if len(words) >= 4:
            by_fmt[" ".join(words[:3])].append(v)
    def pack(d, kind):
        rows = []
        for k, vs in d.items():
            n = len({v["channel_id"] for v in vs})
            if n >= 2:
                rows.append({"kind": kind, "name": k, "channels": n, "videos": len(vs),
                             "views": sum(v["views"] for v in vs),
                             "small": sum(1 for v in vs if v["subs"] < 100_000),
                             "top": max(vs, key=lambda v: v["views"])})
        return rows
    rows = pack(by_tok, "topic") + pack(by_fmt, "format")
    rows.sort(key=lambda r: -(r["channels"] * math.log10(max(r["views"], 10))))
    return rows


def cmd_wave(a):
    key = ts.need_key()
    before = ts.units_today()
    sections, summary = [], {}
    for region in [r.upper() for r in a.regions]:
        name = NAMES.get(region, region)
        vids = collect(key, region, a.days, EXTRA.get(region, []) if not a.no_extra else [])
        local = [v for v in vids if v["country"] == region]
        risers = sorted([v for v in vids if v["subs"] < a.max_subs and v["views"] >= a.min_views],
                        key=lambda v: -(math.log10(max(v["vph"], 1)) * math.log10(max(v["reach"], 1.1) * 10)))
        new = [v for v in risers if v["channel_age"] and v["channel_age"] < 180]
        w = waves(vids)
        cats = Counter(ts.CATEGORIES.get(v.get("category"), v.get("category")) for v in vids)
        summary[region] = {"videos": len(vids), "local_channels": len({v["channel_id"] for v in local}),
                           "categories": cats.most_common(6),
                           "waves": [{k: r[k] for k in ("kind", "name", "channels", "videos", "views", "small")}
                                     | {"example": r["top"]["title"]} for r in w[:25]],
                           "risers": [{"title": v["title"], "channel": v["channel"], "subs": v["subs"],
                                       "country": v["country"], "views": v["views"], "vph": round(v["vph"]),
                                       "reach": round(v["reach"], 1), "hours": round(v["hours"]),
                                       "short": v["short"], "id": v["id"]} for v in risers[:40]]}
        print(f"\n===== {name} ({region}): {len(vids)} videos, {len(local)} from {name}-based channels =====")
        print("Categories: " + ", ".join(f"{c} {n}" for c, n in cats.most_common(6)))
        print("\nWAVES (same topic/format on 2+ channels):")
        for r in w[:a.limit // 2]:
            print(f"  {r['kind']:6} {r['name'][:26]:26} {r['channels']:>2} channels ({r['small']} small) "
                  f"{ts.fmt(r['views']):>7}  e.g. {r['top']['title'][:55]}")
        print("\nRISING ON SMALLER CHANNELS:")
        for v in risers[:a.limit]:
            print(f"  {ts.fmt(v['vph']):>6}/h {ts.fmt(v['views']):>7} {v['reach']:>5.0f}x {v['hours']:>4.0f}h "
                  f"{'S' if v['short'] else 'L'} [{v['country'] or '??'}] {v['title'][:62]} — {v['channel'][:22]} "
                  f"({ts.fmt(v['subs'])})")
        cols = [("", None), ("Video", None), ("Views/hr", lambda v: ts.fmt(v["vph"])),
                ("Views", lambda v: ts.fmt(v["views"])), ("Reach", lambda v: f"{v['reach']:.0f}x"),
                ("Subs", lambda v: ts.fmt(v["subs"])), ("Age", lambda v: f"{v['hours']:.0f}h"),
                ("Type", lambda v: "Short" if v["short"] else "Long"), ("From", lambda v: v["country"] or "?")]
        sections += [f"<h2>{html.escape(name)}: waves</h2><div class=wrap><table><tr><th>Kind</th><th>Topic / format"
                     "</th><th>Channels</th><th>Small channels</th><th>Views</th><th>Example</th></tr>"
                     + "".join(f"<tr><td>{r['kind']}</td><td><b>{html.escape(r['name'])}</b></td>"
                               f"<td class=n>{r['channels']}</td><td class=n>{r['small']}</td>"
                               f"<td class=n>{ts.fmt(r['views'])}</td><td><a href='https://www.youtube.com/watch?v={r['top']['id']}'>"
                               f"{html.escape(r['top']['title'][:80])}</a><br><span class=muted>"
                               f"{ts.channel_link(r['top'])}</span></td></tr>"
                               for r in w[:25]) + "</table></div>",
                     f"<h2>{html.escape(name)}: rising on smaller channels</h2>", ts.video_table(risers[:40], cols)]
        if new:
            sections += [f"<h2>{html.escape(name)}: channels under 6 months old</h2>", ts.video_table(new[:15], cols)]
    path = ts.write_report("wave-" + "-".join(a.regions), "Wave finder: " + ", ".join(a.regions), sections)
    (ts.REPORTS / f"{path.stem}.json").write_text(json.dumps(summary, indent=1))
    print(f"\nUnits used: {ts.units_today() - before}\nReport: {path}")


def add_commands(sub):
    w = sub.add_parser("wave", help="what is taking off right now for a country's audience")
    w.add_argument("regions", nargs="+", help="ISO country codes, e.g. NG US")
    w.add_argument("--days", type=int, default=7)
    w.add_argument("--max-subs", type=int, default=500_000, help="'smaller channel' ceiling for risers")
    w.add_argument("--min-views", type=int, default=30_000)
    w.add_argument("--limit", type=int, default=25)
    w.add_argument("--no-extra", action="store_true", help="skip the region keyword searches")
    w.set_defaults(fn=cmd_wave)
