// ─── Marketing Measurement Framework ─────────────────────────────────────────
// NexaShop: Attribution & Incrementality — Part of the Measurement Triangle
// Light theme matching MMM project aesthetic

const { useState } = React;
const {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart,
  ReferenceLine, Cell,
} = Recharts;

// ─── Design System (matching MMM project) ────────────────────────────────────
const DS = {
  bg: "#F7F6F3",
  surface: "#FFFFFF",
  surfaceAlt: "#F0EFEB",
  border: "#E5E2DB",
  borderLight: "#EDEAE4",
  text: { primary: "#2C2C2C", secondary: "#6B6B6B", tertiary: "#9B9B9B" },
  accent: "#4A7FA5",
  positive: "#4E9A6D",
  negative: "#C45B4F",
  warning: "#D4A24E",
  highlight: "#2D6A85",
  purple: "#7E6BAF",
  channels: {
    "Paid Search": "#4A7FA5",
    "Meta Ads": "#7E6BAF",
    "Display": "#D4A24E",
    "Email": "#4E9A6D",
    "Organic": "#8C8C8C",
    "Referral": "#2C2C2C",
  },
};

// ─── Data ────────────────────────────────────────────────────────────────────

const PLATFORM_VS_ACTUAL = [
  { channel: "Paid Search", platform: 42, shapley: 19, spend: 540, platformROAS: 3.2, trueROAS: 1.4 },
  { channel: "Meta Ads", platform: 35, shapley: 21, spend: 450, platformROAS: 2.8, trueROAS: 1.1 },
  { channel: "Display", platform: 8, shapley: 20, spend: 240, platformROAS: 0.9, trueROAS: 0.7 },
  { channel: "Email", platform: 12, shapley: 9, spend: 75, platformROAS: 5.1, trueROAS: 2.3 },
  { channel: "Organic", platform: 0, shapley: 21, spend: 0, platformROAS: 0, trueROAS: null },
  { channel: "Referral", platform: 3, shapley: 10, spend: 120, platformROAS: 1.5, trueROAS: 0.9 },
];

const MODELS = [
  { channel: "Paid Search", lastClick: 44.8, firstClick: 15.2, linear: 22.1, markov: 28.0, shapley: 18.7 },
  { channel: "Meta Ads", lastClick: 2.1, firstClick: 28.4, linear: 18.5, markov: 7.8, shapley: 21.3 },
  { channel: "Display", lastClick: 0.6, firstClick: 32.1, linear: 15.8, markov: 4.8, shapley: 19.7 },
  { channel: "Email", lastClick: 14.7, firstClick: 5.8, linear: 13.2, markov: 24.2, shapley: 8.7 },
  { channel: "Organic", lastClick: 27.7, firstClick: 10.5, linear: 17.9, markov: 35.2, shapley: 21.1 },
  { channel: "Referral", lastClick: 10.1, firstClick: 8.0, linear: 12.5, markov: 0.0, shapley: 10.5 },
];

// Misallocation calculation
const MISALLOCATION = (() => {
  var totalSpend = 1425000; // quarterly
  var lastClickAlloc = { "Paid Search": 0.448, "Meta Ads": 0.021, "Display": 0.006, "Email": 0.147, "Organic": 0.277, "Referral": 0.101 };
  var shapleyAlloc = { "Paid Search": 0.187, "Meta Ads": 0.213, "Display": 0.197, "Email": 0.087, "Organic": 0.211, "Referral": 0.105 };
  var overSpend = 0;
  Object.keys(lastClickAlloc).forEach(function(ch) {
    var diff = lastClickAlloc[ch] - shapleyAlloc[ch];
    if (diff > 0) overSpend += diff * totalSpend;
  });
  return Math.round(overSpend);
})();

var SC_SERIES = (function() {
  var t = [25520,25012,25440,26140,27580,29140,27680,24780,24320,24480,25460,26120,27840,29500,27960,25040,24480,24600,25780,26440,28200,29840,28380,25340,24780,25000,26120,26760,28580,30220,28600,25480,25040,25160,26280,27020,28900,30580,29040,25880,25340,25500,26620,27340,29280,30940,29420,26220,25680,25820,27020,27700,29620,31320,29780,26560,25980,26120,27380,28040,31120,31560,32440,33200,34480,35020,33780,31680,31020,31200,32060,32740,33960,34640,33380,31220,30560,30740,31620,32400,33580,34240,32940,30860,30240,30400,31240,32020,33200,33880];
  var s = [25480,25070,25380,26080,27520,29080,27600,24820,24380,24540,25400,26060,27780,29440,27920,25000,24520,24640,25720,26380,28140,29780,28300,25280,24720,24940,26060,26680,28500,30140,28540,25420,24980,25080,26220,26960,28820,30500,28960,25800,25260,25420,26540,27260,29180,30860,29340,26140,25580,25740,26920,27620,29540,31220,29680,26480,25880,26020,27280,27940,27000,27180,27440,27780,28120,28300,27800,27080,26880,26960,27220,27520,27780,28060,27560,26840,26620,26720,26980,27300,27540,27820,27320,26580,26380,26460,26720,27000,27260,27540];
  return t.map(function(v, i) { return { day: i+1, treatment: v, synthetic: s[i], gap: v - s[i] }; });
})();

var DECISION_MATRIX = [
  { scenario: "Always-on paid channels", method: "Markov/Shapley MTA", layer: "L2", timeframe: "Weekly", precision: "Medium" },
  { scenario: "New channel launch", method: "Geo-lift / Holdout", layer: "L3", timeframe: "4–6 weeks", precision: "High" },
  { scenario: "Brand/TV campaign", method: "Synthetic Control + DiD", layer: "L3", timeframe: "60+30 days", precision: "High" },
  { scenario: "Creative/landing page", method: "A/B test (user-level)", layer: "L3", timeframe: "1–2 weeks", precision: "Very High" },
  { scenario: "Budget reallocation", method: "MMM + MTA triangulation", layer: "L1+L2", timeframe: "Quarterly", precision: "Medium" },
  { scenario: "Upper-funnel brand", method: "Brand Lift Study + MMM", layer: "L1+L3", timeframe: "Monthly", precision: "Medium" },
];

// ─── Components ──────────────────────────────────────────────────────────────

function KPI(props) {
  return React.createElement("div", {
    className: "rounded-lg border p-4 sm:p-5",
    style: { background: DS.surface, borderColor: DS.border },
  },
    React.createElement("div", { className: "text-xs font-semibold uppercase tracking-wider mb-1.5", style: { color: DS.text.tertiary } }, props.label),
    React.createElement("div", { className: "text-2xl sm:text-3xl font-bold", style: { color: props.color || DS.text.primary } }, props.value),
    props.sub && React.createElement("div", { className: "text-xs sm:text-sm mt-1", style: { color: DS.text.secondary } }, props.sub),
  );
}

function Section(props) {
  return React.createElement("div", { className: "mb-8 sm:mb-10" },
    React.createElement("h2", { className: "text-xl sm:text-2xl font-bold mb-1", style: { color: DS.text.primary } }, props.title),
    props.sub && React.createElement("p", { className: "text-sm mb-4", style: { color: DS.text.secondary } }, props.sub),
    props.children,
  );
}

function Card(props) {
  return React.createElement("div", {
    className: "rounded-lg border p-4 sm:p-5 " + (props.className || ""),
    style: { background: DS.surface, borderColor: DS.border },
  }, props.children);
}

function Callout(props) {
  var bgMap = { warning: "#FEF3C7", info: "#EFF6FF", success: "#F0FDF4", danger: "#FEF2F2" };
  var borderMap = { warning: "#F59E0B", info: "#4A7FA5", success: "#4E9A6D", danger: "#C45B4F" };
  return React.createElement("div", {
    className: "rounded-lg p-4 sm:p-5 border-l-4 mb-5",
    style: { background: bgMap[props.type] || bgMap.info, borderLeftColor: borderMap[props.type] || borderMap.info },
  },
    props.title && React.createElement("div", { className: "text-sm font-bold mb-1.5", style: { color: DS.text.primary } }, props.title),
    React.createElement("div", { className: "text-sm leading-relaxed", style: { color: DS.text.primary } }, props.children),
  );
}

// ─── Charts ──────────────────────────────────────────────────────────────────

function DiscrepancyChart() {
  var data = PLATFORM_VS_ACTUAL.map(function(ch) { return { channel: ch.channel, "Platform-Reported": ch.platform, "True (Shapley)": ch.shapley }; });
  return React.createElement(ResponsiveContainer, { width: "100%", height: 280 },
    React.createElement(BarChart, { data: data, margin: { top: 10, right: 20, left: 0, bottom: 5 } },
      React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: DS.borderLight }),
      React.createElement(XAxis, { dataKey: "channel", tick: { fontSize: 11, fill: DS.text.secondary }, interval: 0, angle: -15, textAnchor: "end", height: 50 }),
      React.createElement(YAxis, { tick: { fontSize: 11, fill: DS.text.secondary }, tickFormatter: function(v) { return v + "%"; } }),
      React.createElement(Tooltip, { contentStyle: { background: DS.surface, border: "1px solid " + DS.border, borderRadius: 8, fontSize: 12 } }),
      React.createElement(Legend, { wrapperStyle: { fontSize: 12 } }),
      React.createElement(Bar, { dataKey: "Platform-Reported", fill: DS.warning, radius: [3,3,0,0], barSize: 22 }),
      React.createElement(Bar, { dataKey: "True (Shapley)", fill: DS.accent, radius: [3,3,0,0], barSize: 22 }),
    ),
  );
}

function ModelChart() {
  var data = MODELS.map(function(ch) {
    return { channel: ch.channel, "Last-Click": ch.lastClick, "First-Click": ch.firstClick, "Linear": ch.linear, "Markov": ch.markov, "Shapley": ch.shapley };
  });
  return React.createElement(ResponsiveContainer, { width: "100%", height: 320 },
    React.createElement(BarChart, { data: data, margin: { top: 10, right: 20, left: 0, bottom: 5 } },
      React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: DS.borderLight }),
      React.createElement(XAxis, { dataKey: "channel", tick: { fontSize: 11, fill: DS.text.secondary }, interval: 0, angle: -15, textAnchor: "end", height: 50 }),
      React.createElement(YAxis, { tick: { fontSize: 11, fill: DS.text.secondary }, tickFormatter: function(v) { return v + "%"; } }),
      React.createElement(Tooltip, { contentStyle: { background: DS.surface, border: "1px solid " + DS.border, borderRadius: 8, fontSize: 12 }, formatter: function(v, n) { return [v.toFixed(1) + "%", n]; } }),
      React.createElement(Legend, { wrapperStyle: { fontSize: 11 } }),
      React.createElement(Bar, { dataKey: "Last-Click", fill: "#B0B0B0", radius: [2,2,0,0], barSize: 11 }),
      React.createElement(Bar, { dataKey: "First-Click", fill: DS.purple, radius: [2,2,0,0], barSize: 11 }),
      React.createElement(Bar, { dataKey: "Linear", fill: DS.warning, radius: [2,2,0,0], barSize: 11 }),
      React.createElement(Bar, { dataKey: "Markov", fill: DS.accent, radius: [2,2,0,0], barSize: 11 }),
      React.createElement(Bar, { dataKey: "Shapley", fill: DS.positive, radius: [2,2,0,0], barSize: 11 }),
    ),
  );
}

function SCChart() {
  return React.createElement(ResponsiveContainer, { width: "100%", height: 260 },
    React.createElement(ComposedChart, { data: SC_SERIES, margin: { top: 10, right: 20, left: 0, bottom: 5 } },
      React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: DS.borderLight }),
      React.createElement(XAxis, { dataKey: "day", tick: { fontSize: 10, fill: DS.text.secondary }, tickFormatter: function(d) { return d % 15 === 0 ? "D" + d : ""; } }),
      React.createElement(YAxis, { tick: { fontSize: 10, fill: DS.text.secondary }, tickFormatter: function(v) { return "$" + (v/1000).toFixed(0) + "K"; } }),
      React.createElement(Tooltip, { contentStyle: { background: DS.surface, border: "1px solid " + DS.border, borderRadius: 8, fontSize: 12 }, formatter: function(v, n) { return ["$" + v.toLocaleString(), n]; } }),
      React.createElement(ReferenceLine, { x: 60, stroke: DS.negative, strokeDasharray: "4 4", label: { value: "TV Launch", fill: DS.negative, fontSize: 10, position: "top" } }),
      React.createElement(Line, { type: "monotone", dataKey: "treatment", name: "Treatment (Actual)", stroke: DS.accent, strokeWidth: 2, dot: false }),
      React.createElement(Line, { type: "monotone", dataKey: "synthetic", name: "Synthetic Control", stroke: DS.text.tertiary, strokeWidth: 2, strokeDasharray: "5 5", dot: false }),
      React.createElement(Legend, { wrapperStyle: { fontSize: 11 } }),
    ),
  );
}

function GapChart() {
  return React.createElement(ResponsiveContainer, { width: "100%", height: 150 },
    React.createElement(AreaChart, { data: SC_SERIES, margin: { top: 5, right: 20, left: 0, bottom: 5 } },
      React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: DS.borderLight }),
      React.createElement(XAxis, { dataKey: "day", tick: { fontSize: 10, fill: DS.text.secondary }, tickFormatter: function(d) { return d % 15 === 0 ? "D" + d : ""; } }),
      React.createElement(YAxis, { tick: { fontSize: 10, fill: DS.text.secondary }, tickFormatter: function(v) { return "$" + (v/1000).toFixed(1) + "K"; } }),
      React.createElement(ReferenceLine, { x: 60, stroke: DS.negative, strokeDasharray: "4 4" }),
      React.createElement(ReferenceLine, { y: 0, stroke: DS.text.tertiary }),
      React.createElement(Area, { type: "monotone", dataKey: "gap", fill: DS.accent + "25", stroke: DS.accent, strokeWidth: 1.5 }),
    ),
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
function App() {
  var _s = useState("problem"), page = _s[0], setPage = _s[1];
  var pages = [
    { id: "problem", label: "The Problem" },
    { id: "models", label: "Attribution Models" },
    { id: "experiments", label: "Experiments" },
    { id: "framework", label: "The Framework" },
  ];

  return React.createElement("div", { className: "min-h-screen", style: { background: DS.bg, color: DS.text.primary, fontFamily: "'Inter', sans-serif" } },

    // Header
    React.createElement("header", {
      className: "border-b sticky top-0 z-20",
      style: { background: DS.surface, borderColor: DS.border },
    },
      React.createElement("div", { className: "max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" },
        React.createElement("div", null,
          React.createElement("div", { className: "text-[10px] font-semibold uppercase tracking-widest", style: { color: DS.text.tertiary } }, "NexaShop · $5M Annual Marketing Budget"),
          React.createElement("h1", { className: "text-lg sm:text-xl font-bold" }, "Marketing Measurement Framework"),
        ),
        React.createElement("nav", { className: "flex gap-1 overflow-x-auto", style: { WebkitOverflowScrolling: "touch" } },
          pages.map(function(p) {
            return React.createElement("button", {
              key: p.id,
              onClick: function() { setPage(p.id); },
              className: "px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-all",
              style: {
                background: page === p.id ? DS.accent : "transparent",
                color: page === p.id ? "#fff" : DS.text.secondary,
              },
            }, p.label);
          }),
        ),
      ),
    ),

    // Content
    React.createElement("main", { className: "max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8" },

      // ═══ THE PROBLEM ═══
      page === "problem" && React.createElement("div", null,

        // Hero stat
        React.createElement("div", {
          className: "rounded-xl p-6 sm:p-8 mb-8 text-center border",
          style: { background: DS.surface, borderColor: DS.border },
        },
          React.createElement("div", { className: "text-xs font-semibold uppercase tracking-wider mb-2", style: { color: DS.negative } }, "The Cost of Wrong Attribution"),
          React.createElement("div", { className: "text-4xl sm:text-5xl font-bold mb-2", style: { color: DS.negative } }, "$" + (MISALLOCATION / 1000).toFixed(0) + "K"),
          React.createElement("div", { className: "text-sm sm:text-base", style: { color: DS.text.secondary } }, "misallocated per quarter because NexaShop trusted last-click attribution"),
          React.createElement("div", { className: "text-xs mt-3", style: { color: DS.text.tertiary } }, "= budget directed to channels that capture demand, not channels that create it"),
        ),

        React.createElement(Callout, { type: "danger", title: "Why Every Number You See Is Wrong" },
          React.createElement("div", { className: "space-y-2 mt-1" },
            React.createElement("p", null, React.createElement("strong", null, "Apple ATT opt-in: ~25%."), " 75% of iOS journeys are invisible. You're measuring a minority and extrapolating."),
            React.createElement("p", null, React.createElement("strong", null, "Platform over-counting: 2–3x."), " Google claims credit Meta also claims. The sum of all platform-reported conversions is 2–3x actual conversions."),
            React.createElement("p", null, React.createElement("strong", null, "Model disagreement: 26pp."), " Paid Search gets 45% credit (last-click) or 19% (Shapley). Same data. Opposite budget decisions."),
          ),
        ),

        React.createElement(Section, { title: "What Platforms Tell You vs. What's True", sub: "Same Q4 campaign. Platform-reported credit (what Google/Meta say) vs. Shapley Value (what your own data says)." },
          React.createElement(Card, null, React.createElement(DiscrepancyChart)),
        ),

        React.createElement(Callout, { type: "warning", title: "The Consequence" },
          "NexaShop was allocating budget based on platform-reported ROAS. Google said Search ROAS was 3.2x. Actual incremental ROAS? 1.4x. ",
          "Meanwhile, organic content and referral programs were being starved. ",
          React.createElement("strong", null, "The $5M question: how do you make decisions when every data source contradicts the others?"),
        ),

        React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6" },
          React.createElement(KPI, { label: "Annual Budget", value: "$5.0M", sub: "6 channels" }),
          React.createElement(KPI, { label: "Platform ROAS (claimed)", value: "2.8x", sub: "Looks great", color: DS.positive }),
          React.createElement(KPI, { label: "True Incremental ROAS", value: "1.2x", sub: "Barely breaking even", color: DS.negative }),
          React.createElement(KPI, { label: "Waste Per Year", value: "$1.8M", sub: "Misallocated spend", color: DS.negative }),
        ),
      ),

      // ═══ ATTRIBUTION MODELS ═══
      page === "models" && React.createElement("div", null,
        React.createElement("div", { className: "mb-6" },
          React.createElement("h1", { className: "text-2xl sm:text-3xl font-bold mb-2" }, "5 Models. Same Data. Different Answers."),
          React.createElement("p", { className: "text-sm sm:text-base", style: { color: DS.text.secondary } }, "50,000 customer journeys (181K touchpoints). Every model makes assumptions that distort reality. The question isn't 'which is right' — it's 'where do they agree, and where do we need experiments to break the tie?'"),
        ),

        React.createElement(Callout, { type: "info", title: "Model Assumptions at a Glance" },
          React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 text-xs" },
            React.createElement("div", null, React.createElement("strong", null, "Last-Click:"), " Only final touch matters. Rewards closers."),
            React.createElement("div", null, React.createElement("strong", null, "First-Click:"), " Only first touch matters. Rewards awareness."),
            React.createElement("div", null, React.createElement("strong", null, "Linear:"), " Equal credit. Simple but naive."),
            React.createElement("div", null, React.createElement("strong", null, "Markov Chain:"), " Removal effect. What breaks if this channel disappears?"),
            React.createElement("div", null, React.createElement("strong", null, "Shapley Value:"), " Game theory. Marginal contribution across all orderings."),
          ),
        ),

        React.createElement(Section, { title: "Credit Distribution by Model", sub: "% of conversions attributed. Notice how Paid Search drops from 45% to 19% depending on which model you trust." },
          React.createElement(Card, null, React.createElement(ModelChart)),
        ),

        React.createElement(Callout, { type: "danger", title: "The 26-Point Gap" },
          React.createElement("p", null, "Paid Search: 44.8% (last-click) vs. 18.7% (Shapley). That's the difference between '$540K well spent' and '$280K wasted'."),
          React.createElement("p", { className: "mt-2" }, "Meta Ads: 2.1% (last-click) vs. 21.3% (Shapley). Under last-click you'd cut this channel. Under Shapley you'd grow it. ", React.createElement("strong", null, "Same data. Opposite decisions.")),
        ),

        React.createElement(Callout, { type: "success", title: "When Models Agree → Act. When They Disagree → Experiment." },
          "Markov AND Shapley both say Display is undervalued → high confidence signal, reallocate. ",
          "They disagree on Email (24% vs 9%) → run a holdout test to find the truth. ",
          React.createElement("strong", null, "Multi-model comparison tells you where to experiment next."),
        ),
      ),

      // ═══ EXPERIMENTS ═══
      page === "experiments" && React.createElement("div", null,
        React.createElement("div", { className: "mb-6" },
          React.createElement("h1", { className: "text-2xl sm:text-3xl font-bold mb-2" }, "When Models Fail, Experiments Prove"),
          React.createElement("p", { className: "text-sm sm:text-base", style: { color: DS.text.secondary } }, "Attribution estimates. Experiments prove causation. When you can't track users (privacy) or platforms disagree, you need causal evidence from controlled tests."),
        ),

        React.createElement(Callout, { type: "info", title: "Choosing the Right Experiment" },
          React.createElement("div", { className: "space-y-1.5 mt-1 text-xs" },
            React.createElement("p", null, React.createElement("strong", null, "Geo-Lift / Synthetic Control:"), " For brand/TV campaigns. Compare markets with vs. without. Need 60+ days pre-data."),
            React.createElement("p", null, React.createElement("strong", null, "Difference-in-Differences:"), " Market-level intervention. Assumes parallel trends. Better with more markets."),
            React.createElement("p", null, React.createElement("strong", null, "Holdout (Dark Traffic):"), " Suppress ads to random 10% for 2–4 weeks. Proves true incrementality. Costly but definitive."),
            React.createElement("p", null, React.createElement("strong", null, "User-Level A/B:"), " For creative, landing pages, bid strategy. Gold standard but can't measure channel-level."),
          ),
        ),

        React.createElement(Section, { title: "Case Study: TV Campaign Geo-Lift", sub: "TV launched in 5 DMAs (treatment) vs. 15 DMAs (control). 60 days pre-period establishes baseline." },
          React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5" },
            React.createElement(Card, null,
              React.createElement("div", { className: "text-xs font-semibold uppercase tracking-wider mb-2", style: { color: DS.text.tertiary } }, "Difference-in-Differences"),
              React.createElement("div", { className: "text-3xl font-bold", style: { color: DS.accent } }, "+14.6%"),
              React.createElement("div", { className: "text-sm", style: { color: DS.text.secondary } }, "$565K incremental (30 days)"),
              React.createElement("div", { className: "text-xs mt-2", style: { color: DS.text.tertiary } }, "p = 0.0005 · CI: [$1.7K, $5.9K]/day"),
            ),
            React.createElement(Card, null,
              React.createElement("div", { className: "text-xs font-semibold uppercase tracking-wider mb-2", style: { color: DS.text.tertiary } }, "Synthetic Control"),
              React.createElement("div", { className: "text-3xl font-bold", style: { color: DS.positive } }, "+12.0%"),
              React.createElement("div", { className: "text-sm", style: { color: DS.text.secondary } }, "$492K incremental (30 days)"),
              React.createElement("div", { className: "text-xs mt-2", style: { color: DS.text.tertiary } }, "Pre-fit RMSPE: 1.0% · Placebo p < 0.001"),
            ),
          ),
        ),

        React.createElement(Section, { title: "Treatment vs. Counterfactual", sub: "Solid line = actual revenue in TV markets. Dashed = what would have happened without TV (synthetic control)." },
          React.createElement(Card, null, React.createElement(SCChart)),
        ),

        React.createElement(Section, { title: "Incremental Effect (Gap)", sub: "Pre-period gap ≈ 0 validates the model. Post-period divergence = TV's causal effect." },
          React.createElement(Card, null, React.createElement(GapChart)),
        ),

        React.createElement(Callout, { type: "success", title: "Triangulation: Two Methods Converge" },
          "DiD: +14.6%. Synthetic Control: +12.0%. Both converge on a 12–15% lift range. ",
          "This convergence gives us confidence to recommend national TV rollout (est. $6.3M annual incremental). ",
          React.createElement("strong", null, "Never make a $500K decision on a single estimator."),
        ),
      ),

      // ═══ THE FRAMEWORK ═══
      page === "framework" && React.createElement("div", null,
        React.createElement("div", { className: "mb-6" },
          React.createElement("h1", { className: "text-2xl sm:text-3xl font-bold mb-2" }, "The Measurement Triangle"),
          React.createElement("p", { className: "text-sm sm:text-base", style: { color: DS.text.secondary } }, "No single method solves attribution. The industry standard is a triangulated system where each layer compensates for the others' weaknesses."),
        ),

        // Triangle visualization
        React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" },
          React.createElement(Card, null,
            React.createElement("div", { className: "text-xs font-bold uppercase tracking-wider mb-2", style: { color: DS.warning } }, "Layer 1 · Platform Signals"),
            React.createElement("div", { className: "text-sm font-semibold mb-1" }, "Direction"),
            React.createElement("div", { className: "text-xs leading-relaxed", style: { color: DS.text.secondary } },
              "Google/Meta/TikTok reported data. Fast but biased — each platform overclaims. Use as hypothesis generator only."),
            React.createElement("div", { className: "text-xs mt-2 italic", style: { color: DS.text.tertiary } }, "Cadence: Real-time"),
          ),
          React.createElement(Card, null,
            React.createElement("div", { className: "text-xs font-bold uppercase tracking-wider mb-2", style: { color: DS.accent } }, "Layer 2 · Statistical Models"),
            React.createElement("div", { className: "text-sm font-semibold mb-1" }, "Allocation"),
            React.createElement("div", { className: "text-xs leading-relaxed", style: { color: DS.text.secondary } },
              "Markov, Shapley, MMM on first-party data. Better but model-dependent. Use for tactical budget decisions."),
            React.createElement("div", { className: "text-xs mt-2 italic", style: { color: DS.text.tertiary } }, "Cadence: Weekly/Monthly"),
            React.createElement("div", { className: "text-xs mt-1", style: { color: DS.accent } }, "→ See also: ", React.createElement("a", { href: "https://freena22.github.io/marketing-mix-model/", target: "_blank", className: "underline" }, "MMM Project")),
          ),
          React.createElement(Card, null,
            React.createElement("div", { className: "text-xs font-bold uppercase tracking-wider mb-2", style: { color: DS.positive } }, "Layer 3 · Experiments"),
            React.createElement("div", { className: "text-sm font-semibold mb-1" }, "Truth"),
            React.createElement("div", { className: "text-xs leading-relaxed", style: { color: DS.text.secondary } },
              "Geo-lift, holdout, DiD, A/B tests. Slow but causal. Use to validate L1 + L2 and calibrate models."),
            React.createElement("div", { className: "text-xs mt-2 italic", style: { color: DS.text.tertiary } }, "Cadence: Quarterly"),
          ),
        ),

        React.createElement(Callout, { type: "info", title: "How Layers Interact" },
          React.createElement("p", null, React.createElement("strong", null, "L1 generates the hypothesis"), " (Google says Search ROAS dropped). "),
          React.createElement("strong", null, "L2 quantifies the signal"), " (Shapley confirms Search is overcredited). ",
          React.createElement("strong", null, "L3 proves the truth"), " (holdout test shows 60% of 'Search conversions' happen without Search). ",
          "Each cycle makes your models more accurate.",
        ),

        React.createElement(Section, { title: "Decision Matrix", sub: "What measurement method for what business question" },
          React.createElement(Card, null,
            React.createElement("div", { className: "overflow-x-auto" },
              React.createElement("table", { className: "w-full text-xs sm:text-sm", style: { minWidth: 580 } },
                React.createElement("thead", null,
                  React.createElement("tr", { style: { borderBottom: "1px solid " + DS.border } },
                    ["Scenario", "Method", "Layer", "Timeline", "Precision"].map(function(h) {
                      return React.createElement("th", { key: h, className: "text-left py-2 px-2 font-semibold text-xs uppercase", style: { color: DS.text.tertiary } }, h);
                    }),
                  ),
                ),
                React.createElement("tbody", null,
                  DECISION_MATRIX.map(function(row, i) {
                    var layerColor = row.layer.indexOf("L3") >= 0 ? DS.positive : row.layer.indexOf("L2") >= 0 ? DS.accent : DS.warning;
                    return React.createElement("tr", { key: i, style: { borderBottom: "1px solid " + DS.borderLight } },
                      React.createElement("td", { className: "py-2.5 px-2 font-medium" }, row.scenario),
                      React.createElement("td", { className: "py-2.5 px-2", style: { color: DS.text.secondary } }, row.method),
                      React.createElement("td", { className: "py-2.5 px-2" },
                        React.createElement("span", { className: "text-[10px] font-bold px-1.5 py-0.5 rounded", style: { background: layerColor + "15", color: layerColor } }, row.layer),
                      ),
                      React.createElement("td", { className: "py-2.5 px-2", style: { color: DS.text.secondary } }, row.timeframe),
                      React.createElement("td", { className: "py-2.5 px-2", style: { color: DS.text.secondary } }, row.precision),
                    );
                  }),
                ),
              ),
            ),
          ),
        ),

        React.createElement(Callout, { type: "warning", title: "What About Brand / Upper Funnel?" },
          "MTA cannot measure brand. MMM captures it indirectly via long-term effects. For direct brand measurement, you need: ",
          React.createElement("strong", null, "Brand Lift Studies"), " (exposed vs. control surveys for awareness/consideration) and ",
          React.createElement("strong", null, "attention metrics"), " as leading indicators. These complement the Triangle but don't replace it.",
        ),

        React.createElement(Section, { title: "If We Had This Framework 12 Months Ago" },
          React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4" },
            React.createElement(KPI, { label: "Budget Saved", value: "$1.8M", sub: "Avoided misallocation from wrong attribution", color: DS.positive }),
            React.createElement(KPI, { label: "TV Lift (Validated)", value: "+13%", sub: "$6.3M annual incremental — now proven", color: DS.accent }),
            React.createElement(KPI, { label: "Decision Speed", value: "3x", sub: "From quarterly guessing to weekly calibration", color: DS.highlight }),
          ),
        ),
      ),
    ),

    // Footer
    React.createElement("footer", {
      className: "border-t py-4 mt-8",
      style: { borderColor: DS.border },
    },
      React.createElement("div", { className: "max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs", style: { color: DS.text.tertiary } },
        React.createElement("span", null, "Part of the ", React.createElement("a", { href: "https://freena22.github.io/marketing-mix-model/", target: "_blank", className: "underline", style: { color: DS.accent } }, "Measurement Triangle"), " · Data simulated for demonstration"),
        React.createElement("span", null, "Built by ", React.createElement("a", { href: "https://linkedin.com/in/freena", target: "_blank", className: "underline", style: { color: DS.accent } }, "Freena Wang")),
      ),
    ),
  );
}

var root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
