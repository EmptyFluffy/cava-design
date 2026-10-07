// Days of heavy rain, by month, for each town, into data/town-data.json. Node 18+.
//
//   node scripts/rain-days.mjs
//
// A heavy-rain day is one with 10 mm or more: on such days earthworks, foundations and concrete pours
// usually stop. Source: NASA POWER daily precipitation (MERRA-2, bias-corrected), 2001 to 2020, no
// restrictions on use. The monthly totals of this series agree with the CHIRPS rain on the pages
// (Tamarindo: 1,731 against 1,741 mm a year).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PATH = join(ROOT, 'data', 'town-data.json');
const data = JSON.parse(readFileSync(PATH, 'utf8'));
const HEAVY = 10;

for (const [slug, t] of Object.entries(data.towns)) {
  const [lng, lat] = t.coords;
  const q = new URLSearchParams({ parameters: 'PRECTOTCORR', community: 'RE', longitude: lng, latitude: lat, start: '20010101', end: '20201231', format: 'JSON' });
  const d = await (await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${q}`)).json();
  const days = Object.entries(d.properties.parameter.PRECTOTCORR).filter(([, v]) => v >= 0);
  const years = new Set(days.map(([k]) => k.slice(0, 4))).size;
  const heavy = Array(12).fill(0);
  for (const [k, v] of days) if (v >= HEAVY) heavy[+k.slice(4, 6) - 1]++;
  t.heavyDays = heavy.map((n) => +(n / years).toFixed(1));
  console.log(`${slug.padEnd(16)} ${t.heavyDays.map((n) => String(n).padStart(4)).join(' ')}  = ${t.heavyDays.reduce((a, b) => a + b, 0).toFixed(0)} a year`);
  await new Promise((r) => setTimeout(r, 600));
}
writeFileSync(PATH, JSON.stringify(data, null, 1) + '\n');
