# Brand Receipts: next 10 brands (picked 28 Oct 2026)

## How these were picked

Each brand had to pass three checks:

1. **Search demand.** YouTube autocomplete shows people actively searching for something
   negative about the brand ("…is dead", "…is failing", "why is … closing"). Autocomplete
   proves people search these phrases, but it doesn't say how many.
2. **Not taken.** None of the ~20 competitor channels we scanned (their last 50 uploads
   each, including Bagholder Association, Michael Girdley, Modern MBA, Fortune & Fall and
   Build Inc.) has covered the brand recently, or the only video on it is small or months
   old. Coverage matters: Starbucks has been covered by 3+ channels recently and those
   videos average 0.5x their channel's normal views.
3. **A brand everyone knows.** Bagholder's hits are all brands nearly every viewer has
   bought from.

Your own winners (Jack in the Box, Nintendo) were brands Bagholder hadn't covered.
Gaming has worked for you, so two gaming brands are on the list.

| # | Brand | What people are searching | Competitor coverage | Title idea |
|---|-------|---------------------------|---------------------|------------|
| 1 | **Spirit Airlines** | "is shutting down", "is dead", "why is … bankrupt" | none found | Spirit Airlines Is (Finally) Getting What It Deserves… |
| 2 | **Disney** | "is dead", "is too expensive", "why is … failing" | one 4.7K video | Disney's Greed Is (Finally) Backfiring… |
| 3 | **Ubisoft** | "is dead", "is dying", "downfall", "why is … hated" | none found | Ubisoft Is (Finally) Getting What It Deserves… |
| 4 | **Target** | "is failing", "is in trouble", "why is … being boycotted" | one 33K video | Target Is (Finally) Getting What It Deserves… |
| 5 | **Walmart** | "why is … closing stores", "being boycotted", "stock dropping" | none found | Walmart Is (Finally) Getting What It Deserves… |
| 6 | **Xbox** | "is dead", "is done", "why is … failing" | Modern MBA, June (649K): proven topic, now 4 months old | Xbox Is (Finally) Getting What It Deserves… |
| 7 | **Nike** | "why is … struggling", "why is … failing", "so expensive" | none found | Nike's Greed Is (Finally) Backfiring… |
| 8 | **Funko** | "is dead", "is going bankrupt", "is so over" | none found | Funko Is (Finally) Getting What It Deserves… |
| 9 | **Forever 21** | "is closing", "bankruptcy", "why is … closing down" | none found | Forever 21 Finally Got What It Deserved… |
| 10 | **Tesla** | "is dead", "is in trouble", "why is … stock falling" | one 61K video | Tesla Is (Finally) Getting What It Deserves… |

Reserves: Netflix ("is done", "so expensive"), Subway (strong demand, but a 643K video
from June), Red Lobster (Bagholder covered it in September).

## Before you script each one

1. Run `python tubescout.py outliers "<brand> downfall" --days 180` (about 100 units) to
   check that nobody covered it in the last few days.
2. Run `python tubescout.py suggest "<brand> is"` (free) to find the angle people care
   about most. Build the cold open around it.
3. Write the script with `prompts/script-writer.md` at 15–18 minutes.
4. Post Spirit, Disney and Ubisoft first: they have the strongest demand and nobody else
   has covered them.

## A second format worth testing

The watchlist found a pattern among new channels: "**What Happened to [nostalgic brand]?**"
archive channels.
- The American Shoe Archive is 58 days old. Fila got 46x its normal views and AND1 got 16x.
- Persimmon Archive (golf), Lost American Models (cars) and America's Lost Technology are
  all under 4 months old with breakouts.
- Fortune & Fall is 17 days old and got 859K views with "WTF Happened to Labubu?".

Brand Receipts could alternate between "Is (Finally) Getting What It Deserves" and
"What Happened to ___?" (Toys "R" Us, Blockbuster-era brands, Forever 21).
