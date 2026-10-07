// The wind field for the climate map, by season, into site/assets/data/wind.json. Node 18+.
//
//   node scripts/wind-map.mjs
//
// Source: NASA POWER climatology (MERRA-2 reanalysis, 2001 to 2020), wind at 10 m, monthly means on its
// native 0.5 x 0.625 degree grid. No restrictions on use; NASA asks for the credit printed on the map.
// Seasons: dry, December to April; rainy, May to November (the Pacific calendar most of the country follows).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// wider than the country, so the moving lines reach the edges of any view the map allows
const BOX = { 'longitude-min': -88.5, 'longitude-max': -79.5, 'latitude-min': 5.5, 'latitude-max': 14 };
const SEASONS = { dry: ['DEC', 'JAN', 'FEB', 'MAR', 'APR'], wet: ['MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV'] };

const get = async (par) => {
  const q = new URLSearchParams({ parameters: par, community: 'RE', format: 'JSON', ...BOX });
  const r = await fetch(`https://power.larc.nasa.gov/api/temporal/climatology/regional?${q}`);
  const d = await r.json();
  if (!d.features) throw new Error(JSON.stringify(d).slice(0, 300));
  return d.features;
};
const U = await get('U10M');
const V = await get('V10M');
const lons = [...new Set(U.map((f) => f.geometry.coordinates[0]))].sort((a, b) => a - b);
const lats = [...new Set(U.map((f) => f.geometry.coordinates[1]))].sort((a, b) => a - b);
const at = (feats, par, lo, la) => feats.find((f) => f.geometry.coordinates[0] === lo && f.geometry.coordinates[1] === la).properties.parameter[par];
const season = (months) => {
  const grid = (feats, par) => lats.map((la) => lons.map((lo) => { const v = at(feats, par, lo, la); return +(months.reduce((a, m) => a + v[m], 0) / months.length).toFixed(2); }));
  return { u: grid(U, 'U10M'), v: grid(V, 'V10M') };
};
const out = {
  source: 'NASA POWER (MERRA-2), wind at 10 m, 2001 to 2020',
  note: 'u = eastward, v = northward, m/s. Rows run south to north (lats ascending), columns west to east.',
  lons, lats, seasons: { dry: season(SEASONS.dry), wet: season(SEASONS.wet) },
};
mkdirSync(join(ROOT, 'site', 'assets', 'data'), { recursive: true });
writeFileSync(join(ROOT, 'site', 'assets', 'data', 'wind.json'), JSON.stringify(out));
const mean = (s) => { const f = out.seasons[s]; const u = f.u.flat(), v = f.v.flat(); const mu = u.reduce((a, b) => a + b) / u.length, mv = v.reduce((a, b) => a + b) / v.length; return `${Math.hypot(mu, mv).toFixed(1)} m/s from ${Math.round((Math.atan2(-mu, -mv) * 180) / Math.PI + 360) % 360}°`; };
console.log(`${lons.length} x ${lats.length} grid; dry season mean ${mean('dry')}, rainy season ${mean('wet')}`);
