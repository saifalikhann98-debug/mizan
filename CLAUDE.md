# CLAUDE.md — Mizan

Context for Claude Code. Read this first.

## What this is
**Mizan** (ميزان, Arabic for "scales / balance") answers one question for Dubai residents:
*"Is the price I'm being quoted fair, or am I getting ripped off?"*

You pick a service + area, optionally type the price you were quoted, and get a verdict
(fair / steep / walk away) plotted on a price range. It's a crowdsourced fair-price book.

The moat is **not** the tech — it's clean, structured, local, fresh, buy-side price data.
The whole product is trust + presentation.

## Current state (prototype)
- Single self-contained file: `index.html`. No build step, no dependencies, no backend.
- Open it directly in a browser, or serve with `python3 -m http.server`.
- Persistence uses the Claude Artifacts `window.storage` API (key/value). This works
  **only inside the Claude.ai artifact runtime.** Outside it, `window.storage` is undefined
  and submissions won't persist — see "First real task" below.

## The data model — TWO LAYERS (this is the core idea, don't break it)
1. **Market estimate** (hatched band) = REAL list prices harvested from the web, Jun 2026.
   The harvest is Dubai-wide & NOT verified — these are what companies *advertise*. The UI then
   **displays it area-adjusted** (list × the area cost factor in `PREMIUM`) as a clearly-labelled
   ESTIMATE, so the area selector moves the band; real paid data stays per-area as reported.
   Source of truth: `data/market-prices.json` (and the `CATEGORIES` array in index.html).
2. **Paid** (solid green band) = what real people report paying. Currently **SYNTHETIC seed
   data** generated in `buildSeed()`, clustered just below list prices to mimic reality.
   This is fake and must be replaced with real submissions before any public launch.

Rule: a service+area shows the paid layer only once it has **≥5 recent prices**. Below that,
it shows the market estimate and says so. The flip from estimate→paid is the product working.

## The reciprocity gate (just added)
The free market estimate is always visible. The crowd **paid** range is **locked** until the
user contributes one price (`UNLOCKED` flag, stored under `mizan:unlocked:v2`, per-user).
This is the growth engine: people came to take a number, so ask for one back at that moment.

## HARD RULES (do not violate)
- **Never present synthetic seed data as real.** Keep the "market estimate vs paid" labels
  explicit and visible. If you remove the seed, the paid layer should simply not show until
  real data exists.
- **Never blur the two layers** into one number. The honesty *is* the product.
- Keep buy-side ("what people paid") and sell-side ("list price") clearly separated. Never let
  business-supplied prices masquerade as crowd data.
- No dark patterns beyond the single contribute-to-unlock gate.

## Design tokens / conventions
Redesigned Aug 2026 ("Outfit / teal band" system — direction D: minimal, tool-first, brand-blocked).
Still a single self-contained file per app (`index.html`, `rent/index.html`, `motor/index.html`),
CSS custom properties in `:root` — no framework/build. `/ar/*` app copies are generated from these.
- Fonts: **Outfit** for everything (Light 300 hero, Medium 500 UI/verdict word, Regular body);
  **Geist Mono** for all prices / AED / scale labels; IBM Plex Sans Arabic for `lang="ar"`.
- Palette: `--teal #14534D` (brand, paid band, primary buttons), `--band` (the flat teal top field;
  `#0F3E3A` in dark) with `--on-band` warm-white text and `--mint #8FC4B0` headline emphasis; verdict
  tones `--fair #2F7D54` / `--steep #B5781F` / `--walk #B5402F` (each with a tint bg); page bg flat
  `#F7F6F1`, card `#FFFFFF`, ink `#1C1A15`, hairlines `#E8E4DA`–`#F1EDE4`, hatch `#DDD8CB`/`#F0ECE3`.
  **No drop shadows** (hairlines only), no gradients — the modal/toast/strip are the only shadowed things.
- Structure: `.topband` (nav + centred hero + segmented `.modeswitch` pill) → `<main>` pulled up
  −72px so the white `.workspace`/`.workcard` straddles the band edge. Inside the card: inputs in ONE
  row of `.field` boxes (label inside the box), then the result grid (verdict left, scale + breakdown
  right, meta + actions across the bottom), then the two-layer explainer `.howto` strip. Rent/Motor keep
  their in-card `.seg` sub-tabs (grey track, white active pill).
- Radii: cards 22px · verdict/legal/uc boxes 18px · fields/breakdown 14px · all buttons + switchers pill (999px).
- Layout: max-width 1140px; ≤900px inputs go 2-up; ≤760px everything stacks, band shortens, mode
  switch fills the width, and the **mobile verdict strip** (`.vstrip`) mirrors the verdict when the card
  is off-screen. Result recomputes live; verdict tiers Fair / Steep / Walk away / Going rate.
- **Dual theme:** light + dark via CSS-var tokens under `:root` / `:root[data-theme="dark"]`. No-flash
  `<head>` script; nav toggle persists to localStorage. The band stays teal in both themes.
- Respect `prefers-reduced-motion`. Visible `:focus-visible` states. Modal: focus-trap + Esc + backdrop close.
- One bold element (the verdict word); keep everything else quiet. Verdict meaning never by colour
  alone — the word + stat carry it. Never blur the two layers.
- SEO guide pages use the same system (CSS lives in `tools/build-seo-pages.mjs` → `/prices/page.css`;
  `G()` lifts crumb + h1 + lede into the teal band). OG cards: `node tools/build-og.mjs` (HTML → headless Brave).

## Prioritized backlog
**First real task — make it persist for real (required before launch):**
- Add a tiny backend (e.g. Supabase, Firebase, or a small serverless KV) so submissions
  persist across users outside the artifact runtime. Abstract storage behind a small
  `store.get/set/list` module so `window.storage` and the real backend are interchangeable.

**P1 — data integrity (the actual moat):**
- Anti-gaming: trim outliers before computing the range (IQR fence), cap submissions per
  device/day, weight by agreement. A business shouldn't be able to pump its area's range.
- Provenance tiers: `paid` vs `verified` (photo of invoice) — verified prices weighted higher.
- Confidence signal: make a tight range from many recent prices visibly different from a wide
  range from few old ones (e.g. a confidence label at the verdict).

**P2 — accuracy:**
- "What's included" structured sub-options per service (AC: # of units; salon: cut vs cut+color;
  car: oil only vs minor service). Right now different scopes pollute one range. Highest
  accuracy lever after data integrity.

**P3 — growth loops:**
- Shareable verdict ("send this to the technician") — doubles as a distribution loop.
- "You paid X% under the area average" feedback after contributing (makes giving feel like winning).

**P4 — scale:**
- Searchable service/area pickers (current `<select>` won't scale past ~20 entries).
- WhatsApp entry point (the real distribution channel — users message a number, get a verdict).

## Strategy & background
See `docs/roadmap.md` for the full thinking (cold-start plan, the "one bucket" focus,
why buy-side only). See `docs/outreach.md` for the messages to collect the first real prices.

## Launch sequence (agreed)
1. Launch with market estimate everywhere (real, honest, useful day one).
2. Concentrate ALL collection on ONE slice: **AC service, Al Qusais corridor.**
3. Get that slice past 5 real prices → it flips from estimate to paid → proof the loop works.
4. Then widen. Don't spread thin across 100 empty buckets.
