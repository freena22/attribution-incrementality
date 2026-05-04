"""
Multi-Touch Attribution Models: Heuristic + Data-Driven.

Implements 5 attribution models and compares channel credit allocation:
1. Last-Touch
2. First-Touch
3. Linear
4. Markov Chain (Removal Effect)
5. Shapley Value (Monte Carlo approximation)
"""

import numpy as np
import pandas as pd
from pathlib import Path
from itertools import permutations
from collections import defaultdict
import json

DATA_DIR = Path(__file__).parent.parent / "data"

# ─── Load data ────────────────────────────────────────────────────────────────
df = pd.read_csv(DATA_DIR / "customer_journeys.csv")

with open(DATA_DIR / "channel_metadata.json") as f:
    channel_meta = json.load(f)

CHANNELS = list(channel_meta.keys())

# Build journey paths: list of (path, conversion_flag, revenue)
converting = df[df["converts"] == True].groupby("user_id")
non_converting = df[df["converts"] == False].groupby("user_id")

paths_convert = []
paths_null = []

for uid, group in df.groupby("user_id"):
    group = group.sort_values("touchpoint_idx")
    path = tuple(group["channel"].tolist())
    converts = group["converts"].iloc[0]
    revenue = group["revenue"].sum()
    if converts:
        paths_convert.append((path, revenue))
    else:
        paths_null.append(path)

total_conversions = len(paths_convert)
total_revenue = sum(r for _, r in paths_convert)
print(f"Converting journeys: {total_conversions:,}")
print(f"Non-converting journeys: {len(paths_null):,}")
print(f"Total revenue: ${total_revenue:,.0f}")

# ─── 1. Last-Touch Attribution ────────────────────────────────────────────────
def last_touch(paths):
    credit = defaultdict(float)
    rev_credit = defaultdict(float)
    for path, revenue in paths:
        credit[path[-1]] += 1
        rev_credit[path[-1]] += revenue
    return dict(credit), dict(rev_credit)

# ─── 2. First-Touch Attribution ───────────────────────────────────────────────
def first_touch(paths):
    credit = defaultdict(float)
    rev_credit = defaultdict(float)
    for path, revenue in paths:
        credit[path[0]] += 1
        rev_credit[path[0]] += revenue
    return dict(credit), dict(rev_credit)

# ─── 3. Linear Attribution ────────────────────────────────────────────────────
def linear(paths):
    credit = defaultdict(float)
    rev_credit = defaultdict(float)
    for path, revenue in paths:
        weight = 1.0 / len(path)
        for ch in path:
            credit[ch] += weight
            rev_credit[ch] += revenue * weight
    return dict(credit), dict(rev_credit)

# ─── 4. Markov Chain (Removal Effect) ────────────────────────────────────────
def markov_chain(paths_convert, paths_null):
    """
    Build transition matrix from journey data, then compute removal effect
    for each channel to determine data-driven attribution.
    """
    # Build transition counts: START → channels → CONVERSION or NULL
    transitions = defaultdict(lambda: defaultdict(int))

    for path, _ in paths_convert:
        transitions["START"][path[0]] += 1
        for i in range(len(path) - 1):
            transitions[path[i]][path[i+1]] += 1
        transitions[path[-1]]["CONVERSION"] += 1

    for path in paths_null:
        transitions["START"][path[0]] += 1
        for i in range(len(path) - 1):
            transitions[path[i]][path[i+1]] += 1
        transitions[path[-1]]["NULL"] += 1

    # Convert to transition probabilities
    trans_probs = {}
    for state, targets in transitions.items():
        total = sum(targets.values())
        trans_probs[state] = {t: c/total for t, c in targets.items()}

    # Compute base conversion probability via absorption
    def conversion_probability(trans_probs, removed_channel=None):
        states = [s for s in trans_probs if s not in ("CONVERSION", "NULL")]
        if removed_channel:
            states = [s for s in states if s != removed_channel]

        # Simple Monte Carlo simulation of paths
        n_sims = 50000
        conversions = 0
        for _ in range(n_sims):
            current = "START"
            for _ in range(20):  # max path length
                if current == "CONVERSION":
                    conversions += 1
                    break
                if current == "NULL":
                    break
                if current not in trans_probs:
                    break

                next_states = trans_probs[current]
                if removed_channel and removed_channel in next_states:
                    # Redistribute probability to NULL
                    adjusted = {k: v for k, v in next_states.items() if k != removed_channel}
                    removed_prob = next_states[removed_channel]
                    if adjusted:
                        total_remaining = sum(adjusted.values())
                        adjusted = {k: v/total_remaining for k, v in adjusted.items()}
                    else:
                        adjusted = {"NULL": 1.0}
                    next_states = adjusted

                choices = list(next_states.keys())
                probs = list(next_states.values())
                probs = np.array(probs) / sum(probs)
                current = np.random.choice(choices, p=probs)

        return conversions / n_sims

    # Base conversion rate
    base_rate = conversion_probability(trans_probs)
    print(f"\n  Markov base conversion rate: {base_rate:.4f}")

    # Removal effect for each channel
    removal_effects = {}
    for ch in CHANNELS:
        removed_rate = conversion_probability(trans_probs, removed_channel=ch)
        effect = (base_rate - removed_rate) / base_rate if base_rate > 0 else 0
        removal_effects[ch] = max(effect, 0)
        print(f"  Remove {ch}: conv rate drops to {removed_rate:.4f} (effect: {effect:.3f})")

    # Normalize removal effects to get attribution weights
    total_effect = sum(removal_effects.values())
    weights = {ch: eff/total_effect for ch, eff in removal_effects.items()}

    credit = {ch: w * total_conversions for ch, w in weights.items()}
    rev_credit = {ch: w * total_revenue for ch, w in weights.items()}

    return credit, rev_credit, removal_effects

# ─── 5. Shapley Value (Monte Carlo) ──────────────────────────────────────────
def shapley_value(paths_convert, paths_null, n_samples=10000):
    """
    Approximate Shapley values using Monte Carlo sampling of channel coalitions.
    """
    # Build a lookup: for each subset of channels, what's the conversion rate?
    path_channel_sets_convert = [(set(path), rev) for path, rev in paths_convert]
    path_channel_sets_null = [set(path) for path in paths_null]

    def coalition_conversion_rate(coalition):
        """Fraction of journeys containing exactly this coalition's channels that convert."""
        coalition = set(coalition)
        if not coalition:
            return 0.0
        # Count journeys that touch at least all channels in coalition
        converts = sum(1 for pset, _ in path_channel_sets_convert if coalition.issubset(pset))
        nulls = sum(1 for pset in path_channel_sets_null if coalition.issubset(pset))
        total = converts + nulls
        return converts / total if total > 0 else 0.0

    shapley_vals = defaultdict(float)

    for _ in range(n_samples):
        perm = list(np.random.permutation(CHANNELS))
        coalition = set()
        prev_value = 0.0
        for ch in perm:
            coalition.add(ch)
            curr_value = coalition_conversion_rate(coalition)
            marginal = curr_value - prev_value
            shapley_vals[ch] += marginal
            prev_value = curr_value

    # Average
    for ch in shapley_vals:
        shapley_vals[ch] /= n_samples

    # Normalize
    total_sv = sum(shapley_vals.values())
    weights = {ch: sv/total_sv for ch, sv in shapley_vals.items()}

    credit = {ch: w * total_conversions for ch, w in weights.items()}
    rev_credit = {ch: w * total_revenue for ch, w in weights.items()}

    return credit, rev_credit, dict(shapley_vals)


# ─── Run all models ───────────────────────────────────────────────────────────
print("\n─── Running Attribution Models ───")

print("\n1. Last-Touch...")
lt_credit, lt_rev = last_touch(paths_convert)

print("2. First-Touch...")
ft_credit, ft_rev = first_touch(paths_convert)

print("3. Linear...")
lin_credit, lin_rev = linear(paths_convert)

print("4. Markov Chain (this takes ~30s)...")
mk_credit, mk_rev, mk_effects = markov_chain(paths_convert, paths_null)

print("\n5. Shapley Value (Monte Carlo, ~60s)...")
sh_credit, sh_rev, sh_values = shapley_value(paths_convert, paths_null, n_samples=5000)

# ─── Compile results ──────────────────────────────────────────────────────────
results = []
for ch in CHANNELS:
    spend = channel_meta[ch]["quarterly_spend"]
    results.append({
        "channel": ch,
        "role": channel_meta[ch]["role"],
        "quarterly_spend": spend,
        "last_touch_conv": round(lt_credit.get(ch, 0), 1),
        "last_touch_rev": round(lt_rev.get(ch, 0), 0),
        "first_touch_conv": round(ft_credit.get(ch, 0), 1),
        "first_touch_rev": round(ft_rev.get(ch, 0), 0),
        "linear_conv": round(lin_credit.get(ch, 0), 1),
        "linear_rev": round(lin_rev.get(ch, 0), 0),
        "markov_conv": round(mk_credit.get(ch, 0), 1),
        "markov_rev": round(mk_rev.get(ch, 0), 0),
        "shapley_conv": round(sh_credit.get(ch, 0), 1),
        "shapley_rev": round(sh_rev.get(ch, 0), 0),
    })

df_results = pd.DataFrame(results)

# Add ROAS calculations
for model in ["last_touch", "first_touch", "linear", "markov", "shapley"]:
    df_results[f"{model}_roas"] = (
        df_results[f"{model}_rev"] / df_results["quarterly_spend"].replace(0, np.nan)
    ).round(2)

df_results.to_csv(DATA_DIR / "attribution_results.csv", index=False)

# Save detailed removal effects and shapley values
details = {
    "markov_removal_effects": mk_effects,
    "shapley_values": sh_values,
    "total_conversions": total_conversions,
    "total_revenue": round(total_revenue, 2),
    "channels": CHANNELS,
}
with open(DATA_DIR / "model_details.json", "w") as f:
    json.dump(details, f, indent=2)

print("\n─── Results Summary ───")
print(df_results[["channel", "last_touch_conv", "markov_conv", "shapley_conv"]].to_string(index=False))
print(f"\nSaved: attribution_results.csv, model_details.json")
