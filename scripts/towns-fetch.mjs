// Collects the data behind each town page into data/town-data.json. Node 18+, no dependencies.
//
//   node scripts/towns-fetch.mjs            fetch towns not in data/town-data.json yet
//   node scripts/towns-fetch.mjs --force    fetch every town again
//
// Then run scripts/towns-rain.py for the rain (CHIRPS climatology), then node scripts/build.mjs.
// Temperature and wind come from the nearest weather station (scripts/stations.mjs), chosen at build time.
//
// Sources, all open for commercial use:
//   coordinates, canton, province   OpenStreetMap (Nominatim), 1 request a second as its policy asks
//   elevation                       SRTM 30 m (public domain), through the OpenTopoData public API
//   driving time to the airports    OpenStreetMap roads, OSRM demo server (public site, credited), 1 request a second
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'town-data.json');
const { towns } = JSON.parse(readFileSync(join(ROOT, 'data', 'towns.json'), 'utf8'));
const have = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { towns: {} };
const force = process.argv.includes('--force');

const UA = { 'User-Agent': 'cava.design town pages (hola@cava.design)' };
const AIRPORTS = { LIR: [-85.5444, 10.5933], SJO: [-84.2088, 9.9939] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (url, headers = {}) => {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, { headers });
    if (r.ok) return r.json();
    await sleep(2000 * (i + 1));
  }
  throw new Error(`failed: ${url}`);
};


for (const t of towns) {
  if (have.towns[t.slug] && !force) continue;
  process.stdout.write(`${t.slug}: `);
  const [place] = await get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(t.query)}&format=jsonv2&limit=1&countrycodes=cr`, UA);
  if (!place) throw new Error(`no geocode for ${t.query}`);
  const lat = +(+place.lat).toFixed(5), lng = +(+place.lon).toFixed(5);
  await sleep(1100);
  const rev = await get(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=10&accept-language=es`, UA);
  await sleep(1100);
  const elev = await get(`https://api.opentopodata.org/v1/srtm30m?locations=${lat},${lng}`);
  await sleep(1100);
  const roads = {};
  for (const [code, [alng, alat]] of Object.entries(AIRPORTS)) {
    const r = await get(`https://router.project-osrm.org/route/v1/driving/${lng},${lat};${alng},${alat}?overview=false`);
    roads[code] = { km: Math.round(r.routes[0].distance / 1000), min: Math.round(r.routes[0].duration / 60) };
    await sleep(1100);
  }
  have.towns[t.slug] = {
    coords: [lng, lat],
    osm: place.display_name,
    canton: rev.address?.county ?? null,
    province: rev.address?.state ?? null,
    elevation: Math.max(0, Math.round(elev.results[0].elevation)),
    roads,
    rain: have.towns[t.slug]?.rain ?? null,
  };
  console.log(`${lat}, ${lng} | ${have.towns[t.slug].canton}, ${have.towns[t.slug].province} | ${have.towns[t.slug].elevation} m | LIR ${roads.LIR.min} min, SJO ${roads.SJO.min} min`);
  have.fetched = new Date().toISOString().slice(0, 10);
  writeFileSync(OUT, JSON.stringify(have, null, 1) + '\n');
}
console.log('done');
