// Sunlight for the towns that do not have it yet, into data/town-data.json. Node 18+.
//
//   node scripts/towns-sun.mjs
//
// Source: Global Solar Atlas (Solargis, World Bank), CC BY 4.0, through its point service: GHI, the yearly
// global horizontal irradiation in kWh/m², and PVOUT, what a kWp of solar panels yields in a year. The first
// towns came from the atlas's Costa Rica GeoTIFFs (scripts/sun-map.py, which also draws the map overlay);
// the point service gives the same figures within about 1% (Tamarindo: 2,056 against 2,080 kWh/m²).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PATH = join(ROOT, 'data', 'town-data.json');
const data = JSON.parse(readFileSync(PATH, 'utf8'));
for (const [slug, t] of Object.entries(data.towns)) {
  if (t.ghi && t.pvout) continue;
  const [lng, lat] = t.coords;
  const r = await fetch(`https://api.globalsolaratlas.info/data/lta?loc=${lat},${lng}`);
  const a = (await r.json()).annual.data;
  t.ghi = Math.round(a.GHI);
  t.pvout = Math.round(a.PVOUT_csi);
  console.log(`${slug.padEnd(16)} GHI ${t.ghi} kWh/m², PVOUT ${t.pvout} kWh/kWp`);
  await new Promise((res) => setTimeout(res, 800));
}
writeFileSync(PATH, JSON.stringify(data, null, 1) + '\n');
