// Submits every URL in sitemap.xml to IndexNow (instant indexing for Bing, Yandex & partners;
// they share submissions). The IndexNow key is PUBLIC by design — it lives in <key>.txt at the
// site root, which is how the endpoint verifies we own the host.
// Run after any deploy that adds or changes pages:  node tools/indexnow-submit.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'www.mizan-price.com';

// the key file is the one <32 hex chars>.txt at the repo root
const keyFile = fs.readdirSync(ROOT).find(f => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) { console.error('No IndexNow key file (<32-hex>.txt) found at repo root.'); process.exit(1); }
const key = fs.readFileSync(path.join(ROOT, keyFile), 'utf8').trim();

const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
if (!urlList.length) { console.error('sitemap.xml has no URLs'); process.exit(1); }

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList }),
});
console.log(`IndexNow: submitted ${urlList.length} URLs → HTTP ${res.status} ${res.statusText}`);
if (!res.ok && res.status !== 202) { console.error(await res.text()); process.exit(1); }
