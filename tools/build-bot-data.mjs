// Extracts the UAE services data the WhatsApp bot needs (categories + area cost factors)
// from index.html into api/bot-data.json — same no-drift pattern as build-llms-full.mjs,
// so the bot can never disagree with the site. Rerun after editing CATEGORIES or
// AREA_GROUPS in index.html:  node tools/build-bot-data.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CATEGORIES = eval(html.match(/const CATEGORIES=(\[[\s\S]*?\n\]);/)[1]);
const AREA_GROUPS = eval(html.match(/const AREA_GROUPS=(\[[\s\S]*?\n\]);/)[1]);

const out = {
  generated: new Date().toISOString().slice(0, 10),
  categories: CATEGORIES.map(c => ({ id: c.id, label: c.label, lo: c.lo, hi: c.hi, typical: c.typical, unit: c.unit })),
  areas: AREA_GROUPS.flatMap(g => g.areas.map(a => ({ name: a[0], emirate: g.emirate, mult: a[1] }))),
};
fs.writeFileSync(path.join(ROOT, 'api', 'bot-data.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`api/bot-data.json written (${out.categories.length} services, ${out.areas.length} areas)`);
