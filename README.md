# Mizan — know the fair price before you pay

A crowdsourced fair-price book for Dubai services. Pick a service and area, optionally enter
the price you were quoted, and get a clear verdict (fair / steep / walk away) against a real
price range. Built to close the information gap that lets people get overcharged for everyday
services — AC cleaning, haircuts, gym memberships, GP visits, movers, and more.

## Run it
It's a single static file. Either:
```
open index.html
```
or serve it:
```
python3 -m http.server 8000   # then visit http://localhost:8000
```

> Note: live persistence currently relies on the Claude Artifacts `window.storage` API and
> only saves inside the Claude.ai runtime. To persist across users in the real world, wire up
> a small backend — see the backlog in `CLAUDE.md`.

## How it works
- **Market estimate** (tan, dashed): real list prices harvested from the web. What companies charge.
- **Paid** (green, solid): what real people report paying. Unlocks after you add one price.
- A service+area switches from estimate to paid once it has 5+ recent real prices.

## What's real vs not (read before demoing)
- Market estimate ranges: **real** web-sourced list prices (Jun 2026). See `data/market-prices.json`.
- Paid prices: **synthetic seed** for now. Replace with real submissions before public launch.

## Project files
```
index.html              the whole app
CLAUDE.md               context + rules + backlog for Claude Code
data/market-prices.json harvested list-price ranges (the estimate layer)
docs/roadmap.md         strategy, cold-start plan, launch sequence
docs/outreach.md        messages to collect the first real prices
```
