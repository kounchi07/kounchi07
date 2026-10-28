"""Dragon Tower (Stake Originals) Monte Carlo simulator.

Rules modelled (per Stake's published game info):
  - 9 rows; each row has `tiles` tiles, of which `eggs` are safe.
  - You cash out after climbing `target_rows` rows (auto-pick).
  - Payout multiplier = RTP / P(survive target_rows), RTP = 0.98 (2% house edge).

Usage:
  python3 sim.py                # run the full strategy comparison
  python3 sim.py --days 365 --trials 2000 --bankroll 100
"""
import argparse
import random
import statistics

RTP = 0.98
ROWS = 9
DIFFICULTY = {  # name: (tiles per row, safe eggs per row)
    "easy": (4, 3),
    "medium": (3, 2),
    "hard": (2, 1),
    "expert": (3, 1),
    "master": (4, 1),
}


def win_prob(difficulty, rows):
    tiles, eggs = DIFFICULTY[difficulty]
    return (eggs / tiles) ** rows


def multiplier(difficulty, rows):
    return round(RTP / win_prob(difficulty, rows), 2)


def play_round(rng, difficulty, rows, bet):
    """Return net profit of one round."""
    if rng.random() < win_prob(difficulty, rows):
        return bet * (multiplier(difficulty, rows) - 1)
    return -bet


# --- Betting strategies -----------------------------------------------------
# Each strategy is a factory returning a stateful callable:
#   next_bet(last_result) -> bet size  (last_result None at session start)

def flat(base):
    def f(last):
        return base
    return f


def martingale(base, mult=None):
    """Increase bet after a loss so one win recovers all losses + base profit."""
    state = {"bet": base}

    def f(last):
        if last is None or last > 0:
            state["bet"] = base
        else:
            state["bet"] *= mult
        return state["bet"]
    return f


def paroli(base, streak=3):
    """Anti-martingale: double after a win, reset after a loss or `streak` wins."""
    state = {"bet": base, "wins": 0}

    def f(last):
        if last is None or last < 0 or state["wins"] >= streak:
            state["bet"], state["wins"] = base, 0
        else:
            state["bet"] *= 2
            state["wins"] += 1
        return state["bet"]
    return f


def dalembert(base):
    state = {"bet": base}

    def f(last):
        if last is not None:
            state["bet"] += base if last < 0 else -base
            state["bet"] = max(base, state["bet"])
        return state["bet"]
    return f


# --- Session / multi-day simulation ----------------------------------------

def run_day(rng, bankroll, strategy, difficulty, rows, daily_target,
            daily_stop_loss, max_rounds):
    """Play one day until target hit, stop-loss hit, or max_rounds.
    Returns (bankroll_after, rounds_played, total_wagered)."""
    start = bankroll
    last = None
    wagered = 0.0
    for n in range(max_rounds):
        profit_today = bankroll - start
        if profit_today >= daily_target or -profit_today >= daily_stop_loss:
            return bankroll, n, wagered
        bet = min(strategy(last), bankroll)
        if bet <= 0:
            return bankroll, n, wagered
        last = play_round(rng, difficulty, rows, bet)
        bankroll += last
        wagered += bet
    return bankroll, max_rounds, wagered


def simulate(name, make_strategy, difficulty, rows, bankroll, days, trials,
             daily_target, daily_stop_loss, max_rounds, seed=1):
    rng = random.Random(seed)
    finals, busts, target_days, total_days, wagered = [], 0, 0, 0, 0.0
    for _ in range(trials):
        br = bankroll
        for _d in range(days):
            if br < 0.01:
                busts += 1
                break
            before = br
            br, _, w = run_day(rng, br, make_strategy(), difficulty, rows,
                               daily_target, daily_stop_loss, max_rounds)
            wagered += w
            total_days += 1
            if br - before >= daily_target:
                target_days += 1
        finals.append(br)
    profitable = sum(f > bankroll for f in finals) / trials
    return {
        "name": name,
        "median_final": statistics.median(finals),
        "mean_final": statistics.mean(finals),
        "p_profit": profitable,
        "p_bust": busts / trials,
        "p_target_day": target_days / max(total_days, 1),
        "edge_realised": (statistics.mean(finals) - bankroll) / max(wagered / trials, 1e-9),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bankroll", type=float, default=100.0)
    ap.add_argument("--days", type=int, default=90)
    ap.add_argument("--trials", type=int, default=2000)
    ap.add_argument("--target", type=float, default=5.0, help="daily profit goal")
    ap.add_argument("--stop", type=float, default=20.0, help="daily stop-loss")
    ap.add_argument("--max-rounds", type=int, default=200)
    a = ap.parse_args()

    print("Payout table (multiplier for cashing out after N rows):")
    print("rows  " + "  ".join(f"{d:>8}" for d in DIFFICULTY))
    for r in range(1, ROWS + 1):
        print(f"{r:>4}  " + "  ".join(f"{multiplier(d, r):>8.2f}" for d in DIFFICULTY))
    print()

    base = a.bankroll / 100  # 1% unit
    m = lambda d, r: 1 / (multiplier(d, r) - 1) + 1  # martingale factor
    cases = [
        ("flat, easy 1 row",      lambda: flat(base),               "easy", 1),
        ("flat, easy 3 rows",     lambda: flat(base),               "easy", 3),
        ("flat, hard 1 row (2x)", lambda: flat(base),               "hard", 1),
        ("flat, master 3 rows",   lambda: flat(base / 10),          "master", 3),
        ("martingale, hard 1 row", lambda: martingale(base, 2.0 * 1.04), "hard", 1),
        ("martingale, easy 1 row", lambda: martingale(base, m("easy", 1)), "easy", 1),
        ("paroli, hard 1 row",    lambda: paroli(base),             "hard", 1),
        ("d'alembert, hard 1 row", lambda: dalembert(base),         "hard", 1),
    ]
    print(f"Bankroll {a.bankroll}, {a.days} days, daily target +{a.target}, "
          f"daily stop -{a.stop}, {a.trials} trials each\n")
    hdr = f"{'strategy':<26}{'median end':>11}{'mean end':>10}{'P(up)':>8}{'P(bust)':>9}{'hit-target days':>17}{'edge/wager':>12}"
    print(hdr)
    print("-" * len(hdr))
    for name, mk, d, r in cases:
        s = simulate(name, mk, d, r, a.bankroll, a.days, a.trials,
                     a.target, a.stop, a.max_rounds)
        print(f"{name:<26}{s['median_final']:>11.2f}{s['mean_final']:>10.2f}"
              f"{s['p_profit']:>8.1%}{s['p_bust']:>9.1%}{s['p_target_day']:>17.1%}"
              f"{s['edge_realised']:>12.2%}")


if __name__ == "__main__":
    main()
