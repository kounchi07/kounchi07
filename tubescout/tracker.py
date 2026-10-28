"""Watchlist, breakout alerts and the dashboard for TubeScout.

  watch add <@handle ...>         start tracking channels
  watch discover <query>          add new/small channels that have outliers in a niche
  watch run                       snapshot every tracked channel, raise alerts (~1-2 units/channel)
  watch list / watch remove <id>
  dashboard                       charts + alert feed as one HTML page

Run `watch run` every few hours (cron / Task Scheduler). Each run stores a snapshot,
so the dashboard can chart growth and spot videos taking off within hours.
Set DISCORD_WEBHOOK_URL in .env to get alerts pushed to your phone via Discord.
"""

import argparse
import html
import json
import statistics
import sys
import time
from datetime import datetime, timezone

import requests

import tubescout as ts

# YouTube refreshes channel totals every few hours, so growth needs snapshots this far apart.
MIN_SPAN_HOURS = 3

# Alert thresholds
BREAKOUT_X = 3.0          # recent video at 3x+ the channel's median views
HOT_VPH_X = 3.0           # recent video gaining views 3x faster than the channel's typical pace
NEW_CHANNEL_DAYS = 120
SURGE_SUBS_PCT = 10.0     # subscriber growth per day, percent


def tables():
    d = ts.db()
    d.executescript("""
    CREATE TABLE IF NOT EXISTS watch (channel_id TEXT PRIMARY KEY, title TEXT, source TEXT, added REAL,
                                      created TEXT);
    CREATE TABLE IF NOT EXISTS csnap (channel_id TEXT, at REAL, subs INT, views INT, videos INT);
    CREATE TABLE IF NOT EXISTS vsnap (video_id TEXT, channel_id TEXT, at REAL, views INT,
                                      title TEXT, published TEXT);
    CREATE TABLE IF NOT EXISTS alerts (at REAL, kind TEXT, channel_id TEXT, video_id TEXT,
                                       message TEXT, UNIQUE(kind, channel_id, video_id));
    """)
    return d


def add_channel(cid, title, source):
    tables().execute("INSERT OR IGNORE INTO watch VALUES (?,?,?,?,NULL)", (cid, title, source, time.time()))
    ts.db().commit()


# ---------------------------------------------------------------- commands

def cmd_watch(a):
    d = tables()
    if a.action == "list":
        rows = d.execute("""SELECT w.channel_id, w.title, w.source,
                              (SELECT subs FROM csnap c WHERE c.channel_id = w.channel_id ORDER BY at DESC LIMIT 1)
                            FROM watch w ORDER BY w.added""").fetchall()
        for cid, title, src, subs in rows:
            print(f"{cid}  {title[:40]:40} subs {ts.fmt(subs or 0):>7}  ({src})")
        print(f"{len(rows)} channels tracked.")
    elif a.action == "add":
        key = ts.need_key()
        for ref in a.args:
            cid = ts.resolve_channel(ref, key)
            title = ts.channel_info([cid], key)[cid]["title"]
            add_channel(cid, title, "manual")
            print(f"+ {title}")
    elif a.action == "remove":
        for ref in a.args:
            d.execute("DELETE FROM watch WHERE channel_id=? OR title=?", (ref, ref))
        d.commit()
    elif a.action == "discover":
        key = ts.need_key()
        for q in a.args:
            sub = argparse.Namespace(query=q, days=a.days, pages=1, order="viewCount",
                                     max_subs=a.max_subs, min_views=10_000, duration=None,
                                     no_shorts=True, lang="en", region=None)
            vids, chans = ts.find_outliers(sub, key)
            picked = {}
            for v in vids:
                young = v["channel_age_days"] and v["channel_age_days"] < a.max_age
                if v["outlier"] >= a.min_score and young:
                    picked.setdefault(v["channel_id"], v)
            for cid, v in picked.items():
                add_channel(cid, v["channel"], f"discover:{q}")
                print(f"+ {v['channel']:30} {v['outlier']:.0f}x  {v['title'][:60]}")
            print(f"{q}: added {len(picked)} channels")
    elif a.action == "run":
        run_snapshot(a)


def run_snapshot(a):
    key = ts.need_key()
    d = tables()
    ids = [r[0] for r in d.execute("SELECT channel_id FROM watch")]
    if not ids:
        sys.exit("Watchlist is empty. Try: watch discover \"brand downfall\"  or  watch add @handle")
    ts.FRESH = True  # snapshots must be live numbers, never cached
    before = ts.units_today()
    now = time.time()
    chans = ts.channel_info(ids, key)
    for cid, c in chans.items():
        d.execute("INSERT INTO csnap VALUES (?,?,?,?,?)", (cid, now, c["subs"], c["views"], c["videos"]))
        d.execute("UPDATE watch SET title=?, created=? WHERE channel_id=?", (c["title"], c["created"], cid))
    recent = {}
    for cid, c in chans.items():
        for vid in ts.upload_ids(c["uploads"], key, a.per_channel):
            recent[vid] = cid
    vids = ts.video_details(list(recent), key)
    for v in vids:
        d.execute("INSERT INTO vsnap VALUES (?,?,?,?,?,?)",
                  (v["id"], v["channel_id"], now, v["views"], v["title"], v["published"]))
    d.commit()
    new_alerts = detect_alerts(chans, vids, now)
    used = ts.units_today() - before
    print(f"Snapshot: {len(chans)} channels, {len(vids)} videos, {used} units.")
    for kind, title, msg in new_alerts:
        print(f"  {kind}  {title}: {msg}")
    if not new_alerts:
        print("  No new alerts.")
    push(new_alerts)


def detect_alerts(chans, vids, now):
    d = ts.db()
    by_chan = {}
    for v in vids:
        by_chan.setdefault(v["channel_id"], []).append(v)
    fresh = []

    def alert(kind, cid, vid, msg):
        cur = d.execute("INSERT OR IGNORE INTO alerts VALUES (?,?,?,?,?)", (now, kind, cid, vid, msg))
        if cur.rowcount:
            fresh.append((kind, chans[cid]["title"], msg))

    for cid, c in chans.items():
        vs = by_chan.get(cid, [])
        settled = [v for v in vs if ts.age_days(v["published"]) > 3]
        median = statistics.median([v["views"] for v in settled]) if settled else 0
        # typical pace = median views/hour of settled videos over their life
        pace = statistics.median([v["views"] / (ts.age_days(v["published"]) * 24) for v in settled]) if settled else 0
        for v in vs:
            age = ts.age_days(v["published"])
            if age > 14:
                continue
            if median and v["views"] >= BREAKOUT_X * median:
                alert("🔥 breakout", cid, v["id"],
                      f"{v['title']}: {ts.fmt(v['views'])} views = {v['views'] / median:.1f}x the channel median "
                      f"after {age:.1f} days")
            prev = d.execute("SELECT at, views FROM vsnap WHERE video_id=? AND at<? ORDER BY at DESC LIMIT 1",
                             (v["id"], now)).fetchone()
            if prev and pace and now - prev[0] > 1800:
                vph = (v["views"] - prev[1]) / ((now - prev[0]) / 3600)
                if vph >= HOT_VPH_X * pace and vph > 200:
                    alert("⚡ accelerating", cid, v["id"],
                          f"{v['title']}: +{ts.fmt(vph)} views/hour right now ({vph / pace:.1f}x normal pace)")
        created = ts.age_days(c["created"])
        if created < NEW_CHANNEL_DAYS and c["views"] > 100_000:
            alert("🆕 new channel", cid, "",
                  f"{created:.0f} days old, {ts.fmt(c['views'])} views, {ts.fmt(c['subs'])} subs")
        prev = d.execute("SELECT at, subs FROM csnap WHERE channel_id=? AND at < ? - 43200 "
                         "ORDER BY at DESC LIMIT 1", (cid, now)).fetchone()
        if prev and prev[1]:
            days = (now - prev[0]) / 86400
            pct = (c["subs"] - prev[1]) / prev[1] * 100 / days
            if pct >= SURGE_SUBS_PCT:
                alert("📈 surging", cid, f"subs-{datetime.now():%Y-%m-%d}",
                      f"subscribers +{pct:.0f}%/day ({ts.fmt(prev[1])} → {ts.fmt(c['subs'])})")
    d.commit()
    return fresh


def push(alerts):
    url = ts.setting("DISCORD_WEBHOOK_URL")
    if not url or not alerts:
        return
    text = "\n".join(f"{k} **{t}**: {m}" for k, t, m in alerts)[:1900]
    try:
        requests.post(url, json={"content": text}, timeout=15)
    except requests.RequestException as e:
        print(f"  (Discord push failed: {e})", file=sys.stderr)


# ---------------------------------------------------------------- dashboard

def cmd_dashboard(a):
    d = tables()
    chans = {cid: title for cid, title in d.execute("SELECT channel_id, title FROM watch")}
    series = {}
    for cid, at, subs, views in d.execute("SELECT channel_id, at, subs, views FROM csnap ORDER BY at"):
        if cid in chans:
            series.setdefault(cid, []).append((at, subs, views))
    # growth over the window: views gained per day between first and last snapshot
    growth = []
    for cid, pts in series.items():
        if len(pts) >= 2 and pts[-1][0] - pts[0][0] >= MIN_SPAN_HOURS * 3600:
            days = (pts[-1][0] - pts[0][0]) / 86400
            growth.append((cid, (pts[-1][2] - pts[0][2]) / days, (pts[-1][1] - pts[0][1]) / days))
    bar_label = "Views gained per day (between snapshots)"
    if not growth:
        bar_label = f"Lifetime views per day (live growth appears once snapshots span {MIN_SPAN_HOURS}+ hours)"
        created = dict(d.execute("SELECT channel_id, created FROM watch WHERE created IS NOT NULL"))
        growth = [(cid, pts[-1][2] / ts.age_days(created[cid]), 0) for cid, pts in series.items() if cid in created]
    growth.sort(key=lambda g: -g[1])
    latest = d.execute("SELECT MAX(at) FROM vsnap").fetchone()[0] or 0
    vids = d.execute("SELECT video_id, channel_id, views, title, published FROM vsnap WHERE at=?",
                     (latest,)).fetchall()
    rising = []
    for vid, cid, views, title, pub in vids:
        age = ts.age_days(pub)
        if age <= 14:
            rising.append({"id": vid, "channel": chans.get(cid, ""), "views": views, "title": title,
                           "per_day": views / age, "age": age})
    rising.sort(key=lambda v: -v["per_day"])
    alerts = d.execute("SELECT at, kind, channel_id, message FROM alerts ORDER BY at DESC LIMIT 60").fetchall()

    top = [g[0] for g in growth[:8]] or list(series)[:8]
    # Views gained since tracking started, so a 65M-view channel doesn't flatten everyone else.
    datasets = [{"label": chans[cid], "data": [{"x": int(at * 1000), "y": views - series[cid][0][2]}
                                               for at, _, views in series[cid]]}
                for cid in top if cid in series and series[cid][-1][0] - series[cid][0][0] >= MIN_SPAN_HOURS * 3600]
    bars = {"labels": [chans[g[0]][:24] for g in growth[:15]], "data": [round(g[1]) for g in growth[:15]]}
    snaps = d.execute("SELECT COUNT(DISTINCT at) FROM csnap").fetchone()[0]

    alert_html = "".join(
        f"<div class=alert><span class=k>{html.escape(k)}</span> <b>{html.escape(chans.get(cid, cid))}</b> "
        f"<span class=muted>{datetime.fromtimestamp(at):%b %d %H:%M}</span><br>{html.escape(m)}</div>"
        for at, k, cid, m in alerts) or "<p class=muted>No alerts yet. Alerts appear after `watch run`.</p>"
    rising_html = "".join(
        f"<tr><td><a href='https://www.youtube.com/watch?v={v['id']}'><img loading=lazy "
        f"src='https://i.ytimg.com/vi/{v['id']}/mqdefault.jpg'></a></td><td><a href='https://www.youtube.com/"
        f"watch?v={v['id']}'>{html.escape(v['title'])}</a><br><span class=muted>{html.escape(v['channel'])}"
        f"</span></td><td class=n>{ts.fmt(v['views'])}</td><td class=n>{ts.fmt(v['per_day'])}</td>"
        f"<td class=n>{v['age']:.1f}d</td></tr>" for v in rising[:30])
    page = DASH.replace("__ALERTS__", alert_html).replace("__RISING__", rising_html) \
        .replace("__BARLABEL__", bar_label).replace("__LINES__", json.dumps(datasets)).replace("__BARS__", json.dumps(bars)) \
        .replace("__STATS__", f"{len(chans)} channels tracked · {snaps} snapshots · "
                              f"{len(alerts)} recent alerts · API units today: {ts.units_today()}") \
        .replace("__WHEN__", f"{datetime.now():%Y-%m-%d %H:%M}")
    ts.REPORTS.mkdir(exist_ok=True)
    path = ts.REPORTS / "dashboard.html"
    path.write_text(page)
    print(f"Dashboard: {path}")


DASH = """<!doctype html><html><head><meta charset=utf-8>
<meta name=viewport content='width=device-width,initial-scale=1'><title>TubeScout Radar</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
<style>
:root{--bg:#f7f7f9;--panel:#fff;--fg:#16161d;--muted:#6b6f7b;--line:#e4e6eb;--hot:#e03131;--accent:#4c6ef5}
@media (prefers-color-scheme:dark){:root{--bg:#101116;--panel:#181a21;--fg:#ececf1;--muted:#9aa0ac;--line:#2a2d36;--hot:#ff6b6b;--accent:#748ffc}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
header{padding:20px 16px 8px;max-width:1200px;margin:auto}h1{margin:0;font-size:22px}.muted{color:var(--muted)}
main{max-width:1200px;margin:auto;padding:8px 16px 40px;display:grid;gap:16px;grid-template-columns:2fr 1fr}
@media (max-width:860px){main{grid-template-columns:1fr}}
section{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px;min-width:0}
h2{font-size:15px;margin:0 0 10px}.wide{grid-column:1/-1}
.alert{border-left:3px solid var(--hot);padding:6px 10px;margin:0 0 8px;background:var(--bg);border-radius:0 8px 8px 0}
.alerts{max-height:560px;overflow:auto}.k{font-weight:700}
table{width:100%;border-collapse:collapse}td,th{padding:6px;border-bottom:1px solid var(--line);text-align:left}
td.n{text-align:right;font-variant-numeric:tabular-nums}img{width:110px;border-radius:6px;display:block}a{color:inherit}
.wrap{overflow-x:auto}canvas{max-height:360px}
</style></head><body>
<header><h1>TubeScout Radar</h1><div class=muted>__STATS__ · updated __WHEN__</div></header>
<main>
<section><h2>Views gained since tracking started (fastest-growing channels)</h2>
<p id=nolines class=muted hidden>This chart fills in once your <code>watch run</code> snapshots are 3+ hours apart
(YouTube only refreshes channel totals every few hours). Schedule it every 3–6 hours.</p>
<canvas id=lines></canvas></section>
<section class=alerts><h2>Alerts</h2>__ALERTS__</section>
<section class=wide><h2>__BARLABEL__</h2><canvas id=bars></canvas></section>
<section class=wide><h2>Rising videos (last 14 days, by views/day)</h2><div class=wrap><table>
<tr><th></th><th>Video</th><th>Views</th><th>Views/day</th><th>Age</th></tr>__RISING__</table></div></section>
</main>
<script>
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
Chart.defaults.color = css('--muted'); Chart.defaults.borderColor = css('--line');
const pal = ['#4c6ef5','#e64980','#12b886','#fab005','#7950f2','#fd7e14','#15aabf','#82c91e'];
const lines = __LINES__;
if (!lines.length) { document.getElementById('nolines').hidden = false; document.getElementById('lines').hidden = true; }
else new Chart(document.getElementById('lines'), {type:'line',
  data:{datasets: lines.map((d,i)=>({...d, borderColor:pal[i%8], backgroundColor:pal[i%8], tension:.25, pointRadius:2}))},
  options:{parsing:true, scales:{x:{type:'time'}, y:{ticks:{callback:v=>Intl.NumberFormat('en',{notation:'compact'}).format(v)}}},
           plugins:{legend:{position:'bottom'}}}});
const bars = __BARS__;
new Chart(document.getElementById('bars'), {type:'bar',
  data:{labels:bars.labels, datasets:[{label:'views/day', data:bars.data, backgroundColor:pal[0]}]},
  options:{indexAxis:'y', plugins:{legend:{display:false}},
           scales:{x:{ticks:{callback:v=>Intl.NumberFormat('en',{notation:'compact'}).format(v)}}}}});
</script></body></html>"""


def add_commands(sub):
    w = sub.add_parser("watch", help="track channels over time and raise breakout alerts")
    w.add_argument("action", choices=["add", "remove", "list", "discover", "run"])
    w.add_argument("args", nargs="*", help="handles for add/remove, niche searches for discover")
    w.add_argument("--days", type=int, default=30, help="discover: look-back window")
    w.add_argument("--max-subs", type=int, default=200_000, help="discover: ignore bigger channels")
    w.add_argument("--max-age", type=int, default=365, help="discover: only channels younger than N days")
    w.add_argument("--min-score", type=float, default=5.0, help="discover: minimum outlier multiple")
    w.add_argument("--per-channel", type=int, default=10, help="run: recent uploads checked per channel")
    w.set_defaults(fn=cmd_watch)
    dsh = sub.add_parser("dashboard", help="build the charts + alerts page")
    dsh.set_defaults(fn=cmd_dashboard)
