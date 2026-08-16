// Generates the OG share cards (og.png + og-services/rent/motor.png, 1200x630) in the current
// "Outfit / teal band" design system. Renders an HTML card with a headless Chromium (Brave) so
// the real Outfit webfont is used — no font files kept in the repo.
//   node tools/build-og.mjs [/path/to/mizan] [/path/to/chromium-binary]
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

const OUT = process.argv[2] || '/Users/saif/mizan';
const BROWSER = process.argv[3] || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SCALE = `<svg viewBox="0 0 32 32" fill="none" stroke="#F6F4EC" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 5v22M9 27h14M6 11h20"/><path d="M6 11l-3.4 6.8a3.8 3.8 0 0 0 6.8 0z"/><path d="M26 11l-3.4 6.8a3.8 3.8 0 0 0 6.8 0z"/></svg>`;

function card({ eyebrow, h1, h1em, h1tail, sub }) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Geist+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{background:#173F35;color:#F6F4EC;font-family:Outfit,system-ui,sans-serif;-webkit-font-smoothing:antialiased;position:relative}
.wm{position:absolute;left:84px;top:64px;display:flex;align-items:center;gap:14px;font-size:34px;font-weight:500}
.wm svg{width:34px;height:34px}.wm .ar{color:#8FCDB1;font-weight:400;font-size:30px;font-family:'Geeza Pro','IBM Plex Sans Arabic',system-ui}
.eyebrow{position:absolute;left:86px;top:178px;font-size:19px;letter-spacing:.18em;text-transform:uppercase;color:rgba(246,244,236,.62);font-weight:500}
.hd{position:absolute;left:82px;top:212px;width:1000px}
h1{font-size:96px;font-weight:300;line-height:1.02;letter-spacing:-.03em}
h1 em{font-style:normal;font-weight:500;color:#8FCDB1}
.sub{margin:26px 0 0 4px;font-size:29px;color:rgba(246,244,236,.74);width:900px;line-height:1.35}
.chips{position:absolute;left:86px;top:530px;display:flex;gap:12px}
.chip{border-radius:999px;padding:9px 20px;font-size:19px;font-weight:500;background:rgba(246,244,236,.12);border:1px solid rgba(246,244,236,.28)}
.chip.f{color:#BFE3CE}.chip.s{color:#F0D493}.chip.w{color:#F4B7A9}
.url{position:absolute;right:86px;top:539px;font-size:23px;font-weight:500;color:rgba(246,244,236,.9)}
.url span{color:rgba(246,244,236,.55);font-weight:400}
</style></head><body>
<div class="wm">${SCALE}<span>Mizan</span><span class="ar">ميزان</span></div>
<div class="eyebrow">${esc(eyebrow)}</div>
<div class="hd"><h1>${esc(h1)} <em>${esc(h1em)}</em>${esc(h1tail)}</h1><div class="sub">${esc(sub)}</div></div>
<div class="chips"><span class="chip f">Fair</span><span class="chip s">Steep</span><span class="chip w">Walk away</span></div>
<div class="url">mizan-price.com <span>· free, no sign-up</span></div>
</body></html>`;
}

const CARDS = {
  'og':          { eyebrow: 'Fair prices · UAE',              h1: 'Know the',       h1em: 'fair price', h1tail: ' before you pay.', sub: 'What UAE residents actually paid, next to what companies advertise — services, rent and car repair.' },
  'og-services': { eyebrow: 'Fair prices · UAE',              h1: 'Is this price',  h1em: 'fair',       h1tail: '?',               sub: 'What UAE residents actually pay for home & personal services — before you say yes.' },
  'og-rent':     { eyebrow: 'Rent · UAE',                     h1: 'Is your rent',   h1em: 'fair',       h1tail: '?',               sub: "Fair rent by community, plus Dubai's legal rent-increase calculator." },
  'og-motor':    { eyebrow: 'Car service & repair · UAE',     h1: 'Is your quote',  h1em: 'fair',       h1tail: '?',               sub: 'Typical UAE repair prices by car brand, next to what drivers actually pay.' },
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mizan-og-'));
for (const [name, spec] of Object.entries(CARDS)) {
  const html = path.join(tmp, name + '.html'); fs.writeFileSync(html, card(spec));
  const png = path.join(OUT, name + '.png');
  execFileSync(BROWSER, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-color-profile=srgb', '--force-device-scale-factor=1',
    '--window-size=1200,630', '--virtual-time-budget=6000', `--screenshot=${png}`, 'file://' + html], { stdio: 'ignore' });
  console.log(`✓ ${name}.png (${(fs.statSync(png).size / 1024).toFixed(0)} KB)`);
}
