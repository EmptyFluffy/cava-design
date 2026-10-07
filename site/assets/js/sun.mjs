// Where the sun is, for a place in Costa Rica (UTC-6, no daylight saving). NOAA's solar equations,
// accurate to about a minute and a degree, which is plenty for drawing a roof.
const TZ = -6;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const gamma = (doy, hour) => ((2 * Math.PI) / 365) * (doy - 1 + (hour - 12) / 24);
const eqtime = (g) => 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
const decl = (g) => 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);

// Altitude above the horizon and azimuth (degrees from north, clockwise) at a local clock hour.
export function position(lat, lng, doy, hour) {
  const g = gamma(doy, hour - TZ);
  const d = decl(g);
  const tst = hour * 60 + eqtime(g) + 4 * lng - 60 * TZ;
  const ha = rad(tst / 4 - 180);
  const p = rad(lat);
  const cosZ = Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(ha);
  const alt = 90 - deg(Math.acos(Math.max(-1, Math.min(1, cosZ))));
  const az = (deg(Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(p) - Math.tan(d) * Math.cos(p))) + 540) % 360;
  return { alt, az };
}

// Sunrise, solar noon and sunset, in minutes after local midnight.
export function times(lat, lng, doy) {
  const g = gamma(doy, 12);
  const d = decl(g);
  const p = rad(lat);
  const ha = deg(Math.acos(Math.cos(rad(90.833)) / (Math.cos(p) * Math.cos(d)) - Math.tan(p) * Math.tan(d)));
  const eq = eqtime(g);
  return { rise: 720 - 4 * (lng + ha) - eq + 60 * TZ, noon: 720 - 4 * lng - eq + 60 * TZ, set: 720 - 4 * (lng - ha) - eq + 60 * TZ };
}

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const doyToDate = (doy) => { let m = 0; while (doy > DAYS[m]) { doy -= DAYS[m]; m++; } return { month: m, day: doy }; };
export const SOLSTICE_JUNE = 172, EQUINOX_MARCH = 79, SOLSTICE_DECEMBER = 355;

// Everything a town page says about the sun.
export function sunFacts(lat, lng) {
  const days = Array.from({ length: 365 }, (_, i) => i + 1);
  const all = days.map((doy) => ({ doy, ...times(lat, lng, doy), decl: deg(decl(gamma(doy, 12))) }));
  const north = all.filter((d) => d.decl > lat).map((d) => d.doy);
  const noonAlt = (doy) => position(lat, lng, doy, times(lat, lng, doy).noon / 60).alt;
  const setAz = (doy) => position(lat, lng, doy, times(lat, lng, doy).set / 60).az;
  const riseAz = (doy) => position(lat, lng, doy, times(lat, lng, doy).rise / 60).az;
  return {
    northFrom: north.length ? doyToDate(north[0]) : null,
    northTo: north.length ? doyToDate(north[north.length - 1]) : null,
    noon: { june: noonAlt(SOLSTICE_JUNE), equinox: noonAlt(EQUINOX_MARCH), december: noonAlt(SOLSTICE_DECEMBER) },
    set: { june: setAz(SOLSTICE_JUNE), december: setAz(SOLSTICE_DECEMBER) },
    rise: { june: riseAz(SOLSTICE_JUNE), december: riseAz(SOLSTICE_DECEMBER) },
    riseRange: [Math.min(...all.map((d) => d.rise)), Math.max(...all.map((d) => d.rise))],
    setRange: [Math.min(...all.map((d) => d.set)), Math.max(...all.map((d) => d.set))],
  };
}

// The sun's path across the sky on one day, every 10 minutes while it is up, plus whole hours.
export function path(lat, lng, doy) {
  const { rise, set } = times(lat, lng, doy);
  const pts = [];
  for (let m = Math.ceil(rise / 10) * 10; m <= set; m += 10) pts.push(position(lat, lng, doy, m / 60));
  const hours = [];
  for (let h = Math.ceil(rise / 60); h * 60 <= set; h++) hours.push({ h, ...position(lat, lng, doy, h) });
  return { pts: [position(lat, lng, doy, rise / 60), ...pts, position(lat, lng, doy, set / 60)], hours };
}
