# Mizan — strategy & roadmap

## The thesis
The biggest unfair advantage in everyday life isn't intelligence — it's access to information
someone else is hoarding. When you get a quote for AC cleaning, a car service, or a clinic
visit, the seller knows the real number and you don't. That gap is where people quietly lose
money, and it hits newcomers and the vulnerable hardest. Mizan closes it.

## Why this beats "just ask Reddit / a forum"
Forums *have* the prices but trapped in prose: stale, scattered, no locality, one stranger's
word. Mizan is the layer on top that does the boring work forums never will:
- **Structure** — filter to service + area + recent, get one clean range.
- **Freshness** — recent prices lead; old ones fade.
- **Locality** — Dubai areas, not "somewhere in the UAE."
- **Trust from volume** — a range + sample size + recency, never one anecdote.

## The two real risks (everything else is secondary)
1. **Cold start** — an empty price book is useless, and people won't feed an empty tool.
2. **Gaming / bad data** — if numbers are dirty or businesses inflate them, the trust dies.

## How cold start is handled
- **Market-estimate layer** (real web list prices) means the tool is useful and calibrated on
  day one, even with zero crowd data. It carries the launch.
- **Reciprocity gate**: the crowd "paid" range is locked until the user adds one price. People
  arrive knowing a price (their quote, or what they last paid) — ask at that exact moment.
- **Harvest where prices are already born**: Dubai expat Facebook groups, Dubizzle, review text.
  Answer "how much should X cost?" threads with the Mizan range + link → harvest + recruit at once.
- **Density over coverage**: one slice with 100 real prices is useful; 2,000 spread across 100
  buckets is useless. Win one slice first.

## On data sources (important)
- The trustworthy crowd data must be **buy-side** (what people *paid*). Never seed the paid
  layer from businesses — a salon's advertised price is not the fair price.
- Businesses' list prices are welcome ONLY as the clearly-labeled "market estimate" layer.
- The gap between "list" and "paid" is itself a feature (your negotiating room).

## The launch sequence
1. Launch with market estimate everywhere — real, honest, useful immediately.
2. Concentrate ALL collection on ONE bucket: **AC service, Al Qusais corridor.**
3. Drive that bucket past 5 real prices → it flips estimate→paid → proof the loop works.
4. Only then widen to a second slice.

## The decision gate (run this BEFORE building more)
Cheapest test of the one assumption that kills the idea if false: *will real people hand over
what they paid?* Send the outreach (`docs/outreach.md`) to ~30–40 people + 1–2 FB groups.
- **≥15–20 prices come back easily** → the loop works. Widen.
- **You had to beg for ~4** → contribution is the real wall. Pivot to harvesting existing data
  rather than asking people to submit.
No more building until this is answered.

## Backlog (mirrors CLAUDE.md)
- P0 Real persistence (backend behind a small store abstraction) — required for public launch.
- P1 Data integrity: outlier trimming, per-device caps, verified-invoice tier, confidence signal.
- P2 "What's included" structured sub-options per service (scope pollutes ranges today).
- P3 Growth: shareable verdict link; "you paid X% under average" post-contribution feedback.
- P4 Scale: searchable pickers; WhatsApp entry point.
