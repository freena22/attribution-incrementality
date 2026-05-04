// ─── Attribution & Incrementality Dashboard ──────────────────────────────────
// NexaShop D2C E-commerce: Multi-Touch Attribution + Causal Incrementality
// Visual: Report-style, navy + indigo + amber, left sidebar nav

const { useState, useMemo } = React;
const {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ComposedChart,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ReferenceLine,
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

// ─── Data (embedded from model outputs) ──────────────────────────────────────
const ATTRIBUTION = [
  { channel: "Paid Search", role: "Converter", spend: 540000, lastTouch: 44.8, firstTouch: 15.2, linear: 22.1, markov: 52.7, shapley: 18.7, lastTouchRev: 105800, markovRev: 124500, shapleyRev: 44200 },
  { channel: "Paid Social", role: "Awareness", spend: 450000, lastTouch: 2.1, firstTouch: 28.4, linear: 18.5, markov: 7.0, shapley: 21.3, lastTouchRev: 4960, markovRev: 16540, shapleyRev: 50300 },
  { channel: "Display", role: "Awareness", spend: 240000, lastTouch: 0.6, firstTouch: 32.1, linear: 15.8, markov: 4.8, shapley: 19.7, lastTouchRev: 1420, markovRev: 11340, shapleyRev: 46500 },
  { channel: "Email", role: "Nurture", spend: 75000, lastTouch: 14.7, firstTouch: 5.8, linear: 13.2, markov: 0.0, shapley: 8.7, lastTouchRev: 34700, markovRev: 0, shapleyRev: 20600 },
  { channel: "Organic Search", role: "Converter", spend: 0, lastTouch: 27.7, firstTouch: 10.5, linear: 17.9, markov: 35.5, shapley: 21.1, lastTouchRev: 65400, markovRev: 83800, shapleyRev: 49800 },
  { channel: "Referral", role: "Consideration", spend: 120000, lastTouch: 10.1, firstTouch: 8.0, linear: 12.5, markov: 0.0, shapley: 10.5, lastTouchRev: 23870, markovRev: 0, shapleyRev: 24800 },
];

const INCREMENTALITY = {
  did: { lift: 14.6, pValue: 0.0005, daily: 3769, total30: 565398, ciLow: 1654, ciHigh: 5885, tStat: 3.492 },
  synthetic: { lift: 12.0, daily: 3283, total30: 492380, rmspe: 1.0, placeboP: 0.000, treatRatio: 13.7 },
  trueLift: 14.0,
};

// Time series for SC chart (90 days)
const SC_SERIES = (() => {
  const treat = [25520,25012,25440,26140,27580,29140,27680,24780,24320,24480,25460,26120,27840,29500,27960,25040,24480,24600,25780,26440,28200,29840,28380,25340,24780,25000,26120,26760,28580,30220,28600,25480,25040,25160,26280,27020,28900,30580,29040,25880,25340,25500,26620,27340,29280,30940,29420,26220,25680,25820,27020,27700,29620,31320,29780,26560,25980,26120,27380,28040,31120,31560,32440,33200,34480,35020,33780,31680,31020,31200,32060,32740,33960,34640,33380,31220,30560,30740,31620,32400,33580,34240,32940,30860,30240,30400,31240,32020,33200,33880];
  const synth = [25480,25070,25380,26080,27520,29080,27600,24820,24380,24540,25400,26060,27780,29440,27920,25000,24520,24640,25720,26380,28140,29780,28300,25280,24720,24940,26060,26680,28500,30140,28540,25420,24980,25080,26220,26960,28820,30500,28960,25800,25260,25420,26540,27260,29180,30860,29340,26140,25580,25740,26920,27620,29540,31220,29680,26480,25880,26020,27280,27940,27000,27180,27440,27780,28120,28300,27800,27080,26880,26960,27220,27520,27780,28060,27560,26840,26620,26720,26980,27300,27540,27820,27320,26580,26380,26460,26720,27000,27260,27540];
  return treat.map((t, i) => ({
    day: i + 1,
    treatment: t,
    synthetic: synth[i],
    gap: t - synth[i],
    period: i < 60 ? "Pre" : "Post",
  }));
})();

// Placebo gaps for visualization
const PLACEBO_RATIOS = [0.92, 1.05, 0.88, 1.15, 0.95, 1.02, 0.78, 1.08, 0.97, 1.12, 0.85, 1.03, 0.91, 0.99, 1.06];

// Channel journey funnel
const FUNNEL_DATA = [
  { stage: "Impressions", value: 2800000 },
  { stage: "Clicks", value: 168000 },
  { stage: "Sessions", value: 142000 },
  { stage: "Add to Cart", value: 28400 },
  { stage: "Conversions", value: 2579 },
];

// ─── Components ──────────────────────────────────────────────────────────────
function KPI({ label, value, sub, color }) {
  return React.createElement("div", {
    className: "rounded-lg border p-4 sm:p-5",
    style: { background: T.surface, borderColor: T.border },
  },
    React.createElement("div", {
      className: "text-xs font-semibold uppercase tracking-wider mb-1.5",
      style: { color: T.textMuted },
    }, label),
    React.createElement("div", {
      className: "text-2xl sm:text-3xl font-bold",
      style: { color: color || T.text },
    }, value),
    sub && React.createElement("div", {
      className: "text-xs sm:text-sm mt-1",
      style: { color: T.textDim },
    }, sub),
  );
}

function Section({ title, sub, children }) {
  return React.createElement("div", { className: "mb-8 sm:mb-10" },
    React.createElement("h2", {
      className: "text-xl sm:text-2xl font-bold mb-1",
      style: { color: T.text },
    }, title),
    sub && React.createElement("p", {
      className: "text-sm mb-4",
      style: { color: T.textSec },
    }, sub),
    children,
  );
}

function Card({ children, className = "" }) {
  return React.createElement("div", {
    className: `rounded-lg border p-4 sm:p-5 ${className}`,
    style: { background: T.surface, borderColor: T.border },
  }, children);
}

function Insight({ color, title, children }) {
  return React.createElement("div", {
    className: "rounded-lg p-4 sm:p-5 border mb-4",
    style: { background: `${color}08`, borderColor: `${color}25` },
  },
    React.createElement("div", {
      className: "text-sm font-semibold uppercase tracking-wider mb-2",
      style: { color },
    }, title),
    React.createElement("div", {
      className: "text-sm leading-relaxed",
      style: { color: T.text },
    }, children),
  );
}

// ─── Attribution Comparison Chart ────────────────────────────────────────────
function AttributionChart() {
  const data = ATTRIBUTION.map(ch => ({
    channel: ch.channel.replace("Organic ", "Org. "),
    "Last-Touch": ch.lastTouch,
    "First-Touch": ch.firstTouch,
    "Markov": ch.markov,
    "Shapley": ch.shapley,
  }));

  return React.createElement(ResponsiveContainer, { width: "100%", height: 320 },
    React.createElement(BarChart, { data, margin: { top: 10, right: 10, left: 0, bottom: 5 } },
      React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: T.border }),
      React.createElement(XAxis, { dataKey: "channel", tick: { fontSize: 11, fill: T.textMuted }, interval: 0, angle: -15, textAnchor: "end", height: 50 }),
      React.createElement(YAxis, { tick: { fontSize: 11, fill: T.textMuted }, tickFormatter: v => `${v}%` }),
      React.createElement(Tooltip, {
        contentStyle: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 },
        formatter: (v, name) => [`${v.toFixed(1)}%`, name],
      }),
      React.createElement(Legend, { wrapperStyle: { fontSize: 11 } }),
      React.createElement(Bar, { dataKey: "Last-Touch", fill: T.textMuted, radius: [2, 2, 0, 0], barSize: 14 }),
      React.createElement(Bar, { dataKey: "First-Touch", fill: T.violet, radius: [2, 2, 0, 0], barSize: 14 }),
      React.createElement(Bar, { dataKey: "Markov", fill: T.indigo, radius: [2, 2, 0, 0], barSize: 14 }),
      React.createElement(Bar, { dataKey: "Shapley", fill: T.amber, radius: [2, 2, 0, 0], barSize: 14 }),
    ),
  );
}

// ─── Synthetic Control Chart ─────────────────────────────────────────────────
function SyntheticControlChart() {
  return React.createElement(ResponsiveContainer, { width: "100%", height: 300 },
    React.createElement(ComposedChart, { data: SC_SERIES, margin: { top: 10, right: 10, left: 0, bottom: 5 } },
      React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: T.border }),
      React.createElement(XAxis, { dataKey: "day", tick: { fontSize: 10, fill: T.textMuted }, tickFormatter: d => d % 10 === 0 ? `D${d}` : "" }),
      React.createElement(YAxis, { tick: { fontSize: 10, fill: T.textMuted }, tickFormatter: v => `$${(v/1000).toFixed(0)}K` }),
      React.createElement(Tooltip, {
        contentStyle: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 },
        formatter: (v, name) => [`$${v.toLocaleString()}`, name],
      }),
      React.createElement(ReferenceLine, { x: 60, stroke: T.amber, strokeDasharray: "4 4", label: { value: "TV Launch", fill: T.amber, fontSize: 10, position: "top" } }),
      React.createElement(Line, { type: "monotone", dataKey: "treatment", name: "Treatment (Actual)", stroke: T.indigo, strokeWidth: 2, dot: false }),
      React.createElement(Line, { type: "monotone", dataKey: "synthetic", name: "Synthetic Control", stroke: T.textMuted, strokeWidth: 2, strokeDasharray: "4 4", dot: false }),
      React.createElement(Legend, { wrapperStyle: { fontSize: 11 } }),
    ),
  );
}

// ─── Gap (Treatment Effect) Chart ────────────────────────────────────────────
function GapChart() {
  return React.createElement(ResponsiveContainer, { width: "100%", height: 180 },
    React.createElement(AreaChart, { data: SC_SERIES, margin: { top: 10, right: 10, left: 0, bottom: 5 } },
      React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: T.border }),
      React.createElement(XAxis, { dataKey: "day", tick: { fontSize: 10, fill: T.textMuted }, tickFormatter: d => d % 15 === 0 ? `D${d}` : "" }),
      React.createElement(YAxis, { tick: { fontSize: 10, fill: T.textMuted }, tickFormatter: v => `$${(v/1000).toFixed(1)}K` }),
      React.createElement(ReferenceLine, { x: 60, stroke: T.amber, strokeDasharray: "4 4" }),
      React.createElement(ReferenceLine, { y: 0, stroke: T.textDim }),
      React.createElement(Tooltip, {
        contentStyle: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 },
        formatter: (v) => [`$${v.toLocaleString()}`, "Gap"],
      }),
      React.createElement(Area, { type: "monotone", dataKey: "gap", fill: `${T.indigo}30`, stroke: T.indigo, strokeWidth: 1.5 }),
    ),
  );
}

// ─── Credit Shift Visualization ──────────────────────────────────────────────
function CreditShift() {
  const data = ATTRIBUTION.map(ch => ({
    channel: ch.channel,
    shift: (ch.shapley - ch.lastTouch).toFixed(1),
    direction: ch.shapley > ch.lastTouch ? "Undervalued" : "Overvalued",
    color: ch.shapley > ch.lastTouch ? T.green : T.rose,
  }));

  return React.createElement("div", { className: "space-y-3" },
    data.map((d, i) => React.createElement("div", { key: i, className: "flex items-center gap-3" },
      React.createElement("div", {
        className: "w-28 sm:w-32 text-xs sm:text-sm font-medium truncate",
        style: { color: T.text },
      }, d.channel),
      React.createElement("div", { className: "flex-1 relative h-6 rounded", style: { background: T.surfaceAlt } },
        React.createElement("div", {
          className: "absolute top-0 h-full rounded",
          style: {
            background: `${d.color}40`,
            left: d.shift > 0 ? "50%" : `${50 + parseFloat(d.shift)}%`,
            width: `${Math.abs(parseFloat(d.shift))}%`,
            maxWidth: "50%",
          },
        }),
        React.createElement("div", {
          className: "absolute top-0 left-1/2 h-full w-px",
          style: { background: T.textDim },
        }),
      ),
      React.createElement("div", {
        className: "w-16 text-right text-xs sm:text-sm font-bold",
        style: { color: d.color },
      }, `${d.shift > 0 ? "+" : ""}${d.shift}pp`),
    )),
  );
}

// ─── ROAS Comparison ─────────────────────────────────────────────────────────
function ROASTable() {
  const paid = ATTRIBUTION.filter(ch => ch.spend > 0);
  return React.createElement("div", { className: "overflow-x-auto" },
    React.createElement("table", { className: "w-full text-sm", style: { minWidth: 500 } },
      React.createElement("thead", null,
        React.createElement("tr", { style: { borderBottom: `1px solid ${T.border}` } },
          ["Channel", "Spend (Q)", "Last-Touch ROAS", "Shapley ROAS", "Delta"].map(h =>
            React.createElement("th", {
              key: h,
              className: "text-left py-2 px-2 font-semibold text-xs uppercase tracking-wider",
              style: { color: T.textMuted },
            }, h)
          ),
        ),
      ),
      React.createElement("tbody", null,
        paid.map((ch, i) => {
          const ltRoas = (ch.lastTouchRev / ch.spend * 4).toFixed(2);
          const shRoas = (ch.shapleyRev / ch.spend * 4).toFixed(2);
          const delta = (shRoas - ltRoas).toFixed(2);
          return React.createElement("tr", {
            key: i,
            style: { borderBottom: `1px solid ${T.border}` },
          },
            React.createElement("td", { className: "py-2.5 px-2 font-medium", style: { color: T.text } }, ch.channel),
            React.createElement("td", { className: "py-2.5 px-2", style: { color: T.textSec } }, `$${(ch.spend/1000).toFixed(0)}K`),
            React.createElement("td", { className: "py-2.5 px-2", style: { color: T.textSec } }, `${ltRoas}x`),
            React.createElement("td", { className: "py-2.5 px-2 font-semibold", style: { color: T.indigo } }, `${shRoas}x`),
            React.createElement("td", {
              className: "py-2.5 px-2 font-semibold",
              style: { color: parseFloat(delta) > 0 ? T.green : T.rose },
            }, `${delta > 0 ? "+" : ""}${delta}x`),
          );
        }),
      ),
    ),
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
function App() {
  const [page, setPage] = useState("executive");
  const pages = [
    { id: "executive", label: "Executive Brief", icon: "◈" },
    { id: "attribution", label: "Attribution", icon: "◉" },
    { id: "incrementality", label: "Incrementality", icon: "△" },
    { id: "recommendations", label: "Actions", icon: "→" },
  ];

  return React.createElement("div", {
    className: "min-h-screen flex flex-col sm:flex-row",
    style: { background: T.bg, color: T.text },
  },
    // ─── Sidebar / Top nav ───
    React.createElement("nav", {
      className: "sm:w-56 sm:min-h-screen border-b sm:border-b-0 sm:border-r flex-shrink-0",
      style: { background: T.sidebar, borderColor: T.border },
    },
      React.createElement("div", { className: "p-4 sm:p-5" },
        React.createElement("div", { className: "flex items-center gap-2 mb-1" },
          React.createElement("div", { className: "w-2 h-2 rounded-full", style: { background: T.indigo } }),
          React.createElement("span", { className: "text-[10px] font-semibold uppercase tracking-widest", style: { color: T.textMuted } }, "NexaShop"),
        ),
        React.createElement("h1", { className: "text-base sm:text-lg font-bold hidden sm:block", style: { color: T.text } }, "Attribution & Incrementality"),
      ),
      React.createElement("div", { className: "flex sm:flex-col gap-1 px-3 pb-3 sm:px-3 overflow-x-auto sm:overflow-visible", style: { WebkitOverflowScrolling: "touch" } },
        pages.map(p => React.createElement("button", {
          key: p.id,
          onClick: () => setPage(p.id),
          className: `flex items-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${page === p.id ? "" : "hover:opacity-80"}`,
          style: {
            background: page === p.id ? `${T.indigo}20` : "transparent",
            color: page === p.id ? T.indigo : T.textMuted,
            borderLeft: page === p.id ? `2px solid ${T.indigo}` : "2px solid transparent",
          },
        }, `${p.icon} ${p.label}`)),
      ),
    ),

    // ─── Main content ───
    React.createElement("main", { className: "flex-1 p-4 sm:p-8 overflow-x-hidden" },

      // ═══ Executive Brief ═══
      page === "executive" && React.createElement("div", null,
        React.createElement("div", { className: "mb-6" },
          React.createElement("h1", { className: "text-2xl sm:text-3xl font-bold mb-2" }, "The Attribution Problem"),
          React.createElement("p", { className: "text-sm sm:text-base leading-relaxed", style: { color: T.textSec } },
            "NexaShop spends $5M/year on marketing across 6 channels. Under last-click attribution, Paid Search receives 45% of conversion credit — but is it actually driving those conversions, or merely capturing demand created elsewhere?"
          ),
        ),

        React.createElement(Insight, { color: T.amber, title: "Why This Matters" },
          "Last-click attribution systematically over-credits bottom-funnel channels (Search, Email) and under-credits top-funnel (Display, Social). ",
          "This leads to budget misallocation: awareness channels get starved, pipeline dries up 3–6 months later, and teams blame 'market conditions' for declining growth. ",
          React.createElement("strong", null, "The real problem is measurement, not marketing."),
        ),

        React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6" },
          React.createElement(KPI, { label: "Annual Spend", value: "$5.0M", sub: "Across 6 channels" }),
          React.createElement(KPI, { label: "Conversions", value: "2,579", sub: "Q4 2024 (90 days)" }),
          React.createElement(KPI, { label: "Revenue", value: "$236K", sub: "Avg order $85" }),
          React.createElement(KPI, { label: "Blended ROAS", value: "0.94x", sub: "Below breakeven", color: T.rose }),
        ),

        Section({ title: "Key Finding: Credit Reallocation", sub: "How attribution credit shifts when we move from last-click to data-driven models" },
          React.createElement(Card, null, React.createElement(CreditShift)),
        ),

        React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mt-6" },
          React.createElement(Insight, { color: T.green, title: "Undervalued Channels" },
            React.createElement("strong", null, "Paid Social (+19pp)"), " and ", React.createElement("strong", null, "Display (+19pp)"),
            " are creating demand that Search captures. Shapley analysis reveals these awareness channels drive 41% of conversion value — vs. 3% under last-click.",
          ),
          React.createElement(Insight, { color: T.rose, title: "Overvalued Channels" },
            React.createElement("strong", null, "Paid Search (-26pp)"), " is claiming credit for conversions initiated by upstream touchpoints. ",
            "Its true incremental value is still significant (19% Shapley) but far less than the 45% last-click suggests.",
          ),
        ),

        Section({ title: "TV Campaign Incrementality", sub: "Geo-lift experiment across 5 treatment DMAs (30-day campaign)" },
          React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3" },
            React.createElement(KPI, { label: "DiD Lift", value: "14.6%", sub: "p = 0.0005", color: T.indigo }),
            React.createElement(KPI, { label: "Synthetic Control", value: "12.0%", sub: "Placebo p < 0.001", color: T.teal }),
            React.createElement(KPI, { label: "30-Day Incremental", value: "$529K", sub: "Avg of both methods", color: T.amber }),
          ),
        ),
      ),

      // ═══ Attribution Tab ═══
      page === "attribution" && React.createElement("div", null,
        React.createElement("div", { className: "mb-6" },
          React.createElement("h1", { className: "text-2xl sm:text-3xl font-bold mb-2" }, "Multi-Touch Attribution Models"),
          React.createElement("p", { className: "text-sm sm:text-base leading-relaxed", style: { color: T.textSec } },
            "Five attribution models applied to 50,000 customer journeys (181K touchpoints). Data-driven models (Markov Chain, Shapley Value) reveal the true contribution of each channel by measuring counterfactual impact."
          ),
        ),

        React.createElement(Insight, { color: T.indigo, title: "Methodology" },
          React.createElement("strong", null, "Markov Chain"), " — Models journeys as state transitions. Measures each channel's 'removal effect': how much does overall conversion probability drop if this channel disappears? ",
          React.createElement("br", null),
          React.createElement("strong", null, "Shapley Value"), " — Game theory approach. Evaluates every possible ordering of channels and computes each one's marginal contribution. Computationally expensive but theoretically fair.",
        ),

        Section({ title: "Credit Distribution by Model", sub: "% of total conversions attributed to each channel" },
          React.createElement(Card, null, React.createElement(AttributionChart)),
        ),

        Section({ title: "ROAS Under Different Models", sub: "How return on ad spend changes when attribution changes" },
          React.createElement(Card, null, React.createElement(ROASTable)),
        ),

        React.createElement(Insight, { color: T.amber, title: "So What?" },
          "Under last-click, Paid Social shows 0.04x ROAS — a clear 'cut' signal. But Shapley reveals its true ROAS is 0.45x. ",
          "Still below breakeven, but now the question changes from 'should we cut Social?' to 'how do we optimize Social creative to push ROAS above 1x?'. ",
          React.createElement("strong", null, "Wrong measurement → wrong decisions → wrong outcomes."),
        ),

        Section({ title: "Journey Patterns" },
          React.createElement(Card, null,
            React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4 text-center" },
              React.createElement("div", null,
                React.createElement("div", { className: "text-2xl font-bold", style: { color: T.indigo } }, "4.2"),
                React.createElement("div", { className: "text-xs mt-1", style: { color: T.textMuted } }, "Avg touchpoints per conversion"),
              ),
              React.createElement("div", null,
                React.createElement("div", { className: "text-2xl font-bold", style: { color: T.amber } }, "73%"),
                React.createElement("div", { className: "text-xs mt-1", style: { color: T.textMuted } }, "Multi-channel journeys"),
              ),
              React.createElement("div", null,
                React.createElement("div", { className: "text-2xl font-bold", style: { color: T.teal } }, "8.2 days"),
                React.createElement("div", { className: "text-xs mt-1", style: { color: T.textMuted } }, "Avg consideration window"),
              ),
            ),
          ),
        ),
      ),

      // ═══ Incrementality Tab ═══
      page === "incrementality" && React.createElement("div", null,
        React.createElement("div", { className: "mb-6" },
          React.createElement("h1", { className: "text-2xl sm:text-3xl font-bold mb-2" }, "Incrementality Testing"),
          React.createElement("p", { className: "text-sm sm:text-base leading-relaxed", style: { color: T.textSec } },
            "Attribution tells you who gets credit. Incrementality tells you what actually works. We ran a geo-lift experiment: TV campaign in 5 DMAs (treatment) vs. 15 DMAs (control) over 30 days."
          ),
        ),

        React.createElement(Insight, { color: T.teal, title: "Why Geo-Lift?" },
          "User-level A/B tests can't measure brand/TV impact (everyone in a market sees the ad). Geo-lift solves this by comparing entire markets. ",
          "We use two methods — Difference-in-Differences (assumes parallel trends) and Synthetic Control (builds a data-driven counterfactual) — and triangulate results.",
        ),

        React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6" },
          React.createElement(Card, null,
            React.createElement("div", { className: "text-xs font-semibold uppercase tracking-wider mb-3", style: { color: T.textMuted } }, "Difference-in-Differences"),
            React.createElement("div", { className: "text-3xl font-bold mb-1", style: { color: T.indigo } }, `+${INCREMENTALITY.did.lift}%`),
            React.createElement("div", { className: "text-sm mb-3", style: { color: T.textSec } }, `$${INCREMENTALITY.did.total30.toLocaleString()} incremental (30 days)`),
            React.createElement("div", { className: "space-y-1 text-xs", style: { color: T.textMuted } },
              React.createElement("div", null, `t-stat: ${INCREMENTALITY.did.tStat} · p-value: ${INCREMENTALITY.did.pValue}`),
              React.createElement("div", null, `95% CI: [$${INCREMENTALITY.did.ciLow.toLocaleString()}, $${INCREMENTALITY.did.ciHigh.toLocaleString()}] /day`),
            ),
          ),
          React.createElement(Card, null,
            React.createElement("div", { className: "text-xs font-semibold uppercase tracking-wider mb-3", style: { color: T.textMuted } }, "Synthetic Control"),
            React.createElement("div", { className: "text-3xl font-bold mb-1", style: { color: T.teal } }, `+${INCREMENTALITY.synthetic.lift}%`),
            React.createElement("div", { className: "text-sm mb-3", style: { color: T.textSec } }, `$${INCREMENTALITY.synthetic.total30.toLocaleString()} incremental (30 days)`),
            React.createElement("div", { className: "space-y-1 text-xs", style: { color: T.textMuted } },
              React.createElement("div", null, `Pre-period RMSPE: ${INCREMENTALITY.synthetic.rmspe}% (excellent fit)`),
              React.createElement("div", null, `Placebo p-value: <0.001 · Ratio: ${INCREMENTALITY.synthetic.treatRatio}x`),
            ),
          ),
        ),

        Section({ title: "Treatment vs. Synthetic Control", sub: "Avg daily revenue per treatment DMA. Dashed = counterfactual (what would have happened without TV)." },
          React.createElement(Card, null, React.createElement(SyntheticControlChart)),
        ),

        Section({ title: "Treatment Effect (Gap)", sub: "Difference between actual and synthetic. Pre-period gap should be ~0 (validates the model)." },
          React.createElement(Card, null, React.createElement(GapChart)),
        ),

        React.createElement(Insight, { color: T.amber, title: "Triangulation" },
          "Both methods converge on a 12–15% lift range. DiD gives a slightly higher estimate (14.6%) because it doesn't perfectly control for differential trends. ",
          "Synthetic Control's 12.0% is more conservative and arguably more reliable given the excellent pre-period fit (1.0% RMSPE). ",
          React.createElement("strong", null, "Recommendation: use the midpoint (13.3%) for planning, with the SC estimate as the floor."),
        ),
      ),

      // ═══ Recommendations Tab ═══
      page === "recommendations" && React.createElement("div", null,
        React.createElement("div", { className: "mb-6" },
          React.createElement("h1", { className: "text-2xl sm:text-3xl font-bold mb-2" }, "Strategic Recommendations"),
          React.createElement("p", { className: "text-sm sm:text-base leading-relaxed", style: { color: T.textSec } },
            "Based on attribution reallocation and incrementality evidence, here's the action plan for Q1 2025."
          ),
        ),

        React.createElement(Insight, { color: T.indigo, title: "Action 1: Rebalance Channel Budget" },
          React.createElement("div", { className: "space-y-2" },
            React.createElement("p", null, "Shapley attribution reveals Paid Social and Display are undervalued by 19pp each. Reallocate 20% of Paid Search budget ($108K/Q) to these channels:"),
            React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3" },
              React.createElement("div", { className: "rounded p-3", style: { background: T.surfaceAlt } },
                React.createElement("div", { className: "text-xs font-semibold mb-1", style: { color: T.rose } }, "Reduce"),
                React.createElement("div", { className: "text-sm", style: { color: T.text } }, "Paid Search: $540K → $432K (-20%)"),
              ),
              React.createElement("div", { className: "rounded p-3", style: { background: T.surfaceAlt } },
                React.createElement("div", { className: "text-xs font-semibold mb-1", style: { color: T.green } }, "Increase"),
                React.createElement("div", { className: "text-sm", style: { color: T.text } }, "Paid Social: $450K → $504K (+12%)"),
                React.createElement("div", { className: "text-sm", style: { color: T.text } }, "Display: $240K → $294K (+22%)"),
              ),
            ),
            React.createElement("p", { className: "text-xs mt-2", style: { color: T.textMuted } }, "Expected impact: +8–12% total conversions at same spend level based on Shapley-optimal allocation."),
          ),
        ),

        React.createElement(Insight, { color: T.teal, title: "Action 2: Scale TV Campaign Nationally" },
          React.createElement("div", { className: "space-y-2" },
            React.createElement("p", null, "Geo-lift confirmed 12–15% incremental lift in treatment markets. At $2.1M TV spend across 5 DMAs:"),
            React.createElement("div", { className: "rounded p-3 mt-2", style: { background: T.surfaceAlt } },
              React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 text-center" },
                React.createElement("div", null,
                  React.createElement("div", { className: "text-lg font-bold", style: { color: T.teal } }, "$6.3M"),
                  React.createElement("div", { className: "text-xs", style: { color: T.textMuted } }, "Annual incremental (5 DMAs)"),
                ),
                React.createElement("div", null,
                  React.createElement("div", { className: "text-lg font-bold", style: { color: T.amber } }, "3.0x"),
                  React.createElement("div", { className: "text-xs", style: { color: T.textMuted } }, "iROAS"),
                ),
                React.createElement("div", null,
                  React.createElement("div", { className: "text-lg font-bold", style: { color: T.indigo } }, "$18.9M"),
                  React.createElement("div", { className: "text-xs", style: { color: T.textMuted } }, "Est. national (15 DMAs)"),
                ),
                React.createElement("div", null,
                  React.createElement("div", { className: "text-lg font-bold", style: { color: T.green } }, "2.4x"),
                  React.createElement("div", { className: "text-xs", style: { color: T.textMuted } }, "Est. national iROAS"),
                ),
              ),
            ),
            React.createElement("p", { className: "text-xs mt-2", style: { color: T.textMuted } }, "Recommendation: Expand to 10 additional DMAs in Q2. Hold back 5 as ongoing control for measurement."),
          ),
        ),

        React.createElement(Insight, { color: T.amber, title: "Action 3: Fix Measurement Infrastructure" },
          React.createElement("div", { className: "space-y-2" },
            React.createElement("p", null, "The 26pp gap between last-click and Shapley for Paid Search means the team has been making decisions based on fundamentally wrong data. Fixes needed:"),
            React.createElement("ul", { className: "list-none space-y-1.5 mt-2" },
              React.createElement("li", null, "▸ ", React.createElement("strong", null, "Replace last-click"), " with Markov Chain as the primary attribution model in BI dashboards"),
              React.createElement("li", null, "▸ ", React.createElement("strong", null, "Implement holdout-based incrementality"), " for each channel quarterly (dark traffic tests)"),
              React.createElement("li", null, "▸ ", React.createElement("strong", null, "Server-side tracking"), " to capture cross-device journeys lost to cookie deprecation"),
              React.createElement("li", null, "▸ ", React.createElement("strong", null, "Unified measurement framework"), ": MMM (long-term) + MTA (tactical) + Incrementality (validation)"),
            ),
          ),
        ),

        Section({ title: "Projected Impact" },
          React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4" },
            React.createElement(Card, null,
              React.createElement("div", { className: "text-center" },
                React.createElement("div", { className: "text-3xl font-bold", style: { color: T.green } }, "+$2.8M"),
                React.createElement("div", { className: "text-xs mt-1", style: { color: T.textMuted } }, "Annual revenue from reallocation"),
              ),
            ),
            React.createElement(Card, null,
              React.createElement("div", { className: "text-center" },
                React.createElement("div", { className: "text-3xl font-bold", style: { color: T.indigo } }, "+$18.9M"),
                React.createElement("div", { className: "text-xs mt-1", style: { color: T.textMuted } }, "Annual TV contribution (national)"),
              ),
            ),
            React.createElement(Card, null,
              React.createElement("div", { className: "text-center" },
                React.createElement("div", { className: "text-3xl font-bold", style: { color: T.amber } }, "1.4x → 2.1x"),
                React.createElement("div", { className: "text-xs mt-1", style: { color: T.textMuted } }, "Blended ROAS improvement"),
              ),
            ),
          ),
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

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
