// Collects the data behind each town page into data/town-data.json. Node 18+, no dependencies.
//
//   node scripts/towns-fetch.mjs            fetch towns not in data/town-data.json yet
//   node scripts/towns-fetch.mjs --force    fetch every town again
//
// Then run scripts/towns-rain.py for the rain (CHIRPS climatology), then node scripts/build.mjs.
//
// Sources, all public:
//   coordinates, canton, province   OpenStreetMap (Nominatim), 1 request a second as its policy asks
//   elevation                       Copernicus DEM 90 m, through the Open-Meteo elevation API
//   temperature                     ECMWF reanalysis through the Open-Meteo archive API, 2015 to 2024
//   wind                            the same, hourly, 2020 to 2024, afternoons only (11:00 to 16:59): the breeze
//                                   a house is opened to. Kept as monthly vector sums so the build can add up seasons.
//   driving time to the airports    OpenStreetMap roads, OSRM routing, no traffic
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
  const elev = await get(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
  const met = await get(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=2015-01-01&end_date=2024-12-31&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FCosta_Rica`);
  const d = met.daily;
  const tmax = Array.from({ length: 12 }, () => []), tmin = Array.from({ length: 12 }, () => []);
  d.time.forEach((day, i) => {
    const m = +day.slice(5, 7) - 1;
    if (d.temperature_2m_max[i] != null) tmax[m].push(d.temperature_2m_max[i]);
    if (d.temperature_2m_min[i] != null) tmin[m].push(d.temperature_2m_min[i]);
  });
  // Afternoon wind: x = east component, y = north component (where the wind comes from), s = sum of speeds.
  const h = (await get(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=2020-01-01&end_date=2024-12-31&hourly=wind_direction_10m,wind_speed_10m&timezone=America%2FCosta_Rica`)).hourly;
  const wind = Array.from({ length: 12 }, () => ({ x: 0, y: 0, s: 0 }));
  h.time.forEach((t, i) => {
    const hour = +t.slice(11, 13), dir = h.wind_direction_10m[i], sp = h.wind_speed_10m[i];
    if (hour < 11 || hour > 16 || dir == null || sp == null) return;
    const w = wind[+t.slice(5, 7) - 1];
    w.x += sp * Math.sin((dir * Math.PI) / 180); w.y += sp * Math.cos((dir * Math.PI) / 180); w.s += sp;
  });
  wind.forEach((w) => { w.x = Math.round(w.x); w.y = Math.round(w.y); w.s = Math.round(w.s); });
  const avg = (a) => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
  const roads = {};
  for (const [code, [alng, alat]] of Object.entries(AIRPORTS)) {
    const r = await get(`https://router.project-osrm.org/route/v1/driving/${lng},${lat};${alng},${alat}?overview=false`);
    roads[code] = { km: Math.round(r.routes[0].distance / 1000), min: Math.round(r.routes[0].duration / 60) };
    await sleep(500);
  }
  have.towns[t.slug] = {
    coords: [lng, lat],
    osm: place.display_name,
    canton: rev.address?.county ?? null,
    province: rev.address?.state ?? null,
    elevation: Math.round(elev.elevation[0]),
    tmax: tmax.map(avg),
    tmin: tmin.map(avg),
    wind, // per month, afternoons: vector sums (see above)
    roads,
    rain: have.towns[t.slug]?.rain ?? null,
  };
  console.log(`${lat}, ${lng} | ${have.towns[t.slug].canton}, ${have.towns[t.slug].province} | ${have.towns[t.slug].elevation} m | LIR ${roads.LIR.min} min, SJO ${roads.SJO.min} min`);
  have.fetched = new Date().toISOString().slice(0, 10);
  writeFileSync(OUT, JSON.stringify(have, null, 1) + '\n');
}
console.log('done');
