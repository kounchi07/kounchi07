# Dragon Tower strategy simulator

Simulates Stake's Dragon Tower (9 rows, 98% RTP / 2% house edge) and backtests
betting strategies with a "small daily profit target + stop-loss" discipline.

```
python3 sim.py                                   # defaults: $100, 90 days
python3 sim.py --bankroll 50 --days 30 --target 2 --stop 10
```

## Key result (bankroll $100, +$5/day target, -$20/day stop, 90 days)

| strategy | P(ending up) | P(bust) | days target hit | loss per $ wagered |
|---|---|---|---|---|
| flat, easy 1 row | 0% | 99% | 37% | -1.7% |
| flat, hard 1 row (2x) | 3% | 87% | 61% | -2.0% |
| flat, master 3 rows | 39% | 31% | 55% | -1.9% |
| martingale, hard 1 row | 32% | 58% | 84% | -2.0% |
| d'alembert, hard 1 row | 25% | 60% | 77% | -2.1% |
| paroli, hard 1 row | 20% | 66% | 69% | -2.1% |

**Every strategy loses ~2% of total amount wagered — exactly the house edge.**
Bet sizing and stop rules only change the *shape* of the loss (many small wins
plus a rare wipe-out, or vice versa), never its expected size. Martingale hits
the daily target most often (84% of days) precisely because it hides the loss in
rare, large busts. Each round is independent and provably-fair seeded, so no
pattern, "tile picking" or sequence can be exploited.
