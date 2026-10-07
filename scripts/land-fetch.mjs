// Official land values for all of Costa Rica, into site/assets/data/land.pmtiles and data/land/. Node 18+.
//
//   node scripts/land-fetch.mjs            fetch what is not cached yet, then build
//   node scripts/land-fetch.mjs --refresh  fetch everything again (a new year of editions)
//
// Source: Ministerio de Hacienda, Órgano de Normalización Técnica, "Plataformas de valores de terrenos por
// zonas homogéneas": 8,752 zones in the 84 cantons, ₡ per m² (ArcGIS REST, sig.hacienda.go.cr). The zone
// layer has no year; the edition year comes from the lot-type table of the same server, joined on
// CONCATENADO. Values are published as they are, never altered.
//
// The server sits behind Akamai: a quoted SQL "where" got an IP blocked for ten minutes, so this asks only
// for where=1=1, pages slowly and caches every page in data/land/raw/ (not committed). Needs tippecanoe
// (brew install tippecanoe) for the tiles.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'data', 'land', 'raw');
const REFRESH = process.argv.includes('--refresh');
const ZONES = 'https://sig.hacienda.go.cr/server/rest/services/Zonas_Homogeneas_ONT/MapServer/0/query';
const LOTS = 'https://sig.hacienda.go.cr/server/rest/services/Capa_Zonas_homogeneas/FeatureServer/1/query';
mkdirSync(RAW, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function page(url, params, file) {
  const path = join(RAW, file);
  if (!REFRESH && existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
  const res = await fetch(`${url}?${new URLSearchParams(params)}`, { headers: { 'user-agent': 'Mozilla/5.0 (Studio CAVA land map; hola@cava.design)' } });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`${file}: not JSON (${res.status}), the server may be blocking: ${text.slice(0, 120)}`); }
  if (data.error) throw new Error(`${file}: ${JSON.stringify(data.error)}`);
  writeFileSync(path, text);
  console.log(`  fetched ${file}`);
  await sleep(4000);
  return data;
}

// ---- 1. the zones, 1,000 at a time ----
const zones = [];
for (let offset = 0; ; offset += 1000) {
  const d = await page(ZONES, {
    where: '1=1', outFields: 'OBJECTID,PROVINCIA,CANTON,DISTRITO,COD_ZONAH,NOMBRE_ZONAH,VALOR,TIPO_DE_USO,CATEGORIZADA,CONCATENADO',
    returnGeometry: 'true', outSR: '4326', geometryPrecision: '5', orderByFields: 'OBJECTID',
    resultOffset: String(offset), resultRecordCount: '1000', f: 'geojson',
  }, `zones-${String(offset).padStart(5, '0')}.json`);
  zones.push(...d.features);
  if (d.features.length < 1000 && !d.properties?.exceededTransferLimit) break;
}
console.log(`${zones.length} zones`);

// ---- 2. the lot-type table: edition year, second and rural values, the lot the value is set for ----
const lots = [];
for (let offset = 0; ; offset += 2000) {
  const d = await page(LOTS, {
    where: '1=1', outFields: 'OBJECTID,CONCATENADO,COD_ZONAH,AÑO,TIPOZONA_U_R,VALOR,AREA_ZH,FRENTE', returnGeometry: 'false',
    orderByFields: 'OBJECTID', resultOffset: String(offset), resultRecordCount: '2000', f: 'json',
  }, `lots-${String(offset).padStart(5, '0')}.json`);
  lots.push(...d.features.map((f) => f.attributes));
  if (d.features.length < 2000 && !d.exceededTransferLimit) break;
}
console.log(`${lots.length} lot-type rows`);
const byKey = new Map();
for (const l of lots) { if (!byKey.has(l.CONCATENADO)) byKey.set(l.CONCATENADO, []); byKey.get(l.CONCATENADO).push(l); }

// ---- 3. join, and keep only what the map shows ----
const cantons = JSON.parse(readFileSync(join(ROOT, 'data', 'land', 'cantons.json'), 'utf8'));
const SMALL = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'a', 'al', 'en']);
const title = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
  .replace(/(^|[\s\-(/])([a-záéíóúñü])/g, (m, p, c) => p + c.toUpperCase())
  .replace(/ (De|Del|La|Las|El|Los|Y|E|A|Al|En) /g, (m, w) => ` ${w.toLowerCase()} `)
  .replace(/\bZmt\b/g, 'ZMT').replace(/\bInvu\b/g, 'INVU').replace(/\bIct\b/g, 'ICT');
const years = {};
const features = [];
for (const z of zones) {
  const p = z.properties;
  // water bodies (Lake Arenal) come without a canton or a value
  if (!z.geometry || !(p.VALOR > 0) || !String(p.PROVINCIA ?? '').trim()) continue;
  const code = `${p.PROVINCIA}${String(p.CANTON).padStart(2, '0')}`;
  const rows = byKey.get(p.CONCATENADO) ?? [];
  const urban = [...new Set(rows.filter((r) => r.TIPOZONA_U_R === 1).map((r) => r.VALOR))].filter((v) => v !== p.VALOR);
  const rural = rows.find((r) => r.TIPOZONA_U_R === 2 && r.VALOR !== p.VALOR);
  const first = rows.find((r) => r.VALOR === p.VALOR) ?? rows[0];
  const year = Math.max(0, ...rows.map((r) => +r.AÑO || 0)) || null;
  if (year) { years[code] ??= {}; years[code][year] = (years[code][year] || 0) + 1; }
  const props = {
    id: p.OBJECTID, c: code, d: String(p.DISTRITO).padStart(2, '0'), z: p.COD_ZONAH, n: title(p.NOMBRE_ZONAH), v: Math.round(p.VALOR),
    u: (p.TIPO_DE_USO || '').trim().slice(0, 2),
  };
  if (year) props.y = year;
  if (urban.length) props.v2 = Math.round(urban[0]);
  if (rural) props.r = Math.round(rural.VALOR);
  if (first?.AREA_ZH) props.a = Math.round(first.AREA_ZH);
  if (/^ZMT\b/i.test((p.NOMBRE_ZONAH || '').trim())) props.zmt = 1;
  features.push({ type: 'Feature', geometry: z.geometry, properties: props });
}
const missing = [...new Set(features.map((f) => f.properties.c))].filter((c) => !cantons[c]);
if (missing.length) throw new Error(`cantons without a name in data/land/cantons.json: ${missing.join(', ')}`);

// ---- 4. tiles, and a summary per canton for the page ----
const geo = join(RAW, 'zones.geojson');
writeFileSync(geo, JSON.stringify({ type: 'FeatureCollection', features }));
const out = join(ROOT, 'site', 'assets', 'data', 'land.pmtiles');
execFileSync('tippecanoe', ['-o', out, '--force', '-l', 'zones', '--use-attribute-for-id=id', '-Z', '6', '-z', '13', '--no-tile-size-limit',
  '--coalesce-densest-as-needed', '--extend-zooms-if-still-dropping', '--detect-shared-borders', '--simplification=4', '-q', geo], { stdio: 'inherit' });
const summary = {};
for (const [code, ys] of Object.entries(years)) {
  const edition = +Object.entries(ys).sort((a, b) => b[1] - a[1])[0][0]; // the year most of its zones carry
  summary[code] = { name: cantons[code], edition, zones: features.filter((f) => f.properties.c === code).length };
}
writeFileSync(join(ROOT, 'data', 'land', 'editions.json'), JSON.stringify({ fetched: new Date().toISOString().slice(0, 10), cantons: summary }, null, 1) + '\n');
console.log(`${features.length} zones in ${Object.keys(summary).length} cantons -> site/assets/data/land.pmtiles`);
