# Operations Dashboard - Project Brief

## What is this?
A single-page internal operations dashboard for the VP of Operations and regional leadership at FastForward Logistics — a mid-size freight and supply chain company.


## Data
Generate a fake dataset as a JSON file (src/data/metrics.json).
12 months of data (Jan–Dec 2025), covering four regions (Northeast, Southeast, Central, West), each month containing:
– shipments (count, trending upward with some variation across the year)
– onTimeRate (percentage, target is 95%, fluctuates between 88–98%)
– exceptions (count of unresolved events — spikes in winter months)
– avgTransitDays (float, ideally trending down as a sign of improvement)
– revenue (dollar amount, loosely correlated with shipment volume)
Each month should also include a breakdown by freight mode: Truckload (TL), LTL, and Expedited.

## Layout (Vuetify)
– App-bar at the top with dashboard title and a month picker.
– Include a toggle switch for light/dark mode in the app bar
– The date range selector defaults to showing ALL months (full year view)
– When a specific month is selected, all cards and charts filter to that month. When "All" is selected, show the full year.
– Below the header: a row of 4 KPI summary cards showing the key metrics — Total Shipments, On-Time Delivery Rate, Open Exceptions, Avg. Transit Days
– Below the cards: a row of 2 charts:
– Left: Bar chart showing monthly shipment volume, stacked by freight mode (TL, LTL, Expedited)
– Right: Line chart showing on-time delivery rate over time, with a target threshold line at 95%
– Below the charts: a 4-up regional performance grid — one card per region (Northeast, Southeast, Central, West)
– Below the regional grid: a full-width exceptions table showing open exception events
– Use a responsive grid layout — cards stack on small screens

## Interactions
– Date range selector in the header filters EVERYTHING — summary cards update, charts update, regional cards update, exceptions table filters
– When "All" is selected, summary cards show yearly totals or averages and charts show all 12 months
– When a specific month is selected, charts highlight that month and cards show that month's numbers
– KPI cards should show a small up/down trend indicator and percentage change vs. prior period
– Regional cards show a green/amber/red status dot based on on-time rate vs. target
– Exceptions table is sortable by any column — default sort is Priority descending, then Age descending
– Hovering a chart bar or line point shows a tooltip with the full breakdown for that data point

## Style
– Dark theme by default — dark navy background (#0F1B2D), white content surfaces
– Clean, minimal, enough white space and padding to not feel cluttered.
– Charts use a cohesive 3-color palette for freight modes — not rainbow
– Status colors follow a strict semantic system: green (#1DB87A) for healthy, amber (#F5A623) for watch, red (#E03B3B) for attention needed — always paired with a label, never color alone
– Typography uses tabular figures for all data values so numbers stay aligned
– Mobile responsive — cards stack on small screens, table scrolls horizontally

## Tech
– Vue 3 + TypoScript + Vuetify 3 
– Chart.js via vue-chartjs for all charts 
– Fake data from a local JSON file (no API calls)
– Single page — no routing needed for this prototype
– No authentication — this is a read-only prototype for demonstration
– Chart tooltips and hover states are the primary detail mechanism — no modals or drill-downs in v1


