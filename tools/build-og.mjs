// Generates the per-vertical OG share cards (og-services/rent/motor.png, 1200x630).
// One-off asset build (macOS fonts + resvg). Usage:
//   npm i @resvg/resvg-js && node tools/build-og.mjs /Users/saif/mizan
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';

const FONTS = [
  '/System/Library/Fonts/Supplemental/Georgia.ttf',
  '/System/Library/Fonts/Supplemental/Georgia Bold.ttf',
  '/System/Library/Fonts/Supplemental/Georgia Italic.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/System/Library/Fonts/GeezaPro.ttc',
];

const OUT = process.argv[2] || '/Users/saif/mizan';

const icon = (x, y, s, color, sw, op) =>
  `<g transform="translate(${x},${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"><path d="M16 5v22M9 27h14M6 11h20"/><path d="M6 11l-3.4 6.8a3.8 3.8 0 0 0 6.8 0z"/><path d="M26 11l-3.4 6.8a3.8 3.8 0 0 0 6.8 0z"/></g>`;

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function card({ eyebrow, noun, sub }) {
  eyebrow = esc(eyebrow); noun = esc(noun); sub = esc(sub);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="mist" cx="50%" cy="-8%" r="135%">
      <stop offset="0%" stop-color="#EFF3F1"/><stop offset="55%" stop-color="#E3EAE8"/><stop offset="100%" stop-color="#D5E0DD"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#mist)"/>
  ${icon(936, 206, 9.2, '#14534D', 2.2, 0.06)}
  ${icon(88, 74, 1.3, '#14534D', 2.4, 1)}
  <text x="146" y="106" font-family="Arial" font-weight="700" font-size="35" fill="#1C1A15">Mizan</text>
  <text x="258" y="106" font-family="Geeza Pro, Arial" font-size="31" fill="#14534D">ميزان</text>
  <text x="90" y="210" font-family="Arial" font-weight="700" font-size="21" letter-spacing="3" fill="#5E7A72">${eyebrow}</text>
  <text x="85" y="308" font-family="Georgia" font-weight="700" font-size="95" fill="#1C1A15">${noun}</text>
  <text x="85" y="404" font-family="Georgia" font-weight="700" font-style="italic" font-size="95" fill="#14534D">fair?</text>
  <text x="90" y="462" font-family="Arial" font-size="29" fill="#55514A">${sub}</text>
  <rect x="88" y="500" rx="20" width="90" height="40" fill="#EBF2EC"/><text x="133" y="526" font-family="Arial" font-weight="700" font-size="19" fill="#2F7D54" text-anchor="middle">Fair</text>
  <rect x="190" y="500" rx="20" width="100" height="40" fill="#F7EFDD"/><text x="240" y="526" font-family="Arial" font-weight="700" font-size="19" fill="#9A6314" text-anchor="middle">Steep</text>
  <rect x="302" y="500" rx="20" width="152" height="40" fill="#F6E7E2"/><text x="378" y="526" font-family="Arial" font-weight="700" font-size="19" fill="#B5402F" text-anchor="middle">Walk away</text>
  <text x="90" y="597" font-family="Arial" font-weight="700" font-size="24" fill="#14534D">mizan-price.com</text>
  <text x="324" y="597" font-family="Arial" font-size="24" fill="#8A857B">·  free, no sign-up</text>
  <rect x="0" y="622" width="1200" height="8" fill="#14534D"/>
</svg>`;
}

const CARDS = {
  'og-services': { eyebrow: 'FAIR PRICES · UAE', noun: 'Is this price', sub: 'What UAE residents actually pay for home & personal services — before you say yes.' },
  'og-rent':     { eyebrow: 'RENT · UAE',        noun: 'Is your rent',  sub: "Fair rent by community, plus Dubai's legal rent-increase calculator." },
  'og-motor':    { eyebrow: 'CAR SERVICE & REPAIR · UAE', noun: 'Is your quote', sub: 'Typical UAE repair prices by car brand, next to what drivers actually pay.' },
};

for (const [name, spec] of Object.entries(CARDS)) {
  const svg = card(spec);
  const r = new Resvg(svg, { font: { fontFiles: FONTS, loadSystemFonts: true, defaultFontFamily: 'Arial' }, fitTo: { mode: 'width', value: 1200 } });
  const png = r.render().asPng();
  fs.writeFileSync(`${OUT}/${name}.png`, png);
  console.log(`✓ ${name}.png (${(png.length/1024).toFixed(0)} KB)`);
}
