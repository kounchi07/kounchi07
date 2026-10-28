"""Analyse: Easy mode, cash out after 1 row (1.31x), double bet after a loss,
reset to base bet after any win.

  python3 easy_double.py --bankroll 100 --base 1 --factor 2
"""
import argparse
import random

P_WIN = 0.75
MULT = 1.31


def cycle_table(base, factor, max_losses=10):
    print(f"Base bet {base}, multiply by {factor} after each loss, cash out at {MULT}x\n")
    print(f"{'losses before win':>18}{'bet that wins':>15}{'total staked':>14}{'net result':>12}{'chance':>9}")
    staked = 0.0
    for losses in range(max_losses + 1):
        bet = base * factor ** losses
        staked += bet
        net = bet * MULT - staked
        chance = (1 - P_WIN) ** losses * P_WIN
        print(f"{losses:>18}{bet:>15.2f}{staked:>14.2f}{net:>12.2f}{chance:>9.3%}")


def simulate(bankroll, base, factor, rounds, trials, seed=1):
    rng = random.Random(seed)
    busted, finals, peak_need = 0, [], 0
    for _ in range(trials):
        br, bet = bankroll, base
        for _ in range(rounds):
            if bet > br:          # can't cover the next bet -> strategy broken
                busted += 1
                break
            if rng.random() < P_WIN:
                br += bet * (MULT - 1)
                bet = base
            else:
                br -= bet
                bet *= factor
        finals.append(br)
    finals.sort()
    mean = sum(finals) / trials
    print(f"\n{trials} players, bankroll {bankroll}, base {base}, {rounds} rounds each:")
    print(f"  went broke (couldn't place next bet): {busted / trials:.1%}")
    print(f"  ended above starting bankroll:        {sum(f > bankroll for f in finals) / trials:.1%}")
    print(f"  median ending bankroll:               {finals[trials // 2]:.2f}")
    print(f"  average ending bankroll:              {mean:.2f}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bankroll", type=float, default=100)
    ap.add_argument("--base", type=float, default=1)
    ap.add_argument("--factor", type=float, default=2)
    ap.add_argument("--rounds", type=int, default=1000)
    ap.add_argument("--trials", type=int, default=20000)
    a = ap.parse_args()
    cycle_table(a.base, a.factor)
    simulate(a.bankroll, a.base, a.factor, a.rounds, a.trials)


if __name__ == "__main__":
    main()
