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

# See how much free quota you've used today and how big the cache is
python tubescout.py quota
```

### Saving your free quota

Every API answer is saved in `tubescout/cache.db`. Running the same search again the same
day costs **0 units**. Video stats are reused for 6 hours, searches and channels for 24
hours, autocomplete for a week, and transcripts permanently. Add `--fresh` to force new
data, for example `python tubescout.py --fresh channel @x`.

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
