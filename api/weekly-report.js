// Mizan — weekly bucket snapshot, emailed automatically.
// Runs weekly via Vercel Cron (see vercel.json). Read-only: queries the live
// Supabase submissions and emails a summary via Resend. Never writes/changes anything.
//
// Required env vars (set in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY   — from resend.com (free)
//   REPORT_EMAIL     — where the report goes (use the same email you signed up to Resend with)
// Optional:
//   CRON_SECRET      — if set, the endpoint requires it (Vercel Cron sends it automatically).
//
// The Supabase URL + anon key below are the public, read-only, RLS-enforced values already
// shipped in the site's client code — safe to include here.

const SUPABASE_URL = 'https://weouzxiubblpsquxdeok.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlb3V6eGl1YmJscHNxdXhkZW9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3Nzc3MjAsImV4cCI6MjA5NzM1MzcyMH0.-y37t_zdUg-VKsUOeJJwmZGCps8buAzpe8V4lx6LOSg';

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

module.exports = async (req, res) => {
  // Optional protection: if CRON_SECRET is set, require it (Vercel Cron adds it automatically).
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers['authorization'] || '') !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'unauthorized' }); return;
  }
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const REPORT_EMAIL = process.env.REPORT_EMAIL;
  if (!RESEND_API_KEY || !REPORT_EMAIL) {
    res.status(500).json({ error: 'Missing RESEND_API_KEY or REPORT_EMAIL env var' }); return;
  }

  // 1) fetch submissions (read-only)
  let rows;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/submissions?select=category,area,price,created_at&order=created_at.desc&limit=5000`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
    rows = await r.json();
    if (!Array.isArray(rows)) throw new Error('unexpected response');
  } catch (e) {
    res.status(502).json({ error: 'failed to fetch data', detail: String(e) }); return;
  }

  // 2) build the bucket board
  const now = Date.now(), day = 864e5;
  const total = rows.length;
  const new7 = rows.filter(x => now - Date.parse(x.created_at) <= 7 * day).length;
  const b = {};
  rows.forEach(x => { const k = x.category + '|' + x.area; (b[k] = b[k] || []).push(+x.price); });
  const rank = Object.entries(b).map(([k, v]) => {
    const [c, a] = k.split('|'); const s = [...v].sort((x, y) => x - y);
    return { c, a, n: v.length, med: s[Math.floor(s.length / 2)] };
  }).sort((x, y) => y.n - x.n);
  const live = rank.filter(o => o.n >= 5), close = rank.filter(o => o.n >= 3 && o.n < 5), early = rank.filter(o => o.n < 3);

  const row = o => `<tr><td style="padding:4px 10px 4px 0;font-weight:700;color:#1C1A15;white-space:nowrap">${o.n}/5</td><td style="padding:4px 12px 4px 0">${esc(o.c)} <span style="color:#8A857B">@ ${esc(o.a)}</span></td><td style="padding:4px 0;color:#55514A;white-space:nowrap">~AED ${o.med}</td></tr>`;
  const section = (title, list, empty) => `<h3 style="margin:22px 0 6px;font-size:15px;color:#1C1A15">${title}</h3>` +
    (list.length ? `<table style="border-collapse:collapse;font-size:14px;width:100%">${list.map(row).join('')}</table>` : `<div style="color:#8A857B;font-size:14px">${empty}</div>`);
  const seed = close.filter(o => !o.c.startsWith('motor-')).map(o =>
    `<div style="font-size:13px;margin:4px 0"><a href="https://www.mizan-price.com/?service=${encodeURIComponent(o.c)}&amp;area=${encodeURIComponent(o.a)}" style="color:#1C1A15;font-weight:600">${esc(o.c)} @ ${esc(o.a)}</a> — needs ${5 - o.n} more to flip</div>`).join('');

  const headline = new7 > 0
    ? `${new7} new price${new7 > 1 ? 's' : ''} this week — nice, keep it going.`
    : `No new prices in the last 7 days — a couple of posts this week would restart the flow.`;

  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1C1A15;padding:8px 4px">
    <div style="font-size:13px;letter-spacing:2px;color:#5E7A72;font-weight:700">MIZAN · WEEKLY SNAPSHOT</div>
    <h2 style="font-size:22px;margin:6px 0 2px">${total} real prices in the book</h2>
    <div style="color:#55514A;font-size:15px">${esc(headline)}</div>
    ${section('🟢 Live — showing real "residents paid"', live, 'None live yet — 5 prices in one bucket flips it.')}
    ${section('🟡 Close — one or two away', close, 'None close right now.')}
    ${seed ? `<div style="margin:8px 0 0">${seed}</div>` : ''}
    ${section('⚪ Early — 1–2 prices', early, 'None.')}
    <div style="margin:26px 0 0;font-size:12px;color:#8A857B;border-top:1px solid #EAE4D6;padding-top:12px">Automated weekly from mizan-price.com · read-only snapshot · this inbox isn't monitored.</div>
  </div>`;

  // 3) send via Resend REST API (no SDK dependency)
  try {
    const er = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Mizan <onboarding@resend.dev>',
        to: [REPORT_EMAIL],
        subject: `Mizan weekly — ${total} prices, ${live.length} live bucket${live.length !== 1 ? 's' : ''}`,
        html,
      }),
    });
    const ejson = await er.json().catch(() => ({}));
    if (!er.ok) { res.status(502).json({ error: 'resend failed', detail: ejson }); return; }
    res.status(200).json({ ok: true, sent_to: REPORT_EMAIL, total, new7, live: live.length, close: close.length });
  } catch (e) {
    res.status(502).json({ error: 'send failed', detail: String(e) }); return;
  }
};
