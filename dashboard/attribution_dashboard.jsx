// ─── Marketing Measurement Framework Dashboard ──────────────────────────────
// NexaShop: Why MTA Is Broken & How to Build a Measurement System That Works
// 3-Layer Framework: Platform Signals → Statistical Attribution → Experimental Truth

const { useState } = React;
const {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ComposedChart,
  ReferenceLine, PieChart, Pie,
} = Recharts;

// ─── Theme ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#080C14",
  sidebar: "#0C1220",
  surface: "#111827",
  surfaceAlt: "#0F172A",
  border: "rgba(255,255,255,0.06)",
  borderAccent: "rgba(99,102,241,0.25)",
  text: "#F1F5F9",
  textSec: "#94A3B8",
  textMuted: "#64748B",
  textDim: "#475569",
  indigo: "#818CF8",
  indigoDark: "#6366F1",
  amber: "#F59E0B",
  amberSoft: "#D97706",
  teal: "#2DD4BF",
  rose: "#FB7185",
  green: "#4ADE80",
  cyan: "#22D3EE",
  violet: "#A78BFA",
};

// ─── Data ────────────────────────────────────────────────────────────────────

// Platform-reported vs. actual attribution (showing the discrepancy)
const PLATFORM_VS_ACTUAL = [
  { channel: "Paid Search", platformCredit: 42, markovCredit: 28, shapleyCredit: 19, platformROAS: 3.2, trueROAS: 1.4 },
  { channel: "Meta Ads", platformCredit: 35, markovCredit: 8, shapleyCredit: 21, platformROAS: 2.8, trueROAS: 1.1 },
  { channel: "Display", platformCredit: 8, markovCredit: 5, shapleyCredit: 20, platformROAS: 0.9, trueROAS: 0.7 },
  { channel: "Email", platformCredit: 12, markovCredit: 0, shapleyCredit: 9, platformROAS: 5.1, trueROAS: 2.3 },
  { channel: "Organic", platformCredit: 0, markovCredit: 35, shapleyCredit: 21, platformROAS: 0, trueROAS: null },
  { channel: "Referral", platformCredit: 3, markovCredit: 0, shapleyCredit: 10, platformROAS: 1.5, trueROAS: 0.9 },
];

// 5 attribution models comparison
const ATTRIBUTION_MODELS = [
  { channel: "Paid Search", lastClick: 44.8, firstClick: 15.2, linear: 22.1, markov: 28.0, shapley: 18.7 },
  { channel: "Meta Ads", lastClick: 2.1, firstClick: 28.4, linear: 18.5, markov: 7.8, shapley: 21.3 },
  { channel: "Display", lastClick: 0.6, firstClick: 32.1, linear: 15.8, markov: 4.8, shapley: 19.7 },
  { channel: "Email", lastClick: 14.7, firstClick: 5.8, linear: 13.2, markov: 24.2, shapley: 8.7 },
  { channel: "Organic", lastClick: 27.7, firstClick: 10.5, linear: 17.9, markov: 35.2, shapley: 21.1 },
  { channel: "Referral", lastClick: 10.1, firstClick: 8.0, linear: 12.5, markov: 0.0, shapley: 10.5 },
];

// Incrementality results
const INCR = {
  did: { lift: 14.6, pValue: 0.0005, daily: 3769, total30: 565398, ciLow: 1654, ciHigh: 5885 },
  synthetic: { lift: 12.0, daily: 3283, total30: 492380, rmspe: 1.0, placeboP: 0.000 },
};

// Synthetic Control time series
const SC_SERIES = (() => {
  const t = [25520,25012,25440,26140,27580,29140,27680,24780,24320,24480,25460,26120,27840,29500,27960,25040,24480,24600,25780,26440,28200,29840,28380,25340,24780,25000,26120,26760,28580,30220,28600,25480,25040,25160,26280,27020,28900,30580,29040,25880,25340,25500,26620,27340,29280,30940,29420,26220,25680,25820,27020,27700,29620,31320,29780,26560,25980,26120,27380,28040,31120,31560,32440,33200,34480,35020,33780,31680,31020,31200,32060,32740,33960,34640,33380,31220,30560,30740,31620,32400,33580,34240,32940,30860,30240,30400,31240,32020,33200,33880];
  const s = [25480,25070,25380,26080,27520,29080,27600,24820,24380,24540,25400,26060,27780,29440,27920,25000,24520,24640,25720,26380,28140,29780,28300,25280,24720,24940,26060,26680,28500,30140,28540,25420,24980,25080,26220,26960,28820,30500,28960,25800,25260,25420,26540,27260,29180,30860,29340,26140,25580,25740,26920,27620,29540,31220,29680,26480,25880,26020,27280,27940,27000,27180,27440,27780,28120,28300,27800,27080,26880,26960,27220,27520,27780,28060,27560,26840,26620,26720,26980,27300,27540,27820,27320,26580,26380,26460,26720,27000,27260,27540];
  return t.map((v, i) => ({ day: i+1, treatment: v, synthetic: s[i], gap: v - s[i] }));
})();

// Decision matrix
const DECISION_MATRIX = [
  { scenario: "Always-on paid channels", method: "Markov/Shapley MTA", layer: "L2", timeframe: "Weekly", precision: "Medium", note: "Directional — calibrate with L3 quarterly" },
  { scenario: "New channel launch", method: "Geo-lift / Holdout", layer: "L3", timeframe: "4–6 weeks", precision: "High", note: "Must isolate effect before scaling" },
  { scenario: "Brand/TV campaign", method: "Synthetic Control + DiD", layer: "L3", timeframe: "60+30 days", note: "Cannot A/B test at user level" , precision: "High"},
  { scenario: "Creative/landing page", method: "A/B test (user-level)", layer: "L3", timeframe: "1–2 weeks", precision: "Very high", note: "Randomized — gold standard" },
  { scenario: "Budget reallocation", method: "MMM + MTA triangulation", layer: "L1+L2", timeframe: "Quarterly", precision: "Medium", note: "Combine macro + micro signals" },
  { scenario: "Cross-device journeys", method: "Probabilistic matching + holdout", layer: "L2+L3", timeframe: "Ongoing", precision: "Low→High", note: "Apple ATT makes deterministic impossible" },
];

// ─── Components ──────────────────────────────────────────────────────────────
function KPI(props) {
  return React.createElement("div", {
    className: "rounded-lg border p-4 sm:p-5",
    style: { background: T.surface, borderColor: T.border },
  },
    React.createElement("div", {
      className: "text-xs font-semibold uppercase tracking-wider mb-1.5",
      style: { color: T.textMuted },
    }, props.label),
    React.createElement("div", {
      className: "text-2xl sm:text-3xl font-bold",
      style: { color: props.color || T.text },
    }, props.value),
    props.sub && React.createElement("div", {
      className: "text-xs sm:text-sm mt-1",
      style: { color: T.textDim },
    }, props.sub),
  );
}

function Section(props) {
  return React.createElement("div", { className: "mb-8 sm:mb-10" },
    React.createElement("h2", {
      className: "text-xl sm:text-2xl font-bold mb-1",
      style: { color: T.text },
    }, props.title),
    props.sub && React.createElement("p", {
      className: "text-sm mb-4",
      style: { color: T.textSec },
    }, props.sub),
    props.children,
  );
}

function Card(props) {
  return React.createElement("div", {
    className: "rounded-lg border p-4 sm:p-5 " + (props.className || ""),
    style: { background: T.surface, borderColor: T.border },
  }, props.children);
}

function Insight(props) {
  return React.createElement("div", {
    className: "rounded-lg p-4 sm:p-5 border mb-4",
    style: { background: props.color + "08", borderColor: props.color + "25" },
  },
    React.createElement("div", {
      className: "text-sm font-semibold uppercase tracking-wider mb-2",
      style: { color: props.color },
    }, props.title),
    React.createElement("div", {
      className: "text-sm leading-relaxed",
      style: { color: T.text },
    }, props.children),
  );
}

function LayerBadge(props) {
  const colors = { L1: T.amber, L2: T.indigo, L3: T.teal };
  const labels = { L1: "Platform Signal", L2: "Statistical Model", L3: "Experiment" };
  return React.createElement("span", {
    className: "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase",
    style: { background: colors[props.layer] + "20", color: colors[props.layer] },
  }, props.layer, " · ", labels[props.layer]);
}

// ─── Charts ──────────────────────────────────────────────────────────────────

function PlatformDiscrepancyChart() {
  const data = PLATFORM_VS_ACTUAL.map(ch => ({
    channel: ch.channel,
    "Platform Says": ch.platformCredit,
    "Shapley (Data-Driven)": ch.shapleyCredit,
  }));
  return React.createElement(ResponsiveContainer, { width: "100%", height: 280 },
    React.createElement(BarChart, { data: data, margin: { top: 10, right: 10, left: 0, bottom: 5 } },
      React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: T.border }),
      React.createElement(XAxis, { dataKey: "channel", tick: { fontSize: 11, fill: T.textMuted }, interval: 0, angle: -15, textAnchor: "end", height: 50 }),
      React.createElement(YAxis, { tick: { fontSize: 11, fill: T.textMuted }, tickFormatter: function(v) { return v + "%"; } }),
      React.createElement(Tooltip, { contentStyle: { background: T.surface, border: "1px solid " + T.border, borderRadius: 8, fontSize: 12 } }),
      React.createElement(Legend, { wrapperStyle: { fontSize: 11 } }),
      React.createElement(Bar, { dataKey: "Platform Says", fill: T.amber, radius: [2,2,0,0], barSize: 20 }),
      React.createElement(Bar, { dataKey: "Shapley (Data-Driven)", fill: T.indigo, radius: [2,2,0,0], barSize: 20 }),
    ),
  );
}

function ModelComparisonChart() {
  const data = ATTRIBUTION_MODELS.map(function(ch) {
    return {
      channel: ch.channel,
      "Last-Click": ch.lastClick,
      "First-Click": ch.firstClick,
      "Linear": ch.linear,
      "Markov": ch.markov,
      "Shapley": ch.shapley,
    };
  });
  return React.createElement(ResponsiveContainer, { width: "100%", height: 320 },
    React.createElement(BarChart, { data: data, margin: { top: 10, right: 10, left: 0, bottom: 5 } },
      React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: T.border }),
      React.createElement(XAxis, { dataKey: "channel", tick: { fontSize: 11, fill: T.textMuted }, interval: 0, angle: -15, textAnchor: "end", height: 50 }),
      React.createElement(YAxis, { tick: { fontSize: 11, fill: T.textMuted }, tickFormatter: function(v) { return v + "%"; } }),
      React.createElement(Tooltip, { contentStyle: { background: T.surface, border: "1px solid " + T.border, borderRadius: 8, fontSize: 12 }, formatter: function(v, name) { return [v.toFixed(1) + "%", name]; } }),
      React.createElement(Legend, { wrapperStyle: { fontSize: 11 } }),
      React.createElement(Bar, { dataKey: "Last-Click", fill: T.textMuted, radius: [2,2,0,0], barSize: 12 }),
      React.createElement(Bar, { dataKey: "First-Click", fill: T.violet, radius: [2,2,0,0], barSize: 12 }),
      React.createElement(Bar, { dataKey: "Linear", fill: T.cyan, radius: [2,2,0,0], barSize: 12 }),
      React.createElement(Bar, { dataKey: "Markov", fill: T.indigo, radius: [2,2,0,0], barSize: 12 }),
      React.createElement(Bar, { dataKey: "Shapley", fill: T.amber, radius: [2,2,0,0], barSize: 12 }),
    ),
  );
}

function SyntheticControlChart() {
  return React.createElement(ResponsiveContainer, { width: "100%", height: 280 },
    React.createElement(ComposedChart, { data: SC_SERIES, margin: { top: 10, right: 10, left: 0, bottom: 5 } },
      React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: T.border }),
      React.createElement(XAxis, { dataKey: "day", tick: { fontSize: 10, fill: T.textMuted }, tickFormatter: function(d) { return d % 15 === 0 ? "D" + d : ""; } }),
      React.createElement(YAxis, { tick: { fontSize: 10, fill: T.textMuted }, tickFormatter: function(v) { return "$" + (v/1000).toFixed(0) + "K"; } }),
      React.createElement(Tooltip, { contentStyle: { background: T.surface, border: "1px solid " + T.border, borderRadius: 8, fontSize: 12 }, formatter: function(v, name) { return ["$" + v.toLocaleString(), name]; } }),
      React.createElement(ReferenceLine, { x: 60, stroke: T.amber, strokeDasharray: "4 4", label: { value: "Campaign Launch", fill: T.amber, fontSize: 10, position: "top" } }),
      React.createElement(Line, { type: "monotone", dataKey: "treatment", name: "Treatment (Actual)", stroke: T.indigo, strokeWidth: 2, dot: false }),
      React.createElement(Line, { type: "monotone", dataKey: "synthetic", name: "Synthetic Control", stroke: T.textMuted, strokeWidth: 2, strokeDasharray: "4 4", dot: false }),
      React.createElement(Legend, { wrapperStyle: { fontSize: 11 } }),
    ),
  );
}

function GapChart() {
  return React.createElement(ResponsiveContainer, { width: "100%", height: 160 },
    React.createElement(AreaChart, { data: SC_SERIES, margin: { top: 10, right: 10, left: 0, bottom: 5 } },
      React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: T.border }),
      React.createElement(XAxis, { dataKey: "day", tick: { fontSize: 10, fill: T.textMuted }, tickFormatter: function(d) { return d % 15 === 0 ? "D" + d : ""; } }),
      React.createElement(YAxis, { tick: { fontSize: 10, fill: T.textMuted }, tickFormatter: function(v) { return "$" + (v/1000).toFixed(1) + "K"; } }),
      React.createElement(ReferenceLine, { x: 60, stroke: T.amber, strokeDasharray: "4 4" }),
      React.createElement(ReferenceLine, { y: 0, stroke: T.textDim }),
      React.createElement(Area, { type: "monotone", dataKey: "gap", fill: T.indigo + "30", stroke: T.indigo, strokeWidth: 1.5 }),
    ),
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
function App() {
  var _useState = useState("problem"), page = _useState[0], setPage = _useState[1];

  var pages = [
    { id: "problem", label: "The Problem", icon: "⚠" },
    { id: "models", label: "Attribution Models", icon: "◉" },
    { id: "experiments", label: "Experiments", icon: "△" },
    { id: "framework", label: "The Framework", icon: "◈" },
  ];

  return React.createElement("div", {
    className: "min-h-screen flex flex-col sm:flex-row",
    style: { background: T.bg, color: T.text },
  },

    // ─── Sidebar ───
    React.createElement("nav", {
      className: "sm:w-56 sm:min-h-screen border-b sm:border-b-0 sm:border-r flex-shrink-0",
      style: { background: T.sidebar, borderColor: T.border },
    },
      React.createElement("div", { className: "p-4 sm:p-5" },
        React.createElement("div", { className: "flex items-center gap-2 mb-1" },
          React.createElement("div", { className: "w-2 h-2 rounded-full", style: { background: T.indigo } }),
          React.createElement("span", { className: "text-[10px] font-semibold uppercase tracking-widest", style: { color: T.textMuted } }, "NexaShop · $5M Budget"),
        ),
        React.createElement("h1", { className: "text-sm sm:text-base font-bold hidden sm:block mt-1", style: { color: T.text } }, "Marketing Measurement Framework"),
      ),
      React.createElement("div", { className: "flex sm:flex-col gap-1 px-3 pb-3 sm:px-3 overflow-x-auto sm:overflow-visible", style: { WebkitOverflowScrolling: "touch" } },
        pages.map(function(p) {
          return React.createElement("button", {
            key: p.id,
            onClick: function() { setPage(p.id); },
            className: "flex items-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-all " + (page === p.id ? "" : "hover:opacity-80"),
            style: {
              background: page === p.id ? T.indigo + "20" : "transparent",
              color: page === p.id ? T.indigo : T.textMuted,
              borderLeft: page === p.id ? "2px solid " + T.indigo : "2px solid transparent",
            },
          }, p.icon + " " + p.label);
        }),
      ),
    ),

    // ─── Main ───
    React.createElement("main", { className: "flex-1 p-4 sm:p-8 overflow-x-hidden" },

      // ═══ TAB 1: THE PROBLEM ═══
      page === "problem" && React.createElement("div", null,
        React.createElement("h1", { className: "text-2xl sm:text-3xl font-bold mb-2" }, "Why Marketing Attribution Is Broken"),
        React.createElement("p", { className: "text-sm sm:text-base leading-relaxed mb-6", style: { color: T.textSec } },
          "In 2025, no single attribution model tells the truth. Privacy restrictions, platform black boxes, and fragmented data mean every number you see is wrong — just in different ways."
        ),

        React.createElement(Insight, { color: T.rose, title: "The 3 Structural Problems" },
          React.createElement("div", { className: "space-y-3 mt-2" },
            React.createElement("div", null,
              React.createElement("strong", { style: { color: T.amber } }, "1. Privacy killed user-level tracking. "),
              "Apple ATT opt-in rates are ~25%. That means 75% of iOS journeys are invisible. Cookie deprecation removes another 30-40% of cross-site tracking. You're measuring a minority of behavior and extrapolating to the whole."
            ),
            React.createElement("div", null,
              React.createElement("strong", { style: { color: T.amber } }, "2. Every platform lies (differently). "),
              "Google claims credit for conversions Meta also claims. Meta's 7-day click window inflates its numbers. TikTok's view-through attribution counts passive scrollers as 'influenced'. The sum of all platform-reported conversions is 2-3x actual conversions."
            ),
            React.createElement("div", null,
              React.createElement("strong", { style: { color: T.amber } }, "3. Models disagree wildly. "),
              "Last-click gives Paid Search 45% credit. First-click gives Display 32%. Shapley gives everyone ~20%. Which is 'right'? None of them — because attribution is not a measurement problem, it's a counterfactual estimation problem."
            ),
          ),
        ),

        React.createElement(Section, { title: "Platform-Reported vs. Data-Driven Attribution", sub: "Same campaign, same period. Platform-reported credit (what vendors tell you) vs. Shapley Value (what data says)." },
          React.createElement(Card, null, React.createElement(PlatformDiscrepancyChart)),
        ),

        React.createElement(Insight, { color: T.amber, title: "The Consequence" },
          "NexaShop was allocating budget based on platform-reported ROAS. Google said Search ROAS was 3.2x. Actual Shapley-based ROAS? 1.4x. ",
          "Meanwhile, organic content (ROAS: ∞) and referral programs were being starved of investment because they don't show up in platform dashboards. ",
          React.createElement("strong", null, "The $5M question: how do you make decisions when every data source contradicts the others?"),
        ),

        React.createElement(Section, { title: "The Solution: A 3-Layer Measurement System" },
          React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4" },
            React.createElement(Card, null,
              React.createElement("div", { className: "text-center" },
                React.createElement("div", { className: "text-3xl mb-2" }, "📡"),
                React.createElement("div", { className: "text-sm font-bold mb-1", style: { color: T.amber } }, "Layer 1: Platform Signals"),
                React.createElement("div", { className: "text-xs", style: { color: T.textSec } }, "Google/Meta/TikTok reported data. Fast but biased. Use as directional hypothesis only."),
              ),
            ),
            React.createElement(Card, null,
              React.createElement("div", { className: "text-center" },
                React.createElement("div", { className: "text-3xl mb-2" }, "📊"),
                React.createElement("div", { className: "text-sm font-bold mb-1", style: { color: T.indigo } }, "Layer 2: Statistical Models"),
                React.createElement("div", { className: "text-xs", style: { color: T.textSec } }, "Markov, Shapley, MMM on your own data. Better but still model-dependent. Use for tactical allocation."),
              ),
            ),
            React.createElement(Card, null,
              React.createElement("div", { className: "text-center" },
                React.createElement("div", { className: "text-3xl mb-2" }, "🧪"),
                React.createElement("div", { className: "text-sm font-bold mb-1", style: { color: T.teal } }, "Layer 3: Experiments"),
                React.createElement("div", { className: "text-xs", style: { color: T.textSec } }, "Geo-lift, holdout, DiD, A/B tests. Slow but causal. Use to validate and calibrate L1 + L2."),
              ),
            ),
          ),
        ),
      ),

      // ═══ TAB 2: ATTRIBUTION MODELS ═══
      page === "models" && React.createElement("div", null,
        React.createElement("h1", { className: "text-2xl sm:text-3xl font-bold mb-2" }, "Layer 2: Statistical Attribution"),
        React.createElement("p", { className: "text-sm sm:text-base leading-relaxed mb-6", style: { color: T.textSec } },
          "5 attribution models applied to 50,000 customer journeys (181K touchpoints). Same data, radically different conclusions. This is why no single model should drive your budget decisions."
        ),

        React.createElement(Insight, { color: T.indigo, title: "What Each Model Assumes" },
          React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-2 text-xs" },
            React.createElement("div", null, React.createElement("strong", { style: { color: T.textMuted } }, "Last-Click: "), "Only the final touchpoint matters. Rewards closers, ignores initiators."),
            React.createElement("div", null, React.createElement("strong", { style: { color: T.textMuted } }, "First-Click: "), "Only the first touchpoint matters. Rewards awareness, ignores nurture."),
            React.createElement("div", null, React.createElement("strong", { style: { color: T.textMuted } }, "Linear: "), "All touchpoints share equally. Simple but naive — a banner impression ≠ a demo request."),
            React.createElement("div", null, React.createElement("strong", { style: { color: T.textMuted } }, "Markov Chain: "), "Measures removal effect: what happens if this channel disappears? Data-driven but path-dependent."),
            React.createElement("div", null, React.createElement("strong", { style: { color: T.textMuted } }, "Shapley Value: "), "Game theory: each channel's marginal contribution across all possible orderings. Fair but expensive."),
          ),
        ),

        React.createElement(Section, { title: "Credit Distribution: 5 Models, 6 Channels", sub: "% of total conversions attributed — notice how dramatically credit shifts between models." },
          React.createElement(Card, null, React.createElement(ModelComparisonChart)),
        ),

        React.createElement(Insight, { color: T.amber, title: "Key Insight: The 26-Point Gap" },
          "Paid Search gets 44.8% credit under last-click but only 18.7% under Shapley — a 26pp gap. That's not a rounding error; it's the difference between '$540K well spent' and '$540K of which $280K is wasted'. ",
          React.createElement("br", null), React.createElement("br", null),
          "Conversely, Meta Ads jumps from 2.1% (last-click) to 21.3% (Shapley). Under last-click, you'd cut this channel. Under Shapley, you'd grow it. ",
          React.createElement("strong", null, "Same data. Opposite decisions."),
        ),

        React.createElement(Section, { title: "So Which Model Is Right?" },
          React.createElement(Card, null,
            React.createElement("div", { className: "text-sm leading-relaxed", style: { color: T.text } },
              React.createElement("p", { className: "mb-3" },
                React.createElement("strong", { style: { color: T.rose } }, "None of them. "),
                "Every model makes assumptions that distort reality. Last-click ignores causation. Shapley assumes all orderings are equally likely (they're not). Markov is only as good as your tracking coverage."
              ),
              React.createElement("p", { className: "mb-3" },
                React.createElement("strong", { style: { color: T.teal } }, "But together they're useful. "),
                "When Markov AND Shapley both say Display is undervalued, that's a strong signal. When they disagree (like Email: 24% Markov vs. 9% Shapley), you know you need experimental validation."
              ),
              React.createElement("p", null,
                React.createElement("strong", { style: { color: T.indigo } }, "The practical move: "),
                "Use multi-model comparison to identify high-confidence signals and high-uncertainty gaps. Then design experiments (Layer 3) specifically to resolve the gaps."
              ),
            ),
          ),
        ),
      ),

      // ═══ TAB 3: EXPERIMENTS ═══
      page === "experiments" && React.createElement("div", null,
        React.createElement("h1", { className: "text-2xl sm:text-3xl font-bold mb-2" }, "Layer 3: Experimental Validation"),
        React.createElement("p", { className: "text-sm sm:text-base leading-relaxed mb-6", style: { color: T.textSec } },
          "Attribution models estimate. Experiments prove. When you can't track individual users (privacy) or when platforms disagree, you need causal evidence. Here's how."
        ),

        React.createElement(Insight, { color: T.teal, title: "When to Use Each Experimental Method" },
          React.createElement("div", { className: "space-y-2 mt-2 text-xs" },
            React.createElement("div", null, React.createElement("strong", { style: { color: T.teal } }, "Geo-Lift (Synthetic Control): "), "For brand/TV campaigns where you can't randomize users. Compare markets with vs. without the campaign. Need 60+ days pre-data."),
            React.createElement("div", null, React.createElement("strong", { style: { color: T.indigo } }, "Difference-in-Differences: "), "For any market-level intervention. Simpler than Synthetic Control, assumes parallel trends. Better with more treatment/control markets."),
            React.createElement("div", null, React.createElement("strong", { style: { color: T.amber } }, "Holdout Test: "), "Suppress ads to a random % of users for 2-4 weeks. Measures true incrementality of a single channel. Gold standard but costly (you lose revenue during test)."),
            React.createElement("div", null, React.createElement("strong", { style: { color: T.violet } }, "A/B Test: "), "User-level randomization for tactics (creative, landing page, bid strategy). Not for channel-level measurement (contamination)."),
          ),
        ),

        React.createElement(Section, { title: "Case Study: TV Campaign Geo-Lift", sub: "NexaShop launched TV in 5 DMAs (treatment) vs. 15 DMAs (control). 60 days pre-period, 30 days post." },
          React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4" },
            React.createElement(Card, null,
              React.createElement("div", { className: "text-xs font-semibold uppercase tracking-wider mb-3", style: { color: T.textMuted } }, "Difference-in-Differences"),
              React.createElement("div", { className: "text-3xl font-bold mb-1", style: { color: T.indigo } }, "+14.6%"),
              React.createElement("div", { className: "text-sm mb-2", style: { color: T.textSec } }, "$565K incremental (30 days)"),
              React.createElement("div", { className: "text-xs", style: { color: T.textMuted } }, "p = 0.0005 · 95% CI: [$1,654, $5,885]/day"),
            ),
            React.createElement(Card, null,
              React.createElement("div", { className: "text-xs font-semibold uppercase tracking-wider mb-3", style: { color: T.textMuted } }, "Synthetic Control"),
              React.createElement("div", { className: "text-3xl font-bold mb-1", style: { color: T.teal } }, "+12.0%"),
              React.createElement("div", { className: "text-sm mb-2", style: { color: T.textSec } }, "$492K incremental (30 days)"),
              React.createElement("div", { className: "text-xs", style: { color: T.textMuted } }, "Pre-fit RMSPE: 1.0% · Placebo p < 0.001"),
            ),
          ),
        ),

        React.createElement(Section, { title: "Treatment vs. Synthetic Control", sub: "Solid = actual treatment market revenue. Dashed = data-driven counterfactual (what would have happened without TV)." },
          React.createElement(Card, null, React.createElement(SyntheticControlChart)),
        ),

        React.createElement(Section, { title: "Treatment Effect Over Time", sub: "Gap between actual and counterfactual. Pre-period gap ≈ 0 validates the model. Post-period divergence = causal effect." },
          React.createElement(Card, null, React.createElement(GapChart)),
        ),

        React.createElement(Insight, { color: T.amber, title: "Why Two Methods?" },
          "Triangulation. DiD assumes parallel trends (simple, interpretable). Synthetic Control builds a custom counterfactual (flexible, less assumption-dependent). ",
          "When both converge on 12-15% lift, confidence is high. When they diverge, you investigate further. ",
          React.createElement("strong", null, "Never trust a single estimator for a $500K decision."),
        ),
      ),

      // ═══ TAB 4: THE FRAMEWORK ═══
      page === "framework" && React.createElement("div", null,
        React.createElement("h1", { className: "text-2xl sm:text-3xl font-bold mb-2" }, "The Measurement Framework"),
        React.createElement("p", { className: "text-sm sm:text-base leading-relaxed mb-6", style: { color: T.textSec } },
          "No single method solves attribution. The answer is a systematic framework where each layer compensates for the others' weaknesses."
        ),

        React.createElement(Insight, { color: T.indigo, title: "How the 3 Layers Work Together" },
          React.createElement("div", { className: "space-y-3 mt-2" },
            React.createElement("div", null,
              React.createElement(LayerBadge, { layer: "L1" }), " ",
              React.createElement("strong", null, "Platform data tells you WHERE to look. "),
              "Google says Search ROAS dropped 30% last month. That's a signal — maybe true, maybe an attribution window change. It generates the hypothesis."
            ),
            React.createElement("div", null,
              React.createElement(LayerBadge, { layer: "L2" }), " ",
              React.createElement("strong", null, "Statistical models tell you HOW MUCH to believe. "),
              "Run Markov + Shapley on your first-party data. If they confirm Search is weakening, confidence grows. If they disagree with Google, the platform is probably wrong."
            ),
            React.createElement("div", null,
              React.createElement(LayerBadge, { layer: "L3" }), " ",
              React.createElement("strong", null, "Experiments tell you THE TRUTH. "),
              "Run a holdout test on Search for 2 weeks. Suppress ads to 10% of users. If conversions barely drop, Search was capturing demand, not creating it. Now you know."
            ),
          ),
        ),

        React.createElement(Section, { title: "Decision Matrix: What Method for What Question", sub: "A practical guide for choosing the right measurement approach" },
          React.createElement(Card, null,
            React.createElement("div", { className: "overflow-x-auto" },
              React.createElement("table", { className: "w-full text-xs sm:text-sm", style: { minWidth: 640 } },
                React.createElement("thead", null,
                  React.createElement("tr", { style: { borderBottom: "1px solid " + T.border } },
                    ["Scenario", "Method", "Layer", "Timeline", "Precision"].map(function(h) {
                      return React.createElement("th", { key: h, className: "text-left py-2 px-2 font-semibold text-xs uppercase tracking-wider", style: { color: T.textMuted } }, h);
                    }),
                  ),
                ),
                React.createElement("tbody", null,
                  DECISION_MATRIX.map(function(row, i) {
                    return React.createElement("tr", { key: i, style: { borderBottom: "1px solid " + T.border } },
                      React.createElement("td", { className: "py-2.5 px-2 font-medium", style: { color: T.text } }, row.scenario),
                      React.createElement("td", { className: "py-2.5 px-2", style: { color: T.textSec } }, row.method),
                      React.createElement("td", { className: "py-2.5 px-2" }, React.createElement(LayerBadge, { layer: row.layer.split("+")[0] })),
                      React.createElement("td", { className: "py-2.5 px-2", style: { color: T.textSec } }, row.timeframe),
                      React.createElement("td", { className: "py-2.5 px-2", style: { color: T.textSec } }, row.precision),
                    );
                  }),
                ),
              ),
            ),
          ),
        ),

        React.createElement(Insight, { color: T.teal, title: "The Calibration Loop" },
          React.createElement("div", { className: "space-y-2 mt-2" },
            React.createElement("p", null,
              "The framework isn't static. It's a continuous calibration loop:"
            ),
            React.createElement("div", { className: "rounded p-3 mt-2", style: { background: T.surfaceAlt } },
              React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-4 gap-3 text-center text-xs" },
                React.createElement("div", null,
                  React.createElement("div", { className: "text-lg font-bold", style: { color: T.amber } }, "Q1"),
                  React.createElement("div", { style: { color: T.textSec } }, "Set budget using L2 models"),
                ),
                React.createElement("div", null,
                  React.createElement("div", { className: "text-lg font-bold", style: { color: T.indigo } }, "Q2"),
                  React.createElement("div", { style: { color: T.textSec } }, "Run holdout tests on top 3 channels"),
                ),
                React.createElement("div", null,
                  React.createElement("div", { className: "text-lg font-bold", style: { color: T.teal } }, "Q3"),
                  React.createElement("div", { style: { color: T.textSec } }, "Calibrate L2 with L3 results"),
                ),
                React.createElement("div", null,
                  React.createElement("div", { className: "text-lg font-bold", style: { color: T.green } }, "Q4"),
                  React.createElement("div", { style: { color: T.textSec } }, "Reallocate with calibrated model"),
                ),
              ),
            ),
            React.createElement("p", { className: "mt-3" },
              "Each cycle makes your models more accurate. After 2-3 cycles, your L2 attribution becomes ",
              React.createElement("strong", null, "experimentally validated"), " — not just 'a model' but a proven decision tool."
            ),
          ),
        ),

        React.createElement(Section, { title: "Projected Impact" },
          React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4" },
            React.createElement(KPI, { label: "Budget Reallocation", value: "+$2.8M", sub: "Annual revenue from correcting misattribution", color: T.green }),
            React.createElement(KPI, { label: "TV Incremental (validated)", value: "$6.3M", sub: "Annual — confirmed via geo-lift", color: T.indigo }),
            React.createElement(KPI, { label: "Measurement Confidence", value: "3x", sub: "From 'gut + last-click' to calibrated framework", color: T.amber }),
          ),
        ),

        React.createElement(Insight, { color: T.indigo, title: "Bottom Line" },
          "The goal isn't perfect attribution — it's making ",
          React.createElement("strong", null, "better decisions faster"),
          ". A 3-layer framework won't give you a single 'true ROAS' number. But it will tell you: ",
          React.createElement("em", null, "which channels are definitely working, which are definitely not, and which need more evidence before you scale."),
          " That's the difference between guessing and deciding.",
        ),
      ),
    ),

    // Footer
    React.createElement("footer", {
      className: "sm:hidden border-t py-3 px-4 text-center text-[10px]",
      style: { borderColor: T.border, color: T.textDim },
    }, "Built by Freena Wang · Data simulated for demonstration"),
  );
}

var root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
