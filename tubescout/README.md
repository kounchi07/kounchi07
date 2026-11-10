# TubeScout

A free, self-hosted YouTube idea finder. It does the main job of paid "outlier" tools
(1of10, ViewStats Pro, OutlierKit, NexLev): it finds videos that got far more views than
their channel usually gets, pulls out the title format behind them, and checks what people
are searching for around that format.

## How new channels actually blow up

New channels that "pop from day one" are rarely lucky. Most of them repeat a few steps:

1. **They find a format that is already working.** They look for an *outlier*: a video
   that did 5–50x its channel's normal views. That shows the topic and packaging did the
   work, not the size of the channel.
2. **They copy the format, not the video.** Same title structure, same thumbnail style,
   same length, with a new subject or setting.
3. **They post a lot of that format.** One format, many variations, often daily.
4. **When one variation hits, they make sequels of it right away** (Part 2, Part 3, "60
   days", "90 days").

**Real example: Nobody Gets In** (`@nobodygetsin`, started 1 Oct 2026). Every title is
`Zombie Outbreak: N Days [Locked/Trapped] Inside a [PLACE]`. They posted about one video a
day. *Supermarket* hit 2.4M views and *School* hit 1.5M, so both got a Part 2 and a Part 3
within days. The niche is faceless animated survival stories, and it was already proven
before they started. YouTube autocomplete already shows copycat demand: "zombie outbreak
30 days in your car", "…costco", "…ikea", "…cruise", "…backyard bunker".

TubeScout automates steps 1 and 2.

## Setup

```bash
pip install -r requirements.txt
```

Downloads and transcripts use [yt-dlp](https://github.com/yt-dlp/yt-dlp) and
[youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api), both free and
open source. yt-dlp works best with [deno](https://deno.com) installed and **ffmpeg**
installed (needed to merge video and audio). YouTube blocks both tools from cloud servers
and many VPNs, so run them on your own computer.

`suggest` and `channel` work right away. `outliers` and `ideas` need a **free** YouTube
Data API key:

1. Go to https://console.cloud.google.com and create a project.
2. Go to *APIs & Services* → *Library* → enable **YouTube Data API v3**.
3. Go to *Credentials* → *Create credentials* → *API key*.
4. `echo YOUTUBE_API_KEY=your_key_here > tubescout/.env`

The free quota is 10,000 units a day. One `outliers` run with the default 2 pages costs
roughly 200–300 units, so you get about 30–40 runs a day for free.

## Commands

```bash
# What people type into YouTube search (no key needed)
python tubescout.py suggest "zombie outbreak"

# Break down any channel: breakouts, repeated title formats, sequels
python tubescout.py channel @nobodygetsin

# Videos from the last 30 days that beat their channel's median views by 2x or more,
# from channels under 500K subs
python tubescout.py outliers "survival story animation" --days 30 --no-shorts

# Find only small or new channels that are popping
python tubescout.py outliers "what if" --max-subs 50000 --min-score 5 --days 14

# Outliers -> reusable title formats + search demand around each one
python tubescout.py ideas "faceless history documentary" --days 60

# Scan many faceless niches at once, ranked by new channels breaking through
python tubescout.py niches                      # built-in faceless storytelling list
python tubescout.py niches "brand downfall" "true crime animated"

# Save transcripts of a channel's top videos to study their scripts
# (run this on your own computer: YouTube blocks transcript downloads from cloud servers)
python tubescout.py transcripts @SomeChannel --top 3

# Topic radar: which subjects (brands, people, places) are hot vs already covered
python tubescout.py topics "finally getting what it deserves" "what happened to company" --days 90

# Watchlist + alerts + dashboard
python tubescout.py watch discover "brand downfall" --days 30    # add new channels that are popping
python tubescout.py watch add @BagholderAssociation @nobodygetsin
python tubescout.py watch run                                    # snapshot: about 1-2 units per channel
python tubescout.py dashboard                                    # open reports/dashboard.html

# Viral odds: score an idea before you make it (add your channel for momentum + past hits)
python tubescout.py predict "Spirit Airlines Is (Finally) Getting What It Deserves…" --channel @brandreceipts --minutes 16 --chapters
# Early verdict on a video that's already live (is it beating the channel's normal pace?)
python tubescout.py predict https://www.youtube.com/watch?v=VIDEO_ID
# Retrain from everything in your cache and print the accuracy report
python tubescout.py predict --train

# Download with yt-dlp: video (mp4) + English subtitles + thumbnail
python tubescout.py download https://www.youtube.com/watch?v=3Hp03-lSQRw
python tubescout.py download @BagholderAssociation --top 5 --subs-only   # scripts + thumbnails only
python tubescout.py download <url> --audio                               # audio only (voice/pacing study)
# If YouTube says "Sign in to confirm you're not a bot":
python tubescout.py download <url> --cookies-from-browser chrome

# See how much free quota you've used today and how big the cache is
python tubescout.py quota
```

### Alerts and the dashboard

`watch run` saves a snapshot of every tracked channel and its latest uploads, then flags:

- 🔥 **breakout**: a video from the last 14 days at 3x+ its channel's median views
- ⚡ **accelerating**: a video gaining views 3x faster than the channel's normal pace (needs two snapshots)
- 🆕 **new channel**: a channel under 120 days old with 100K+ views
- 📈 **surging**: subscribers growing 10%+ per day

Each alert fires once. `dashboard` turns everything into one page with charts. Growth
charts fill in once snapshots are 3+ hours apart, because YouTube only refreshes channel
totals every few hours.

Run it automatically every 4 hours on your computer:

- **Mac/Linux:** run `crontab -e` and add
  `0 */4 * * * cd /path/to/kounchi07/tubescout && python3 tubescout.py watch run && python3 tubescout.py dashboard`
- **Windows:** use Task Scheduler to run the same two commands.

To get alerts on your phone, create a Discord channel webhook (Channel settings →
Integrations → Webhooks) and add `DISCORD_WEBHOOK_URL=...` to `.env`.

With 25 channels, each run costs about 30 units. That's about 180 units a day at 6 runs
a day.

### How `predict` works (and how good it is)

vidIQ doesn't publish its formulas. Its docs say its outlier and breakout scores compare a
video's views and speed with the channel's usual numbers. `predict` uses the same idea and
learns it from real data:

- **Training data:** every video in your cache (about 8,000 videos from 340 channels after
  one day of use). Each is labeled by whether it reached **3x its own channel's median**,
  so a big channel and a small channel are judged the same way.
- **What it looks at:**
  - **The title:** length, numbers, questions, ellipsis, power and conflict words.
  - **Format:** whether the title matches a proven outlier on another channel.
  - **Topic:** whether it has produced outliers before, and how crowded it is.
  - **The video:** length, tags, language, category, chapters.
  - **Your channel:** recent momentum and whether the idea repeats one of your own past hits.
- **How accurate it is:** on channels it has never seen, AUC is 0.62 (0.5 is a coin flip,
  1.0 is perfect). Ideas in its top 10% actually hit 3x **34%** of the time; its bottom 10%
  hit **10%** of the time. That's a real edge, but not a guarantee.
- **What it can't see:** the thumbnail, the first 30 seconds and audience retention. These
  matter a lot, so check them yourself.
- **It gets better as you use it:** every search adds training videos, and it retrains
  automatically each week.

For a live video, `predict <url>` compares its views with the channel's normal pace at the
same age, using a growth curve learned from the cached videos. If it's behind after a day,
change the thumbnail or title.

### Story engine (`stories`, `saturation`)

`stories` pulls the full libraries of 20 story-Shorts channels (Zack D. Films, Athena_Explains,
History Explained, Global Secrets, True Tales, World explained and others). It groups videos
that tell the same story, keeps the stories that are **proven** (300K+ views, or 10x+ the
channel's normal), skips stories still in a copy wave, and then searches each candidate to
measure **saturation**:
- how many channels told it as a Short in the past year
- how many did so in the last 30 days
- the median views of those retellings
- how many retellings broke 100K, especially on small channels

Each story is ranked 🟢 OPEN, 🟢 RIPE, 🟡 WARM or 🔴 CROWDED.

```bash
python tubescout.py stories                                   # about 1,600 units the first time, then mostly cached
python tubescout.py stories --channels @somechannel --check 10
python tubescout.py saturation "lake peigneur salt mine oil rig"   # check one story, about 100 units
```

What the first runs found (Nov 2026):
- **Copies of mega-hits don't work.** Zack D. Films stories with 36–52M views get copied by
  16–48 channels, and those copies get a median of about 1,300 views.
- **About 5–10% of retellings break 100K**, and the ones that do are mostly on established
  channels.
- Small channels won when they **got to a news story first** (the flydubai stabbing: 3.6M on
  a 2.3K-subscriber channel) or **found a new angle and a stronger title** (BA 5390: 511K on
  1.3K subscribers, with "Sucked Out… at 17,000 Feet").

### Breaking-stories scanner (`fresh`)

`fresh` searches Shorts published in the **last 72 hours** across 15 story-event keywords
(rescued, survived, trapped, plane emergency, sinkhole, heist and others) and ranks them by:
- **views per hour**
- **reach:** views ÷ the channel's subscribers (high means YouTube is pushing it to new viewers)
- **channels covering it:** how many channels have already posted the same story

Each story gets 🚀 EARLY (1–2 channels), ⚡ HEATING (3–5) or 🔥 CROWDING (6+). Games, sports,
edits and trends are filtered out.

```bash
python tubescout.py fresh                                  # about 1,500 units; a rerun within the hour is free
python tubescout.py fresh --hours 48 --queries "cave rescue" "lottery winner" "shipwreck"
```

**How to use it:** look through the 🚀 EARLY items for **real events** you can confirm in news
reports. Make your version **the same day**, with your own angle and a stronger title. The list
still needs a human eye, because some fast-moving Shorts are movie clips or staged "survival
skills" videos.

### Saving your free quota

Every API answer is saved in `tubescout/cache.db`. Running the same search again the same
day costs **0 units**. Video stats are reused for 6 hours, searches and channels for 24
hours, autocomplete for a week, and transcripts permanently. Add `--fresh` to force new
data, for example `python tubescout.py --fresh channel @x`.

**More than one key:** add each one to `.env`. TubeScout uses the first key until it reaches
the daily budget, or until YouTube says that key is out of quota, then moves to the next one.
`python tubescout.py quota` shows usage per key.

```
YOUTUBE_API_KEY=first_key
YOUTUBE_API_KEY_2=second_key        # YOUTUBE_API_KEY_3 … _9 also work
```

YouTube's developer policies don't allow creating several projects for one use case to get
around the quota, and keys that do this can be suspended. The approved route is a free quota
increase request in Google Cloud (APIs & Services → YouTube Data API v3 → Quotas).

There is also a **daily budget**. TubeScout stops at 9,000 units a day, so it never hits
YouTube's 10,000 limit in the middle of a run. Cached results keep working after that.
Change it with `TUBESCOUT_DAILY_BUDGET=...` in `.env`.

### Scripts

- `prompts/script-breakdown.md`: paste in a viral video's transcript and Claude maps its
  hook, beats and retention tricks.
- `prompts/script-writer.md`: the structure viral story documentaries use, with a
  self-scoring pass at the end. Use it with Claude to write your script, then build the
  video in Remotion.

Each command prints results and saves an HTML report with thumbnails to
`tubescout/reports/`. Open it in a browser.

### What the numbers mean

- **Outlier (e.g. 9.2x)**: the video's views divided by the channel's *median* views on
  recent uploads. A score of 3x or more means the idea and packaging worked.
- **Views/day**: how fast the video is still growing.
- **Ch. age**: channel age in days. Outliers on channels under 120 days old show niches
  that new channels can break into now. The report lists these separately.

## A workflow that works

1. Write down 5–10 broad niches you would enjoy making videos about for a year.
2. Run `outliers` on each one with `--max-subs 100000 --days 30`. Ignore niches with no
   outliers.
3. Run `channel` on the 3–5 small channels that keep showing up. Look at the **format**
   section and copy the structure.
4. Run `suggest` on that format's opening words to get 30–100 variations people search for.
5. Make 10–20 videos in **one** format before you judge it. When one does 2x or more of
   your median, make its sequel next.

## Open-source tools found while researching

- [mutube-org/cli](https://github.com/mutube-org/cli): open-source 1of10/ViewStats alternative (early stage)
- [pandich93/youtube-niche-finder](https://github.com/pandich93/youtube-niche-finder): self-hosted niche and outlier finder with a dashboard (Postgres, Docker)
- [shkuratovdesigner/yuben-app](https://github.com/shkuratovdesigner/yuben-app): local-first outlier research
- [slaavass/youtube-outlier-finder](https://github.com/slaavass/youtube-outlier-finder): Shorts channel outlier finder (TypeScript)
- [yusufipk/YouTubeOutlierBadge](https://github.com/yusufipk/YouTubeOutlierBadge): Firefox extension that shows an outlier score on every thumbnail
- [ahmedmostafa147/youtube-studio](https://github.com/ahmedmostafa147/youtube-studio): local vidIQ/TubeBuddy-style tool
