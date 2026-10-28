# Brand Receipts: channel audit (28 Oct 2026)

Data comes from the YouTube Data API through TubeScout. Transcripts come from vidIQ.

## Where you stand

- 9 videos, 69 subscribers, 24K views. Median video: 1.0K views.
- **Two videos already broke out:** Jack in the Box got 11.0K (10.9x your median) and
  Nintendo got 9.0K (8.9x). The niche and the format work for you. You just haven't made
  enough videos yet to land a big one.

## The comparison: Bagholder Association

Same niche, same title format, same thumbnail style. They started 18 May 2026 and have
52 videos, 9.8K subscribers and 7.4M views.

|                          | Brand Receipts | Bagholder Association |
|--------------------------|----------------|-----------------------|
| Videos                   | 9              | 52                    |
| Median length            | **8.8 min**    | **17–19 min**         |
| Median views             | 1.0K           | 42.6K                 |
| 'Video language' set     | 1 of 9         | all                   |
| Category                 | People & Blogs | Education             |
| Tags                     | 1 of 9 videos  | all (8–23 each)       |

Their best videos are Pepsi (1.3M), Doritos (1.2M), Krispy Kreme (725K), Gillette (599K),
KFC (561K) and Five Guys (455K).

Even Bagholder's median video gets about 43K views, and only around 1 in 6 of their videos
breaks out. Most of their 52 videos are ordinary. **Volume is part of their strategy.**

## What to change, most important first

1. **Make longer, deeper videos (15–18 min).** Every one of their hits is 16–20 minutes.
   Yours are 6–12. A longer video that holds attention earns far more watch time per click,
   and watch time is what YouTube uses to decide what to recommend.
2. **Pick bigger, more emotional brands.** Their hits are brands nearly everyone has bought
   from (Pepsi, Doritos, KFC, Gillette) plus brands people already complain about online.
   Walgreens (88 views) and Papa John's (276) are smaller and less emotional. Use
   `python tubescout.py suggest "<brand> is"` and the outliers search to check that people
   are already angry or curious about a brand before you pick it.
3. **Don't follow them onto the same brand days later.** Your Wendy's video came out 3 days
   after theirs and got 1.5K views; theirs got 435K. Your two winners, Jack in the Box and
   Nintendo, are brands they haven't covered. Run `python tubescout.py channel
   UCaMJ003hQXcETQIs2_ppVLQ` before you choose a topic.
4. **Move the subscribe ask to the end.** In the Jack in the Box script you stop the story
   at 4:35 to ask for comments and subscribes. Bagholder never breaks the story. Keep one
   line at the very end.
5. **Fix the upload settings, which takes 2 minutes per video.** In Studio > Details, set
   **Video language = English** and **Category = Education**, and add tags. 8 of your 9
   videos have no language set. When we pulled your Jack in the Box captions, the default
   track came back in **Bengali**. Your videos have many auto-translated tracks; Bagholder's
   mostly only have English. Check Studio > Languages and make sure English is the original.
6. **Use one structure for every script.** Your scripts are better than you think. The Jack
   in the Box cold open is a good paradox ("paid $575M… sold for $115M… spent $2B on
   buybacks"). What's missing is the long middle: the Pepsi video has 4–5 escalating
   mini-stories, each with a vivid detail and a number that pays it off. Use
   `prompts/script-writer.md`.
7. **Post 3 videos a week for 10 weeks before you judge the channel.** That's about 30 more
   videos. Expect most to be ordinary and a few to break out, then make follow-ups on the
   winners.

## Other faceless niches (niche scan, last 45 days, English, channels under 250K subs)

These niches have the most new channels (under 6 months old) with videos at 3x or more of
their usual views:

| Niche | Outliers | New channels taking off | Median outlier views |
|---|---|---|---|
| billionaire / rags-to-riches story* | 25 | 14 | 2.2M |
| zombie apocalypse "Day 1 to Day N" | 22 | 11 | 599K |
| prison survival story | 14 | 8 | 194K |
| animated survival (bunker, 1 year) | 21 | 7 | 591K |
| "what happened to [company]" | 14 | 6 | 93K |
| bible stories animated | 17 | 5 | 82K |

\* Some of these are Hindi stories with English-letter titles, so check the report before you trust this row.

All of these can be made with Claude scripts, AI images and Remotion. The full table is in
`reports/niches.html`.
