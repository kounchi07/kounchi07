"""Viral-odds model for TubeScout.

Learns from every video already sitting in cache.db (each search, channel breakdown and
watch run adds more). Label: did the video reach 3x+ its own channel's median views?
That is the same "outlier" idea vidIQ and 1of10 use, so channel size cancels out and the
model learns what *the video* did differently: title shape, topic, format, length, settings.

  predict "Title idea" --minutes 16 --niche "brand downfall"   score an idea before you make it
  predict https://youtube.com/watch?v=...                      early verdict on a live video
  predict --train                                              retrain + print accuracy report

Honest limits: thumbnails, hooks and retention are not visible to the API, and they
matter a lot. Treat the score as better-than-guessing odds, not a guarantee.
"""

import json
import math
import random
import re
import statistics
import sys
import time
from collections import defaultdict

import numpy as np

import tubescout as ts

MODEL_PATH = ts.HERE / "model.json"
OUTLIER_X = 3.0
MIN_CHANNEL_VIDEOS = 8

POWER = set("""secret secrets truth finally deserve deserves deserved nobody everyone never worst best
insane shocking dark real really exposed why how happened destroyed killed died dead fall fell lost
ruined broke greed greedy lie lies lied scam hidden untold forgotten disappeared vanished""".split())
NEGATIVE = set("""fail failed failing failure dead dying died bankrupt bankruptcy collapse collapsed
crash crashed closing closed shut lost losing ruined worst broke greed greedy scam backfiring
backfired destroyed downfall trouble decline""".split())
CATEGORIES = ["1", "20", "22", "24", "25", "26", "27", "28"]

FEATURES = ["title_len", "title_words", "has_number", "has_question", "has_colon", "has_ellipsis",
            "has_parens", "has_dollar", "caps_ratio", "power_words", "negative_words", "you_words",
            "i_words", "starts_with_topic", "dur_short", "dur_mid", "dur_long", "dur_xl", "log_minutes",
            "log_tags", "lang_set", "log_desc", "has_chapters", "weekend",
            *[f"cat_{c}" for c in CATEGORIES], "format_match", "topic_proven", "topic_crowded",
            "momentum", "own_hit_format", "is_sequel", "prev_hits"]


# ---------------------------------------------------------------- data

def cached_videos():
    """Every video object the API has returned and we cached (deduped, freshest copy)."""
    vids = {}
    for at, raw in ts.db().execute("SELECT at, v FROM cache WHERE kind='videos' ORDER BY at"):
        for it in json.loads(raw).get("items", []):
            if "statistics" in it and "contentDetails" in it:
                vids[it["id"]] = it
    return vids


def build_rows():
    rows = []
    by_chan = defaultdict(list)
    for v in cached_videos().values():
        sn, st = v["snippet"], v["statistics"]
        secs = ts.parse_duration(v["contentDetails"].get("duration"))
        if secs < 61 or "viewCount" not in st:
            continue  # Shorts behave differently; skip
        by_chan[sn["channelId"]].append({
            "id": v["id"], "channel_id": sn["channelId"], "title": sn["title"],
            "published": sn["publishedAt"], "views": int(st["viewCount"]), "seconds": secs,
            "tags": len(sn.get("tags", [])), "lang": sn.get("defaultAudioLanguage"),
            "category": sn.get("categoryId"), "desc": sn.get("description", "")})
    for cid, vs in by_chan.items():
        settled = [v for v in vs if ts.age_days(v["published"]) >= 7]
        if len(settled) < MIN_CHANNEL_VIDEOS:
            continue
        med = statistics.median(v["views"] for v in settled)
        if med < 50:
            continue
        for v in vs:
            v["ratio"] = v["views"] / med
        add_history(sorted(vs, key=lambda v: v["published"]))
        for v in settled:
            v["label"] = int(v["ratio"] >= OUTLIER_X)
            rows.append(v)
    return rows


def add_history(ordered):
    """Attach what was knowable before each upload: recent momentum and earlier hits."""
    for i, v in enumerate(ordered):
        prev = ordered[max(0, i - 5):i]
        v["momentum"] = statistics.median(p["ratio"] for p in prev) if prev else 1.0
        v["prior_hits"] = [p["title"] for p in ordered[:i] if p["ratio"] >= OUTLIER_X]


# ---------------------------------------------------------------- features

def tokens(title):
    return {w for w in re.findall(r"[a-z0-9$']+", ts.title_template(title)) if w not in ts.STOPWORDS}


def jaccard(a, b):
    return len(a & b) / len(a | b) if a and b else 0.0


class Reference:
    """Outlier titles/topics from *other* channels: is this format/topic already proven?"""

    def __init__(self, rows):
        self.out = [(r["channel_id"], tokens(r["title"])) for r in rows if r["label"]]
        self.index = defaultdict(list)
        for i, (_, toks) in enumerate(self.out):
            for t in toks:
                self.index[t].append(i)
        self.topic_hits = defaultdict(set)    # topic -> channels with an outlier on it
        self.topic_all = defaultdict(set)     # topic -> channels with any video on it
        for r in rows:
            for t in ts.extract_topics(r["title"]):
                self.topic_all[t.lower()].add(r["channel_id"])
                if r["label"]:
                    self.topic_hits[t.lower()].add(r["channel_id"])

    def format_match(self, title, channel_id=None):
        toks = tokens(title)
        if not toks:
            return 0.0, None
        cand = defaultdict(int)
        for t in toks:
            for i in self.index.get(t, ()):
                cand[i] += 1
        best, best_i = 0.0, None
        for i, shared in cand.items():
            if self.out[i][0] == channel_id:
                continue
            j = shared / len(toks | self.out[i][1])
            if j > best:
                best, best_i = j, i
        return best, best_i

    def topic_stats(self, title, channel_id=None):
        proven = crowded = 0
        for t in ts.extract_topics(title):
            hits = self.topic_hits.get(t.lower(), set()) - {channel_id}
            alls = self.topic_all.get(t.lower(), set()) - {channel_id}
            proven = max(proven, len(hits))
            crowded = max(crowded, len(alls))
        return proven, crowded


def featurize(v, ref):
    t = v["title"]
    words = re.findall(r"[A-Za-z0-9$']+", t)
    low = [w.lower() for w in words]
    mins = v["seconds"] / 60
    pub = ts.datetime.fromisoformat(v["published"].replace("Z", "+00:00")) if v.get("published") else None
    fm, _ = ref.format_match(t, v.get("channel_id"))
    proven, crowded = ref.topic_stats(t, v.get("channel_id"))
    topics = ts.extract_topics(t)
    f = {
        "title_len": len(t) / 100, "title_words": len(words) / 15,
        "has_number": int(bool(re.search(r"\d", t))), "has_question": int("?" in t),
        "has_colon": int(":" in t), "has_ellipsis": int("…" in t or "..." in t),
        "has_parens": int("(" in t), "has_dollar": int("$" in t),
        "caps_ratio": sum(1 for w in words if w.isupper() and len(w) > 2) / max(len(words), 1),
        "power_words": sum(w in POWER for w in low), "negative_words": sum(w in NEGATIVE for w in low),
        "you_words": sum(w in ("you", "your", "you're") for w in low),
        "i_words": sum(w in ("i", "my", "we", "our", "i'm") for w in low),
        "starts_with_topic": int(bool(topics) and t.replace("’", "'").startswith(topics[0].split()[0])),
        "dur_short": int(mins < 4), "dur_mid": int(4 <= mins < 10), "dur_long": int(10 <= mins < 20),
        "dur_xl": int(mins >= 20), "log_minutes": math.log1p(mins),
        "log_tags": math.log1p(v.get("tags", 0)), "lang_set": int(bool(v.get("lang"))),
        "log_desc": math.log1p(len(v.get("desc", ""))) / 8,
        "has_chapters": int(bool(re.search(r"(^|\n)\s*0?0:00", v.get("desc", "")))),
        "weekend": int(pub.weekday() >= 5) if pub else 0,
        "format_match": fm, "topic_proven": math.log1p(proven), "topic_crowded": math.log1p(crowded),
        "momentum": math.log(max(v.get("momentum", 1.0), 0.05)),
        "own_hit_format": max((jaccard(tokens(t), tokens(h)) for h in v.get("prior_hits", [])), default=0.0),
        "is_sequel": int(bool(re.search(r"part\s*\d|\b(ii|returns|again)\b|\b\d+\s+days\b", t, re.I))),
        "prev_hits": math.log1p(len(v.get("prior_hits", []))),
    }
    for c in CATEGORIES:
        f[f"cat_{c}"] = int(v.get("category") == c)
    return [f[k] for k in FEATURES]


# ---------------------------------------------------------------- logistic regression (numpy)

def fit(X, y, l2=1.0, epochs=800, lr=0.1):
    mu, sd = X.mean(0), X.std(0) + 1e-9
    Z = (X - mu) / sd
    w, b = np.zeros(Z.shape[1]), 0.0
    pos = y.mean()
    sw = np.where(y == 1, 0.5 / pos, 0.5 / (1 - pos))  # balance classes while learning
    for _ in range(epochs):
        p = 1 / (1 + np.exp(-(Z @ w + b)))
        g = (p - y) * sw
        w -= lr * (Z.T @ g / len(y) + l2 * w / len(y))
        b -= lr * g.mean()
    return {"w": w.tolist(), "b": b, "mu": mu.tolist(), "sd": sd.tolist()}


def raw_score(m, X):
    Z = (X - np.array(m["mu"])) / np.array(m["sd"])
    return Z @ np.array(m["w"]) + m["b"]


def auc(scores, y):
    order = np.argsort(scores)
    ranks = np.empty(len(scores))
    ranks[order] = np.arange(1, len(scores) + 1)
    pos = y.sum()
    return (ranks[y == 1].sum() - pos * (pos + 1) / 2) / (pos * (len(y) - pos))


def calibrate(scores, y, bins=10):
    """Map raw score -> real hit rate using score deciles (honest probabilities)."""
    edges = np.quantile(scores, np.linspace(0, 1, bins + 1))
    table = []
    for i in range(bins):
        mask = (scores >= edges[i]) & (scores <= edges[i + 1])
        table.append([float(edges[i]), float(edges[i + 1]), float(y[mask].mean()) if mask.any() else 0.0,
                      int(mask.sum())])
    return table


def train(verbose=True, folds=5, l2=1000.0):
    rows = build_rows()
    if len(rows) < 300 or sum(r["label"] for r in rows) < 30:
        sys.exit(f"Only {len(rows)} usable videos cached. Run more searches/channel breakdowns first.")
    chans = sorted({r["channel_id"] for r in rows})
    random.Random(7).shuffle(chans)
    # Cross-validation grouped by channel: every score below comes from a model that never saw
    # that channel, and the topic/format reference is rebuilt without it (no peeking at labels).
    oof, aucs = np.zeros(len(rows)), []
    for k in range(folds):
        test_ch = set(chans[k::folds])
        tr_i = [i for i, r in enumerate(rows) if r["channel_id"] not in test_ch]
        te_i = [i for i, r in enumerate(rows) if r["channel_id"] in test_ch]
        ref = Reference([rows[i] for i in tr_i])
        Xtr = np.array([featurize(rows[i], ref) for i in tr_i])
        Xte = np.array([featurize(rows[i], ref) for i in te_i])
        ytr = np.array([rows[i]["label"] for i in tr_i]); yte = np.array([rows[i]["label"] for i in te_i])
        m = fit(Xtr, ytr, l2=l2)
        oof[te_i] = raw_score(m, Xte)
        aucs.append(auc(oof[te_i], yte))
    y = np.array([r["label"] for r in rows])
    ref = Reference(rows)
    X = np.array([featurize(r, ref) for r in rows])
    m = fit(X, y, l2=l2)
    # Calibrate on out-of-fold scores, mapped onto the final model's scale by rank.
    s_all = raw_score(m, X)
    cal = calibrate(oof, y)
    q_oof = np.quantile(oof, np.linspace(0, 1, 11))
    q_all = np.quantile(s_all, np.linspace(0, 1, 11))
    for i, c in enumerate(cal):
        c[0], c[1] = float(q_all[i]), float(q_all[i + 1])
    m.update({"features": FEATURES, "calibration": cal, "base_rate": float(y.mean()),
              "n": len(rows), "channels": len(chans), "test_auc": float(np.mean(aucs)),
              "test_auc_sd": float(np.std(aucs)), "trained": time.time(),
              "score_quantiles": np.quantile(s_all, np.linspace(0, 1, 101)).tolist()})
    MODEL_PATH.write_text(json.dumps(m))
    if verbose:
        print(f"Trained on {len(rows)} videos from {len(chans)} channels "
              f"({y.mean():.1%} reached {OUTLIER_X:.0f}x their channel median).")
        print(f"Accuracy on channels the model never saw ({folds}-fold): AUC {np.mean(aucs):.2f} "
              f"± {np.std(aucs):.2f}  (0.5 = coin flip, 1.0 = perfect)")
        print("\nWhat the model learned (+ raises odds, − lowers):")
        for name, w in sorted(zip(FEATURES, m["w"]), key=lambda x: -abs(x[1]))[:12]:
            print(f"  {'+' if w > 0 else '−'} {name:18} {w:+.2f}")
        print("\nReal hit rate by predicted score, lowest to highest tenth (unseen channels):")
        print("  " + "  ".join(f"{c[2]:.0%}" for c in cal))
    return m


def load_model():
    if not MODEL_PATH.exists():
        return train(verbose=False)
    m = json.loads(MODEL_PATH.read_text())
    if time.time() - m["trained"] > 7 * 86400:
        return train(verbose=False)
    return m


def probability(m, s):
    for lo, hi, rate, _ in m["calibration"]:
        if s <= hi:
            return rate
    return m["calibration"][-1][2]


def percentile(m, s):
    return int(np.searchsorted(m["score_quantiles"], s))


# ---------------------------------------------------------------- predict

EXPLAIN = {
    "format_match": ("Title format matches a proven outlier on another channel", "Format isn't proven yet"),
    "topic_proven": ("Topic has produced outliers for other channels", None),
    "topic_crowded": ("Lots of channels already cover this topic", "Topic isn't crowded"),
    "dur_long": ("10–20 min length (winning range for story docs)", None),
    "dur_xl": ("20+ min length", None),
    "dur_mid": ("4–10 min length", None),
    "lang_set": ("Video language is set", "Video language not set"),
    "log_tags": ("Has tags", "No tags"),
    "has_ellipsis": ("Ellipsis cliffhanger (…)", None),
    "negative_words": ("Conflict/decline words", None),
    "power_words": ("Curiosity/emotion words", None),
    "has_chapters": ("Has chapters", None),
    "starts_with_topic": ("Subject named first", None),
    "momentum": ("Your recent videos are trending up", "Your recent videos are below your median"),
    "own_hit_format": ("Reuses the format of one of your own past hits", "Doesn't build on your own past hits"),
    "is_sequel": ("Sequel / day-count format", None),
    "prev_hits": ("Channel has had outliers before", None),
}


def cmd_predict(a):
    if a.train:
        train()
        return
    m = load_model()
    target = a.target or sys.exit("Give a title in quotes or a video URL.")
    vid = re.search(r"(?:v=|youtu\.be/|shorts/)([\w-]{11})", target)
    if vid:
        return predict_live(m, vid.group(1))
    v = {"title": target, "seconds": a.minutes * 60, "tags": a.tags, "lang": "en" if a.lang_set else None,
         "category": a.category, "desc": "0:00 Intro" if a.chapters else "x" * 400,
         "published": None, "channel_id": None}
    if a.channel:
        attach_channel_history(v, a.channel)
    ref = Reference(build_rows())
    x = np.array([featurize(v, ref)])
    s = float(raw_score(m, x)[0])
    p, pct = probability(m, s), percentile(m, s)
    base = m["base_rate"]
    print(f"\n“{target}”  ({a.minutes} min)")
    print(f"\n  VIRAL SCORE  {pct}/100   (better than {pct}% of {m['n']:,} real videos in the model)")
    print(f"  Chance of 3x+ your channel's normal views: ~{p:.0%}  (average video: {base:.0%}, "
          f"{p / base:.1f}x the usual odds)")
    print(f"  Model accuracy on unseen channels: AUC {m['test_auc']:.2f}\n")

    contrib = (x[0] - np.array(m["mu"])) / np.array(m["sd"]) * np.array(m["w"])
    ups, downs = [], []
    for i in np.argsort(-np.abs(contrib)):
        name = FEATURES[i]
        if name not in EXPLAIN or abs(contrib[i]) < 0.05:
            continue
        good, bad = EXPLAIN[name]
        (ups if contrib[i] > 0 else downs).append(good if contrib[i] > 0 or not bad else bad)
    if ups:
        print("  Helping:  " + "; ".join(dict.fromkeys(ups[:5])))
    if downs:
        print("  Hurting:  " + "; ".join(dict.fromkeys(d for d in downs[:5] if d)))

    fm, i = ref.format_match(target, v["channel_id"])
    if i is not None and fm > 0.25:
        print(f"\n  Closest proven outlier format ({fm:.0%} match): “{ref_title(ref, i)}”")
    proven, crowded = ref.topic_stats(target, v["channel_id"])
    topics = ts.extract_topics(target)
    if topics:
        print(f"  Topic “{topics[0]}”: {proven} channels had an outlier on it, {crowded} channels covered it "
              "(in your cached data)")
        demand = [s for q in (f"{topics[0]} is", f"why is {topics[0]}") for s in ts.autocomplete(q)]
        hot = list(dict.fromkeys(s for s in demand if re.search(
            r"\b(fail\w*|dead|dying|clos\w*|bankrupt\w*|trouble|expensive|hated|boycott\w*|struggl\w*|"
            r"done|over|crash\w*|shut\w*|down)\b", s)))
        print(f"  Search demand: {len(hot)} negative autocomplete hits"
              + (f" (e.g. {', '.join(hot[:3])})" if hot else " (weak; consider a different angle)"))
    print("\n  Not measured (check yourself): thumbnail, first 30 seconds, retention, upload consistency.")


def attach_channel_history(v, ref):
    """Give an idea the momentum / past-hit context of the channel it will be posted on."""
    key = ts.need_key()
    cid = ts.resolve_channel(ref, key)
    chan = ts.channel_info([cid], key)[cid]
    vids = ts.video_details(ts.upload_ids(chan["uploads"], key, 50), key)
    vids = [x for x in vids if x["seconds"] > 60]
    settled = [x["views"] for x in vids if ts.age_days(x["published"]) >= 7] or [x["views"] for x in vids]
    med = statistics.median(settled) if settled else 1
    for x in vids:
        x["ratio"] = x["views"] / max(med, 1)
    ordered = sorted(vids, key=lambda x: x["published"])
    prev = ordered[-5:]
    v["momentum"] = statistics.median(p["ratio"] for p in prev) if prev else 1.0
    v["prior_hits"] = [p["title"] for p in ordered if p["ratio"] >= OUTLIER_X]
    v["channel_id"] = cid
    print(f"  Channel context: {chan['title']}, median {ts.fmt(med)} views, last-5 momentum "
          f"{v['momentum']:.2f}x, {len(v['prior_hits'])} past 3x hits")


def ref_title(ref, i):
    # Reference stores tokens only; recover the original title from the cache for display
    toks = ref.out[i][1]
    for r in build_rows():
        if r["label"] and tokens(r["title"]) == toks:
            return r["title"]
    return " ".join(sorted(toks))


def growth_curve():
    """Typical views at age N days as a share of a channel's median, learned from cached data."""
    buckets = [(0, 1), (1, 2), (2, 4), (4, 7), (7, 14), (14, 30), (30, 10_000)]
    by_chan = defaultdict(list)
    for v in cached_videos().values():
        if "viewCount" in v["statistics"] and ts.parse_duration(v["contentDetails"].get("duration")) > 60:
            by_chan[v["snippet"]["channelId"]].append(
                (ts.age_days(v["snippet"]["publishedAt"]), int(v["statistics"]["viewCount"])))
    ratios = defaultdict(list)
    for vs in by_chan.values():
        settled = [n for age, n in vs if age >= 7]
        if len(settled) < MIN_CHANNEL_VIDEOS:
            continue
        med = statistics.median(settled) or 1
        for age, n in vs:
            for lo, hi in buckets:
                if lo <= age < hi:
                    ratios[(lo, hi)].append(n / med)
    return {b: statistics.median(r) for b, r in ratios.items() if len(r) >= 20}


def predict_live(m, video_id):
    key = ts.need_key()
    v = ts.video_details([video_id], key)[0]
    c = ts.channel_info([v["channel_id"]], key)[v["channel_id"]]
    base = ts.channel_baseline(c, key)
    age = ts.age_days(v["published"])
    curve = growth_curve()
    expected_share = next((r for (lo, hi), r in curve.items() if lo <= age < hi), 1.0)
    expected = base * expected_share
    pace = v["views"] / max(expected, 1)
    projected = v["views"] / max(expected_share, 0.05) if age < 30 else v["views"]
    print(f"\n{v['title']}  — {v['channel']}")
    print(f"  {ts.fmt(v['views'])} views after {age:.1f} days. Channel median: {ts.fmt(base)}.")
    print(f"  A typical video at this age has ~{expected_share:.0%} of its long-run views "
          f"(learned from {m['n']:,} videos), so expected now: ~{ts.fmt(expected)}.")
    verdict = ("🔥 BREAKING OUT" if pace >= 3 else "📈 above normal" if pace >= 1.3
               else "➖ normal" if pace >= 0.7 else "📉 below normal")
    print(f"  Pace: {pace:.1f}x normal → {verdict}. Rough projection: ~{ts.fmt(projected)} views "
          f"(~{projected / max(base, 1):.1f}x the channel median).")
    if pace < 0.7 and age < 3:
        print("  Early & slow: try a new thumbnail/title now; YouTube re-tests packaging changes.")


def add_commands(sub):
    p = sub.add_parser("predict", help="viral odds for a title idea, or early verdict for a live video")
    p.add_argument("target", nargs="?", help="a title in quotes, or a YouTube video URL")
    p.add_argument("--minutes", type=float, default=16, help="planned length")
    p.add_argument("--tags", type=int, default=10)
    p.add_argument("--category", default="27", help="27 Education, 24 Entertainment, 22 People & Blogs")
    p.add_argument("--no-lang", dest="lang_set", action="store_false", help="language not set")
    p.add_argument("--chapters", action="store_true", help="description will have chapters")
    p.add_argument("--channel", help="your channel (@handle): adds your momentum and past hits")
    p.add_argument("--train", action="store_true", help="retrain from all cached data and show accuracy")
    p.set_defaults(fn=cmd_predict)
