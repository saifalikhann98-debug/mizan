// Mizan — WhatsApp entry point ("message a number, get a verdict"). P4 growth channel.
// WhatsApp Business Cloud API webhook: GET = Meta's subscription handshake, POST = inbound
// messages. Stateless by design — every message carries the whole question:
//   "ac service in al qusais"            → the going rate
//   "ac service al qusais 300"           → verdict on a quote
//   "paid 250 for ac service in al qusais" → records a price (and unlocks the resident range)
//
// Honesty rules carry over from the site (CLAUDE.md): the ADVERTISED market estimate
// (area-adjusted, labelled) and the resident-PAID range (>=5 recent reports, IQR-trimmed,
// verified receipts 2x) are never blended. The reciprocity gate carries over too: the paid
// range unlocks by contributing — in the same message, or remembered per phone once the
// docs/backend-setup.md §5 device migration has run. The phone number itself is NEVER
// stored: submissions carry only a one-way hash shaped as the anonymous device id.
//
// Service/area data comes from api/bot-data.json, generated from index.html by
// tools/build-bot-data.mjs — rerun it whenever CATEGORIES/AREA_GROUPS change.
//
// Required env vars (Vercel → Project → Settings → Environment Variables):
//   WHATSAPP_TOKEN        — Cloud API access token (permanent system-user token in prod)
//   WHATSAPP_PHONE_ID     — the business phone-number id from Meta's "API Setup" page
//   WHATSAPP_VERIFY_TOKEN — any random string; must match the one typed into Meta's webhook form
// Setup walkthrough: docs/whatsapp-setup.md

const crypto = require('crypto');
const DATA = require('./bot-data.json');

const SUPABASE_URL = 'https://weouzxiubblpsquxdeok.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlb3V6eGl1YmJscHNxdXhkZW9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3Nzc3MjAsImV4cCI6MjA5NzM1MzcyMH0.-y37t_zdUg-VKsUOeJJwmZGCps8buAzpe8V4lx6LOSg'; // public anon key, RLS-enforced — same one shipped in the site
const SB_HEADERS = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' };
const SITE = 'https://www.mizan-price.com';

const CATS = Object.fromEntries(DATA.categories.map(c => [c.id, c]));

/* ---------------- text matching ---------------- */
// keep letters/digits; fold punctuation to spaces ("a/c" → "a c", "re-gas" → "re gas")
const norm = s => String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9؀-ۿ]+/g, ' ').replace(/\s+/g, ' ').trim();
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (t, w) => new RegExp('(?:^| )' + escRe(w) + '(?: |$)').test(t);

// alias → category id. Matched longest-first so "car ac" beats "ac", "ac installation" beats "ac".
const SVC_ALIASES = Object.entries({
  ac: ['ac service', 'ac cleaning', 'ac clean', 'a c', 'aircon', 'air con', 'air conditioner', 'air conditioning', 'split ac', 'ac'],
  acinstall: ['ac installation', 'ac install', 'install ac', 'new ac'],
  ductclean: ['duct cleaning', 'duct'],
  cleaning: ['deep clean', 'deep cleaning', 'house cleaning', 'home cleaning', 'apartment cleaning', 'villa cleaning', 'cleaning'],
  pest: ['pest control', 'pest', 'cockroach', 'exterminator', 'fumigation'],
  upholstery: ['sofa cleaning', 'carpet cleaning', 'mattress cleaning', 'sofa', 'carpet', 'upholstery', 'mattress'],
  watertank: ['water tank', 'tank cleaning'],
  pool: ['pool'],
  windows: ['window cleaning', 'windows'],
  handyman: ['handyman'],
  plumber: ['plumber', 'plumbing', 'leak', 'pipe'],
  electrician: ['electrician', 'electrical', 'wiring', 'socket'],
  painting: ['painting', 'painter', 'paint'],
  applrepair: ['washing machine', 'washer', 'fridge', 'refrigerator', 'dishwasher', 'dryer repair', 'appliance', 'oven'],
  tvmount: ['tv mount', 'tv mounting', 'tv wall', 'mount tv'],
  carserv: ['car service', 'minor service', 'major service'],
  carwash: ['car wash', 'car detailing', 'detailing', 'polish'],
  oilchange: ['oil change'],
  tyres: ['tyres', 'tyre', 'tires', 'tire'],
  carac: ['car ac', 'ac regas', 'ac re gas', 'ac gas', 'regas'],
  carbattery: ['car battery', 'battery'],
  tint: ['tinting', 'tint'],
  haircut: ['haircut', 'hair cut', 'barber', 'mens hair'],
  salon: ['blow dry', 'blowdry', 'cut and blow', 'salon'],
  womenshair: ['cut and color', 'cut and colour', 'hair color', 'hair colour', 'hair dye', 'highlights', 'womens cut'],
  keratin: ['keratin', 'hair treatment', 'protein treatment', 'hair botox'],
  manipedi: ['mani pedi', 'manicure', 'pedicure', 'nails', 'mani', 'pedi'],
  facial: ['facial'],
  massage: ['massage'],
  waxing: ['waxing', 'threading', 'eyebrow', 'wax'],
  lashes: ['eyelash', 'lashes', 'lash'],
  gym: ['gym'],
  gp: ['doctor visit', 'doctor', 'clinic', 'gp'],
  dental: ['teeth cleaning', 'dentist', 'dental', 'scaling'],
  physio: ['physiotherapy', 'physio'],
  eyetest: ['eye test', 'eye exam', 'optician'],
  bloodtest: ['blood test', 'blood panel', 'lab test'],
  petgroom: ['pet grooming', 'dog grooming', 'cat grooming', 'grooming'],
  vet: ['veterinary', 'vet'],
  petboard: ['pet boarding', 'dog boarding', 'pet hotel', 'boarding'],
  maid: ['maid', 'part time cleaner', 'hourly cleaner', 'cleaner'],
  nanny: ['nanny', 'babysitter'],
  tutor: ['tutor', 'tuition', 'private teacher'],
  swim: ['swimming lessons', 'swimming lesson', 'swimming class', 'swim class', 'swimming'],
  laundry: ['laundry', 'wash and fold'],
  dryclean: ['dry cleaning', 'dry clean', 'drycleaning'],
  tailoring: ['tailoring', 'tailor', 'alterations', 'alteration', 'stitching'],
  movers: ['movers', 'moving', 'mover', 'relocation', 'shifting', 'packers', 'house move'],
}).flatMap(([id, list]) => list.map(a => [a, id])).sort((x, y) => y[0].length - x[0].length);

function matchCategory(t) {
  for (const [alias, id] of SVC_ALIASES) if (hasWord(t, alias)) return CATS[id];
  return null;
}

// area name variants: full name, name minus "(...)", the parenthetical itself (JVC, JVT…),
// and the "al "-less form — plus manual shorthand people actually type.
const AREA_MANUAL = {
  'dubai marina': 'Dubai Marina', marina: 'Dubai Marina', downtown: 'Downtown Dubai', tecom: 'Barsha Heights',
  greens: 'The Greens', views: 'The Views', 'media city': 'Dubai Media City', palm: 'Palm Jumeirah',
  silicon: 'Silicon Oasis', 'sports city': 'Dubai Sports City', 'festival city': 'Dubai Festival City',
  creek: 'Dubai Creek Harbour', 'hills estate': 'Dubai Hills Estate', ranches: 'Arabian Ranches',
  springs: 'The Springs', meadows: 'The Meadows', 'abu dhabi': 'Abu Dhabi – Corniche', reem: 'Al Reem Island',
  yas: 'Yas Island', sharjah: 'Sharjah – City', ajman: 'Ajman – City', rak: 'RAK – City',
  'ras al khaimah': 'RAK – City', fujairah: 'Fujairah – City', 'umm al quwain': 'Umm Al Quwain – City', uaq: 'Umm Al Quwain – City',
};
const AREA_VARIANTS = (() => {
  const out = [];
  for (const a of DATA.areas) {
    const seen = new Set();
    const add = v => { v = norm(v); if (v && v !== 'dubai' && !seen.has(v)) { seen.add(v); out.push([v, a]); } };
    add(a.name);
    const par = a.name.match(/\(([^)]+)\)/); if (par) add(par[1]);
    const noPar = norm(a.name.replace(/\([^)]*\)/, '')); add(noPar);
    if (noPar.startsWith('al ')) add(noPar.slice(3));
  }
  const byName = Object.fromEntries(DATA.areas.map(a => [a.name, a]));
  for (const [alias, name] of Object.entries(AREA_MANUAL)) if (byName[name]) out.push([norm(alias), byName[name]]);
  return out.sort((x, y) => y[0].length - x[0].length);
})();

function matchArea(t) {
  for (const [alias, area] of AREA_VARIANTS) if (hasWord(t, alias)) return area;
  return null;
}

/* ---------------- numbers ---------------- */
const num = (s, k) => { let v = parseFloat(String(s).replace(/,/g, '')); if (k) v *= 1000; return isFinite(v) && v > 0 ? v : 0; };
function extractPaid(raw) { // "paid 250" / "paid aed 1,200" / "paid 1.2k"
  const m = raw.match(/\bpaid\s*(?:aed)?\s*([\d,]+(?:\.\d+)?)\s*(k)?\b/i);
  return m ? num(m[1], m[2]) : 0;
}
function extractQuote(raw) { // last standalone number in the message; <10 is noise ("2 bed"), not a price
  const m = [...raw.matchAll(/(?:aed\s*)?(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/gi)];
  if (!m.length) return 0;
  const last = m[m.length - 1], v = num(last[1], last[2]);
  return v >= 10 ? v : 0;
}

/* ---------------- stats (mirrors the app: 12-mo fresh window, verified 2x, IQR fence) ---------------- */
const RECENT_MS = 12 * 30 * 24 * 3600 * 1000;
const pct = (arr, q) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
function iqrKeep(p) { if (p.length < 4) return p; const q1 = pct(p, .25), q3 = pct(p, .75), iqr = q3 - q1, lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr; const kept = p.filter(x => x >= lo && x <= hi); return kept.length ? kept : p; }
async function fetchStats(catId, area) {
  const url = `${SUPABASE_URL}/rest/v1/submissions?select=price,verified,created_at&category=eq.${encodeURIComponent(catId)}&area=eq.${encodeURIComponent(area)}&order=created_at.desc&limit=500`;
  const r = await fetch(url, { headers: SB_HEADERS });
  if (!r.ok) throw new Error('stats ' + r.status);
  const all = (await r.json()).map(x => ({ p: +x.price, v: !!x.verified, t: Date.parse(x.created_at) }));
  const fresh = all.filter(d => Date.now() - d.t <= RECENT_MS);
  const use = fresh.length >= 3 ? fresh : all;
  if (!use.length) return { count: 0 };
  const kept = iqrKeep(use.flatMap(d => d.v ? [d.p, d.p] : [d.p]));
  return { count: use.length, p25: pct(kept, .25), p50: pct(kept, .5), p75: pct(kept, .75) };
}

/* ---------------- reciprocity + submissions (phone hashed, never stored) ---------------- */
function deviceOf(waId) { // deterministic uuid-shaped one-way hash → works with the §5 device column
  const h = crypto.createHash('sha256').update('mizan-wa:' + waId).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
async function hasContributed(device) { // only works once the §5 migration adds the device column
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/submissions?select=created_at&device=eq.${device}&limit=1`, { headers: SB_HEADERS });
    if (!r.ok) return false;
    return (await r.json()).length > 0;
  } catch { return false; }
}
async function addSubmission(sub) {
  const body = { category: sub.c, area: sub.a, price: sub.p, note: 'via whatsapp', device: sub.device };
  const post = () => fetch(`${SUPABASE_URL}/rest/v1/submissions`, { method: 'POST', headers: { ...SB_HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify(body) });
  let r = await post();
  if (!r.ok && r.status === 400) {
    const t = await r.text().catch(() => '');
    if (/column|schema cache/i.test(t) && /device/i.test(t)) { delete body.device; r = await post(); } // §5 not run yet
    else if (t) { const e = new Error(t.slice(0, 200)); e.reject = true; throw e; }                     // trigger/constraint said no
  }
  if (!r.ok) {
    if (r.status >= 400 && r.status < 500 && r.status !== 401) { const e = new Error('rejected ' + r.status); e.reject = true; throw e; }
    throw new Error('add failed ' + r.status);
  }
}

/* ---------------- replies ---------------- */
const aed = n => 'AED ' + Math.round(n).toLocaleString('en-US');
const round5 = n => Math.round(n / 5) * 5;
const range = (a, b) => `${aed(round5(a))} – ${aed(round5(b)).replace('AED ', '')}`;
const linkFor = (catId, area) => `${SITE}/?service=${encodeURIComponent(catId)}&area=${encodeURIComponent(area)}`;

const HELP = `*Mizan* — fair prices for everyday services in the UAE, from real residents. Free and anonymous.

Ask like this:
• "ac service in al qusais" — the going rate
• "ac service al qusais 300" — verdict on a quote
• "paid 250 for ac service in al qusais" — add what you paid (it unlocks what residents actually pay)

I cover ~45 services — AC, cleaning, salon, car, movers and more — across all seven emirates.
Browse everything: ${SITE}`;

const UNKNOWN_SVC = `I didn't recognise the service. Try for example: "ac service", "deep cleaning", "oil change", "haircut", "movers", "pest control"…

Full list: ${SITE}`;

async function buildReply(raw, from) {
  const t = norm(raw);
  if (!t || (t.length < 20 && /^(hi|hello|hey|salam|salaam|start|help|menu|thanks|thank you|shukran)\b/.test(t))) return HELP;

  const cat = matchCategory(t);
  const area = matchArea(t);
  const isPaid = /(^| )paid( |$)/.test(t);

  if (isPaid) {
    const amount = extractPaid(raw);
    if (!amount) return `How much did you pay? Send it like: "paid 250 for ac service in al qusais"`;
    if (!cat || !area) return `Almost — tell me the service and area in the same message, like:\n"paid ${amount} for ac service in al qusais"`;
    if (amount >= 1000000) return `That price looks too high — double-check and resend?`;
    try {
      await addSubmission({ c: cat.id, a: area.name, p: Math.round(amount), device: deviceOf(from) });
    } catch (e) {
      return e && e.reject
        ? `That didn't go through — you've hit today's limit for this service and area. Try again tomorrow.`
        : `Couldn't save that right now — please try again in a bit.`;
    }
    const s = await fetchStats(cat.id, area.name).catch(() => ({ count: 0 }));
    const typ = round5(cat.typical * area.mult);
    const vs = Math.round((amount / typ - 1) * 100);
    const vsLine = vs <= -3 ? `You paid ${-vs}% under the typical advertised price (${aed(typ)}). Nicely done.`
      : vs >= 3 ? `That's ${vs}% over the typical advertised price (${aed(typ)}) — your report helps the next person push back.`
        : `That's right around the typical advertised price (${aed(typ)}).`;
    let paidLine = '';
    if (s.count >= 5) paidLine = `\nResidents paid here: ${range(s.p25, s.p75)} (${s.count} reports)`;
    else if (s.count > 0) paidLine = `\n${s.count} report${s.count > 1 ? 's' : ''} here so far — ${Math.max(0, 5 - s.count)} more and the resident range goes live.`;
    return `Added — thank you. 🙏 The next person who checks *${cat.label}* in *${area.name}* gets a sharper answer because of you.\n${paidLine}\n${vsLine}\n\n${linkFor(cat.id, area.name)}`;
  }

  if (!cat) return UNKNOWN_SVC;
  if (!area) return `Got it — *${cat.label}*. Which area? For example:\n"${cat.label.toLowerCase()} in al qusais" — or JVC, Dubai Marina, Deira, Sharjah…`;

  const q = extractQuote(raw);
  const [s, unlocked] = await Promise.all([
    fetchStats(cat.id, area.name).catch(() => ({ count: 0 })),
    hasContributed(deviceOf(from)),
  ]);
  const mLow = round5(cat.lo * area.mult), mHigh = round5(cat.hi * area.mult), mTyp = round5(cat.typical * area.mult);
  const hasPaid = s.count >= 5, paidVisible = hasPaid && unlocked;

  const lines = [`*${cat.label} — ${area.name}*`, '', `Advertised (list): ${range(mLow, mHigh)} _(market estimate, area-adjusted)_`];
  if (paidVisible) lines.push(`Residents paid: ${range(s.p25, s.p75)} (${s.count} reports)`);
  else if (hasPaid) lines.push(`🔒 ${s.count} residents reported what they paid here — reply "paid <amount>" after your job and I'll show you their range.`);
  else if (s.count > 0) lines.push(`${s.count} resident report${s.count > 1 ? 's' : ''} so far — ${5 - s.count} more unlocks the real paid range.`);
  else lines.push(`No resident reports here yet — be the first: reply "paid <amount>" after your job.`);

  if (q) {
    let verdict, why;
    if (paidVisible) {
      if (q <= s.p75) { verdict = 'FAIR ✅'; why = q <= s.p50 ? 'At or below what residents typically pay here. Lock it in.' : 'Within the range residents actually report paying. Reasonable.'; }
      else if (q <= mHigh) { verdict = 'STEEP ⚠️'; why = `That's ~${Math.round((q / s.p50 - 1) * 100)}% over what residents typically paid — you're near list price, there's room to push back.`; }
      else { verdict = 'WALK AWAY ⛔'; why = 'Above even the highest advertised rate. Get another quote before you commit.'; }
    } else {
      if (q <= mLow) { verdict = 'BELOW MARKET ✅'; why = `Cheaper than what companies usually advertise. Looks fair — confirm what's included.`; }
      else if (q <= mTyp) { verdict = 'AROUND MARKET 👍'; why = 'Close to the going advertised rate. Reasonable — real paid prices often run lower.'; }
      else if (q <= mHigh) { verdict = 'STEEP ⚠️'; why = `That's ~${Math.round((q / mTyp - 1) * 100)}% over the typical advertised price. Shop one or two more quotes first.`; }
      else { verdict = 'WALK AWAY ⛔'; why = 'Above even the highest advertised rate. Get another quote before you commit.'; }
      why += ' _(vs advertised prices — not verified paid data)_';
    }
    lines.push('', `Your quote ${aed(q)} → *${verdict}*`, why);
  } else {
    lines.push('', `Typical advertised: ${aed(mTyp)}. Send the price you were quoted for a verdict, e.g. "${norm(cat.label).split(' ').slice(0, 2).join(' ')} ${area.name.toLowerCase()} ${mTyp}".`);
  }
  lines.push('', linkFor(cat.id, area.name));
  return lines.join('\n');
}

/* ---------------- WhatsApp Cloud API ---------------- */
const GRAPH_V = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0'; // Graph versions retire ~2 yearly — override via env without a deploy
async function sendText(to, body) {
  const r = await fetch(`https://graph.facebook.com/${GRAPH_V}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { preview_url: false, body } }),
  });
  if (!r.ok) console.error('whatsapp send failed', r.status, await r.text().catch(() => ''));
}

module.exports = async (req, res) => {
  if (req.method === 'GET') { // Meta's webhook verification handshake
    const q = req.query || {};
    const vt = process.env.WHATSAPP_VERIFY_TOKEN;
    if (vt && q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === vt) { res.status(200).send(q['hub.challenge']); return; }
    res.status(403).send('forbidden'); return;
  }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) { res.status(200).json({ ok: true, note: 'env not configured' }); return; }

  try {
    // dig out the first inbound user message (status callbacks etc. are ignored)
    const msgs = [];
    for (const e of (req.body && req.body.entry) || [])
      for (const ch of e.changes || [])
        for (const m of (ch.value && ch.value.messages) || []) msgs.push(m);
    const m = msgs[0];
    if (m && m.from) {
      const text = m.type === 'text' && m.text ? m.text.body
        : m.type === 'button' && m.button ? m.button.text
          : m.type === 'interactive' && m.interactive ? ((m.interactive.button_reply || m.interactive.list_reply || {}).title || '')
            : '';
      const reply = text ? await buildReply(text, m.from).catch(e => { console.error('buildReply', e); return `Something went wrong on my side — try again in a minute?`; }) : HELP;
      await sendText(m.from, reply); // must finish before we respond — serverless freezes after res
    }
  } catch (e) { console.error('webhook', e); }
  res.status(200).json({ ok: true }); // always 200 so Meta doesn't retry-storm
};

// exposed for tests only (node -e / CI); not part of the webhook contract
module.exports._test = { norm, matchCategory, matchArea, extractPaid, extractQuote, deviceOf, buildReply };
