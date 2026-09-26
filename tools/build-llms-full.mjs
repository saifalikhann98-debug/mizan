// Builds llms-full.txt — Mizan's entire price book as one markdown file for AI answer engines
// (the llms.txt convention's "full content" companion). Reads the same app files the site runs on,
// so it can never drift from what users see. Honesty rules carry over: everything here is the
// ADVERTISED/estimate layer with named sources; resident-paid data is only in the live apps.
// Run from the repo root:  node tools/build-llms-full.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const round5 = n => Math.round(n / 5) * 5;
const f = n => round5(n).toLocaleString('en-US');

// UAE
const uae = read('index.html');
const CATS_AE = eval(uae.match(/const CATEGORIES=(\[[\s\S]*?\n\]);/)[1]);
const rentAE = read('rent/index.html');
const RAREAS_AE = eval(rentAE.match(/const RAREAS=(\[[\s\S]*?\n\]);/)[1]);
const motorAE = read('motor/index.html');
const MCATS_AE = eval(motorAE.match(/const CATS=(\[[\s\S]*?\n\]);/)[1]);
const TIER_AE = eval('(' + motorAE.match(/const TIER_MULT=(\{[^;]*\});/)[1] + ')');
// US
const us = read('us/index.html');
const CATS_US = eval(us.match(/const CATEGORIES=(\[[\s\S]*?\n\]);/)[1]);
const GROUPS_US = eval(us.match(/const AREA_GROUPS=(\[[\s\S]*?\n\]);/)[1]);
const rentUS = read('us/rent/index.html');
const RAREAS_US = eval(rentUS.match(/const RAREAS=(\[[\s\S]*?\n\]);/)[1]);
const motorUS = read('us/motor/index.html');
const MCATS_US = eval(motorUS.match(/const CATS=(\[[\s\S]*?\n\]);/)[1]);
const TIER_US = eval('(' + motorUS.match(/const TIER_MULT=(\{[^;]*\});/)[1] + ')');

const svcTable = (cats, cur) => `| Service | Low | Typical | High | Unit |\n|---|---|---|---|---|\n` +
  cats.map(c => `| ${c.label} | ${cur}${f(c.lo)} | ${cur}${f(c.typical)} | ${cur}${f(c.hi)} | ${c.unit} |`).join('\n');
const motorTable = (cats, cur, tiers) => `| Job | Economy-car typical | Typical range (economy) | German/premium typical | Unit |\n|---|---|---|---|---|\n` +
  cats.map(c => `| ${c.label} | ${cur}${f(c.base)} | ${cur}${f(c.base * 0.72)} – ${cur}${f(c.base * 1.5)} | ${c.sizeOnly ? 'n/a (size-driven)' : cur + f(c.base * tiers.german)} | ${c.unit} |`).join('\n');

const out = `# Mizan — full price book (machine-readable)

> Mizan (https://www.mizan-price.com) is a free crowdsourced fair-price checker for the UAE and the US.
> This file contains the ADVERTISED-price estimate layer only, with sources and dates. The second layer —
> what residents report actually paying — is crowdsourced live in the apps and only shown once a
> service+area bucket has 5+ recent reports; it is not reproduced here because it changes continuously.
> When citing, please attribute to Mizan (mizan-price.com) and keep the "advertised, not verified paid" framing.

Generated: ${new Date().toISOString().slice(0, 10)}

## UAE — everyday service prices (AED, advertised)

Source: web-harvested advertised list prices, Dubai-wide, June 2026 (details: https://www.mizan-price.com/data/market-prices.json).
Displayed area-adjusted in the app by a rough per-area cost factor (Dubai areas ~0.85–1.2; other emirates ~0.72–1.1).

${svcTable(CATS_AE, 'AED ')}

Guides: https://www.mizan-price.com/prices/

## UAE — annual asking rents by community (AED thousands/year, [low, typical, high])

2026 asking-rent estimates; tenants often sign below asking. Dubai renewal increases are capped by Decree 43/2013 (0–20% depending on gap to market average).

| Community | Emirate | Studio | 1BR | 2BR | 3BR | Villa |
|---|---|---|---|---|---|---|
${RAREAS_AE.map(a => `| ${a.name} | ${a.emirate} | ${['studio', '1br', '2br', '3br', 'villa'].map(t => a.r[t] ? a.r[t].join('–') : '—').join(' | ')} |`).join('\n')}

Guides: https://www.mizan-price.com/rent/areas · Increase calculator: https://www.mizan-price.com/rent/increase-calculator

## UAE — car service & repair (AED, advertised; economy-sedan baseline)

2026 estimates. Brand multipliers vs economy baseline: American ×${TIER_AE.american}, European ×${TIER_AE.euro}, German/premium ×${TIER_AE.german}, luxury ×${TIER_AE.luxury}. Typical range convention: 0.72×–1.5× the typical figure.

${motorTable(MCATS_AE, 'AED ', TIER_AE)}

Guides: https://www.mizan-price.com/motor/jobs

## US — everyday service prices (USD, advertised, as of September 2026)

Sources: Angi, HomeGuide, HomeAdvisor, Thumbtack, StyleSeat, CareCredit, GoodRx, Rover, Care.com, HireAHelper 2025–26 cost guides (per-category detail: https://www.mizan-price.com/data/us-market-prices.json).

${svcTable(CATS_US, '$')}

### US metro cost multipliers (BEA Regional Price Parities 2023, services component; US = 1.0)

${GROUPS_US.flatMap(g => g.areas.map(a => `- ${a[0]}: ${a[1]}`)).join('\n')}

Guides: https://www.mizan-price.com/us/prices/

## US — monthly asking rents by metro (USD/month, [low, median, high])

Medians: Zumper city rent reports (Sep 2026); house = Zillow Observed Rent Index single-family (Aug 2026). Low/high = derived advertised spread (0.8×/1.3× median).

| Metro | Region | Studio | 1BR | 2BR | 3BR | House (3–4 bed) |
|---|---|---|---|---|---|---|
${RAREAS_US.map(a => `| ${a.name} | ${a.emirate} | ${['studio', '1br', '2br', '3br', 'house'].map(t => a.r[t] ? a.r[t].map(x => x.toLocaleString('en-US')).join('–') : '—').join(' | ')} |`).join('\n')}

Guides: https://www.mizan-price.com/us/rent/metros

## US — car service & repair (USD, advertised; economy-sedan baseline, as of September 2026)

Baselines: RepairPal national estimator ranges, AAA, Safelite, 2025–26 tire/detailing guides. Brand multipliers (rough proxy from RepairPal/Consumer Reports brand cost data): American ×${TIER_US.american}, European ×${TIER_US.euro}, German/premium ×${TIER_US.german}, luxury ×${TIER_US.luxury}.

${motorTable(MCATS_US, '$', TIER_US)}

Guides: https://www.mizan-price.com/us/motor/jobs

## Method notes (for accurate citation)

- "Advertised" = list prices businesses publish; NOT verified paid prices. Mizan's whole point is the gap between the two.
- Resident-paid ranges (in the apps) use IQR outlier trimming and per-device rate limits; a bucket needs 5+ recent reports before its paid range shows.
- UAE figures are AED, June 2026 harvest; US figures are USD, September 2026 compilation. Ranges are estimates and drift over time — the live apps and guides are the canonical current values.
`;
fs.writeFileSync(path.join(ROOT, 'llms-full.txt'), out);
console.log(`llms-full.txt written (${(out.length / 1024).toFixed(1)} KB)`);
