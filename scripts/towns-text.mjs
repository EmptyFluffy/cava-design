// What a town page says, in each language. Every sentence is built from that town's data
// (data/town-data.json and scripts/sun.mjs), so no two pages read alike.

export const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'],
};
export const MONTHS_SHORT = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'],
};
const COMPASS16 = {
  en: ['north', 'north-northeast', 'northeast', 'east-northeast', 'east', 'east-southeast', 'southeast', 'south-southeast', 'south', 'south-southwest', 'southwest', 'west-southwest', 'west', 'west-northwest', 'northwest', 'north-northwest'],
  es: ['norte', 'nor-noreste', 'noreste', 'este-noreste', 'este', 'este-sureste', 'sureste', 'sur-sureste', 'sur', 'sur-suroeste', 'suroeste', 'oeste-suroeste', 'oeste', 'oeste-noroeste', 'noroeste', 'nor-noroeste'],
};
const COMPASS8 = {
  en: ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'],
  es: ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'],
};
export const compass16 = (lang, az) => COMPASS16[lang][Math.round(az / 22.5) % 16];
const compass8 = (lang, az) => COMPASS8[lang][Math.round(az / 45) % 8];

// "en el aeropuerto de Liberia" but "en Parrita": only airports take the article.
export const enSt = (name) => (/^aeropuerto/.test(name) ? `el ${name}` : name);
export const num = (lang, n) => (lang === 'en' ? Math.round(n).toLocaleString('en-US') : String(Math.round(n)));
export const clock = (min) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, '0')}`;
export const duration = (min) => {
  const r = Math.round(min / 5) * 5;
  return r < 60 ? `${r} min` : `${Math.floor(r / 60)} h${r % 60 ? ` ${r % 60} min` : ''}`;
};
const date = (lang, d) => (lang === 'en' ? `${MONTHS.en[d.month]} ${d.day}` : `${d.day} de ${MONTHS.es[d.month]}`);
const list2 = (lang, a, b) => `${a} ${lang === 'en' ? 'and' : 'y'} ${b}`;

// ---------- Derived climate facts ----------
export const DRY = 60; // mm: a month with less rain than this is a dry month (the usual tropical threshold)

export function climate(d) {
  const rain = d.rain;
  const total = rain.reduce((a, b) => a + b, 0);
  const dry = rain.map((r) => r < DRY);
  // the longest run of dry months, wrapping over the new year
  let best = null;
  for (let s = 0; s < 12; s++) {
    if (!dry[s] || dry[(s + 11) % 12]) continue;
    let n = 0;
    while (n < 12 && dry[(s + n) % 12]) n++;
    if (!best || n > best.n) best = { start: s, n };
  }
  if (!best && dry.every(Boolean)) best = { start: 0, n: 12 };
  const wettest = rain.indexOf(Math.max(...rain));
  const order = rain.map((r, i) => [r, i]).sort((a, b) => a[0] - b[0]);
  const wet = best ? { start: (best.start + best.n) % 12, n: 12 - best.n } : null;
  const wetShare = wet ? Math.round((100 * Array.from({ length: wet.n }, (_, k) => rain[(wet.start + k) % 12]).reduce((a, b) => a + b, 0)) / total) : null;
  const veranillo = rain[6] < 0.85 * Math.min(rain[5], rain[7]);
  const hottest = d.tmax.indexOf(Math.max(...d.tmax));
  const coolest = d.tmax.indexOf(Math.min(...d.tmax));
  // afternoon wind by season: vector sums over the season's months
  const season = (months) => {
    const s = months.reduce((a, m) => ({ x: a.x + d.wind[m].x, y: a.y + d.wind[m].y, s: a.s + d.wind[m].s }), { x: 0, y: 0, s: 0 });
    return { dir: ((Math.atan2(s.x, s.y) * 180) / Math.PI + 360) % 360, steady: Math.hypot(s.x, s.y) / s.s };
  };
  const dryMonths = best ? Array.from({ length: best.n }, (_, k) => (best.start + k) % 12) : [];
  const wetMonths = Array.from({ length: 12 }, (_, m) => m).filter((m) => !dryMonths.includes(m));
  return {
    total, dry: best, wet, wetShare, wettest, veranillo,
    driest: [order[0][1], order[1][1]].sort((a, b) => a - b), driestMin: order[0][0],
    hottest, coolest, tmaxHot: Math.round(d.tmax[hottest]), tmaxCool: Math.round(d.tmax[coolest]),
    nights: [Math.round(Math.min(...d.tmin)), Math.round(Math.max(...d.tmin))],
    windDry: dryMonths.length ? season(dryMonths) : null,
    windWet: wetMonths.length ? season(wetMonths) : null,
  };
}

const range = (lang, run) => {
  const a = MONTHS[lang][run.start], b = MONTHS[lang][(run.start + run.n - 1) % 12];
  return lang === 'en' ? `from ${a} to ${b}` : `de ${a} a ${b}`;
};
const windPhrase = (lang, w) => (w.steady < 0.45 ? null : compass8(lang, w.dir));

// ---------- Labels and short text, per language ----------
const factsDry = (lang, c) => (c.dry
  ? `${MONTHS[lang][c.dry.start]} ${lang === 'en' ? 'to' : 'a'} ${MONTHS[lang][(c.dry.start + c.dry.n - 1) % 12]}`
  : (lang === 'en' ? 'None, it rains every month' : 'No hay, llueve todos los meses'));
const nearestAirport = (lang, d) => (d.roads.LIR.min <= d.roads.SJO.min
  ? { min: d.roads.LIR.min, name: lang === 'en' ? 'Liberia airport' : 'Liberia' }
  : { min: d.roads.SJO.min, name: lang === 'en' ? 'San José airport' : 'San José' });

// "Tamarindo is in the canton of Santa Cruz, Guanacaste", without repeating a name that is both.
const where = (lang, t, d) => {
  const en = lang === 'en';
  if (t.name === d.canton && d.canton === d.province) return en ? `${t.name} is the seat of the canton and the province of the same name` : `${t.name} es la cabecera del cantón y de la provincia del mismo nombre`;
  if (t.name === d.canton) return en ? `${t.name} is the seat of the canton of the same name, in ${d.province}` : `${t.name} es la cabecera del cantón del mismo nombre, en ${d.province}`;
  if (d.canton === d.province) return en ? `${t.name} is in the canton of ${d.canton}, in the province of the same name` : `${t.name} está en el cantón de ${d.canton}, en la provincia del mismo nombre`;
  return en ? `${t.name} is in the canton of ${d.canton}, ${d.province}` : `${t.name} está en el cantón de ${d.canton}, ${d.province}`;
};

export const T = {
  en: {
    kicker: 'Architects in',
    title: (t) => `Architects in ${t.name}, Costa Rica | Studio CAVA`,
    description: (t, d, c, muni) => `Building in ${t.name}: ${num('en', c.total)} mm of rain a year, ${c.dry ? `dry ${range('en', c.dry)}` : 'rain in every month'}, permits through ${muni}, ${duration(nearestAirport('en', d).min)} from ${nearestAirport('en', d).name}.`,
    municipality: (t, d) => t.council?.en ?? `the Municipalidad de ${d.canton}`,
    intro: (t, d, c, muni) => [
      `${where('en', t, d)}, ${d.elevation < 5 ? 'at sea level' : `${num('en', d.elevation)} m above sea level`}. A year here brings ${num('en', c.total)} mm of rain, ${c.wet ? `${c.wetShare}% of it ${range('en', c.wet)}` : 'spread over every month'}. Permits for a lot go through ${muni}.`,
      `We design houses, rental villas and small hotels in ${t.name} and anywhere else in Costa Rica, from the first site visit to the CFIA permit.`,
    ],
    facts: {
      label: '(At a glance)', canton: 'Canton', permits: 'Permits', elevation: 'Elevation', rain: 'Rain', dry: 'Dry season',
      lir: 'Liberia airport', sjo: 'San José airport',
      cantonV: (d) => `${d.canton}, ${d.province}`, elevationV: (d) => (d.elevation < 5 ? 'Sea level' : `${num('en', d.elevation)} m`),
      rainV: (c) => `${num('en', c.total)} mm a year`, dryV: (c) => factsDry('en', c),
      road: (r) => `${duration(r.min)} by road, ${num('en', r.km)} km`,
    },
    year: { label: '(The year)', chart: (t, d) => `Rain by month in ${t.name}, in mm: ${d.rain.map((r, i) => `${MONTHS.en[i]} ${r}`).join(', ')}`, caption: `Rain by month, in mm. Grey: months under ${DRY} mm.` },
    sun: {
      label: '(The sun)', legend: ['June 21', 'March 20 and September 22', 'December 21'], aria: (t) => `Sun path over ${t.name}, seen from above with north at the top: the sun's track on the June solstice, the equinoxes and the December solstice`, compass: ['N', 'E', 'S', 'W'],
      temps: 'Typical temperature at that hour', bands: ['Under 22 °C', '22 to 25', '25 to 28', '28 to 31', '31 °C and up'],
      note: 'Each dot is the sun at a whole hour, every three days: each figure-eight is one hour across the year, and the lines are the 21st of each month. Orange and red dots are the hours when the sun should stay off the glass.',
    },
    build: { label: '(Building here)' },
    work: { near: '(Our work nearby)', far: '(Our work)', km: (n) => `${num('en', n)} km` },
    faq: { label: '(Questions)' },
    nearby: { label: '(Nearby)', km: (n) => `${num('en', n)} km`, all: 'All the places we work' },
    reach: (t) => `Tell us about your lot in ${t.name} and what you want to build. We answer within a working day.`,
    wa: (t) => `Hi Studio CAVA, I have a lot in ${t.name} and would like to talk about a project.`,
    sources: (fetched, st) => `Rain: CHIRPS climatology (CHPclim v2, Climate Hazards Center, UC Santa Barbara). Temperature and wind: ${st ? `measured at ${st.name}, ${num('en', st.km)} km away` : 'the nearest of 12 weather stations'}, typical year 2011 to 2025 (Climate.OneBuilding.org TMYx, from NOAA observations), temperatures adjusted for elevation. Sun: calculated for the town's coordinates. Elevation: SRTM. Roads and places: OpenStreetMap. Gathered ${fetched}.`,
    wind: {
      label: '(The wind)', dry: '(Dry season)', wet: '(Rainy season)', all: '(All year)', calm: (p) => `Calm ${p}%`,
      caption: (st) => `Share of hours the wind blows from each direction, by speed. Measured at ${st.name}, ${num('en', st.km)} km away, 2011 to 2025.`,
      speeds: ['Up to 7 km/h', '7 to 14', '14 to 22', '22 to 29', 'Over 29'],
      aria: (t, season) => `Wind rose for ${t.name}, ${season}`,
    },
    hub: {
      title: 'Where we work | Studio CAVA',
      description: 'Architects across Costa Rica. Rain, dry season, permits and the drive from the airport for every town where we design houses and hotels.',
      label: '(Where we work)', h1: ['Where we', 'work'],
      intro: 'We design and sign projects anywhere in Costa Rica. Each page gathers what matters before building in that place: the rain, the sun, the wind, the permits and the drive from the airport.',
      cols: ['Town', 'Canton', 'Rain a year', 'Dry season', 'Hottest afternoons', 'From Liberia airport', 'From San José airport'],
    },
    crumb: 'Where we work',
  },
  es: {
    kicker: 'Arquitectos en',
    title: (t) => `Arquitectos en ${t.name}, Costa Rica | Studio CAVA`,
    description: (t, d, c, muni) => `Construir en ${t.name}: ${num('es', c.total)} mm de lluvia al año, ${c.dry ? `seco ${range('es', c.dry)}` : 'llueve todos los meses'}, permisos en ${muni}, a ${duration(nearestAirport('es', d).min)} del aeropuerto de ${nearestAirport('es', d).name}.`,
    municipality: (t, d) => t.council?.es ?? `la Municipalidad de ${d.canton}`,
    intro: (t, d, c, muni) => [
      `${where('es', t, d)}, ${d.elevation < 5 ? 'al nivel del mar' : `a ${num('es', d.elevation)} m sobre el nivel del mar`}. Al año caen ${num('es', c.total)} mm de lluvia, ${c.wet ? `el ${c.wetShare}% ${range('es', c.wet)}` : 'repartidos en todos los meses'}. Los permisos de un lote se tramitan en ${muni}.`,
      `Diseñamos casas, villas de alquiler y hoteles pequeños en ${t.name} y en cualquier otra parte de Costa Rica, desde la primera visita al lote hasta el permiso del CFIA.`,
    ],
    facts: {
      label: '(De un vistazo)', canton: 'Cantón', permits: 'Permisos', elevation: 'Altitud', rain: 'Lluvia', dry: 'Época seca',
      lir: 'Aeropuerto de Liberia', sjo: 'Aeropuerto de San José',
      cantonV: (d) => `${d.canton}, ${d.province}`, elevationV: (d) => (d.elevation < 5 ? 'Nivel del mar' : `${num('es', d.elevation)} m`),
      rainV: (c) => `${num('es', c.total)} mm al año`, dryV: (c) => factsDry('es', c),
      road: (r) => `${duration(r.min)} por carretera, ${num('es', r.km)} km`,
    },
    year: { label: '(El año)', chart: (t, d) => `Lluvia por mes en ${t.name}, en mm: ${d.rain.map((r, i) => `${MONTHS.es[i]} ${r}`).join(', ')}`, caption: `Lluvia por mes, en mm. En gris, los meses con menos de ${DRY} mm.` },
    sun: {
      label: '(El sol)', legend: ['21 de junio', '20 de marzo y 22 de setiembre', '21 de diciembre'], aria: (t) => `Recorrido del sol sobre ${t.name}, visto desde arriba con el norte hacia arriba: el camino del sol en el solsticio de junio, los equinoccios y el solsticio de diciembre`, compass: ['N', 'E', 'S', 'O'],
      temps: 'Temperatura típica a esa hora', bands: ['Menos de 22 °C', '22 a 25', '25 a 28', '28 a 31', '31 °C o más'],
      note: 'Cada punto es el sol a una hora en punto, cada tres días: cada figura en ocho es una misma hora a lo largo del año, y las líneas son el día 21 de cada mes. Los puntos naranja y rojos son las horas en que el sol no debería tocar el vidrio.',
    },
    build: { label: '(Construir aquí)' },
    work: { near: '(Nuestro trabajo cerca)', far: '(Nuestro trabajo)', km: (n) => `${num('es', n)} km` },
    faq: { label: '(Preguntas)' },
    nearby: { label: '(Cerca)', km: (n) => `${num('es', n)} km`, all: 'Todos los lugares donde trabajamos' },
    reach: (t) => `Cuéntenos sobre su lote en ${t.name} y lo que quiere construir. Respondemos en un día hábil.`,
    wa: (t) => `Hola Studio CAVA, tengo un lote en ${t.name} y quisiera conversar sobre un proyecto.`,
    sources: (fetched, st) => `Lluvia: climatología CHIRPS (CHPclim v2, Climate Hazards Center, UC Santa Barbara). Temperatura y viento: ${st ? `medidos en ${enSt(st.name_es)}, a ${num('es', st.km)} km` : 'la más cercana de 12 estaciones meteorológicas'}, año típico 2011 a 2025 (Climate.OneBuilding.org TMYx, a partir de observaciones de la NOAA), con la temperatura ajustada por altitud. Sol: calculado para las coordenadas del pueblo. Altitud: SRTM. Carreteras y lugares: OpenStreetMap. Datos reunidos en ${fetched}.`,
    wind: {
      label: '(El viento)', dry: '(Época seca)', wet: '(Época lluviosa)', all: '(Todo el año)', calm: (p) => `Calma ${p}%`,
      caption: (st) => `Porcentaje de horas en que el viento sopla desde cada dirección, por velocidad. Medido en ${enSt(st.name_es)}, a ${num('es', st.km)} km, 2011 a 2025.`,
      speeds: ['Hasta 7 km/h', '7 a 14', '14 a 22', '22 a 29', 'Más de 29'],
      aria: (t, season) => `Rosa de los vientos de ${t.name}, ${season}`,
    },
    hub: {
      title: 'Dónde trabajamos | Studio CAVA',
      description: 'Arquitectos en todo Costa Rica. Lluvia, época seca, permisos y distancia al aeropuerto de cada pueblo donde diseñamos casas y hoteles.',
      label: '(Dónde trabajamos)', h1: ['Dónde', 'trabajamos'],
      intro: 'Diseñamos y firmamos proyectos en cualquier parte de Costa Rica. Cada página reúne lo que importa antes de construir en ese lugar: la lluvia, el sol, el viento, los permisos y el viaje desde el aeropuerto.',
      cols: ['Pueblo', 'Cantón', 'Lluvia al año', 'Época seca', 'Tardes más calientes', 'Desde el aeropuerto de Liberia', 'Desde el aeropuerto de San José'],
    },
    crumb: 'Dónde trabajamos',
  },
};

// Paragraphs and answers. Kept as functions of (lang, town, data, climate, sun) so both languages share one logic.
export function paragraphs(lang, t, d, c, s, muni) {
  const en = lang === 'en';
  const M = MONTHS[lang];
  const out = {};

  // the year: rain, heat, wind
  const rain = [];
  if (c.dry) {
    rain.push(en
      ? `The dry season runs ${range(lang, c.dry)}: ${c.dry.n} months under ${DRY} mm of rain. The wettest month is ${M[c.wettest]}, with ${num(lang, d.rain[c.wettest])} mm.`
      : `La época seca va ${range(lang, c.dry)}: ${c.dry.n} meses con menos de ${DRY} mm de lluvia. El mes más lluvioso es ${M[c.wettest]}, con ${num(lang, d.rain[c.wettest])} mm.`);
  } else {
    rain.push(en
      ? `There is no dry season here: every month gets at least ${num(lang, c.driestMin)} mm of rain. The least rainy months are ${list2(lang, M[c.driest[0]], M[c.driest[1]])}, and the wettest is ${M[c.wettest]}, with ${num(lang, d.rain[c.wettest])} mm.`
      : `Aquí no hay época seca: todos los meses llueven al menos ${num(lang, c.driestMin)} mm. Los meses menos lluviosos son ${list2(lang, M[c.driest[0]], M[c.driest[1]])}, y el más lluvioso es ${M[c.wettest]}, con ${num(lang, d.rain[c.wettest])} mm.`);
  }
  if (c.veranillo) rain.push(en ? 'July rains less than June and August: the short break known as the veranillo de San Juan.' : 'Julio llueve menos que junio y agosto: es el veranillo de San Juan.');
  const heat = c.nights[0] === c.nights[1]
    ? (en ? `Nights stay around ${c.nights[0]} °C all year.` : `Las noches se mantienen cerca de ${c.nights[0]} °C todo el año.`)
    : (en ? `Nights stay between ${c.nights[0]} and ${c.nights[1]} °C.` : `Las noches se mantienen entre ${c.nights[0]} y ${c.nights[1]} °C.`);
  rain.push(en
    ? `Afternoons are hottest in ${M[c.hottest]}, at ${c.tmaxHot} °C on average, and coolest in ${M[c.coolest]}, at ${c.tmaxCool} °C. ${heat}`
    : `Las tardes más calientes son en ${M[c.hottest]}, con ${c.tmaxHot} °C en promedio, y las más frescas en ${M[c.coolest]}, con ${c.tmaxCool} °C. ${heat}`);
  out.year = rain;

  // the wind, measured at the station: where the afternoon wind comes from
  const wd = c.windDry && windPhrase(lang, c.windDry);
  const wa = !c.dry && c.windWet && windPhrase(lang, c.windWet);
  const st = lang === 'en' ? d.station.name : enSt(d.station.name_es);
  out.wind = [];
  if (wd) out.wind.push(en ? `In the dry season the afternoon wind at ${st} comes from the ${wd}.` : `En la época seca el viento de la tarde en ${st} viene del ${wd}.`);
  else if (wa) out.wind.push(en ? `The afternoon wind at ${st} comes from the ${wa} most of the year.` : `El viento de la tarde en ${st} viene del ${wa} casi todo el año.`);
  out.wind.push(en
    ? 'Rooms that open to the wind on one side and away from it on the other cool themselves, and a roof that sheds the rain lets them stay open in the wet months too.'
    : 'Los espacios que se abren hacia el viento de un lado y hacia el lado opuesto del otro se ventilan solos, y un techo que bota bien el agua permite dejarlos abiertos también en los meses de lluvia.');

  // the sun
  const sun = [];
  sun.push(en
    ? `The sun here is never far from overhead. At noon it stands ${Math.round(s.noon.equinox)}° high in March and September and ${Math.round(s.noon.december)}° in December, and ${s.northFrom ? `from ${date(lang, s.northFrom)} to ${date(lang, s.northTo)} it passes north of overhead, so walls and glass that face north take sun as well` : 'it always passes to the south'}.`
    : `Aquí el sol nunca se aleja mucho del cenit. Al mediodía está a ${Math.round(s.noon.equinox)}° de altura en marzo y setiembre y a ${Math.round(s.noon.december)}° en diciembre, y ${s.northFrom ? `del ${date(lang, s.northFrom)} al ${date(lang, s.northTo)} pasa por el norte, así que las paredes y ventanas que miran al norte también reciben sol` : 'siempre pasa por el sur'}.`);
  sun.push(en
    ? `What heats a house is the low afternoon sun. It sets at ${Math.round(s.set.june)}°, ${compass16(lang, s.set.june)}, in June and at ${Math.round(s.set.december)}°, ${compass16(lang, s.set.december)}, in December. That side needs the deepest roof.`
    : `Lo que calienta una casa es el sol bajo de la tarde. Se pone a ${Math.round(s.set.june)}°, hacia el ${compass16(lang, s.set.june)}, en junio y a ${Math.round(s.set.december)}°, hacia el ${compass16(lang, s.set.december)}, en diciembre. Ese lado necesita el alero más profundo.`);
  sun.push(en
    ? `Sunrise falls between ${clock(s.riseRange[0])} and ${clock(s.riseRange[1])} all year, and sunset between ${clock(s.setRange[0])} and ${clock(s.setRange[1])}.`
    : `El sol sale entre las ${clock(s.riseRange[0])} y las ${clock(s.riseRange[1])} todo el año, y se pone entre las ${clock(s.setRange[0])} y las ${clock(s.setRange[1])}.`);
  out.sun = sun;

  // building here
  out.steps = en
    ? [
        ['Land use certificate', `The uso de suelo, from ${muni}: what the zoning allows on the lot.`],
        ['Water availability letter', 'From the local ASADA or from AyA. Without it there is no building permit, so it is worth asking for before buying.'],
        ['Drawings at the CFIA', "Filed through the CFIA's APC platform and signed by the architect in charge."],
        ['Building permit', `Issued by ${muni}.`],
      ]
    : [
        ['Certificado de uso de suelo', `En ${muni}: lo que la zonificación permite en el lote.`],
        ['Carta de disponibilidad de agua', 'De la ASADA local o de AyA. Sin ella no hay permiso de construcción, así que conviene pedirla antes de comprar.'],
        ['Planos en el CFIA', 'Se tramitan por la plataforma APC del CFIA, firmados por el profesional responsable.'],
        ['Permiso de construcción', `Lo emite ${muni}.`],
      ];
  out.zmt = t.coastal
    ? (en
      ? 'Within 200 m of the ordinary high-tide line the maritime zone law (Ley 6043) applies: the first 50 m are public and cannot be built on, and the next 150 m are held under a concession from the municipality, not owned. Check where a lot sits before you buy.'
      : 'A menos de 200 m de la pleamar ordinaria rige la Ley de la Zona Marítimo Terrestre (Ley 6043): los primeros 50 m son públicos y no se puede construir, y los 150 m siguientes se tienen en concesión de la municipalidad, no en propiedad. Conviene saber dónde está el lote antes de comprar.')
    : null;
  out.note = t.note?.[lang] ?? null;
  return out;
}

export function faq(lang, t, d, c, s, muni) {
  const en = lang === 'en';
  const M = MONTHS[lang];
  const q = [];
  q.push(c.dry
    ? [en ? `When is the best time to build in ${t.name}?` : `¿Cuál es la mejor época para construir en ${t.name}?`,
      en ? `The dry season, ${range(lang, c.dry)}, when each month gets less than ${DRY} mm of rain. Earthworks, foundations and the roof go faster then, so it helps to have the permit in hand before ${M[c.dry.start]}.`
        : `La época seca, ${range(lang, c.dry)}, cuando cada mes llueve menos de ${DRY} mm. El movimiento de tierra, las fundaciones y el techo avanzan más rápido, así que conviene tener el permiso antes de ${M[c.dry.start]}.`]
    : [en ? `When is the best time to build in ${t.name}?` : `¿Cuál es la mejor época para construir en ${t.name}?`,
      en ? `${t.name} has no real dry season: every month gets at least ${num(lang, c.driestMin)} mm of rain. The least rainy months, ${list2(lang, M[c.driest[0]], M[c.driest[1]])}, are the best window for earthworks and foundations.`
        : `${t.name} no tiene una época seca de verdad: todos los meses llueven al menos ${num(lang, c.driestMin)} mm. Los meses menos lluviosos, ${list2(lang, M[c.driest[0]], M[c.driest[1]])}, son la mejor ventana para el movimiento de tierra y las fundaciones.`]);
  q.push([en ? `Who issues building permits in ${t.name}?` : `¿Quién da los permisos de construcción en ${t.name}?`,
    en ? `${muni[0].toUpperCase() + muni.slice(1)}. The drawings are filed first with the CFIA, through its APC platform, and the permit comes after the land use certificate and the water availability letter.`
      : `${muni[0].toUpperCase() + muni.slice(1)}. Los planos se tramitan primero en el CFIA, por su plataforma APC, y el permiso llega después del certificado de uso de suelo y de la carta de disponibilidad de agua.`]);
  if (t.coastal) q.push([en ? `Can I build near the beach in ${t.name}?` : `¿Se puede construir cerca de la playa en ${t.name}?`,
    en ? 'Not in the first 50 m from the ordinary high-tide line, which are public. The next 150 m are held under a concession from the municipality rather than owned, with their own rules. Beyond 200 m, a titled lot follows the normal permit process.'
      : 'No en los primeros 50 m desde la pleamar ordinaria, que son públicos. Los 150 m siguientes se tienen en concesión de la municipalidad y no en propiedad, con sus propias reglas. Más allá de los 200 m, un lote inscrito sigue el trámite normal de permisos.']);
  q.push([en ? `How hot does it get in ${t.name}?` : `¿Qué tanto calor hace en ${t.name}?`,
    en ? `Afternoons average ${c.tmaxHot} °C in ${M[c.hottest]}, the hottest month, and ${c.tmaxCool} °C in ${M[c.coolest]}. Nights stay ${c.nights[0] === c.nights[1] ? `around ${c.nights[0]} °C` : `between ${c.nights[0]} and ${c.nights[1]} °C`}. Shade on the west side and air moving through the rooms do more for comfort than anything else.`
      : `Las tardes promedian ${c.tmaxHot} °C en ${M[c.hottest]}, el mes más caliente, y ${c.tmaxCool} °C en ${M[c.coolest]}. Las noches se mantienen ${c.nights[0] === c.nights[1] ? `cerca de ${c.nights[0]} °C` : `entre ${c.nights[0]} y ${c.nights[1]} °C`}. La sombra del lado oeste y el aire que cruza los espacios hacen más por el confort que cualquier otra cosa.`]);
  q.push([en ? `How far is ${t.name} from the airports?` : `¿Qué tan lejos queda ${t.name} de los aeropuertos?`,
    en ? `By road, without traffic, ${duration(d.roads.LIR.min)} from Daniel Oduber airport in Liberia (${num(lang, d.roads.LIR.km)} km) and ${duration(d.roads.SJO.min)} from Juan Santamaría airport in San José (${num(lang, d.roads.SJO.km)} km).`
      : `Por carretera y sin presas, a ${duration(d.roads.LIR.min)} del aeropuerto Daniel Oduber en Liberia (${num(lang, d.roads.LIR.km)} km) y a ${duration(d.roads.SJO.min)} del aeropuerto Juan Santamaría en San José (${num(lang, d.roads.SJO.km)} km).`]);
  return q;
}
