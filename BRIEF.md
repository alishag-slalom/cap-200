# Operations Dashboard

## What this is
A single-page internal operations dashboard for the VP of Operations and regional leadership at FastForward Logistics — a mid-size freight and supply chain company. 

## Problem it solves
FastForward's VP of Operations and regional leads previously pieced together shipment, on-time, and exception data from separate carrier reports and spreadsheets — there was no single view of "how are we doing, and where." Decisions like reallocating carrier capacity, escalating a struggling region, or reporting up to executives happened on a lag because someone had to manually assemble the numbers first.
– Primary user: VP of Operations — needs a fast, trustworthy read on whether the network is hitting SLA (95% on-time) and where to intervene.
– Secondary users: Regional leads — need to see their region's standing against target and against peers, without digging through raw data.
– Core question the dashboard answers: "Are we on target, and if not, where and why?" — surfaced through KPI trend direction, regional status dots, and the exceptions table as the "why."
– A closely related question: "Is this a one-off or a pattern?" — surfaced through the exception type breakdown and the year-over-year overlay, so the VP isn't just reacting to this month's numbers in isolation.
– A forward-looking question: "Are we going to miss target this month, before the month is even over?" — surfaced through the "at risk this month" projection, so intervention can happen mid-month instead of in a retro.
– A peer question, mainly for regional leads: "How does my region actually stack up against a specific peer, not just the network average?" — surfaced through the region-vs-region comparison, which sits alongside the existing regional grid rather than replacing it.
– This is a decision-support tool, not a system of record — it doesn't support data entry or corrections, only fast comprehension.

## Data model
The dataset lives in `src/data/metrics.json` and now covers 24 months (Jan 2024–Dec 2025) across four regions (Northeast, Southeast, Central, West), to support the year-over-year overlay. Each region, each month, carries:
– `shipments` — count, trending upward with some variation across the year.
– `onTimeRate` — percentage, target 95%, fluctuates 88–98%.
– `exceptions` — count of exception **events** logged that month (a volume/trend metric — see "Two kinds of exceptions" below).
– `avgTransitDays` — float, trending down as a sign of improvement.
– `revenue` — dollar amount, loosely correlated with shipment volume.
– `byMode` — a breakdown of shipments and revenue by freight mode: Truckload (TL), LTL, and Expedited.
– `exceptionsByType` — a breakdown of that month's exception event count across the 6 exception types (weather, no-shows, damage, customs, equipment, missed connections). This is what drives the new breakdown chart — it's a count of events, same as the top-line `exceptions` field (their sum should reconcile), just split out by type rather than left as one number.

Because a month has to be genuinely "in progress" for a projection to mean anything, the dataset also marks one month — the most recent one, Dec 2025 — as partial: it carries `monthStatus: "in-progress"` (every other month is `"actual"`) plus `daysElapsed` and `daysInMonth`. Its metric values represent month-to-date totals as of that partial point, not a full month — this is what the projection logic scales up from.

A separate top-level `exceptions` array holds the actual open-exceptions log — 15 named, freight-specific incidents (weather delays, carrier no-shows, damaged freight, customs holds, equipment failures, missed connections), each with `region`, `mode`, `type`, `description`, `priority`, `status`, and `ageDays`. This log still only reflects currently-open incidents from the most recent months (Sep–Dec 2025) — the 2024 data exists solely to power monthly trend metrics and the YoY overlay, not the open-exceptions log, which stays scoped to "right now."

### Two kinds of "exceptions" — and why the numbers don't match
The monthly `exceptions` count and the exceptions log are **intentionally not the same number**, and the KPI card is labeled "Exception Events" (not "Open Exceptions") to make that honest:
– The monthly count (and its `exceptionsByType` breakdown) is a volume metric — how many exception events occurred that month, useful for spotting the winter spike, identifying which type is driving it, and comparing year-over-year trend.
– The exceptions log is a live triage queue — only the incidents still unresolved right now. Because most incidents get resolved within days to weeks, the log only has entries for the last few months (Sep–Dec 2025); older months show an empty state, which is correct, not a bug.
– Priority: **High** = SLA already breached or customer-escalated. **Medium** = at risk of breaching within 24h. **Low** = flagged but within tolerance.
– `ageDays` is measured in days since the exception was first logged, not days since the shipment was created.

### "At risk this month" projection — how it's calculated
This only applies to the one `monthStatus: "in-progress"` month, and only when that specific month is selected — never to "All", never to closed historical months (their numbers are final, a projection would be noise).
– **Count metrics** (shipments, exceptions, exceptions by type) are paced up: `projected = monthToDateValue / daysElapsed × daysInMonth`. Simple linear pace — good enough for a decision-support read, not presented as a statistical forecast.
– **Rate metrics** (on-time rate) are not paced the same way — a rate doesn't need scaling, so the projection is the month-to-date rate itself, labeled clearly as "based on the first `daysElapsed` of `daysInMonth` days" so the VP knows it's partial, not final.
– Risk level is derived by comparing the projected on-time rate to the same three thresholds as the regional status chips (≥95% On Track, 92–94.9% At Risk, <92% Behind Target) — same language, same color convention, so it reads as an extension of a pattern the VP already knows rather than a new system.
– The projection is a read, not a prediction engine — no confidence intervals, no machine learning, just transparent arithmetic the VP could reproduce by hand if they wanted to sanity-check it.

### Region-vs-region comparison — no schema change needed
Unlike the two additions above, this one needs no new fields — it's a UI feature that reads the same per-region monthly data already in `metrics.json` and renders two regions' existing values side by side. The only new "data" is the fixed region-to-icon/line-style mapping, which lives in the frontend as a small constant, not in the JSON.

## Layout (Vuetify)
– App-bar: truck icon, "FastForward Logistics — Operations Dashboard" title, a month picker, a light/dark toggle, and a logout button (visible once authenticated).
– Month picker defaults to "All Months" (full year view). Selecting a specific month filters every card, chart, and table below to that month; selecting "All" shows full-year totals/averages across all 12 months of the selected year.
– Row of 4 KPI cards: Total Shipments, On-Time Delivery, Exception Events, Avg. Transit Days. When the in-progress month is selected, each card shows a small "Projected" chip alongside the month-to-date value rather than replacing it — the VP sees both what's actually happened so far and where it's headed.
– Row of 2 charts: a stacked bar chart of monthly shipment volume by freight mode (TL/LTL/Expedited), and a line chart of on-time delivery rate over time with a dashed 95% target threshold line.
– **New: Exception type breakdown chart** — a bar chart (Pareto-ordered, highest-volume type first) of exception event counts by type over the selected period, with a toggle to switch between "by month" (stacked bars across the year, good for spotting a seasonal spike like weather in Q4) and "by type" (a single ranked bar per type, summed over the period, good for spotting a systemic issue like recurring no-shows). Sits alongside the existing two charts as a third chart in that row, or wraps to its own row on smaller screens.
– 4-up regional performance grid, one card per region. During the in-progress month, each regional card's status chip is joined by a second, visually subordinate "Projected: On Track / At Risk / Behind Target" line — the current chip stays the source of truth for "where things stand today," the projection is clearly the secondary, forward-looking read. Each card also has a small "Compare" checkbox/toggle in its corner.
– **New: Region comparison panel** — appears below the regional grid once exactly two regions are selected via their card checkboxes; collapses back to an empty prompt ("Select two regions to compare") if fewer than two are picked. Selecting a third region while two are already active swaps out the oldest selection rather than allowing three-way comparison, keeping the layout to a predictable two-column format. Contents, all still respecting the active month/year filters:
  – A pair of side-by-side mini KPI blocks (shipments, on-time rate, exceptions, transit days) for the two selected regions, each showing the same trend-arrow convention as the main KPI cards, plus a plain-language delta line ("Northeast is 3.2 points ahead of Southeast on-time").
  – An overlaid on-time trend line chart for both regions across the selected period, using each region's fixed icon/line-style identity (see Style) rather than arbitrary color.
  – A grouped-bar exception type comparison, same 6 types, one bar pair per type, so a lead can see not just "we have more exceptions" but "we have more weather delays specifically."
– Full-width "Open Exceptions" table with a caption clarifying its scope (see above), sortable by any column.
– Responsive grid — cards stack on small screens, table scrolls horizontally.

## Interactions
– The month picker filters everything: KPI cards, all three charts, the regional grid, and the exceptions table.
– **New: Year toggle** — a control near the month picker (e.g., a 2024/2025 switch or a "Compare to last year" checkbox) that adds a second, visually distinct series (dashed line or lighter shade) to the on-time delivery chart and the exception type breakdown chart, showing the same period one year prior. This answers "are we better than last winter" directly on the chart rather than requiring a separate view. When YoY comparison is on, KPI cards can optionally show "+X% vs. same month last year" alongside the existing month-over-month arrow — these are two different comparisons and should be labeled distinctly so they're not confused.
– KPI cards show a colored trend arrow and percentage change vs. the prior month, evaluated against what's good for that metric (rising on-time rate and shipments are improvements/green; rising exception events and transit days are regressions/red).
  – January has no prior month, and "All" has no prior year — both show a neutral "No prior month to compare" / "Full year total" state instead of an arrow.
  – The in-progress month is excluded from the month-over-month arrow's normal "green means good" logic being applied to raw month-to-date counts (a partial month will always look artificially low against a full prior month) — its KPI cards use the projected value for the comparison instead, with a tooltip noting the comparison is projection-based.
– Regional cards show a status chip — green "On Target" (≥95% on-time), amber "At Risk" (92–94.9%), red "Below Target" (<92%) — always paired with a label and an icon, never color alone.
– **New: Projection chip** — appears only on regional cards and KPI cards when the in-progress month is the active selection, uses the same three-tier color/label/icon convention as the status chip, and is visually secondary (smaller, or outlined rather than filled) so it never competes with the actual current-status chip for attention. Selecting any other month — including "All" or a closed prior month — hides the projection entirely rather than showing a stale or meaningless one.
– Regions with no data for the selected period render a "No data for this period" placeholder card instead of a misleading 0%. A region in this state can still be selected for comparison — the comparison panel just shows the same "No data for this period" state in its place rather than a misleading blank chart.
– **New: Region comparison selection** — checkbox state lives on the regional cards themselves so the connection between "which cards are checked" and "what's in the panel below" stays visible and literal, rather than a separate dropdown picker that's disconnected from the cards a lead is already looking at. Comparison respects whatever month/year filter is active — switching the month picker updates the comparison panel exactly like it updates everything else, no separate refresh needed.
– Exceptions table is sortable by every column except the free-text Description field; default sort is Priority descending, then Age descending — the order a VP would triage in a morning review. A month with no open exceptions shows an explicit empty state rather than a blank table.
– Hovering a chart bar or line point shows a tooltip with the full breakdown for that data point; chart legends stay visible at all times rather than appearing only on hover. This applies to the exception type breakdown chart and the YoY comparison series as well — hovering a YoY point should show both years' values side by side in the tooltip. Hovering or tapping a projection chip shows the underlying arithmetic (month-to-date value, days elapsed of days in month, and the resulting projected value) so the read is never a black box.
– A malformed or missing `metrics.json` renders a top-level error banner instead of a blank dashboard.

## Style
– Light/dark mode toggle in the app bar — dark mode is the default.
– Dark mode: near-black background (#0A0F1C), elevated card surfaces (#111827), primary accent (#1A6EFF).
– Light mode: off-white background (#F4F6FA), white card surfaces (#FFFFFF), same primary accent.
– Glassmorphism card treatment — frosted-glass effect via `backdrop-filter: blur(12px)`, semi-opaque surface (72% light / 65% dark), thin border.
– Gradient accents on KPI cards — a soft blue-to-purple sweep behind the metric value.
– Charts use a tight 3-color palette (blue/purple/light-blue) — not rainbow. The exception type breakdown chart extends this with tint/shade variations of the same palette (rather than new hues) to keep all 6 types visually distinct without breaking the "not rainbow" rule; the YoY comparison series uses a consistent visual convention (e.g., current year solid, prior year dashed/lighter) across every chart that supports it.
– Status colors: green (#1DB87A), amber (#F5A623), red (#E03B3B) — always paired with a label. The projection chip reuses these same three colors (never a fourth "projection" hue) but at reduced fill/outline weight, so its visual subordination to the actual-status chip is a style property, not a new palette to learn.
– Each region has a fixed identity used only in the comparison panel — a compass-direction icon (Northeast/Southeast/Central/West already suggest this) paired with a distinct line style (solid vs. dashed, or dotted for a third/fourth if ever needed) on the overlaid trend chart. This is a separate convention from the green/amber/red status colors, which stay reserved for target performance — regional identity and target status are two different kinds of information and shouldn't share one color language.
– Theme switch transitions animate at 200ms ease.
– Typography: Inter, self-hosted via `@fontsource/inter` (400/500/600/700) so it loads without a network request to a font CDN — falls back to system-ui if the package is ever removed. Tabular figures (`font-variant-numeric: tabular-nums`) for all data values.
– Mobile responsive — cards stack on small screens, table scrolls horizontally.

## Accessibility
– Status indicators always pair color with a text label and a distinct icon (check / alert / close), so status reads correctly without color perception.
– Chart legends are persistent and always visible, not revealed only on hover.
– Glassmorphism surfaces use high opacity (72%/65%) specifically to preserve text contrast against the frosted background in both themes.
– The exception type breakdown chart's tint/shade palette and the YoY solid/dashed convention are both distinguishable independent of color (shade contrast and line style, respectively), consistent with the existing color-plus-label pattern used elsewhere.
– The projection chip's "secondary" treatment (outline vs. fill) is a shape/weight distinction, not a color-only one — so it reads as clearly subordinate to the actual-status chip even without color perception, and its text always says "Projected" rather than relying on visual weight alone to convey that.
– The comparison panel's region identity (icon + line style) is legible without color for the same reason the YoY solid/dashed convention is — line style carries the distinction, color is a reinforcement, not the only signal. The comparison checkboxes on regional cards are standard, keyboard-accessible checkbox controls, not custom click targets.

## Tech
– Vue 3 + TypeScript + Vuetify 3.
– Chart.js via vue-chartjs for all three charts.
– Fake data from a local JSON file, now spanning two fake years (2024–2025) to support the YoY overlay — no API calls, no loading state needed.
– Single page — no routing beyond the one view.
– `LoginGate` component gates the dashboard behind a single shared password, hashed and checked client-side, stored in `sessionStorage` for the session. No user accounts, no backend — this is a deterrent for a demo link, not real security, and doesn't protect sensitive data.
– Chart tooltips and hover states are the primary detail mechanism — no modals or drill-downs. The projection's underlying arithmetic (see above) is exposed the same way, via tooltip, rather than a separate detail panel.
– The projection is computed client-side from the in-progress month's `daysElapsed`/`daysInMonth` fields — no date logic tied to the real current date, since this is fake data; the "in-progress" month is simply whichever one the JSON marks that way.
– The region comparison panel reuses the existing Chart.js line and bar components with a second dataset added, rather than a new charting approach — keeps the codebase's chart patterns to one library, one set of conventions.
– Vuetify's built-in theme system handles light/dark token switching.