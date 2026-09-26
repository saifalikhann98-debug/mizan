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

## US edition (added Sep 2026)
`/us/`, `/us/rent/`, `/us/motor/` are US copies of the three apps: USD, US-wide with a **metro
selector** (24 metros for rent, 23 for services), same two-layer model and reciprocity gate.
- Market estimates are REAL published US figures (Angi/HomeGuide/RepairPal/Zumper/Zillow etc.,
  Sep 2026) — sources in `data/us-market-prices.json`. Metro multipliers = BEA Regional Price
  Parities 2023 ("Services: Other"). Rent lo/hi is a labelled derived spread around real medians.
- Category ids carry a `us-` prefix (`us-hvac`, `us-rent-1br`, `us-motor-oilchange`) so US and UAE
  buckets never mix in the shared Supabase `submissions` table; each app's feed filters by its own
  known ids. localStorage keys use `mizan:us:*`.
- The Dubai RERA increase calculator is UAE-only and was removed from `/us/rent`; there is no
  US-wide legal-cap equivalent (rent control is city/state-specific).
- `/us/*` is English-only (`LANG` pinned to `en`; the Arabic i18n code was stripped from the US
  copies) and uses **brick orange `--teal #9E3B1F`** as its single accent instead of the pine green;
  the US header drops the Arabic wordmark.

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
Redesigned Aug 2026 ("Outfit / quiet light" system — Ramp-style: off-white page, faint dot grid, ink
headline, ONE brand accent). Still a single self-contained file per app (`index.html`, `rent/index.html`,
`motor/index.html`), CSS custom properties in `:root` — no framework/build. `/ar/*` app copies are generated.
- Fonts: **Outfit** everywhere (Regular 400 hero, Medium 500 UI/verdict word); **Geist Mono** for all
  prices / AED / scale labels; IBM Plex Sans Arabic for `lang="ar"`.
- Palette: brand **pine `--teal #173F35`** (primary buttons, paid band, headline emphasis via `--mint`,
  active switcher pill, links) — the single accent; page/`--band` `#FBFAF6` (light) / `#121615` (dark) with
  a faint ink dot grid (`--dot`) fading toward the card; ink `#1C1A15`; card `#FFFFFF`; hairlines
  `#E8E4DA`–`#F1EDE4`; verdict tones `--fair #2F7D54` / `--steep #B5781F` / `--walk #B5402F` (+ tints);
  hatch `#DDD8CB`/`#F0ECE3`. Cards get one whisper shadow; everything else hairlines. No gradients.
- Structure: `.topband` (nav + centred hero + segmented `.modeswitch` pill on the page colour) → `<main>`
  pulled up so the white `.workspace`/`.workcard` overlaps the hero area. Inside the card: inputs in ONE row
  of `.field` boxes (label inside), result grid (verdict left, scale + breakdown right, meta + actions
  across the bottom), explainer `.howto` strip at the foot. Rent/Motor keep `.seg` sub-tabs. Below: "Recently
  paid" panel (2-col, deep-linked rows, old rows fade) and FAQ hairline grid (3-col, index numerals).
- Radii: cards 22px · verdict/legal/uc boxes 18px · fields/breakdown/FAQ grid 14px · buttons + switchers pill.
- Layout: max-width 1140px; ≤900px inputs 2-up; ≤760px stacks, switcher fills width, mobile verdict strip
  (`.vstrip`) mirrors the verdict when the card is off-screen. Result recomputes live; tiers Fair / Steep /
  Walk away / Going rate.
- **Light theme only** (Sep 2026: dark mode + the theme switcher were removed product-wide; the
  no-flash script pins `data-theme="light"`). Respect `prefers-reduced-motion`. `:focus-visible` states. Modal focus-trap.
- One bold element (the verdict word); keep everything else quiet. Verdict meaning never by colour alone.
- Guides share the system (CSS in `tools/build-seo-pages.mjs` → `/prices/page.css`; `G()` lifts crumb +
  h1 + lede into `.topband`). OG cards (`node tools/build-og.mjs`) intentionally stay on the pine field.

## Backlog status (Sep 2026 — keep this honest, it drives planning)
**Shipped — do not re-plan these:**
- Backend: Supabase REST behind the `store` abstraction (shared `submissions` table, RLS,
  anon key in the page). All six apps.
- P1 data integrity: IQR outlier fence; per-device/day caps client-side AND a server DB
  trigger (per-device + per-IP caps, price sanity, duplicate rejection — clients send an
  anonymous `device` id); `verified` invoice tier (photo → private bucket → manual flip,
  2× weight); confidence label at the verdict ("High confidence / Building confidence /
  Early data" from fresh-report count, downgraded when stale). All six apps.
- P2 "what's included" scopes: sub-option select; buckets segment as `id+suffix`
  (e.g. `ac+2u`, `us-hvac+2u`); base scope keeps the bare id. UAE + US services apps.
- P3 growth loops: share button with verdict message + deep link; post-submit
  "you paid X% under/over typical (…)" feedback. All six apps.
- P4 searchable pickers: `makeCombobox()` type-to-filter over the hidden native selects.

**Remaining:**
- WhatsApp entry point (the real distribution channel — users message a number, get a verdict).
- Server-side filtering/pagination once the 5000-row read cap gets close.
- Agreement weighting (beyond verified 2×) if pumping is ever observed in the wild.

## Strategy & background
See `docs/roadmap.md` for the full thinking (cold-start plan, the "one bucket" focus,
why buy-side only). See `docs/outreach.md` for the messages to collect the first real prices.

## Launch sequence (agreed)
1. Launch with market estimate everywhere (real, honest, useful day one).
2. Concentrate ALL collection on ONE slice: **AC service, Al Qusais corridor.**
3. Get that slice past 5 real prices → it flips from estimate to paid → proof the loop works.
4. Then widen. Don't spread thin across 100 empty buckets.
