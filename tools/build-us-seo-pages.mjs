// Mizan US SEO/GEO page generator (English only).
// Reads the US apps' data straight out of us/*/index.html (single source of truth, zero drift) and
// emits per-service price guides (/us/prices/*), per-metro rent guides (/us/rent/*), per-job car
// repair guides (/us/motor/*) and three hubs — each with metro tables, named data sources and
// as-of dates (the provenance AI answer engines cite), FAQ/Breadcrumb/WebPage JSON-LD, and the
// US brick-orange accent. Also writes tools/us-urls.json, which build-seo-pages.mjs merges into
// the sitemap (that tool stays the only sitemap writer).
// Run from the repo root BEFORE build-seo-pages.mjs:  node tools/build-us-seo-pages.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://www.mizan-price.com';
const AS_OF = 'September 2026';
const LASTMOD = new Date().toISOString().slice(0, 10);

const svcHtml = fs.readFileSync(path.join(ROOT, 'us', 'index.html'), 'utf8');
const rentHtml = fs.readFileSync(path.join(ROOT, 'us', 'rent', 'index.html'), 'utf8');
const motorHtml = fs.readFileSync(path.join(ROOT, 'us', 'motor', 'index.html'), 'utf8');
const CATEGORIES = eval(svcHtml.match(/const CATEGORIES=(\[[\s\S]*?\n\]);/)[1]);
const AREA_GROUPS = eval(svcHtml.match(/const AREA_GROUPS=(\[[\s\S]*?\n\]);/)[1]);
const RTYPES = eval(rentHtml.match(/const RTYPES=(\[[\s\S]*?\n\]);/)[1]);
const RAREAS = eval(rentHtml.match(/const RAREAS=(\[[\s\S]*?\n\]);/)[1]);
const MCATS = eval(motorHtml.match(/const CATS=(\[[\s\S]*?\n\]);/)[1]);
const TIER_MULT = eval('(' + motorHtml.match(/const TIER_MULT=(\{[^;]*\});/)[1] + ')');
const TIER_LABEL = eval('(' + motorHtml.match(/const TIER_LABEL=(\{[^;]*\});/)[1] + ')');
const M_BODY = eval(motorHtml.match(/const BODY=(\[[^;]*\]);/)[1]);
const METROS = AREA_GROUPS.flatMap(g => g.areas.map(a => ({ name: a[0], mult: a[1], region: g.emirate })));

const round5 = n => Math.round(n / 5) * 5;
const fmt = n => round5(n).toLocaleString('en-US');
const usd = n => `$${fmt(n)}`;
const rng = (a, b) => `$${fmt(a)} – $${fmt(b)}`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const slugify = s => s.toLowerCase().replace(/[()'".]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// slug + prose name (+ article form for "How much does … cost") per US service id
const META = {
  'us-hvac':       { slug: 'hvac-service',          name: 'HVAC service',            art: 'an HVAC tune-up' },
  'us-cleaning':   { slug: 'house-deep-cleaning',   name: 'house deep cleaning',     art: 'a house deep clean' },
  'us-cleanhr':    { slug: 'house-cleaning-hourly', name: 'hourly house cleaning',   art: 'hourly house cleaning' },
  'us-pest':       { slug: 'pest-control',          name: 'pest control',            art: 'a pest control visit' },
  'us-ductclean':  { slug: 'air-duct-cleaning',     name: 'air duct cleaning',       art: 'air duct cleaning' },
  'us-carpet':     { slug: 'carpet-cleaning',       name: 'carpet cleaning',         art: 'carpet cleaning' },
  'us-windows':    { slug: 'window-cleaning',       name: 'window cleaning',         art: 'window cleaning' },
  'us-pool':       { slug: 'pool-maintenance',      name: 'pool maintenance',        art: 'monthly pool maintenance' },
  'us-handyman':   { slug: 'handyman',              name: 'handyman service',        art: 'a handyman' },
  'us-plumber':    { slug: 'plumber',               name: 'a plumber service call',  art: 'a plumber service call' },
  'us-electrician':{ slug: 'electrician',           name: 'an electrician service call', art: 'an electrician service call' },
  'us-painting':   { slug: 'interior-painting',     name: 'interior painting',       art: 'painting a room' },
  'us-applrepair': { slug: 'appliance-repair',      name: 'appliance repair',        art: 'appliance repair' },
  'us-tvmount':    { slug: 'tv-mounting',           name: 'TV wall mounting',        art: 'TV wall mounting' },
  'us-minisplit':  { slug: 'mini-split-installation', name: 'mini-split installation', art: 'a mini-split install' },
  'us-oilchange':  { slug: 'oil-change',            name: 'an oil change',           art: 'an oil change' },
  'us-carwash':    { slug: 'car-detailing',         name: 'car detailing',           art: 'a full car detail' },
  'us-tires':      { slug: 'tires',                 name: 'a set of tires',          art: 'a set of 4 tires' },
  'us-haircut':    { slug: 'mens-haircut',          name: "a men's haircut",         art: "a men's haircut" },
  'us-womenshair': { slug: 'womens-haircut',        name: "a women's haircut",       art: "a women's cut and blow-dry" },
  'us-cutcolor':   { slug: 'cut-and-color',         name: 'a cut and color',         art: 'a cut and color' },
  'us-keratin':    { slug: 'keratin-treatment',     name: 'a keratin treatment',     art: 'a keratin treatment' },
  'us-manipedi':   { slug: 'mani-pedi',             name: 'a mani-pedi',             art: 'a mani-pedi' },
  'us-facial':     { slug: 'facial',                name: 'a facial',                art: 'a facial' },
  'us-massage':    { slug: 'massage',               name: 'a massage',               art: 'a 60-minute massage' },
  'us-waxing':     { slug: 'eyebrow-waxing',        name: 'eyebrow waxing',          art: 'an eyebrow wax' },
  'us-lashes':     { slug: 'eyelash-extensions',    name: 'eyelash extensions',      art: 'a full set of lash extensions' },
  'us-gym':        { slug: 'gym-membership',        name: 'a gym membership',        art: 'a gym membership' },
  'us-urgentcare': { slug: 'urgent-care-visit',     name: 'an urgent care visit',    art: 'an urgent care visit without insurance' },
  'us-dental':     { slug: 'dental-cleaning',       name: 'a dental cleaning',       art: 'a dental cleaning without insurance' },
  'us-pt':         { slug: 'physical-therapy',      name: 'physical therapy',        art: 'a physical therapy session' },
  'us-eyetest':    { slug: 'eye-exam',              name: 'an eye exam',             art: 'an eye exam without insurance' },
  'us-bloodtest':  { slug: 'blood-test',            name: 'a blood panel',           art: 'a basic blood panel' },
  'us-petgroom':   { slug: 'dog-grooming',          name: 'dog grooming',            art: 'a full dog groom' },
  'us-vet':        { slug: 'vet-visit',             name: 'a vet visit',             art: 'a routine vet exam' },
  'us-petboard':   { slug: 'pet-boarding',          name: 'pet boarding',            art: 'a night of pet boarding' },
  'us-nanny':      { slug: 'nanny',                 name: 'a full-time nanny',       art: 'a full-time nanny' },
  'us-tutor':      { slug: 'private-tutor',         name: 'a private tutor',         art: 'a private tutor' },
  'us-swim':       { slug: 'swim-lessons',          name: 'swim lessons',            art: 'a private swim lesson' },
  'us-laundry':    { slug: 'wash-and-fold',         name: 'wash-and-fold laundry',   art: 'a 20 lb wash-and-fold bag' },
  'us-dryclean':   { slug: 'dry-cleaning',          name: 'dry cleaning',            art: 'dry cleaning an item' },
  'us-tailoring':  { slug: 'alterations',           name: 'clothing alterations',    art: 'hemming a pair of pants' },
  'us-movers':     { slug: 'local-movers',          name: 'local movers',            art: 'moving a 1-bedroom apartment locally' },
};
const MSLUG = {
  oilchange: 'oil-change', carserv: 'basic-service', majorservice: 'major-service', wheelalign: 'wheel-alignment',
  sparkplugs: 'spark-plugs', carac: 'ac-recharge', carbattery: 'battery-replacement', tyres: 'tires',
  brakepads: 'brake-pads', brakejob: 'brake-pads-rotors', clutch: 'clutch-replacement', accompressor: 'ac-compressor',
  timingbelt: 'timing-belt', alternator: 'alternator', starter: 'starter-motor', suspension: 'shocks-struts',
  radiator: 'radiator-replacement', dentpaint: 'dent-repair-paint', windshield: 'windshield-replacement',
  tint: 'window-tinting', carwash: 'car-detailing', ceramic: 'ceramic-coating',
};

const SVC_SOURCES = 'published 2025–26 US cost guides (Angi, HomeGuide, HomeAdvisor, Thumbtack, StyleSeat, CareCredit, GoodRx and others)';
const RENT_SOURCES = 'Zumper city rent reports (September 2026) and the Zillow Observed Rent Index single-family series (August 2026)';
const MOTOR_SOURCES = 'published US repair estimators (RepairPal national ranges, AAA, Safelite and 2025–26 tire and detailing guides)';

const SCALE = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:22px;height:22px"><path d="M16 5v22M9 27h14M6 11h20"/><path d="M6 11l-3.4 6.8a3.8 3.8 0 0 0 6.8 0z"/><path d="M26 11l-3.4 6.8a3.8 3.8 0 0 0 6.8 0z"/></svg>`;
// US guides reuse the shared guide stylesheet; this inline override swaps pine → brick orange.
const BRICK = `<style>:root{--teal:#9E3B1F;--teal-deep:#7F2E17;--teal-bg:#F7E8E1;--mint:#9E3B1F}</style>`;

function head(title, desc, canonPath, jsonld) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${ORIGIN}${canonPath}"><meta name="robots" content="index,follow">
<meta name="theme-color" content="#FBFAF6">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="article"><meta property="og:site_name" content="Mizan"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${ORIGIN}${canonPath}"><meta property="og:image" content="${ORIGIN}/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:image" content="${ORIGIN}/og.png">
<script>document.documentElement.setAttribute('data-theme','light');</script><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet"><link rel="stylesheet" href="/prices/page.css">${BRICK}<script defer src="/_vercel/insights/script.js"></script>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script></head><body>`;
}
function nav(cta, ctaHref) {
  return `<div class="topband"><header class="nav"><div class="nav-in"><a class="brand" href="/us/">${SCALE}<span class="w">Mizan</span><span style="font-size:12px;font-weight:600;letter-spacing:.08em;color:var(--teal);margin-left:6px">US</span></a><div class="nav-r"><a href="/">UAE edition</a><a href="${ctaHref}">${cta}</a></div></div></header>`;
}
// Lift crumb + h1 + lede into the top band (same pattern as the UAE guides).
function G(html) {
  return html.replace(/<\/header><main>\n(<div class="crumb">[\s\S]*?<\/div>\n<h1>[\s\S]*?<\/h1>\n?(?:<p class="lede">[\s\S]*?<\/p>)?)/, (m, t) => `</header><div class="gh">${t}</div></div><main>`);
}
function footer() {
  return `<script>(function(){var f=function(){var w=document.querySelector('.rangecard')||document.querySelector('main');if(w)document.body.style.setProperty('--dots-end',Math.round(w.getBoundingClientRect().bottom+scrollY+48)+'px');};f();addEventListener('resize',f);})();</script><footer><div class="foot-in">Mizan shows advertised list prices from published US sources next to what residents report actually paying. Reports are anonymous. Prices are estimates, not quotes. <a href="/us/prices/">All US price guides</a> · <a href="/us/">US home</a> · <a href="/">UAE edition</a></div></footer></body></html>`;
}
function graph(canonPath, crumbs, faqs, title, desc) {
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': `${ORIGIN}${canonPath}`, url: `${ORIGIN}${canonPath}`, name: title, description: desc, inLanguage: 'en-US', dateModified: LASTMOD, isAccessibleForFree: true, speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '.lede'] }, isPartOf: { '@type': 'WebSite', '@id': `${ORIGIN}/us/#website`, name: 'Mizan US', url: `${ORIGIN}/us/` } },
    { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: `${ORIGIN}${c[1]}` })) },
    ...(faqs ? [{ '@type': 'FAQPage', inLanguage: 'en-US', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []),
  ] };
}
const faqBlock = faqs => faqs.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n');

/* ===== US service guides (/us/prices/*) ===== */
function servicePage(s) {
  const m = META[s.id], n = m.name, art = m.art, N = cap(n.replace(/^an? /, ''));
  const canonPath = `/us/prices/${m.slug}`;
  const u = ({'/visit':'per visit','/clean':'per clean','/hour':'per hour','/job':'per job','/month':'per month','/room':'per room','/repair':'per repair','/TV':'per TV','/system':'per system','/service':'per service','/detail':'per detail','/set':'per set','/cut':'per cut','/session':'per session','/night':'per night','/week':'per week','/lesson':'per lesson','/bag':'per 20 lb bag','/item':'per item','/move':'per move','/panel':'per panel'})[s.unit] || 'per service';
  const rows = METROS.map(e => `<tr><td>${esc(e.name)}</td><td class="r">${rng(s.lo * e.mult, s.hi * e.mult)}</td></tr>`).join('');
  const related = CATEGORIES.filter(o => o.group === s.group && o.id !== s.id).slice(0, 4)
    .map(o => `<a href="/us/prices/${META[o.id].slug}">${esc(cap(META[o.id].name.replace(/^an? /, '')))}</a>`).join('');
  const faqs = [
    { q: `How much does ${art} cost in the US?`, a: `As of ${AS_OF}, ${art} is typically advertised between ${usd(s.lo)} and ${usd(s.hi)} ${u} in the US, with most quotes around ${usd(s.typical)}. Figures come from ${SVC_SOURCES}.` },
    { q: `What is a fair price for ${n.replace(/^an? /, '')}?`, a: `A fair price sits at or below the typical advertised figure of about ${usd(s.typical)} ${u}. Compare two or three quotes and check them against what residents report actually paying on Mizan.` },
    { q: `Why do prices differ between metros?`, a: `Local labor and operating costs differ. The metro ranges here apply the US Bureau of Economic Analysis Regional Price Parities for services (2023, latest published), so a quote in Seattle naturally runs above one in Las Vegas for the same job.` },
  ];
  const title = `${N} cost in the US 2026: ${rng(s.lo, s.hi)} ${u} | Mizan`;
  const desc = `As of ${AS_OF}, ${art} typically costs ${rng(s.lo, s.hi)} ${u} in the US, most often around ${usd(s.typical)}. See the range for 23 metros and what residents actually pay — free, no ads.`;
  const jsonld = graph(canonPath, [['US home', '/us/'], ['US price guides', '/us/prices/'], [N, canonPath]], faqs, title, desc);
  return head(title, desc, canonPath, jsonld) + nav('Check a price', `/us/?service=${s.id}`) + `<main>
<div class="crumb"><a href="/us/">US home</a> / <a href="/us/prices/">Price guides</a> / ${esc(N)}</div>
<h1>${esc(`How much does ${art} cost in the US?`)}</h1>
<p class="lede">${cap(esc(art))} is typically advertised between <strong>${usd(s.lo)}</strong> and <strong>${usd(s.hi)}</strong> ${esc(u)}, with most quotes around <strong>${usd(s.typical)}</strong> — figures as of ${AS_OF}, from ${esc(SVC_SOURCES)}. Your metro, the provider and what's included all move the price, so the advertised rate is rarely the price you have to pay.</p>
<div class="rangecard"><div class="k">Typical US market range · ${AS_OF}</div><div class="big">${rng(s.lo, s.hi)}</div><div class="sub">${esc(cap(u))} · most quotes around ${usd(s.typical)}</div></div>
<h2>${esc(N)} prices by metro</h2>
<table><thead><tr><th>Metro</th><th class="ra">Typical advertised range</th></tr></thead><tbody>${rows}</tbody></table>
<p class="note">Estimates: the US national range adjusted per metro with the BEA Regional Price Parities for services (2023). Residents often pay below the top of the range.</p>
<h2>What is a fair price?</h2><p>A fair price for ${esc(n.replace(/^an? /, ''))} sits at or below the typical advertised figure. Residents who compare a couple of quotes usually pay noticeably less than the high end. Use the table above as a benchmark, then check your specific quote against what people actually paid.</p>
<div class="ctabox"><p>Got a quote for ${esc(n.replace(/^an? /, ''))}? See if it is fair in seconds.</p><a class="btn" href="/us/?service=${s.id}">Check your quote →</a></div>
<h2>Common questions</h2>
${faqBlock(faqs)}
${related ? `<h2>Related guides</h2><div class="related">${related}</div>` : ''}
</main>` + footer();
}
function serviceHub() {
  const canonPath = '/us/prices/';
  const groups = [];
  CATEGORIES.forEach(s => { let g = groups.find(x => x.k === s.group); if (!g) { g = { k: s.group, items: [] }; groups.push(g); } g.items.push(s); });
  const body = groups.map(g => `<div class="idxgroup"><h3>${esc(g.k)}</h3><div class="idxgrid">${g.items.map(s => `<a href="/us/prices/${META[s.id].slug}">${esc(cap(META[s.id].name.replace(/^an? /, '')))}</a>`).join('')}</div></div>`).join('');
  const title = 'US service price guides (2026) | Mizan';
  const desc = `Browse fair-price guides for ${CATEGORIES.length} everyday US services — HVAC, cleaning, movers, haircuts, urgent care and more — across 23 metros. See what residents actually pay.`;
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', name: title, url: `${ORIGIN}${canonPath}`, inLanguage: 'en-US', description: desc, dateModified: LASTMOD },
    { '@type': 'Dataset', name: 'Mizan US market price data', description: `Advertised US price ranges for ${CATEGORIES.length} everyday services with per-category sources (${SVC_SOURCES}) and BEA Regional Price Parities metro multipliers. As of ${AS_OF}.`, url: `${ORIGIN}${canonPath}`, isAccessibleForFree: true, dateModified: LASTMOD, distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${ORIGIN}/data/us-market-prices.json` }] },
  ] };
  return head(title, desc, canonPath, jsonld) + nav('Check a price', '/us/') + `<main>
<div class="crumb"><a href="/us/">US home</a> / Price guides</div>
<h1>US service price guides</h1><p class="lede">What everyday services really cost across the US, as of ${AS_OF}. Each guide shows the typical advertised range from ${esc(SVC_SOURCES)}, a per-metro breakdown, and what residents report actually paying. Pick a service, or <a href="/us/">check a specific quote</a>.</p>${body}</main>` + footer();
}

/* ===== US rent guides (/us/rent/<metro>) ===== */
function rentPage(a) {
  const slug = slugify(a.name), canonPath = `/us/rent/${slug}`;
  const typeName = { studio: 'Studio', '1br': '1 bedroom', '2br': '2 bedrooms', '3br': '3 bedrooms', house: 'House (3–4 bed)' };
  const rows = RTYPES.filter(t => a.r[t.id]).map(t => { const r = a.r[t.id]; return `<tr><td>${esc(typeName[t.id] || t.label)}</td><td class="r">${rng(r[0], r[2])}<span style="color:var(--faint)"> · median ${usd(r[1])}</span></td></tr>`; }).join('');
  const one = a.r['1br'] || a.r.studio;
  const faqs = [
    { q: `How much is rent for a 1-bedroom in ${a.name}?`, a: `As of ${AS_OF}, the median asking rent for a 1-bedroom in ${a.name} is about ${usd(one[1])} per month (${RENT_SOURCES}), with advertised listings roughly ${usd(one[0])} to ${usd(one[2])}.` },
    { q: `What is a fair rent in ${a.name}?`, a: `A fair rent sits at or below the median asking figure for that home type. Landlords advertise high and negotiate, so tenants often sign below the median — compare a few listings and check what tenants report actually signing on Mizan.` },
    { q: `Where do these rent figures come from?`, a: `Apartment medians come from Zumper's published city rent reports (September 2026); house figures from the Zillow Observed Rent Index single-family series (August 2026). The low–high spread is a derived advertised range around the published median.` },
  ];
  const related = RAREAS.filter(o => o.emirate === a.emirate && o.name !== a.name).slice(0, 4).map(o => `<a href="/us/rent/${slugify(o.name)}">${esc(o.name)}</a>`).join('');
  const title = `Average rent in ${a.name} 2026: 1-bed ${usd(one[1])}/mo | Mizan`;
  const desc = `Average rent in ${a.name} as of ${AS_OF}: a 1-bedroom is typically asked at ${usd(one[1])} per month; see studio to house ranges from Zumper and Zillow data, and what tenants actually sign.`;
  const jsonld = graph(canonPath, [['US home', '/us/'], ['Rent by metro', '/us/rent/metros'], [a.name, canonPath]], faqs, title, desc);
  return head(title, desc, canonPath, jsonld) + nav('Check your rent', `/us/rent?area=${encodeURIComponent(a.name)}`) + `<main>
<div class="crumb"><a href="/us/">US home</a> / <a href="/us/rent/metros">Rent by metro</a> / ${esc(a.name)}</div>
<h1>${esc(`Average rent in ${a.name} (2026)`)}</h1>
<p class="lede">Typical monthly asking rents in <strong>${esc(a.name)}</strong> by home type, as of ${AS_OF} — medians from ${esc(RENT_SOURCES)}. Landlords list high and negotiate, so tenants often sign below these figures.</p>
<h2>Average rent in ${esc(a.name)} by home type</h2>
<table><thead><tr><th>Home type</th><th class="ra">Asking rent / month</th></tr></thead><tbody>${rows}</tbody></table>
<p class="note">Medians are published figures; the low–high spread is a derived advertised range (0.8× / 1.3× the median). Actual signed rents vary with the building, unit and lease terms.</p>
<h2>What is a fair rent here?</h2><p>A fair rent in ${esc(a.name)} is at or below the median asking figure for that home type. Compare a few listings and check what tenants report actually signing — the gap between asking and signed is your room to negotiate.</p>
<div class="ctabox"><p>Renting in ${esc(a.name)}? Check if your rent is fair in seconds.</p><a class="btn" href="/us/rent?area=${encodeURIComponent(a.name)}">Open the rent checker →</a></div>
<h2>Common questions</h2>
${faqBlock(faqs)}
${related ? `<h2>Rent in nearby metros</h2><div class="related">${related}</div>` : ''}
</main>` + footer();
}
function rentHub() {
  const canonPath = '/us/rent/metros';
  const byRegion = [];
  RAREAS.forEach(a => { let g = byRegion.find(x => x.k === a.emirate); if (!g) { g = { k: a.emirate, items: [] }; byRegion.push(g); } g.items.push(a); });
  const body = byRegion.map(g => `<div class="idxgroup"><h3>${esc(g.k)}</h3><div class="idxgrid">${g.items.map(a => `<a href="/us/rent/${slugify(a.name)}">${esc(a.name)}</a>`).join('')}</div></div>`).join('');
  const title = 'US rent prices by metro (2026) | Mizan';
  const desc = `Median asking rents across ${RAREAS.length} US metros — studio to house — from Zumper and Zillow data, next to what tenants actually sign.`;
  const jsonld = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: `${ORIGIN}${canonPath}`, inLanguage: 'en-US', description: desc, dateModified: LASTMOD };
  return head(title, desc, canonPath, jsonld) + nav('Check your rent', '/us/rent') + `<main>
<div class="crumb"><a href="/us/">US home</a> / Rent by metro</div>
<h1>US rent prices by metro</h1><p class="lede">What it really costs to rent across the US, metro by metro, as of ${AS_OF} — median asking rents by home type from ${esc(RENT_SOURCES)}. Or <a href="/us/rent">open the rent checker</a>.</p>${body}</main>` + footer();
}

/* ===== US car repair guides (/us/motor/<job>) ===== */
function motorPage(job) {
  const slug = MSLUG[job.id] || slugify(job.label), canonPath = `/us/motor/${slug}`;
  const name = job.label, n = name.toLowerCase(), sizeOnly = !!job.sizeOnly;
  let rows, tableH, thFirst;
  if (sizeOnly) {
    thFirst = 'Body type'; tableH = `${cap(n)} cost by body type`;
    rows = M_BODY.map(b => `<tr><td>${esc(b.label)}</td><td class="r">${rng(job.base * b.m * 0.72, job.base * b.m * 1.5)}</td></tr>`).join('');
  } else {
    thFirst = 'Car brand'; tableH = `${cap(n)} cost by car brand`;
    rows = ['economy', 'american', 'euro', 'german', 'luxury'].map(t => `<tr><td>${esc(TIER_LABEL[t])}</td><td class="r">${rng(job.base * TIER_MULT[t] * 0.72, job.base * TIER_MULT[t] * 1.5)}</td></tr>`).join('');
  }
  const lo = fmt(job.base * 0.72), hi = fmt(job.base * (sizeOnly ? 1.25 : 2.1) * 1.5);
  const faqs = [
    { q: `How much does ${n} cost in the US?`, a: `As of ${AS_OF}, ${n} typically runs around $${lo} to $${hi} in the US — toward the lower end for Japanese/economy cars at an independent shop, higher for German or luxury brands and at dealers. Baseline figures come from ${MOTOR_SOURCES}.` },
    { q: `Why does ${n} vary so much between shops?`, a: `It depends on your car's make (parts cost), OEM vs aftermarket parts, labor rates, and dealer vs independent shop. That's why Mizan shows the typical range next to what drivers actually pay.` },
    { q: `Is a dealer or an independent shop cheaper?`, a: `For ${n}, independent shops are usually cheaper than dealers — often noticeably — but check reviews and ask about parts and any warranty.` },
  ];
  const related = MCATS.filter(o => o.group === job.group && o.id !== job.id).slice(0, 4).map(o => `<a href="/us/motor/${MSLUG[o.id] || slugify(o.label)}">${esc(o.label)}</a>`).join('');
  const title = `${cap(n)} price in the US 2026: $${lo}–$${hi} (cost by ${sizeOnly ? 'car size' : 'car brand'}) | Mizan`;
  const desc = `${cap(n)} in the US typically costs $${lo}–$${hi} as of ${AS_OF} — lower for economy cars at independent shops, higher for German and luxury brands and dealers. Check if your quote is fair.`;
  const jsonld = graph(canonPath, [['US home', '/us/'], ['Car repair costs', '/us/motor/jobs'], [cap(n), canonPath]], faqs, title, desc);
  return head(title, desc, canonPath, jsonld) + nav('Check your quote', `/us/motor?job=${job.id}`) + `<main>
<div class="crumb"><a href="/us/">US home</a> / <a href="/us/motor/jobs">Car repair costs</a> / ${esc(cap(n))}</div>
<h1>${esc(`How much does ${n} cost in the US?`)}</h1>
<p class="lede">What ${esc(n)} typically costs at US shops, by ${sizeOnly ? 'body type' : 'car-brand tier'}, as of ${AS_OF} — baseline from ${esc(MOTOR_SOURCES)}. German and luxury cars sit at the top; economy cars and independent shops at the bottom. Quotes vary a lot, so check yours against the range.</p>
<h2>${esc(tableH)}</h2>
<table><thead><tr><th>${esc(thFirst)}</th><th class="ra">Typical range</th></tr></thead><tbody>${rows}</tbody></table>
<p class="note">Typical 2026 estimates in USD for a standard job. Actual price depends on the exact model, OEM vs aftermarket parts, and the shop — dealers charge more than independents. Brand multipliers are a rough proxy from published brand repair-cost data.</p>
<h2>How to avoid overpaying</h2><p>Quotes for ${esc(n)} vary widely between shops. Get two or three quotes, ask whether parts are OEM or aftermarket, and check your number against the range above and what other drivers report paying.</p>
<div class="ctabox"><p>Got a quote for ${esc(n)}? Check if it's fair in seconds.</p><a class="btn" href="/us/motor?job=${job.id}">Check your quote →</a></div>
<h2>Common questions</h2>
${faqBlock(faqs)}
${related ? `<h2>Other car jobs</h2><div class="related">${related}</div>` : ''}
</main>` + footer();
}
function motorHub() {
  const canonPath = '/us/motor/jobs';
  const groups = []; MCATS.forEach(c => { let g = groups.find(x => x.k === c.group); if (!g) { g = { k: c.group, items: [] }; groups.push(g); } g.items.push(c); });
  const body = groups.map(g => `<div class="idxgroup"><h3>${esc(g.k)}</h3><div class="idxgrid">${g.items.map(c => `<a href="/us/motor/${MSLUG[c.id] || slugify(c.label)}">${esc(c.label)}</a>`).join('')}</div></div>`).join('');
  const title = 'US car service & repair costs (2026) | Mizan';
  const desc = 'What car service and repairs really cost in the US — oil change, brakes, alternator, AC, tires and more — by car brand, next to what drivers actually pay.';
  const jsonld = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: `${ORIGIN}${canonPath}`, inLanguage: 'en-US', description: desc, dateModified: LASTMOD };
  return head(title, desc, canonPath, jsonld) + nav('Check your quote', '/us/motor') + `<main>
<div class="crumb"><a href="/us/">US home</a> / Car repair costs</div>
<h1>US car repair & service costs</h1><p class="lede">What everyday car jobs cost across the US, by brand tier, as of ${AS_OF} — baselines from ${esc(MOTOR_SOURCES)}, with what drivers actually report paying. Pick a job, or <a href="/us/motor">check a specific quote</a>.</p>${body}</main>` + footer();
}

/* ===== write everything ===== */
let pages = 0;
const urls = [`${ORIGIN}/us/`, `${ORIGIN}/us/rent`, `${ORIGIN}/us/motor`];

const pricesDir = path.join(ROOT, 'us', 'prices');
fs.mkdirSync(pricesDir, { recursive: true });
fs.writeFileSync(path.join(pricesDir, 'index.html'), G(serviceHub())); pages++; urls.push(`${ORIGIN}/us/prices/`);
CATEGORIES.forEach(s => {
  if (!META[s.id]) throw new Error('missing META for ' + s.id);
  const d = path.join(pricesDir, META[s.id].slug); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'index.html'), G(servicePage(s))); pages++; urls.push(`${ORIGIN}/us/prices/${META[s.id].slug}`);
});

fs.mkdirSync(path.join(ROOT, 'us', 'rent', 'metros'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'us', 'rent', 'metros', 'index.html'), G(rentHub())); pages++; urls.push(`${ORIGIN}/us/rent/metros`);
RAREAS.forEach(a => {
  const d = path.join(ROOT, 'us', 'rent', slugify(a.name)); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'index.html'), G(rentPage(a))); pages++; urls.push(`${ORIGIN}/us/rent/${slugify(a.name)}`);
});

fs.mkdirSync(path.join(ROOT, 'us', 'motor', 'jobs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'us', 'motor', 'jobs', 'index.html'), G(motorHub())); pages++; urls.push(`${ORIGIN}/us/motor/jobs`);
MCATS.forEach(j => {
  const d = path.join(ROOT, 'us', 'motor', MSLUG[j.id] || slugify(j.label)); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'index.html'), G(motorPage(j))); pages++; urls.push(`${ORIGIN}/us/motor/${MSLUG[j.id] || slugify(j.label)}`);
});

fs.writeFileSync(path.join(ROOT, 'tools', 'us-urls.json'), JSON.stringify(urls, null, 1));
console.log(`Generated ${pages} US pages; ${urls.length} URLs written to tools/us-urls.json (merged into the sitemap by build-seo-pages.mjs).`);
