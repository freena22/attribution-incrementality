"""
Generate realistic multi-touch customer journey data for NexaShop (D2C e-commerce).

Scenario: 50K customer journeys over 90 days across 6 marketing channels.
Channels have different roles in the funnel (awareness → consideration → conversion).
"""

import numpy as np
import pandas as pd
from pathlib import Path
import json

np.random.seed(42)

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# ─── Channel definitions ─────────────────────────────────────────────────────
CHANNELS = {
    "Paid Search": {
        "role": "converter",
        "avg_position": 0.85,  # typically late in journey
        "daily_impressions": 8000,
        "ctr": 0.045,
        "monthly_spend": 180000,
    },
    "Paid Social": {
        "role": "awareness",
        "avg_position": 0.25,
        "daily_impressions": 25000,
        "ctr": 0.012,
        "monthly_spend": 150000,
    },
    "Display": {
        "role": "awareness",
        "avg_position": 0.15,
        "daily_impressions": 40000,
        "ctr": 0.003,
        "monthly_spend": 80000,
    },
    "Email": {
        "role": "nurture",
        "avg_position": 0.55,
        "daily_impressions": 12000,
        "ctr": 0.08,
        "monthly_spend": 25000,
    },
    "Organic Search": {
        "role": "converter",
        "avg_position": 0.75,
        "daily_impressions": 15000,
        "ctr": 0.035,
        "monthly_spend": 0,
    },
    "Referral": {
        "role": "consideration",
        "avg_position": 0.45,
        "daily_impressions": 5000,
        "ctr": 0.06,
        "monthly_spend": 40000,
    },
}

TOTAL_MONTHLY_SPEND = sum(ch["monthly_spend"] for ch in CHANNELS.values())
CHANNEL_NAMES = list(CHANNELS.keys())

# ─── Journey generation ───────────────────────────────────────────────────────
N_JOURNEYS = 50000
CONVERSION_RATE = 0.032  # 3.2% overall conversion rate
AVG_TOUCHES = 4.2
MAX_TOUCHES = 12

def generate_channel_sequence(n_touches, converts):
    """Generate a realistic channel sequence based on funnel position."""
    sequence = []
    for i in range(n_touches):
        position = i / max(n_touches - 1, 1)  # 0 to 1

        weights = []
        for ch_name, ch_info in CHANNELS.items():
            pos_pref = ch_info["avg_position"]
            distance = abs(position - pos_pref)
            weight = np.exp(-3 * distance) * ch_info["ctr"] * 100
            weights.append(weight)

        weights = np.array(weights)
        # If converting, boost converter channels at the end
        if converts and i == n_touches - 1:
            for j, (_, ch_info) in enumerate(CHANNELS.items()):
                if ch_info["role"] == "converter":
                    weights[j] *= 3.0

        weights /= weights.sum()
        channel = np.random.choice(CHANNEL_NAMES, p=weights)
        sequence.append(channel)

    return sequence


journeys = []
for uid in range(N_JOURNEYS):
    n_touches = min(int(np.random.exponential(AVG_TOUCHES - 1)) + 1, MAX_TOUCHES)
    converts = np.random.random() < CONVERSION_RATE

    # More touches increase conversion probability
    if n_touches >= 4:
        converts = converts or (np.random.random() < 0.015 * (n_touches - 3))

    sequence = generate_channel_sequence(n_touches, converts)

    # Generate timestamps (spread over 90 days)
    start_day = np.random.randint(0, 75)
    touch_days = sorted(start_day + np.random.choice(range(min(15, 90 - start_day)), size=n_touches, replace=True))

    for touch_idx, (channel, day) in enumerate(zip(sequence, touch_days)):
        journeys.append({
            "user_id": f"U{uid:06d}",
            "touchpoint_idx": touch_idx,
            "channel": channel,
            "day": int(day),
            "is_conversion": converts and touch_idx == n_touches - 1,
            "journey_length": n_touches,
            "converts": converts,
        })

df_journeys = pd.DataFrame(journeys)

# Add revenue for conversions
avg_order_value = 85
df_journeys["revenue"] = 0.0
df_journeys.loc[df_journeys["is_conversion"], "revenue"] = np.random.lognormal(
    np.log(avg_order_value), 0.4, size=df_journeys["is_conversion"].sum()
).round(2)

# ─── Summary stats ────────────────────────────────────────────────────────────
n_conversions = df_journeys["is_conversion"].sum()
total_revenue = df_journeys["revenue"].sum()
print(f"Generated {N_JOURNEYS:,} journeys, {len(df_journeys):,} touchpoints")
print(f"Conversions: {n_conversions:,} ({n_conversions/N_JOURNEYS*100:.1f}%)")
print(f"Total revenue: ${total_revenue:,.0f}")
print(f"Avg touches per journey: {len(df_journeys)/N_JOURNEYS:.1f}")

# ─── Save ─────────────────────────────────────────────────────────────────────
df_journeys.to_csv(DATA_DIR / "customer_journeys.csv", index=False)

# Save channel metadata
channel_meta = {}
for ch_name, ch_info in CHANNELS.items():
    channel_meta[ch_name] = {
        "role": ch_info["role"],
        "monthly_spend": ch_info["monthly_spend"],
        "quarterly_spend": ch_info["monthly_spend"] * 3,
    }

with open(DATA_DIR / "channel_metadata.json", "w") as f:
    json.dump(channel_meta, f, indent=2)

print(f"\nSaved to {DATA_DIR}/")
print(f"  - customer_journeys.csv ({len(df_journeys):,} rows)")
print(f"  - channel_metadata.json")
