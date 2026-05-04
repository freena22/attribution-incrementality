"""
Incrementality Testing: DiD + Synthetic Control for TV campaign measurement.

Analyzes geo-level daily revenue data to estimate the causal impact of
NexaShop's TV campaign launched in 5 treatment DMAs.
"""

import numpy as np
import pandas as pd
from pathlib import Path
from scipy import stats
from scipy.optimize import minimize
import json

DATA_DIR = Path(__file__).parent.parent / "data"

# ─── Load data ────────────────────────────────────────────────────────────────
df = pd.read_csv(DATA_DIR / "geo_daily_revenue.csv")

PRE_DAYS = 60
POST_DAYS = 30
TREATMENT_DMAS = df[df["group"] == "treatment"]["dma_id"].unique()
CONTROL_DMAS = df[df["group"] == "control"]["dma_id"].unique()

print(f"Treatment DMAs: {len(TREATMENT_DMAS)}, Control DMAs: {len(CONTROL_DMAS)}")
print(f"Pre-period: {PRE_DAYS} days, Post-period: {POST_DAYS} days")

# ─── 1. Difference-in-Differences ────────────────────────────────────────────
print("\n═══ Difference-in-Differences ═══")

# Per-DMA daily average (to avoid scale issues)
treat_daily = df[df["group"] == "treatment"].groupby("day")["daily_revenue"].mean().reset_index()
ctrl_daily = df[df["group"] == "control"].groupby("day")["daily_revenue"].mean().reset_index()

treat_pre_mean = treat_daily[treat_daily["day"] < PRE_DAYS]["daily_revenue"].mean()
treat_post_mean = treat_daily[treat_daily["day"] >= PRE_DAYS]["daily_revenue"].mean()
ctrl_pre_mean = ctrl_daily[ctrl_daily["day"] < PRE_DAYS]["daily_revenue"].mean()
ctrl_post_mean = ctrl_daily[ctrl_daily["day"] >= PRE_DAYS]["daily_revenue"].mean()

did_estimate = (treat_post_mean - treat_pre_mean) - (ctrl_post_mean - ctrl_pre_mean)
did_lift_pct = did_estimate / treat_pre_mean * 100

print(f"  Treatment avg/DMA: ${treat_pre_mean:,.0f}/day (pre) → ${treat_post_mean:,.0f}/day (post)")
print(f"  Control avg/DMA:   ${ctrl_pre_mean:,.0f}/day (pre) → ${ctrl_post_mean:,.0f}/day (post)")
print(f"  DiD estimate: ${did_estimate:,.0f}/day per DMA ({did_lift_pct:.1f}% lift)")
print(f"  Total 30-day incremental: ${did_estimate * POST_DAYS * len(TREATMENT_DMAS):,.0f}")

# DMA-level panel regression for proper standard errors
# Y_it = α + β1*Treat_i + β2*Post_t + β3*(Treat×Post)_it + ε_it
dma_day = df.groupby(["dma_id", "day", "group"]).agg({"daily_revenue": "sum"}).reset_index()
dma_day["treat"] = (dma_day["group"] == "treatment").astype(int)
dma_day["post"] = (dma_day["day"] >= PRE_DAYS).astype(int)
dma_day["treat_post"] = dma_day["treat"] * dma_day["post"]

X = np.column_stack([
    np.ones(len(dma_day)),
    dma_day["treat"].values,
    dma_day["post"].values,
    dma_day["treat_post"].values,
])
y = dma_day["daily_revenue"].values

from numpy.linalg import lstsq
beta, _, _, _ = lstsq(X, y, rcond=None)
y_pred = X @ beta
resid = y - y_pred
n, k = len(y), 4
mse = np.sum(resid**2) / (n - k)
var_beta = mse * np.diag(np.linalg.inv(X.T @ X))
se = np.sqrt(var_beta)

t_stat = beta[3] / se[3]
p_value = 2 * (1 - stats.t.cdf(abs(t_stat), df=n - k))

print(f"\n  DiD coefficient (β3): ${beta[3]:,.0f}")
print(f"  Standard Error: ${se[3]:,.0f}")
print(f"  t-statistic: {t_stat:.3f}")
print(f"  p-value: {p_value:.6f}")
print(f"  95% CI: [${beta[3] - 1.96*se[3]:,.0f}, ${beta[3] + 1.96*se[3]:,.0f}]")

# ─── 2. Synthetic Control ────────────────────────────────────────────────────
print("\n═══ Synthetic Control Method ═══")

# Build synthetic control for the AVERAGE treatment DMA
# using weighted combination of individual control DMAs
pivot = df.pivot_table(index="day", columns="dma_id", values="daily_revenue")

# Treatment average series
treat_avg_series = pivot[TREATMENT_DMAS].mean(axis=1).values
# Control individual series
ctrl_series = pivot[CONTROL_DMAS].values  # days × n_control

# Pre-period optimization
pre_treat = treat_avg_series[:PRE_DAYS]
pre_ctrl = ctrl_series[:PRE_DAYS]

def objective(w):
    synthetic = pre_ctrl @ w
    return np.sum((pre_treat - synthetic) ** 2)

n_ctrl = len(CONTROL_DMAS)
w0 = np.ones(n_ctrl) / n_ctrl
bounds = [(0, 1)] * n_ctrl
constraints = {"type": "eq", "fun": lambda w: np.sum(w) - 1}

result = minimize(objective, w0, bounds=bounds, constraints=constraints, method="SLSQP")
optimal_weights = result.x

# Full synthetic control series
synthetic_full = ctrl_series @ optimal_weights

# Post-period analysis
post_treat = treat_avg_series[PRE_DAYS:]
post_synthetic = synthetic_full[PRE_DAYS:]
sc_gap = post_treat - post_synthetic
sc_lift_daily = sc_gap.mean()
sc_lift_pct = sc_lift_daily / post_synthetic.mean() * 100

# Pre-period fit quality
pre_synthetic = synthetic_full[:PRE_DAYS]
rmspe_pre = np.sqrt(np.mean((pre_treat - pre_synthetic) ** 2))
rmspe_pre_pct = rmspe_pre / pre_treat.mean() * 100

print(f"  Pre-period RMSPE: ${rmspe_pre:,.0f} ({rmspe_pre_pct:.1f}% of mean)")
print(f"\n  Synthetic control weights:")
top_weights = sorted(zip(CONTROL_DMAS, optimal_weights), key=lambda x: -x[1])
for dma_id, w in top_weights:
    if w > 0.01:
        dma_name = df[df["dma_id"] == dma_id]["dma_name"].iloc[0]
        print(f"    {dma_name}: {w:.3f}")

print(f"\n  Synthetic Control lift: ${sc_lift_daily:,.0f}/day per avg DMA ({sc_lift_pct:.1f}%)")
print(f"  Total 30-day incremental: ${sc_lift_daily * POST_DAYS * len(TREATMENT_DMAS):,.0f}")

# ─── Placebo tests (in-space) ─────────────────────────────────────────────────
print("\n  Running placebo tests...")
placebo_effects = []
for i, ctrl_dma in enumerate(CONTROL_DMAS):
    placebo_treat = pivot[ctrl_dma].values
    remaining_ctrl_ids = [d for d in CONTROL_DMAS if d != ctrl_dma]
    remaining_ctrl = pivot[remaining_ctrl_ids].values

    pre_pt = placebo_treat[:PRE_DAYS]
    pre_rc = remaining_ctrl[:PRE_DAYS]

    n_rc = remaining_ctrl.shape[1]
    w0_p = np.ones(n_rc) / n_rc
    bounds_p = [(0, 1)] * n_rc
    constraints_p = {"type": "eq", "fun": lambda w: np.sum(w) - 1}

    res_p = minimize(
        lambda w, prc=pre_rc, ppt=pre_pt: np.sum((prc @ w - ppt) ** 2),
        w0_p, bounds=bounds_p, constraints=constraints_p, method="SLSQP"
    )

    synth_p = remaining_ctrl @ res_p.x
    gap_p_post = (placebo_treat[PRE_DAYS:] - synth_p[PRE_DAYS:]).mean()
    rmspe_p_pre = np.sqrt(np.mean((placebo_treat[:PRE_DAYS] - synth_p[:PRE_DAYS]) ** 2))

    # Ratio of post/pre RMSPE (standard metric)
    rmspe_p_post = np.sqrt(np.mean((placebo_treat[PRE_DAYS:] - synth_p[PRE_DAYS:]) ** 2))
    ratio = rmspe_p_post / rmspe_p_pre if rmspe_p_pre > 0 else 0

    placebo_effects.append({
        "dma": ctrl_dma,
        "gap": gap_p_post,
        "ratio": ratio,
    })

# Treatment ratio
rmspe_treat_post = np.sqrt(np.mean((post_treat - post_synthetic) ** 2))
treat_ratio = rmspe_treat_post / rmspe_pre

# p-value: fraction of placebo ratios >= treatment ratio
placebo_ratios = [p["ratio"] for p in placebo_effects]
placebo_pval = np.mean([r >= treat_ratio for r in placebo_ratios])

print(f"  Treatment RMSPE ratio (post/pre): {treat_ratio:.2f}")
print(f"  Placebo ratios: median {np.median(placebo_ratios):.2f}, max {max(placebo_ratios):.2f}")
print(f"  Placebo p-value: {placebo_pval:.3f}")

# ─── 3. Compile results for dashboard ────────────────────────────────────────
# Daily time series for visualization
treat_daily_list = treat_daily["daily_revenue"].tolist()
ctrl_daily_list = ctrl_daily["daily_revenue"].tolist()

results = {
    "did": {
        "estimate_daily": round(did_estimate, 0),
        "lift_pct": round(did_lift_pct, 2),
        "total_30day": round(did_estimate * POST_DAYS * len(TREATMENT_DMAS), 0),
        "p_value": round(p_value, 6),
        "ci_lower": round(beta[3] - 1.96*se[3], 0),
        "ci_upper": round(beta[3] + 1.96*se[3], 0),
        "t_stat": round(t_stat, 3),
    },
    "synthetic_control": {
        "estimate_daily": round(sc_lift_daily, 0),
        "lift_pct": round(sc_lift_pct, 2),
        "total_30day": round(sc_lift_daily * POST_DAYS * len(TREATMENT_DMAS), 0),
        "rmspe_pre_pct": round(rmspe_pre_pct, 2),
        "placebo_pvalue": round(placebo_pval, 3),
        "treat_ratio": round(treat_ratio, 2),
        "weights": {
            df[df["dma_id"] == dma]["dma_name"].iloc[0]: round(float(w), 3)
            for dma, w in zip(CONTROL_DMAS, optimal_weights) if w > 0.01
        },
    },
    "time_series": {
        "treatment_avg": [round(x, 0) for x in treat_avg_series.tolist()],
        "synthetic": [round(x, 0) for x in synthetic_full.tolist()],
        "gap": [round(x, 0) for x in (treat_avg_series - synthetic_full).tolist()],
    },
    "daily_by_group": {
        "treatment": [round(x, 0) for x in treat_daily_list],
        "control": [round(x, 0) for x in ctrl_daily_list],
    },
    "placebo": {
        "treat_ratio": round(treat_ratio, 2),
        "placebo_ratios": [round(p["ratio"], 2) for p in placebo_effects],
    },
    "params": {
        "pre_days": PRE_DAYS,
        "post_days": POST_DAYS,
        "n_treatment": int(len(TREATMENT_DMAS)),
        "n_control": int(len(CONTROL_DMAS)),
        "true_lift": 0.14,
    },
}

with open(DATA_DIR / "incrementality_results.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"\nSaved: incrementality_results.json")
print(f"\n═══ Final Summary ═══")
print(f"  DiD estimate:       {did_lift_pct:.1f}% lift (p={p_value:.4f})")
print(f"  Synthetic Control:  {sc_lift_pct:.1f}% lift (placebo p={placebo_pval:.3f})")
print(f"  True lift:          14.0%")
