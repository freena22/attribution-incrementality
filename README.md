# Attribution & Incrementality Testing — NexaShop

> Multi-touch attribution (Markov Chain, Shapley Value) and causal incrementality testing (DiD, Synthetic Control) for a D2C e-commerce brand's $5M quarterly marketing budget.

**[Live Dashboard →](https://freena22.github.io/attribution-incrementality/)**

## The Problem

NexaShop spends $5M/year on marketing across 6 channels. Under last-click attribution, Paid Search receives 45% of conversion credit. But is it actually driving those conversions, or merely capturing demand created elsewhere?

This project answers two questions:
1. **Attribution**: Which channels truly create value vs. which ones just capture it?
2. **Incrementality**: Does our new TV campaign actually lift revenue, or would it have grown anyway?

## Methodology

### Multi-Touch Attribution (5 models)

| Model | Approach | Best For |
|-------|----------|----------|
| Last-Touch | 100% credit to final touchpoint | Baseline comparison |
| First-Touch | 100% credit to first touchpoint | Awareness measurement |
| Linear | Equal credit across all touchpoints | Simple multi-touch |
| **Markov Chain** | Removal effect — how much conversion drops without each channel | **Scalable data-driven attribution** |
| **Shapley Value** | Game theory — marginal contribution in all possible orderings | **Theoretically fair allocation** |

### Incrementality Testing (2 methods)

| Method | Approach | Assumption |
|--------|----------|------------|
| **Difference-in-Differences** | Compare treatment-control gap before/after launch | Parallel trends |
| **Synthetic Control** | Build data-driven counterfactual from weighted control units | Pre-period fit quality |

Both validated via:
- Regression with clustered standard errors
- Placebo tests (in-space) for Synthetic Control
- RMSPE ratio for significance

## Key Findings

- **Paid Social is undervalued by 19pp** under last-click vs. Shapley
- **Display is undervalued by 19pp** — it initiates journeys that Search captures
- **TV campaign delivers 12–15% incremental lift** (validated by two independent methods, p < 0.001)
- **Reallocation opportunity**: Shifting 20% of Search budget to Social/Display could yield +8–12% conversions

## Tech Stack

- **Python**: numpy, pandas, scipy (optimization, statistics)
- **Attribution**: Custom Markov Chain (removal effect), Monte Carlo Shapley
- **Causal Inference**: OLS DiD, Constrained Synthetic Control (SLSQP)
- **Dashboard**: React 18, Recharts, Tailwind CSS
- **Deployment**: GitHub Pages

## Data

Simulated but realistic:
- 50,000 customer journeys (181K touchpoints) across 90 days
- 20 DMAs × 90 days of daily revenue for geo-lift testing
- Channel roles, spend levels, and conversion patterns calibrated to D2C e-commerce benchmarks

## Project Structure

```
├── model/
│   ├── generate_journeys.py      # Customer journey simulation
│   ├── generate_geo_data.py      # Geo-level daily data
│   ├── attribution_models.py     # 5 attribution models
│   └── incrementality.py         # DiD + Synthetic Control
├── data/                          # Generated datasets
├── dashboard/                     # React dashboard source
└── docs/                          # GitHub Pages deployment
```

## Run Locally

```bash
# Generate data
python3 model/generate_journeys.py
python3 model/generate_geo_data.py

# Run models
python3 model/attribution_models.py
python3 model/incrementality.py

# View dashboard
cd docs && python3 -m http.server 8766
```

---

Built by [Freena Wang](https://linkedin.com/in/freena) · Part of the [AI-Augmented Analytics series](https://freena22.github.io)
