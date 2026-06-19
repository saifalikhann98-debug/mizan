// Mizan SEO page generator.
// Reads CATEGORIES + AREA_GROUPS straight out of ../index.html (single source of truth, zero drift),
// then emits one price-guide page per service + a /prices hub + page.css + sitemap.xml.
// Run from the repo root:  node tools/build-seo-pages.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://www.mizan-price.com';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// --- extract the live data from index.html (the app stays the single source of truth) ---
const CATEGORIES = eval(html.match(/const CATEGORIES=(\[[\s\S]*?\n\]);/)[1]);
const AREA_GROUPS = eval(html.match(/const AREA_GROUPS=(\[[\s\S]*?\n\]);/)[1]);

// representative cost multiplier per emirate (avg of its areas' multipliers)
const emirates = AREA_GROUPS.map(g => ({
  name: g.emirate,
  mult: g.areas.reduce((s, a) => s + a[1], 0) / g.areas.length,
}));
const dubaiMult = emirates.find(e => e.name === 'Dubai').mult;

// SEO-friendly concise name + slug per service id
const SEO = {
  ac:{name:'AC cleaning',slug:'ac-cleaning'}, cleaning:{name:'home deep cleaning',slug:'home-deep-cleaning'},
  pest:{name:'pest control',slug:'pest-control'}, ductclean:{name:'AC duct cleaning',slug:'ac-duct-cleaning'},
  upholstery:{name:'sofa & carpet cleaning',slug:'sofa-carpet-cleaning'}, watertank:{name:'water tank cleaning',slug:'water-tank-cleaning'},
  pool:{name:'pool maintenance',slug:'pool-maintenance'}, windows:{name:'window cleaning',slug:'window-cleaning'},
  handyman:{name:'handyman service',slug:'handyman'}, plumber:{name:'plumber call-out',slug:'plumber'},
  electrician:{name:'electrician call-out',slug:'electrician'}, painting:{name:'painting',slug:'painting'},
  applrepair:{name:'appliance repair',slug:'appliance-repair'}, tvmount:{name:'TV wall-mounting',slug:'tv-wall-mounting'},
  acinstall:{name:'AC installation',slug:'ac-installation'}, carserv:{name:'car service',slug:'car-service'},
  carwash:{name:'car wash & detailing',slug:'car-wash-detailing'}, oilchange:{name:'oil change',slug:'oil-change'},
  tyres:{name:'tyre replacement',slug:'tyre-replacement'}, carac:{name:'car AC re-gas',slug:'car-ac-regas'},
  carbattery:{name:'car battery replacement',slug:'car-battery-replacement'}, tint:{name:'car window tinting',slug:'car-window-tinting'},
  haircut:{name:"men's haircut",slug:'mens-haircut'}, salon:{name:'salon cut & blow-dry',slug:'salon-blow-dry'},
  womenshair:{name:"women's cut & colour",slug:'womens-cut-colour'}, keratin:{name:'keratin treatment',slug:'keratin-treatment'},
  manipedi:{name:'mani-pedi',slug:'mani-pedi'}, facial:{name:'facial',slug:'facial'}, massage:{name:'massage',slug:'massage'},
  waxing:{name:'waxing & threading',slug:'waxing-threading'}, lashes:{name:'eyelash extensions',slug:'eyelash-extensions'},
  gym:{name:'gym membership',slug:'gym-membership'}, gp:{name:'GP consultation',slug:'gp-consultation'},
  dental:{name:'dental cleaning',slug:'dental-cleaning'}, physio:{name:'physiotherapy',slug:'physiotherapy'},
  eyetest:{name:'eye test',slug:'eye-test'}, bloodtest:{name:'blood test',slug:'blood-test'},
  petgroom:{name:'pet grooming',slug:'pet-grooming'}, vet:{name:'vet consultation',slug:'vet-consultation'},
  petboard:{name:'pet boarding',slug:'pet-boarding'}, maid:{name:'hourly maid service',slug:'maid-cleaner'},
  nanny:{name:'nanny',slug:'nanny'}, tutor:{name:'private tutor',slug:'private-tutor'}, swim:{name:'swimming lessons',slug:'swimming-lessons'},
  laundry:{name:'laundry',slug:'laundry'}, dryclean:{name:'dry cleaning',slug:'dry-cleaning'}, tailoring:{name:'tailoring & alterations',slug:'tailoring-alterations'},
};
const UNIT = {'/unit':'per unit','/job':'per job','/visit':'per visit','/month':'per month','/hour':'per hour',
  '/room':'per room','/repair':'per repair','/service':'per service','/set':'per set','/car':'per car',
  '/cut':'per cut','/session':'per session','/panel':'per panel','/night':'per night','/lesson':'per lesson','/kg':'per kg','/item':'per item','/move':'per move'};

const round5 = n => Math.round(n / 5) * 5;
const aed = n => round5(n).toLocaleString('en-US');
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

const services = CATEGORIES.map(c => {
  const meta = SEO[c.id] || { name: c.label.toLowerCase(), slug: c.id };
  return { ...c, ...meta, unitText: UNIT[c.unit] || '' };
});

// ---- shared stylesheet for the guide pages (brand tokens + light/dark) ----
const CSS = `:root{--ink:#1C1A15;--ink-2:#43403A;--muted:#65615A;--faint:#8A857A;--faint-2:#A39D90;
  --surface:#fff;--surface-2:#FBFAF5;--line:#EAE4D6;--line-2:#EFEADF;--teal:#14534D;--teal-deep:#0F423D;
  --on-teal:#F4F0E6;--bg:radial-gradient(140% 90% at 50% -10%,#EEF2F1 0%,#E3EAE8 55%,#D7E2DF 100%);
  --serif:'Newsreader',Georgia,serif;--mono:'Geist Mono',ui-monospace,monospace}
:root[data-theme="dark"]{--ink:#ECE8E0;--ink-2:#CFC9BD;--muted:#A8A398;--faint:#8E8779;--faint-2:#8C8678;
  --surface:#1C201E;--surface-2:#252A27;--line:#343A36;--line-2:#2E332F;--teal:#5BBBA6;--teal-deep:#74CCB8;
  --on-teal:#0E1A17;--bg:radial-gradient(140% 90% at 50% -10%,#16201E 0%,#121A18 55%,#0D1413 100%)}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{background:var(--bg);min-height:100vh;color:var(--ink);font-family:'Geist',system-ui,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:var(--teal);text-decoration:none}a:hover{text-decoration:underline}
.nav{border-bottom:1px solid var(--line);background:rgba(248,246,240,.82);backdrop-filter:saturate(140%) blur(12px)}
:root[data-theme="dark"] .nav{background:rgba(18,24,22,.82)}
.nav-in{max-width:760px;margin:0 auto;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand{display:flex;align-items:center;gap:9px;color:var(--ink)}
.brand svg{width:21px;height:21px}.brand .w{font-family:var(--serif);font-size:23px}.brand .ar{font-size:17px;color:var(--teal);opacity:.7}
.nav a.cta{font-size:13.5px;font-weight:600;color:var(--teal)}
main{max-width:760px;margin:0 auto;padding:clamp(28px,5vw,48px) 24px 72px}
.crumb{font-size:12.5px;color:var(--faint-2);margin-bottom:22px}.crumb a{color:var(--faint-2)}
h1{font-family:var(--serif);font-weight:500;font-size:clamp(32px,6vw,46px);line-height:1.08;letter-spacing:.2px;margin:0 0 18px}
.lede{font-size:17px;color:var(--muted);margin:0 0 30px}
.lede strong{color:var(--ink-2);font-weight:600}
.rangecard{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:24px;margin:0 0 34px;
  box-shadow:0 1px 2px rgba(40,34,20,.04),0 18px 40px -34px rgba(40,34,20,.3)}
.rangecard .k{font-size:11px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:var(--faint)}
.rangecard .big{font-family:var(--mono);font-size:34px;font-weight:600;color:var(--teal);margin:6px 0 2px}
.rangecard .sub{font-size:13.5px;color:var(--muted)}
h2{font-family:var(--serif);font-weight:500;font-size:26px;margin:38px 0 14px;letter-spacing:.2px}
p{font-size:15.5px;color:var(--muted);margin:0 0 16px}p strong{color:var(--ink-2);font-weight:600}
table{width:100%;border-collapse:collapse;margin:6px 0 8px;font-size:14.5px}
th,td{text-align:left;padding:12px 4px;border-bottom:1px solid var(--line)}
th{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
td.r{font-family:var(--mono);color:var(--ink-2);text-align:right;white-space:nowrap}
.note{font-size:12.5px;color:var(--faint-2);margin:0 0 30px}
.ctabox{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:24px;text-align:center;margin:34px 0}
.ctabox p{margin:0 0 16px;color:var(--ink-2)}
.btn{display:inline-block;background:var(--teal);color:var(--on-teal);font-weight:600;font-size:15px;
  padding:13px 22px;border-radius:12px;box-shadow:0 10px 22px -12px rgba(20,83,77,.8)}
.btn:hover{background:var(--teal-deep);text-decoration:none}
details{border-top:1px solid var(--line)}details:last-of-type{border-bottom:1px solid var(--line)}
summary{list-style:none;cursor:pointer;padding:16px 2px;font-weight:600;color:var(--ink);display:flex;justify-content:space-between;gap:14px}
summary::-webkit-details-marker{display:none}summary::after{content:"+";font-family:var(--mono);color:var(--faint-2)}
details[open] summary::after{content:"\\2212"}
details p{padding:0 0 16px;font-size:14.5px}
.related{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0 0}
.related a{font-size:13.5px;border:1px solid var(--line);border-radius:999px;padding:7px 14px;color:var(--ink-2)}
.related a:hover{border-color:var(--teal);color:var(--teal);text-decoration:none}
.idxgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px 24px}
.idxgroup{margin:26px 0 0}.idxgroup h3{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);margin:0 0 8px}
.idxgrid a{display:block;padding:7px 0;font-size:15px;color:var(--ink-2);border-bottom:1px solid var(--line)}
.idxgrid a:hover{color:var(--teal);text-decoration:none}
footer{border-top:1px solid var(--line);margin-top:48px}
.foot-in{max-width:760px;margin:0 auto;padding:24px;font-size:12.5px;color:var(--faint-2)}`;

const SCALE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="#14534D" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v17"/><path d="M5 20h14"/><path d="M4 7h16"/><path d="M4 7l-2.5 5a3 3 0 0 0 5 0z"/><path d="M20 7l-2.5 5a3 3 0 0 0 5 0z"/></svg>`;
const THEME_SCRIPT = `<script>(function(){try{var s=localStorage.getItem('mizan:theme');var d=s||((window.matchMedia&&matchMedia('(prefers-color-scheme:dark)').matches)?'dark':'light');document.documentElement.setAttribute('data-theme',d);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();</script>`;
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">`;

function head(title, desc, url, jsonld) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}"><meta name="robots" content="index,follow">
<meta name="theme-color" content="#EEF2F1" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#16201E" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="article"><meta property="og:site_name" content="Mizan"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${ORIGIN}/og.png">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:image" content="${ORIGIN}/og.png">
${THEME_SCRIPT}${FONTS}<link rel="stylesheet" href="/prices/page.css">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script></head><body>`;
}
const navHtml = `<header class="nav"><div class="nav-in"><a class="brand" href="/">${SCALE_SVG}<span class="w">Mizan</span><span class="ar">ميزان</span></a><a class="cta" href="/">Check a price</a></div></header>`;
const footHtml = `<footer><div class="foot-in">Mizan shows advertised list prices next to what UAE residents report paying. Reports are anonymous. Prices are estimates, not quotes. <a href="/prices/">All price guides</a> · <a href="/">Home</a></div></footer></body></html>`;

function servicePage(s) {
  const url = `${ORIGIN}/prices/${s.slug}`;
  const title = `${cap(s.name)} prices in the UAE (2026) | Mizan`;
  const desc = `What does ${s.name} cost in the UAE? Typical market range AED ${aed(s.lo)} to ${aed(s.hi)} ${s.unitText}, plus what residents actually pay across Dubai, Abu Dhabi, Sharjah and more.`;
  const rows = emirates.map(e =>
    `<tr><td>${esc(e.name)}</td><td class="r">AED ${aed(s.lo*e.mult)} – ${aed(s.hi*e.mult)}</td></tr>`).join('');
  const related = services.filter(o => o.group === s.group && o.id !== s.id).slice(0, 4)
    .map(o => `<a href="/prices/${o.slug}">${esc(cap(o.name))}</a>`).join('');
  const faqs = [
    { q: `How much does ${s.name} cost in Dubai?`,
      a: `In Dubai, ${s.name} is typically advertised around AED ${aed(s.lo*dubaiMult)} to AED ${aed(s.hi*dubaiMult)} ${s.unitText}. Many residents pay less than the top of that range.` },
    { q: `What is a fair price for ${s.name} in the UAE?`,
      a: `A fair price is usually at or below the typical advertised figure of about AED ${aed(s.typical)}. Compare two or three quotes and check them against what residents report paying on Mizan.` },
    { q: `Why do ${s.name} prices vary so much?`,
      a: `Prices move with your area, the provider's tier, and exactly what the quote includes. That is why Mizan shows the advertised range next to what people actually pay.` },
  ];
  const jsonld = { "@context":"https://schema.org","@graph":[
    {"@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":ORIGIN+"/"},
      {"@type":"ListItem","position":2,"name":"Price guides","item":ORIGIN+"/prices/"},
      {"@type":"ListItem","position":3,"name":cap(s.name),"item":url}]},
    {"@type":"FAQPage","mainEntity":faqs.map(f=>({"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}}))}
  ]};
  return head(title, desc, url, jsonld) + navHtml + `<main>
<div class="crumb"><a href="/">Home</a> / <a href="/prices/">Price guides</a> / ${esc(cap(s.name))}</div>
<h1>How much does ${esc(s.name)} cost in the UAE?</h1>
<p class="lede">${cap(esc(s.name))} in the UAE is typically advertised between <strong>AED ${aed(s.lo)}</strong> and <strong>AED ${aed(s.hi)}</strong> ${esc(s.unitText)}, with most quotes around <strong>AED ${aed(s.typical)}</strong>. Actual prices swing with your area, the provider, and what is included, so the advertised rate is rarely the price you have to pay.</p>
<div class="rangecard"><div class="k">Typical UAE market range</div><div class="big">AED ${aed(s.lo)} – ${aed(s.hi)}</div><div class="sub">${esc(cap(s.unitText||'per service'))} · most quotes around AED ${aed(s.typical)}</div></div>
<h2>${cap(esc(s.name))} prices by emirate</h2>
<table><thead><tr><th>Emirate</th><th style="text-align:right">Typical advertised range</th></tr></thead><tbody>${rows}</tbody></table>
<p class="note">Estimates: Dubai/Abu Dhabi list prices adjusted by a rough cost factor for each emirate. Residents often pay below the top of the range.</p>
<h2>What is a fair price?</h2>
<p>A fair price for ${esc(s.name)} sits at or below the typical advertised figure. Residents who compare a couple of quotes usually pay noticeably less than the high end. Use the table above as a benchmark, then check your specific quote against what people actually paid.</p>
<div class="ctabox"><p>Got a quote for ${esc(s.name)}? See if it is fair in seconds.</p><a class="btn" href="/?service=${s.id}">Check your ${esc(s.name)} quote →</a></div>
<h2>Common questions</h2>
${faqs.map(f=>`<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n')}
${related?`<h2>Related guides</h2><div class="related">${related}</div>`:''}
</main>` + footHtml;
}

function indexPage() {
  const url = `${ORIGIN}/prices/`;
  const title = `Service price guides for Dubai & the UAE | Mizan`;
  const desc = `Browse fair-price guides for ${services.length} everyday UAE services - AC cleaning, salon, gym, movers, pest control and more. See what residents actually pay.`;
  const groups = [];
  services.forEach(s => { let g = groups.find(x => x.name === s.group); if (!g) { g = { name: s.group, items: [] }; groups.push(g); } g.items.push(s); });
  const body = groups.map(g => `<div class="idxgroup"><h3>${esc(g.name)}</h3><div class="idxgrid">${
    g.items.map(s => `<a href="/prices/${s.slug}">${esc(cap(s.name))}</a>`).join('')}</div></div>`).join('');
  const jsonld = { "@context":"https://schema.org","@type":"CollectionPage","name":title,"url":url,
    "description":desc,"breadcrumb":{"@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":ORIGIN+"/"},
      {"@type":"ListItem","position":2,"name":"Price guides","item":url}]}};
  return head(title, desc, url, jsonld) + navHtml + `<main>
<div class="crumb"><a href="/">Home</a> / Price guides</div>
<h1>UAE service price guides</h1>
<p class="lede">What everyday services really cost across the UAE. Each guide shows the typical advertised range, a per-emirate breakdown, and what residents report actually paying. Pick a service to dig in, or <a href="/">check a specific quote</a>.</p>
${body}
</main>` + footHtml;
}

// ---- write everything ----
const pricesDir = path.join(ROOT, 'prices');
fs.mkdirSync(pricesDir, { recursive: true });
fs.writeFileSync(path.join(pricesDir, 'page.css'), CSS);
fs.writeFileSync(path.join(pricesDir, 'index.html'), indexPage());
services.forEach(s => {
  const dir = path.join(pricesDir, s.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), servicePage(s));
});

// ---- sitemap with all URLs ----
const urls = [ORIGIN + '/', ORIGIN + '/prices/', ...services.map(s => `${ORIGIN}/prices/${s.slug}`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u}</loc><changefreq>weekly</changefreq><priority>${u === ORIGIN + '/' ? '1.0' : '0.7'}</priority></url>`).join('\n') +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

console.log(`Generated ${services.length} service pages + index + page.css; sitemap has ${urls.length} URLs.`);
