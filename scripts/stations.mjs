// Weather stations of Costa Rica, measured hour by hour, into data/stations.json. Node 18+, needs `unzip`.
//
//   node scripts/stations.mjs [cache folder]     default cache: ~/.cache/cava-stations
//
// Source: Climate.OneBuilding.org TMYx files, 2011 to 2025 (typical years built from NOAA's ISD hourly
// observations), free to use. These are the EPW files architects load into Ladybug and EnergyPlus.
// The raw files stay in the cache folder; the repo keeps only the summary each page needs:
//   temp[month][hour]      mean dry-bulb temperature, °C (hour 0 = 00:00 to 01:00 local time)
//   tmax[month], tmin[month]  mean of the daily maximum and minimum
//   rose[month][dir][band]  hours with wind from 16 directions in 5 speed bands; calm[month] below 0.5 m/s
//   noon[month]            afternoon (11:00 to 16:59) wind as a vector sum {x, y, s} (x east, y north, s = speed sum)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = process.argv[2] ?? join(homedir(), '.cache', 'cava-stations');
const BASE = 'https://climate.onebuilding.org/WMO_Region_4_North_and_Central_America/CRI_Costa_Rica/';
const FILES = [
  'CRI_AL_San.Jose-Santamaria.Intl.AP.787620', 'CRI_GU_Nicoya.AP.787550', 'CRI_GU_Quiros-Liberia.Intl.AP.787740',
  'CRI_LI_Finca.Favorita.749033', 'CRI_LI_Limon.Intl.AP.787670', 'CRI_PU_Chacarita-Puntarenas.AP.787613',
  'CRI_PU_Palmar.Sur-Southern.Zone.Intl.AP.787720', 'CRI_PU_Parrita.749036', 'CRI_PU_Paso.Canoas.AP.787606',
  'CRI_PU_Puntarenas.787600', 'CRI_SJ_San.Jose-Bolanos.Intl.AP.787640', 'CRI_SJ_San.Jose-La.Sabana.787605',
].map((f) => `${f}_TMYx.2011-2025`);
const BANDS = [2, 4, 6, 8, Infinity]; // m/s upper limits of the speed bands
// Readable names (the files use airport codes and dots)
const NAMES = {
  787620: 'Juan Santamaría airport', 787550: 'Nicoya airport', 787740: 'Liberia airport', 749033: 'Finca La Favorita',
  787670: 'Limón airport', 787613: 'Chacarita, Puntarenas', 787720: 'Palmar Sur airport', 749036: 'Parrita',
  787606: 'Paso Canoas', 787600: 'Puntarenas', 787640: 'Tobías Bolaños airport', 787605: 'La Sabana, San José',
};
const NAMES_ES = {
  787620: 'aeropuerto Juan Santamaría', 787550: 'aeropuerto de Nicoya', 787740: 'aeropuerto de Liberia', 749033: 'Finca La Favorita',
  787670: 'aeropuerto de Limón', 787613: 'Chacarita, Puntarenas', 787720: 'aeropuerto de Palmar Sur', 749036: 'Parrita',
  787606: 'Paso Canoas', 787600: 'Puntarenas', 787640: 'aeropuerto Tobías Bolaños', 787605: 'La Sabana, San José',
};

mkdirSync(CACHE, { recursive: true });
const stations = {};
for (const f of FILES) {
  const zip = join(CACHE, `${f}.zip`);
  if (!existsSync(zip)) {
    const r = await fetch(BASE + f + '.zip');
    if (!r.ok) throw new Error(`${r.status} ${f}`);
    writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
    await new Promise((res) => setTimeout(res, 1000));
  }
  const epw = execFileSync('unzip', ['-p', zip, `${f}.epw`], { maxBuffer: 64 * 1024 * 1024 }).toString('latin1').split(/\r?\n/);
  const loc = epw[0].split(',');
  const wmo = +loc[5];
  const rows = epw.slice(8).filter((l) => l.trim()).map((l) => l.split(','));
  if (rows.length !== 8760) throw new Error(`${f}: ${rows.length} hours`);
  const temp = Array.from({ length: 12 }, () => Array.from({ length: 24 }, () => []));
  const days = {};
  const rose = Array.from({ length: 12 }, () => Array.from({ length: 16 }, () => Array(BANDS.length).fill(0)));
  const calm = Array(12).fill(0);
  const noon = Array.from({ length: 12 }, () => ({ x: 0, y: 0, s: 0 }));
  for (const c of rows) {
    const m = +c[1] - 1, h = +c[3] - 1, t = +c[6], dir = +c[20], sp = +c[21];
    if (t < 99) { temp[m][h].push(t); (days[`${m}-${c[2]}`] ??= []).push(t); }
    if (sp >= 999 || dir > 360) continue;
    if (sp < 0.5) calm[m]++;
    else rose[m][Math.round(dir / 22.5) % 16][BANDS.findIndex((b) => sp < b)]++;
    if (h >= 11 && h <= 16) { noon[m].x += sp * Math.sin((dir * Math.PI) / 180); noon[m].y += sp * Math.cos((dir * Math.PI) / 180); noon[m].s += sp; }
  }
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const daily = Array.from({ length: 12 }, (_, m) => Object.entries(days).filter(([k]) => +k.split('-')[0] === m).map(([, v]) => v));
  stations[wmo] = {
    name: NAMES[wmo] ?? loc[1], name_es: NAMES_ES[wmo] ?? loc[1], file: f,
    coords: [+(+loc[7]).toFixed(4), +(+loc[6]).toFixed(4)], elevation: Math.round(+loc[9]),
    temp: temp.map((mm) => mm.map((hh) => +avg(hh).toFixed(1))),
    tmax: daily.map((ds) => +avg(ds.map((d) => Math.max(...d))).toFixed(1)),
    tmin: daily.map((ds) => +avg(ds.map((d) => Math.min(...d))).toFixed(1)),
    rose, calm,
    noon: noon.map((w) => ({ x: Math.round(w.x), y: Math.round(w.y), s: Math.round(w.s) })),
  };
  const st = stations[wmo];
  console.log(`${String(wmo).padEnd(7)} ${st.name.padEnd(26)} ${st.coords.join(', ').padEnd(20)} ${String(st.elevation).padStart(5)} m  tmax ${Math.min(...st.tmax).toFixed(0)}-${Math.max(...st.tmax).toFixed(0)}  tmin ${Math.min(...st.tmin).toFixed(0)}-${Math.max(...st.tmin).toFixed(0)}  calm ${Math.round((100 * st.calm.reduce((a, b) => a + b, 0)) / 8760)}%`);
}
writeFileSync(join(ROOT, 'data', 'stations.json'), JSON.stringify({
  _note: 'Hourly weather of 12 Costa Rica stations, summarised by scripts/stations.mjs from Climate.OneBuilding.org TMYx 2011-2025 files (NOAA ISD observations). Months and hours are 0-based; hour 0 is 00:00 to 01:00 local time.',
  bands: BANDS.slice(0, -1), stations,
}) + '\n');
console.log(`${Object.keys(stations).length} stations -> data/stations.json`);
