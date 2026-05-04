"""
Generate geo-level daily data for incrementality testing.

Scenario: NexaShop launched a TV campaign in 5 treatment markets (out of 20 total DMAs).
We have 60 days pre-period + 30 days post-period of daily revenue data.
Goal: Measure the true incremental lift of the TV campaign using DiD and Synthetic Control.
"""

import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(123)

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# ─── DMA definitions ──────────────────────────────────────────────────────────
DMAS = [
    # Treatment markets (TV campaign launched)
    {"id": "DMA_01", "name": "Los Angeles", "group": "treatment", "base_daily_rev": 42000, "trend": 1.0015},
    {"id": "DMA_02", "name": "Chicago", "group": "treatment", "base_daily_rev": 28000, "trend": 1.0010},
    {"id": "DMA_03", "name": "Houston", "group": "treatment", "base_daily_rev": 22000, "trend": 1.0012},
    {"id": "DMA_04", "name": "Phoenix", "group": "treatment", "base_daily_rev": 18000, "trend": 1.0008},
    {"id": "DMA_05", "name": "Denver", "group": "treatment", "base_daily_rev": 15000, "trend": 1.0010},
    # Control markets — chosen to have similar base levels for matching
    {"id": "DMA_06", "name": "Philadelphia", "group": "control", "base_daily_rev": 38000, "trend": 1.0012},
    {"id": "DMA_07", "name": "Dallas", "group": "control", "base_daily_rev": 30000, "trend": 1.0010},
    {"id": "DMA_08", "name": "San Diego", "group": "control", "base_daily_rev": 24000, "trend": 1.0008},
    {"id": "DMA_09", "name": "Seattle", "group": "control", "base_daily_rev": 21000, "trend": 1.0012},
    {"id": "DMA_10", "name": "San Jose", "group": "control", "base_daily_rev": 20000, "trend": 1.0010},
    {"id": "DMA_11", "name": "Austin", "group": "control", "base_daily_rev": 16000, "trend": 1.0015},
    {"id": "DMA_12", "name": "Nashville", "group": "control", "base_daily_rev": 14000, "trend": 1.0010},
    {"id": "DMA_13", "name": "Columbus", "group": "control", "base_daily_rev": 13000, "trend": 1.0008},
    {"id": "DMA_14", "name": "Charlotte", "group": "control", "base_daily_rev": 12000, "trend": 1.0010},
    {"id": "DMA_15", "name": "Indianapolis", "group": "control", "base_daily_rev": 10500, "trend": 1.0008},
    {"id": "DMA_16", "name": "Portland", "group": "control", "base_daily_rev": 17000, "trend": 1.0010},
    {"id": "DMA_17", "name": "San Antonio", "group": "control", "base_daily_rev": 15000, "trend": 1.0012},
    {"id": "DMA_18", "name": "Jacksonville", "group": "control", "base_daily_rev": 11000, "trend": 1.0008},
    {"id": "DMA_19", "name": "Las Vegas", "group": "control", "base_daily_rev": 9500, "trend": 1.0010},
    {"id": "DMA_20", "name": "Memphis", "group": "control", "base_daily_rev": 8000, "trend": 1.0005},
]

# ─── Parameters ───────────────────────────────────────────────────────────────
PRE_DAYS = 60
POST_DAYS = 30
TOTAL_DAYS = PRE_DAYS + POST_DAYS
TV_CAMPAIGN_START = PRE_DAYS

# True treatment effect: 14% lift in treated markets
TRUE_LIFT = 0.14
RAMP_DAYS = 10

# Weekly seasonality (e-commerce: weekends higher)
WEEKLY_PATTERN = [0.93, 0.89, 0.91, 0.96, 1.06, 1.14, 1.10]  # Mon-Sun

# ─── Generate data ────────────────────────────────────────────────────────────
rows = []
for dma in DMAS:
    for day in range(TOTAL_DAYS):
        base = dma["base_daily_rev"]
        trend = dma["trend"] ** day
        seasonal = WEEKLY_PATTERN[day % 7]
        noise = np.random.normal(1.0, 0.018)  # low noise for geo-level data

        revenue = base * trend * seasonal * noise

        treatment_effect = 0.0
        if dma["group"] == "treatment" and day >= TV_CAMPAIGN_START:
            days_since_launch = day - TV_CAMPAIGN_START
            ramp = min(days_since_launch / RAMP_DAYS, 1.0)
            treatment_effect = TRUE_LIFT * ramp
            revenue *= (1 + treatment_effect)

        rows.append({
            "dma_id": dma["id"],
            "dma_name": dma["name"],
            "group": dma["group"],
            "day": day,
            "period": "pre" if day < TV_CAMPAIGN_START else "post",
            "daily_revenue": round(revenue, 2),
            "daily_orders": int(revenue / np.random.uniform(78, 92)),
            "true_lift_pct": round(treatment_effect * 100, 2),
        })

df_geo = pd.DataFrame(rows)

# ─── Summary ──────────────────────────────────────────────────────────────────
treat_pre = df_geo[(df_geo["group"] == "treatment") & (df_geo["period"] == "pre")]["daily_revenue"].mean()
treat_post = df_geo[(df_geo["group"] == "treatment") & (df_geo["period"] == "post")]["daily_revenue"].mean()
ctrl_pre = df_geo[(df_geo["group"] == "control") & (df_geo["period"] == "pre")]["daily_revenue"].mean()
ctrl_post = df_geo[(df_geo["group"] == "control") & (df_geo["period"] == "post")]["daily_revenue"].mean()

raw_did = (treat_post - treat_pre) - (ctrl_post - ctrl_pre)
print(f"Generated {len(df_geo):,} rows ({len(DMAS)} DMAs × {TOTAL_DAYS} days)")
print(f"\nTreatment avg: pre=${treat_pre:,.0f}/day → post=${treat_post:,.0f}/day")
print(f"Control avg:   pre=${ctrl_pre:,.0f}/day → post=${ctrl_post:,.0f}/day")
print(f"Raw DiD estimate: ${raw_did:,.0f}/day per DMA")
print(f"True lift: {TRUE_LIFT*100}%")

# ─── Save ─────────────────────────────────────────────────────────────────────
df_geo.to_csv(DATA_DIR / "geo_daily_revenue.csv", index=False)
print(f"\nSaved: {DATA_DIR}/geo_daily_revenue.csv")
