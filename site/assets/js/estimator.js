/* Studio CAVA: the building cost estimator.
   Everything is computed in the browser from site/assets/data/costs.json (unit costs with their sources)
   and the town data the build adds to it (dry season, solar yield). Results update on every change; the
   state lives in the URL, so an estimate can be shared or printed as it is. */
(() => {
  'use strict';

  const root = document.querySelector('[data-estimator]');
  const SCRIPT = document.currentScript && document.currentScript.src;
  if (!root || !SCRIPT) return;
  const ES = document.documentElement.lang === 'es';
  const $ = (s, r = root) => r.querySelector(s);
  const $$ = (s, r = root) => [...r.querySelectorAll(s)];
  const form = $('[data-est-form]');

  const T = ES ? {
    months: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'],
    likely: 'probable', perM2: 'por m²', perFt2: 'por pie²', construction: 'Construcción', soft: 'Diseño, permisos e impuestos', total: 'Total del proyecto',
    parts: { land: 'Terreno', foundations: 'Fundaciones y contrapiso', structure: 'Paredes y estructura', roof: 'Techo', openings: 'Puertas y ventanas', finishes: 'Divisiones, pisos, enchapes y cielos', mep: 'Instalaciones mecánicas y eléctricas', slope: 'Pendiente: fundaciones, muros y drenajes', pool: 'Piscina', deck: 'Terrazas y decks', solar: 'Paneles solares', landscape: 'Paisajismo', furniture: 'Mobiliario' },
    softs: { design: 'Estudios, diseño, planos y presupuesto (CFIA, desde 6%)', supervision: 'Dirección técnica (CFIA, desde 5%)', permits: 'Permiso municipal y cargos del CFIA', insurance: 'Póliza de riesgos del trabajo (INS)', connection: 'Conexión de agua en Península Papagayo', review: 'Revisiones de diseño del condominio', vat: 'IVA, 13% sobre obra y honorarios', contingency: 'Reserva para imprevistos' },
    phases: { design: 'Diseño', concept: 'Concepto', schematic: 'Anteproyecto', drawings: 'Planos constructivos', permits: 'Permisos', prepermits: 'Uso de suelo, agua y alineamientos', setena: 'SETENA', condo: 'Revisión del condominio', ict: 'ICT', apc: 'CFIA y municipalidad', build: 'Obra', earth: 'Tierra y fundaciones', struct: 'Estructura y techo', closing: 'Cerramientos e instalaciones', finish: 'Acabados', outdoor: 'Exteriores' },
    dry: 'Época seca', today: 'Hoy',
    monthsLong: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'], and: 'y', to: 'a',
    startNote: (permit) => `Los permisos estarían listos hacia ${permit}, y la obra arranca entonces y sigue sin pausa: en lluvias se construye igual, sobre todo de mañana.`,
    rainNote: (months, days) => ` El movimiento de tierra caería en ${months}, con unos ${days} días de lluvia fuerte: lo programamos según el clima, o corremos el inicio unas semanas si el calendario lo permite.`,
    noDry: 'Aquí no hay época seca: la obra arranca apenas salen los permisos y sigue todo el año.',
    flags: {
      setena: 'Más de 1,000 m²: necesita viabilidad ambiental de SETENA (formulario D1) antes del permiso.',
      setenaFragile: 'Entre 500 y 1,000 m²: necesita SETENA (formulario D1-C) solo si el lote es un sitio frágil: zona marítimo terrestre, bosque, cerca de un río o naciente, o en recarga acuífera.',
      public: 'Un edificio para huéspedes o público pasa por la revisión de Salud y Bomberos en el APC y debe cumplir la Ley 7600 de accesibilidad.',
      apartments: 'Un edificio de apartamentos pasa por la revisión de Bomberos en el APC, y sus áreas comunes deben cumplir la Ley 7600 de accesibilidad.',
      industrial: 'Una bodega o una nave industrial pasa por la revisión de Bomberos en el APC, y por la de Salud si en ella trabaja gente.',
      condo: 'En condominio, el comité de diseño aprueba antes que la municipalidad. La estimación suma dos revisiones; los depósitos y las cuotas cambian según el desarrollo.',
      papagayo: 'En Papagayo el ICT y el MDRB aprueban antes que la municipalidad. Las tres revisiones de diseño (US$2,000 cada una) y la conexión de agua (US$25,000) ya van en la estimación; aparte va un depósito de cumplimiento de US$20,000 a US$50,000 según el tamaño, que se devuelve.',
      coastal: 'Cerca de la playa: a menos de 200 m de la pleamar rige la Ley de la Zona Marítimo Terrestre.',
    },
    solarNote: (kwp, kwh) => `${kwp} kWp, que aquí producen unos ${kwh} kWh al año.`,
    rate: (b, ft, all) => `Construcción ${b} por m² construido (${ft} por pie²); todo incluido, ${all} por m².`,
    landNote: (t, L) => L.src === 'market' ? `Terreno a lo que piden los lotes en ${t}: US$${L.r[0]} a ${L.r[2]} el m², la mitad central de ${L.n} lotes en venta (octubre de 2026).` : `En ${t} hay pocos lotes anunciados: el terreno va a los valores residenciales de Hacienda, US$${L.r[0]} a ${L.r[2]} el m² (edición ${L.y}).`,
    landPapagayo: 'En la Península Papagayo el terreno es una concesión del ICT, no se compra: queda fuera.',
    landNone: 'Aquí no tenemos un precio del terreno con fuente: queda fuera.',
    share: 'Enlace copiado', wa: (sum) => `Hola Studio CAVA, hice una estimación en su sitio: ${sum}. Quisiera conversar sobre el proyecto.`,
    ft2: 'pie²',
  } : {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    likely: 'likely', perM2: 'per m²', perFt2: 'per ft²', construction: 'Construction', soft: 'Design, permits and taxes', total: 'Project total',
    parts: { land: 'Land', foundations: 'Foundations and ground slab', structure: 'Walls and structure', roof: 'Roof', openings: 'Doors and windows', finishes: 'Partitions, floors, tiling and ceilings', mep: 'Plumbing and electrical', slope: 'Slope: foundations, walls and drainage', pool: 'Pool', deck: 'Terraces and decks', solar: 'Solar panels', landscape: 'Landscaping', furniture: 'Furniture' },
    softs: { design: 'Studies, design, drawings and estimate (CFIA, from 6%)', supervision: 'Technical direction (CFIA, from 5%)', permits: 'Municipal permit and CFIA charges', insurance: 'Work-risk insurance (INS)', connection: 'Water connection in Península Papagayo', review: 'Condominium design reviews', vat: 'VAT, 13% on works and fees', contingency: 'Contingency reserve' },
    phases: { design: 'Design', concept: 'Concept', schematic: 'Schematic design', drawings: 'Construction drawings', permits: 'Permits', prepermits: 'Land use, water and alignments', setena: 'SETENA', condo: 'Condominium review', ict: 'ICT', apc: 'CFIA and municipality', build: 'Construction', earth: 'Earthworks and foundations', struct: 'Structure and roof', closing: 'Envelope and services', finish: 'Finishes', outdoor: 'Outdoors' },
    dry: 'Dry season', today: 'Today',
    monthsLong: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], and: 'and', to: 'to',
    startNote: (permit) => `Permits would be ready around ${permit}, and the works start then and run straight through: building goes on in the rains, mostly in the mornings.`,
    rainNote: (months, days) => ` The earthworks would fall in ${months}, with about ${days} days of heavy rain: we plan them around the weather, or move the start a few weeks if the calendar allows.`,
    noDry: 'There is no dry season here: the works start as soon as the permits are in and run all year.',
    flags: {
      setena: 'Over 1,000 m²: it needs SETENA environmental viability (form D1) before the permit.',
      setenaFragile: 'Between 500 and 1,000 m²: it needs SETENA (form D1-C) only if the lot is a fragile site: the maritime zone, forest, near a river or spring, or an aquifer recharge area.',
      public: 'A building for guests or the public goes through the Health and Fire review in the APC and must meet the Ley 7600 accessibility rules.',
      apartments: 'An apartment building goes through the Fire review in the APC, and its shared areas must meet the Ley 7600 accessibility rules.',
      industrial: 'A warehouse or industrial building goes through the Fire review in the APC, and the Health review if people work in it.',
      condo: 'In a condominium, the design committee approves before the municipality. The estimate adds two reviews; deposits and dues vary by development.',
      papagayo: 'In Papagayo the ICT and the MDRB approve before the municipality. The three design reviews (US$2,000 each) and the water connection (US$25,000) are in the estimate; a compliance deposit of US$20,000 to US$50,000 by house size comes on top and is returned.',
      coastal: 'Near the beach: within 200 m of the high-tide line the maritime zone law applies.',
    },
    solarNote: (kwp, kwh) => `${kwp} kWp, which make about ${kwh} kWh a year here.`,
    rate: (b, ft, all) => `Construction ${b} a m² built (${ft} a ft²); everything in, ${all} a m².`,
    landNote: (t, L) => L.src === 'market' ? `Land at what lots ask in ${t}: US$${L.r[0]} to ${L.r[2]} a m², the middle half of ${L.n} lots for sale (October 2026).` : `Few lots are listed in ${t}: the land goes at Hacienda's residential values, US$${L.r[0]} to ${L.r[2]} a m² (${L.y} edition).`,
    landPapagayo: 'In Península Papagayo the land is an ICT concession and is not sold: it is left out.',
    landNone: 'We have no sourced land price here: it is left out.',
    share: 'Link copied', wa: (sum) => `Hi Studio CAVA, I made an estimate on your site: ${sum}. I would like to talk about the project.`,
    ft2: 'ft²',
  };

  let D = null; // costs.json
  const fmtUsd = (n) => `US$${Math.round(n / 1000) >= 1 ? (Math.round(n / 1000) * 1000).toLocaleString('en-US') : Math.round(n).toLocaleString('en-US')}`;
  const fmtCrc = (n) => `₡${(Math.round((n * D.fx.crcPerUsd) / 1e6 * 10) / 10).toLocaleString('en-US')} ${ES ? 'millones' : 'million'}`;
  const money = (n) => (state.cur === 'crc' ? fmtCrc(n) : fmtUsd(n));
  const num = (n) => Math.round(n).toLocaleString('en-US');

  // the area slider and its number box move together
  const range = $('[data-est-area-range]'), box = $('[data-est-area-box]');
  range.addEventListener('input', () => { box.value = range.value; });
  box.addEventListener('input', () => { range.value = box.value; });

  // ---------- state, in the form and in the URL ----------
  const state = {};
  const read = () => {
    const f = new FormData(form);
    for (const [k, v] of f.entries()) state[k] = v;
    for (const el of $$('input[type=checkbox]', form)) state[el.name] = el.checked ? '1' : '0';
    state.area = Math.max(40, Math.min(3000, +state.area || 250));
    state.lot = Math.max(100, Math.min(100000, +state.lot || 1000));
  };
  const toUrl = () => {
    const q = new URLSearchParams(state);
    history.replaceState(null, '', `${location.pathname}?${q}`);
  };
  const fromUrl = () => {
    const q = new URLSearchParams(location.search);
    for (const [k, v] of q.entries()) {
      const els = $$(`[name="${k}"]`, form);
      for (const el of els) {
        if (el.type === 'radio') el.checked = el.value === v;
        else if (el.type === 'checkbox') el.checked = v === '1';
        else el.value = v;
      }
    }
  };

  // ---------- the estimate ----------
  // the type being built (data/costs.json, programs) and the town's price factor
  const prog = () => D.programs.list.find((p) => p.key === state.type) ?? D.programs.list[0];
  const townOf = () => D.towns.find((t) => t.slug === state.town) ?? null;
  const placeOf = (town) => (town && D.place.town[town.slug]) || D.place.region[town ? town.region : 'other'] || 1;
  function estimate() {
    const town = townOf();
    const place = placeOf(town);
    const pr = prog();
    const rate = (D.perM2[pr.key] ?? D.perM2.house)[state.quality].map((r) => r * place); // US$ a m²: low, likely, high
    const area = state.area;
    const base = rate.map((r) => r * area);
    // the building, by part (Hacienda's weights), then what the lot and the outdoors add
    const shares = D.shares[pr.multi || +state.storeys > 1 ? '2' : '1'];
    const parts = Object.entries(shares).map(([k, s]) => [k, base.map((b) => b * s)]);
    const slope = D.slope[state.slope];
    if (slope[1] > 0) parts.push(['slope', base.map((b, i) => b * slope[i])]);
    const pool = +state.pool;
    if (pool) {
      const w = Math.sqrt(pool * D.pool.ratio), d = pool / w;
      const shell = pool + 2 * (w + d) * D.pool.depth; // floor and walls, as Hacienda prices it
      parts.push(['pool', D.pool.perM2Shell.map((r) => r * shell * place)]);
    }
    const deck = +state.deck;
    if (deck) parts.push(['deck', D.deck.perM2.map((r) => r * deck * place)]);
    // bought as quoted: no fees or construction VAT on top
    const extras = [];
    let solar = null;
    if (state.solar === '1') {
      const kwp = Math.max(D.solar.minKwp, Math.min(D.solar.maxKwp, Math.round(area / D.solar.m2PerKwp)));
      solar = { kwp, kwh: kwp * (town ? town.pvout : D.solar.defaultPvout) };
      extras.push(['solar', D.solar.perKwp.map((r) => r * kwp)]);
    }
    if (state.landscape === '1') extras.push(['landscape', D.landscape]);
    if (state.furniture === '1') extras.push(['furniture', D.furniture.map((r) => r * area)]);
    const sum = (list) => [0, 1, 2].map((i) => list.reduce((s, [, v]) => s + v[i], 0));
    const works = sum(parts), bought = sum(extras);
    const S = D.soft;
    const pick = (v, i) => (Array.isArray(v) ? v[i] : v);
    const on = (k) => works.map((c, i) => c * pick(S[k], i));
    const design = on('design'), supervision = on('supervision');
    const softs = [['design', design], ['supervision', supervision], ['permits', works.map((c) => c * (S.municipal + S.cfia))], ['insurance', on('insurance')]];
    const conn = town && D.connection[town.slug];
    if (conn) softs.push(['connection', [conn, conn, conn]]);
    // a condominium's design reviews: Papagayo's own rate, or the usual range
    if (town?.slug === 'papagayo') { const R = D.review.papagayo; softs.push(['review', [0, 1, 2].map(() => R.perReview * R.rounds)]); }
    else if (state.condo === '1') softs.push(['review', D.review.perReview.map((r) => r * D.review.rounds)]);
    softs.push(['vat', works.map((c, i) => (c + design[i] + supervision[i]) * S.vat)]);
    softs.push(['contingency', works.map((c, i) => (c + bought[i]) * pick(S.contingency, i))]);
    const all = [...parts, ...extras];
    const hard = sum(all), soft = sum(softs);
    // the land, at what lots ask in the town: no fees, VAT or reserve on top
    const lnd = state.land === '1' && town?.land ? town.land.r.map((r) => r * state.lot) : [0, 0, 0];
    const total = [0, 1, 2].map((i) => hard[i] + soft[i] + lnd[i]);
    return { town, area, rate, parts: all, softs, hard, soft, land: lnd, total, solar };
  }

  // ---------- schedule: design, permits, works; the works start with the permits and run through the rains ----------
  function schedule(e) {
    const Dd = D.durations;
    const pr = prog();
    const a = e.area;
    const qf = Dd.qualityFactor[state.quality];
    const design = [
      ['concept', Dd.concept],
      ['schematic', Dd.schematic + a / Dd.schematicPerM2],
      ['drawings', Dd.drawings + a / Dd.drawingsPerM2],
    ];
    const permits = [['prepermits', Dd.prepermits]];
    if (state.condo === '1' || e.town?.slug === 'papagayo') permits.push(['condo', Dd.condo]);
    if (e.town?.slug === 'papagayo') permits.push(['ict', Dd.ict]);
    if (a > 1000) permits.push(['setena', Dd.setena]);
    permits.push(['apc', Dd.apc + (pr.permit !== 'home' ? Dd.publicReview : 0)]);
    const works = Math.min(Dd.maxWorks, (Dd.worksBase + a / Dd.worksPerM2) * qf * pr.works);
    const split = Dd.worksSplit; // shares of the works time
    const now = new Date();
    const start = now.getFullYear() * 12 + now.getMonth(); // months since year 0
    let t = start;
    const rows = [];
    for (const [k, m] of design) { rows.push({ k, group: 'design', from: t, to: t + m }); t += m; }
    for (const [k, m] of permits) { rows.push({ k, group: 'permits', from: t, to: t + m }); t += m; }
    const permitReady = t;
    const buildStart = Math.ceil(t);
    const dry = e.town?.dry;
    let b = buildStart;
    for (const [k, s] of Object.entries(split)) { rows.push({ k, group: 'build', from: b, to: b + works * s }); b += works * s; }
    return { rows, start, end: b, permitReady, buildStart, dry };
  }

  // ---------- drawing ----------
  // one colour per part, each after its material, told apart by hue and by lightness
  const COLORS = { foundations: '#5e4b35', structure: '#3a3d40', roof: '#b4502e', openings: '#4f7fa8', finishes: '#dcc7a1', mep: '#2c7a73', slope: '#8d8a3f', pool: '#8fc6db', deck: '#b47b45', solar: '#e6b53f', landscape: '#6c9a52', furniture: '#c99599', land: '#9e8f72' };
  const inkOn = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5 ? '#080807' : '#fcfcfc'; };

  function renderTotals(e) {
    $('[data-est-total]').textContent = `${money(e.total[0])} ${ES ? 'a' : 'to'} ${money(e.total[2])}`;
    $('[data-est-likely]').textContent = `${T.likely} ${money(e.total[1])}`;
    const exact = (n) => (state.cur === 'crc' ? `₡${num(n * D.fx.crcPerUsd)}` : `US$${num(n)}`);
    $('[data-est-rate]').textContent = T.rate(exact(e.rate[1]), exact(e.rate[1] / 10.7639), exact(e.total[1] / e.area));
    $('[data-est-hard]').textContent = money(e.hard[1]);
    $('[data-est-soft]').textContent = money(e.soft[1]);
    const sticky = $('[data-est-sticky]');
    if (sticky) sticky.textContent = `${money(e.total[0])} ${ES ? 'a' : 'to'} ${money(e.total[2])}`;
  }

  function renderBreakdown(e) {
    const bar = $('[data-est-bar]');
    const list = $('[data-est-parts]');
    const tot = e.hard[1];
    const pc = (v) => Math.round((100 * v[1]) / tot);
    bar.innerHTML = e.parts.map(([k, v]) => `<span data-k="${k}" style="flex-grow:${v[1].toFixed(0)};background:${COLORS[k]};color:${inkOn(COLORS[k])}" title="${T.parts[k]}, ${pc(v)}%">${pc(v) >= 8 ? `${pc(v)}%` : ''}</span>`).join('');
    list.innerHTML = e.parts.map(([k, v]) => `<li data-k="${k}"><i style="background:${COLORS[k]}"></i><span>${T.parts[k]}</span><b>${money(v[1])}</b><em>${pc(v)}%</em></li>`).join('');
    $('[data-est-softs]').innerHTML = e.softs.map(([k, v]) => `<li><span>${T.softs[k]}</span><b>${money(v[1])}</b></li>`).join('');
    const sn = $('[data-est-solar]');
    if (sn) sn.textContent = e.solar ? T.solarNote(e.solar.kwp, num(e.solar.kwh)) : '';
    // the land sits apart from the construction, after it
    if (e.land[1]) list.insertAdjacentHTML('beforeend', `<li class="est__land"><i style="background:${COLORS.land}"></i><span>${T.parts.land}, ${num(state.lot)} m²</span><b>${money(e.land[1])}</b><em></em></li>`);
    const ln = $('[data-est-land]');
    if (ln) {
      const L = e.town?.land;
      ln.textContent = state.land !== '1' ? '' : e.town?.slug === 'papagayo' ? T.landPapagayo : !L ? T.landNone : T.landNote(e.town.name, L);
    }
  }

  // ---------- the volume, to scale: white faces, a heavy outline, thin seams, two people and a tree ----------
  // Storeys are 3.2 m and the roof keeps its pitch, so a wider house gets a taller ridge; the drawing
  // is fitted to its box, so the people and the tree shrink as the building grows.
  const ISO = (x, y, z) => [(x - y) * 0.866, (x + y) * 0.5 - z];
  const pts = (list) => list.map((p) => ISO(...p).map((n) => n.toFixed(2)).join(',')).join(' ');
  // a tree of branches, always the same one
  const TREE = (() => {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const segs = [];
    const grow = (x, z, ang, len, depth) => {
      const x2 = x + Math.sin(ang) * len, z2 = z + Math.cos(ang) * len;
      segs.push([x, z, x2, z2, depth]);
      if (!depth) return;
      const n = depth > 2 ? 2 : 2 + (rnd() > 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) grow(x2, z2, ang + (i - (n - 1) / 2) * (0.5 + rnd() * 0.25) + (rnd() - 0.5) * 0.2, len * (0.68 + rnd() * 0.1), depth - 1);
    };
    grow(0, 0, 0, 2.6, 5);
    return segs;
  })();
  function renderMassing(e) {
    const svg = $('[data-est-massing]');
    const pr = prog();
    const storeys = pr.roof === 'aframe' || pr.roof === 'dome' ? 1 : +state.storeys;
    const foot = e.area / storeys;
    const H = 3.2 * storeys;
    const faces = []; // [class, points]: drawn in this order, back to front
    const seams = []; // polylines
    let W, Dp, outline; // outline: points of the volume, for its shadow
    if (pr.roof === 'dome') {
      const r = Math.sqrt(foot / Math.PI);
      W = Dp = 2 * r;
      const at = (th, ph) => [r + r * Math.cos(ph) * Math.cos(th), r + r * Math.cos(ph) * Math.sin(th), r * Math.sin(ph)];
      const shell = [];
      for (let a = 0; a < 48; a++) for (let b = 0; b <= 8; b++) shell.push(ISO(...at((a / 48) * 2 * Math.PI, (b / 8) * (Math.PI / 2))));
      faces.push(['m-face m-rf', hull(shell)]);
      // the geodesic lines on the side we see (facing the viewer, who looks down along -1,-1,-1)
      const seen = (th, ph) => Math.cos(ph) * (Math.cos(th) + Math.sin(th)) + Math.sin(ph) > 0;
      for (const ph of [Math.PI / 6, Math.PI / 3]) { const l = []; for (let a = 0; a <= 96; a++) { const th = (a / 96) * 2 * Math.PI; if (seen(th, ph)) l.push(ISO(...at(th, ph))); else if (l.length) { seams.push(l.splice(0)); } } if (l.length) seams.push(l); }
      for (let k = 0; k < 10; k++) { const th = (k / 10) * 2 * Math.PI; const l = []; for (let b = 0; b <= 20; b++) { const ph = (b / 20) * (Math.PI / 2); if (seen(th, ph)) l.push(ISO(...at(th, ph))); } if (l.length > 1) seams.push(l); }
      outline = Array.from({ length: 24 }, (_, a) => at((a / 24) * 2 * Math.PI, 0)).concat([[r, r, r]]);
    } else {
      W = Math.sqrt(foot * 1.8); Dp = foot / W;
      if (pr.roof === 'flat') {
        const T = H + 0.45;
        faces.push(['m-face m-s', pts([[0, Dp, 0], [W, Dp, 0], [W, Dp, T], [0, Dp, T]])]);
        faces.push(['m-face m-e', pts([[W, 0, 0], [W, Dp, 0], [W, Dp, T], [W, 0, T]])]);
        faces.push(['m-face m-rf', pts([[0, 0, T], [W, 0, T], [W, Dp, T], [0, Dp, T]])]);
        seams.push([[0.35, 0.35, T], [W - 0.35, 0.35, T], [W - 0.35, Dp - 0.35, T], [0.35, Dp - 0.35, T], [0.35, 0.35, T]].map((p) => ISO(...p)));
        for (let k = 1; k <= storeys; k++) seams.push([[0, Dp, 3.2 * k], [W, Dp, 3.2 * k], [W, 0, 3.2 * k]].map((p) => ISO(...p)));
        outline = [[0, 0, T], [W, 0, T], [W, Dp, T], [0, Dp, T], [0, 0, 0], [W, 0, 0], [W, Dp, 0], [0, Dp, 0]];
      } else if (pr.roof === 'aframe') {
        const R = (Dp / 2) * Math.tan(Math.PI / 3);
        faces.push(['m-face m-rb', pts([[0, 0, 0], [W, 0, 0], [W, Dp / 2, R], [0, Dp / 2, R]])]);
        faces.push(['m-face m-e', pts([[W, 0, 0], [W, Dp, 0], [W, Dp / 2, R]])]);
        faces.push(['m-face m-rf', pts([[0, Dp / 2, R], [W, Dp / 2, R], [W, Dp, 0], [0, Dp, 0]])]);
        seams.push([[W, Dp * 0.21, 3.2 * 0.95], [W, Dp * 0.79, 3.2 * 0.95]].map((p) => ISO(...p)));
        outline = [[0, 0, 0], [W, 0, 0], [W, Dp, 0], [0, Dp, 0], [0, Dp / 2, R], [W, Dp / 2, R]];
      } else {
        // a gable along the long side, pitched at 22 degrees, with a 0.6 m overhang
        const o = 0.6, t = 0.25, tan = Math.tan((22 * Math.PI) / 180), R = H + (Dp / 2 + o) * tan, eave = H;
        faces.push(['m-face m-rb', pts([[-o, -o, eave], [W + o, -o, eave], [W + o, Dp / 2, R], [-o, Dp / 2, R]])]);
        faces.push(['m-face m-s', pts([[0, Dp, 0], [W, Dp, 0], [W, Dp, H], [0, Dp, H]])]);
        faces.push(['m-face m-e', pts([[W, 0, 0], [W, Dp, 0], [W, Dp, H + o * tan], [W, Dp / 2, R - t], [W, 0, H + o * tan]])]);
        faces.push(['m-face m-e', pts([[W + o, -o, eave], [W + o, Dp / 2, R], [W + o, Dp + o, eave], [W + o, Dp + o, eave - t], [W + o, Dp / 2, R - t], [W + o, -o, eave - t]])]);
        faces.push(['m-face m-rf', pts([[-o, Dp / 2, R], [W + o, Dp / 2, R], [W + o, Dp + o, eave], [-o, Dp + o, eave]])]);
        faces.push(['m-face m-s', pts([[-o, Dp + o, eave], [W + o, Dp + o, eave], [W + o, Dp + o, eave - t], [-o, Dp + o, eave - t]])]);
        for (let k = 1; k < storeys; k++) seams.push([[0, Dp, 3.2 * k], [W, Dp, 3.2 * k], [W, 0, 3.2 * k]].map((p) => ISO(...p)));
        outline = [[-o, -o, eave], [W + o, -o, eave], [W + o, Dp + o, eave], [-o, Dp + o, eave], [-o, Dp / 2, R], [W + o, Dp / 2, R], [0, 0, 0], [W, 0, 0], [W, Dp, 0], [0, Dp, 0]];
      }
    }
    // a short shadow to the west, on the ground
    const shade = hull(outline.map(([x, y, z]) => ISO(x - z * 0.55, y + z * 0.18, 0)).concat(outline.filter((p) => !p[2]).map((p) => ISO(...p))));
    // the pool, in front
    const pool = +state.pool;
    const pw = pool ? Math.sqrt(pool * 2.5) : 0, pd = pool ? pool / pw : 0;
    const py = Dp + (pr.roof === 'gable' ? 2.4 : 1.8);
    // people, 1.75 and 1.62 m, beside the east end, and a tree behind them
    const person = (x, y, h) => { const [px, pz] = ISO(x, y, 0); return `<g class="m-person"><circle cx="${px.toFixed(2)}" cy="${(pz - h + 0.13).toFixed(2)}" r="0.14"/><rect x="${(px - 0.2).toFixed(2)}" y="${(pz - h + 0.32).toFixed(2)}" width="0.4" height="${(h - 0.32).toFixed(2)}" rx="0.16"/></g>`; };
    const tpos = [W + 4.6, Dp * 0.15];
    const [tx, tz] = ISO(tpos[0], tpos[1], 0);
    const tree = TREE.map(([x1, z1, x2, z2, d]) => `<line x1="${(tx + x1).toFixed(2)}" y1="${(tz - z1).toFixed(2)}" x2="${(tx + x2).toFixed(2)}" y2="${(tz - z2).toFixed(2)}" style="stroke-width:${(0.5 + d * 0.28).toFixed(2)}px"/>`).join('');
    const line = (l) => `<polyline class="m-seam" points="${l.map((p) => p.map((n) => n.toFixed(2)).join(',')).join(' ')}"/>`;
    const body = faces.map(([c, p]) => `<polygon class="${c}" points="${Array.isArray(p) ? p.map((q) => q.map((n) => n.toFixed(2)).join(',')).join(' ') : p}"/>`).join('');
    const sil = faces.map(([, p]) => `<polygon class="m-sil" points="${Array.isArray(p) ? p.map((q) => q.map((n) => n.toFixed(2)).join(',')).join(' ') : p}"/>`).join('');
    // the width, measured along the front
    const [lx1, ly1] = ISO(0, Dp + (pool ? py - Dp + pd + 1.2 : 1.4), 0), [lx2, ly2] = ISO(W, Dp + (pool ? py - Dp + pd + 1.2 : 1.4), 0);
    const all = [...faces.flatMap(([, p]) => (Array.isArray(p) ? p : p.split(' ').map((q) => q.split(',').map(Number)))), ...shade, ISO(tpos[0], tpos[1], 8.5), [tx + 3.2, tz - 6], [tx - 3.2, tz - 6], [lx1, ly1], [lx2, ly2], ISO(W + 3.2, Dp * 0.85, 0)];
    if (pool) all.push(ISO(1, py + pd, 0), ISO(1 + pw, py + pd, 0), ISO(1 + pw, py, 0));
    const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
    const pad = Math.max(w, h) * 0.06;
    svg.setAttribute('viewBox', [x0 - pad, y0 - pad, w + 2 * pad, h + 2 * pad + Math.max(w, h) * 0.04].map((n) => n.toFixed(1)).join(' '));
    const fs = Math.max(w, h) * 0.032;
    svg.innerHTML = `<polygon class="m-shadow" points="${shade.map((q) => q.map((n) => n.toFixed(2)).join(',')).join(' ')}"/>`
      + (pool ? `<polygon class="m-pool" points="${pts([[1, py, 0], [1 + pw, py, 0], [1 + pw, py + pd, 0], [1, py + pd, 0]])}"/>` : '')
      + sil + body + seams.map(line).join('') + `<g class="m-tree">${tree}</g>`
      + person(W + 2.1, Dp * 0.85, 1.75) + person(W + 2.9, Dp * 0.66, 1.62)
      + `<line class="m-dim" x1="${lx1.toFixed(2)}" y1="${ly1.toFixed(2)}" x2="${lx2.toFixed(2)}" y2="${ly2.toFixed(2)}"/>${[[lx1, ly1], [lx2, ly2]].map(([x, y]) => `<line class="m-dim" x1="${(x - fs * 0.35).toFixed(2)}" y1="${(y - fs * 0.35).toFixed(2)}" x2="${(x + fs * 0.35).toFixed(2)}" y2="${(y + fs * 0.35).toFixed(2)}"/>`).join('')}<text class="m-text" x="${((lx1 + lx2) / 2).toFixed(2)}" y="${((ly1 + ly2) / 2 + fs * 1.4).toFixed(2)}" style="font-size:${fs.toFixed(2)}px">${Math.round(W)} m</text>`;
    $('[data-est-massing-cap]').textContent = `${num(e.area)} m² · ${storeys} ${storeys === 1 ? (ES ? 'piso' : 'storey') : (ES ? 'pisos' : 'storeys')} · ${Math.round(W)} × ${Math.round(Dp)} m${pool ? ` · ${ES ? 'piscina' : 'pool'} ${pool} m²` : ''}`;
  }
  // the convex outline of a set of points (monotone chain)
  function hull(p) {
    const q = [...p].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const v of q) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], v) <= 0) lo.pop(); lo.push(v); }
    for (const v of q.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], v) <= 0) up.pop(); up.push(v); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }

  function renderSchedule(e) {
    const s = schedule(e);
    const el = $('[data-est-gantt]');
    const months = Math.ceil(s.end - s.start) + 1;
    const pct = (m) => `${(((m - s.start) / months) * 100).toFixed(2)}%`;
    const mlabel = (m) => `${T.months[((Math.floor(m) % 12) + 12) % 12]} ${Math.floor(m / 12)}`;
    // dry-season bands across the whole span
    let bands = '';
    if (s.dry) {
      for (let y = Math.floor(s.start / 12) - 1; y <= Math.floor(s.end / 12) + 1; y++) {
        const from = y * 12 + s.dry.start, to = from + s.dry.n;
        const a = Math.max(from, s.start), b = Math.min(to, s.start + months);
        if (b > a) bands += `<span class="g-dry" style="left:${pct(a)};width:${(((b - a) / months) * 100).toFixed(2)}%"></span>`;
      }
    }
    const ticks = [];
    // every January, and today unless a January comes within four months and would sit on top of it
    const first = Math.ceil(s.start), toJan = (12 - (((first % 12) + 12) % 12)) % 12;
    for (let m = first; m <= s.start + months; m++) if (((m % 12) + 12) % 12 === 0 || (m === first && toJan >= 4)) ticks.push(`<span class="g-tick${(m - s.start) / months > 0.8 ? ' g-tick--end' : ''}" style="left:${pct(m)}">${mlabel(m)}</span>`);
    const rows = s.rows.map((r) => `<li class="g-row g-${r.group}"><span class="g-name">${T.phases[r.k]}</span><span class="g-track"><span class="g-bar" style="left:${pct(r.from)};width:${(((r.to - r.from) / months) * 100).toFixed(2)}%"></span></span></li>`).join('');
    el.innerHTML = `<div class="g-head"><span class="g-name"></span><span class="g-track">${ticks.join('')}</span></div><ol class="g-rows"><li class="g-bands"><span class="g-name"></span><span class="g-track">${bands}<span class="g-now" style="left:0"></span></span></li>${rows}</ol>`;
    // the earthworks, the part the rain slows most: which months they fall in, and how wet those are
    const earth = s.rows.find((r) => r.k === 'earth');
    const em = [];
    for (let m = Math.floor(earth.from); m < Math.ceil(earth.to); m++) em.push(((m % 12) + 12) % 12);
    const heavy = e.town?.heavy ? em.reduce((n, m) => n + e.town.heavy[m], 0) : 0;
    const inDry = (m) => s.dry && (m - s.dry.start + 12) % 12 < s.dry.n;
    const names = em.map((m) => T.monthsLong[m]);
    const span = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} ${T.and} ${names[1]}` : `${names[0]} ${T.to} ${names[names.length - 1]}`;
    let note = s.dry ? T.startNote(mlabel(s.permitReady)) : T.noDry;
    if (s.dry && em.some((m) => !inDry(m)) && heavy >= 4) note += T.rainNote(span, Math.round(heavy));
    $('[data-est-schedule-note]').textContent = note;
    $('[data-est-legend-dry]').hidden = !s.dry;
  }

  function renderFlags(e) {
    const f = [];
    if (e.area > 1000) f.push(T.flags.setena);
    else if (e.area >= 500) f.push(T.flags.setenaFragile);
    const permit = prog().permit;
    if (T.flags[permit]) f.push(T.flags[permit]);
    if (e.town?.slug === 'papagayo') f.push(T.flags.papagayo);
    else if (state.condo === '1') f.push(T.flags.condo);
    if (e.town?.coastal) f.push(T.flags.coastal);
    $('[data-est-flags]').innerHTML = f.map((x) => `<li>${x}</li>`).join('');
  }

  // the choices, in words, above the total: what a printed or shared estimate is for
  function renderChoices(e) {
    const label = (n) => $(`[name=${n}]:checked + span`)?.textContent ?? '';
    const sel = $('[name=town]');
    const ts = $('[name=type]');
    const bits = [sel.options[sel.selectedIndex]?.text, ts.options[ts.selectedIndex]?.text, `${num(e.area)} m²`, `${state.storeys} ${+state.storeys === 1 ? (ES ? 'piso' : 'storey') : (ES ? 'pisos' : 'storeys')}`, `${ES ? 'acabados' : 'finish'}: ${label('quality').toLowerCase()}`, `${ES ? 'lote' : 'lot'}: ${label('slope').toLowerCase()}`];
    if (+state.pool) bits.push(`${ES ? 'piscina' : 'pool'} ${state.pool} m²`);
    $('[data-est-choices]').textContent = bits.join(' · ');
  }

  // ---------- what each option changes, priced inline ----------
  const short = (n) => {
    if (state.cur === 'crc') { const c = (n * D.fx.crcPerUsd) / 1e6; return `₡${c >= 100 ? Math.round(c) : c.toFixed(1)}M`; }
    return n >= 1e6 ? `US$${(n / 1e6).toFixed(2)}M` : `US$${Math.round(n / 1000)}k`;
  };
  // the likely total with one choice changed, the others as they are
  const likelyWith = (over) => { const keep = { ...state }; Object.assign(state, over); const t = estimate().total[1]; Object.assign(state, keep); return t; };
  function renderDeltas(e) {
    const base = e.total[1];
    for (const el of $$('input[type=radio], input[type=checkbox]', form)) {
      const out = el.closest('label').querySelector('[data-delta]');
      if (!out) continue;
      let d;
      if (el.type === 'checkbox') d = el.checked ? base - likelyWith({ [el.name]: '0' }) : likelyWith({ [el.name]: '1' }) - base;
      else d = el.checked ? 0 : likelyWith({ [el.name]: el.value }) - base;
      out.textContent = Math.abs(d) < 500 ? '' : `${d > 0 ? '+' : '−'}${short(Math.abs(d))}`;
    }
  }

  // ---------- from a budget: the area each finish level reaches, everything else as chosen ----------
  const budgetIn = $('[data-est-budget]');
  let budgetCur = 'usd';
  const budgetVal = () => +budgetIn.value.replace(/[^\d.]/g, '') || 0;
  const budgetShow = (v) => { budgetIn.value = state.cur === 'crc' ? String(Math.round(v)) : num(v); };
  function renderBudget() {
    const cur = $('[data-est-budget-cur]');
    if (state.cur !== budgetCur) {
      // keep the same amount when the currency changes
      const v = budgetVal();
      budgetCur = state.cur;
      if (v) budgetShow(state.cur === 'crc' ? (v * D.fx.crcPerUsd) / 1e6 : Math.round((v * 1e6) / D.fx.crcPerUsd / 1000) * 1000);
    }
    cur.textContent = cur.dataset[state.cur];
    const usd = state.cur === 'crc' ? (budgetVal() * 1e6) / D.fx.crcPerUsd : budgetVal();
    const list = $('[data-est-fits]');
    if (!usd) { list.innerHTML = ''; return; }
    const MIN = 40, MAX = 3000;
    const rows = $$('[name=quality]', form).map((q) => {
      const at = (a) => likelyWith({ area: a, quality: q.value });
      let fit;
      if (at(MIN) > usd) fit = null;
      else if (at(MAX) <= usd) fit = MAX;
      else { let lo = MIN, hi = MAX; for (let k = 0; k < 24; k++) { const mid = (lo + hi) / 2; if (at(mid) <= usd) lo = mid; else hi = mid; } fit = Math.floor(lo / 5) * 5; }
      const name = q.nextElementSibling.textContent;
      if (fit === null) return `<li class="est__fit is-none"><b>${ES ? `menos de ${MIN} m²` : `under ${MIN} m²`}</b><span>${name}</span></li>`;
      const on = fit === state.area && q.value === state.quality;
      return `<li><button class="est__fit${on ? ' is-on' : ''}" type="button" data-area="${fit}" data-quality="${q.value}"><b>${fit === MAX ? `${num(MAX)}+` : num(fit)} m²</b><span>${name}</span></button></li>`;
    });
    list.innerHTML = rows.join('');
  }
  $('[data-est-fits]').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-area]');
    if (!b) return;
    box.value = range.value = b.dataset.area;
    const q = $(`[name=quality][value="${b.dataset.quality}"]`, form);
    if (q) q.checked = true;
    update();
  });
  budgetIn.addEventListener('input', () => { if (D) renderBudget(); });
  budgetIn.addEventListener('change', () => { if (budgetVal()) budgetShow(budgetVal()); });

  // ---------- our projects nearest this size, houses for a house and hospitality for a hotel ----------
  function renderWork(e) {
    const kind = prog().group === 'homes' ? 'house' : 'hotel';
    const cards = $$('.est__work [data-area]');
    const ranked = cards.map((c) => ({ c, d: (c.dataset.kind === kind ? 0 : 10) + Math.abs(Math.log(+c.dataset.area / e.area)) })).sort((a, b) => a.d - b.d);
    const show = new Set(ranked.slice(0, 3).map((x) => x.c));
    const ol = cards[0]?.parentElement;
    for (const { c } of ranked) { c.hidden = !show.has(c); ol.appendChild(c); }
  }

  function summary(e) {
    const town = e.town ? e.town.name : (ES ? 'Costa Rica' : 'Costa Rica');
    return `${num(e.area)} m², ${$(`[name=quality]:checked + span`)?.textContent ?? state.quality}, ${town}, ${money(e.total[0])} ${ES ? 'a' : 'to'} ${money(e.total[2])}`;
  }

  function update() {
    read();
    comboSync();
    $('[data-est-single]').hidden = !prog().single;
    const e = estimate();
    renderTotals(e);
    renderBreakdown(e);
    renderMassing(e);
    renderSchedule(e);
    renderFlags(e);
    renderChoices(e);
    renderDeltas(e);
    renderBudget();
    renderWork(e);
    $('[data-est-area-out]').textContent = `${num(state.area)} m² · ${num(state.area * 10.7639)} ${T.ft2}`;
    toUrl();
    // the printed copy carries the date and the link that reopens this estimate
    const pd = $('[data-est-print-date]');
    if (pd && !pd.textContent) pd.textContent = new Intl.DateTimeFormat(ES ? 'es-CR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    const pu = $('[data-est-print-url]');
    if (pu) pu.textContent = location.href;
    const book = $('[data-est-book]');
    if (book) { book.dataset.base ||= book.getAttribute('href'); book.href = `${book.dataset.base}?town=${encodeURIComponent(state.town)}&est=${encodeURIComponent(location.href)}`; }
    const wa = $('[data-est-wa]');
    wa.href = `https://wa.me/${wa.dataset.phone}?text=${encodeURIComponent(T.wa(summary(e)) + ' ' + location.href)}`;
  }

  // a part pointed at in the bar or in the list lights up in both
  const lightPart = (k) => { for (const el of $$('[data-est-bar] [data-k], [data-est-parts] [data-k]')) el.classList.toggle('is-dim', !!k && el.dataset.k !== k); };
  for (const sel of ['[data-est-bar]', '[data-est-parts]']) {
    $(sel).addEventListener('pointerover', (e) => lightPart(e.target.closest('[data-k]')?.dataset.k));
    $(sel).addEventListener('pointerleave', () => lightPart(null));
  }

  // ---------- what you are building: a search over every type, laid over the plain select ----------
  // Type to filter (names and everyday words in both languages), or open the whole list; each type
  // shows what a m² costs at the finish and town chosen. Without this script the select still works.
  const combo = $('[data-est-combo]');
  const tsel = $('select[name=type]', combo);
  const fold = (x) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const cq = Object.assign(document.createElement('input'), { className: 'input est__combo-in', type: 'text', id: 'est-type-q', autocomplete: 'off', spellcheck: false, placeholder: combo.dataset.ph });
  for (const [k, v] of Object.entries({ role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'est-type-list', 'aria-autocomplete': 'list', 'aria-label': tsel.getAttribute('aria-label') })) cq.setAttribute(k, v);
  const caret = Object.assign(document.createElement('button'), { type: 'button', className: 'est__combo-caret', tabIndex: -1 });
  caret.setAttribute('aria-hidden', 'true');
  const clist = Object.assign(document.createElement('ul'), { className: 'est__combo-list', id: 'est-type-list', hidden: true });
  clist.setAttribute('role', 'listbox');
  tsel.hidden = true;
  tsel.tabIndex = -1;
  combo.append(cq, caret, clist);
  let active = -1, shown = [];
  const comboSync = () => { if (document.activeElement !== cq) cq.value = tsel.options[tsel.selectedIndex]?.text ?? ''; };
  const perM2 = (key) => {
    if (!D) return '';
    const v = D.perM2[key][state.quality][1] * placeOf(townOf());
    return state.cur === 'crc' ? `₡${num((v * D.fx.crcPerUsd) / 1000)}k/m²` : `US$${num(v)}/m²`;
  };
  function setActive(i, center) {
    active = i;
    let el = null;
    for (const li of clist.querySelectorAll('.est__combo-opt')) { const on = +li.dataset.i === i; li.classList.toggle('is-active', on); if (on) el = li; }
    if (!el) { cq.removeAttribute('aria-activedescendant'); return; }
    cq.setAttribute('aria-activedescendant', el.id);
    const top = el.offsetTop, bot = top + el.offsetHeight;
    if (center) clist.scrollTop = top - clist.clientHeight / 2 + el.offsetHeight / 2;
    else if (top < clist.scrollTop) clist.scrollTop = top;
    else if (bot > clist.scrollTop + clist.clientHeight) clist.scrollTop = bot - clist.clientHeight;
  }
  function drawList(q) {
    const words = fold(q.trim()).split(/\s+/).filter(Boolean);
    shown = [];
    let html = '';
    for (const og of tsel.querySelectorAll('optgroup')) {
      const items = [...og.children].filter((o) => {
        if (!words.length) return true;
        const p = D?.programs.list.find((x) => x.key === o.value);
        const hay = fold(`${o.text} ${og.label} ${p ? `${p.en} ${p.es} ${p.aliases}` : ''}`);
        return words.every((w) => hay.includes(w));
      });
      if (!items.length) continue;
      html += `<li class="est__combo-group label" role="presentation">${og.label}</li>`;
      for (const o of items) {
        const i = shown.push(o.value) - 1;
        html += `<li class="est__combo-opt" role="option" id="est-type-${o.value}" data-i="${i}" aria-selected="${o.value === tsel.value}"><span>${o.text}</span><em>${perM2(o.value)}</em></li>`;
      }
    }
    clist.innerHTML = html || `<li class="est__combo-none note" role="presentation">${combo.dataset.none}</li>`;
    const cur = shown.indexOf(tsel.value);
    setActive(!words.length && cur >= 0 ? cur : shown.length ? 0 : -1, !words.length);
  }
  const openList = () => { if (!clist.hidden) return; clist.hidden = false; combo.classList.add('is-open'); cq.setAttribute('aria-expanded', 'true'); drawList(''); };
  const closeList = () => { clist.hidden = true; combo.classList.remove('is-open'); cq.setAttribute('aria-expanded', 'false'); cq.removeAttribute('aria-activedescendant'); cq.value = tsel.options[tsel.selectedIndex]?.text ?? ''; };
  const choose = (key) => { if (key && tsel.value !== key) { tsel.value = key; tsel.dispatchEvent(new Event('change', { bubbles: true })); } closeList(); };
  cq.addEventListener('focus', () => { openList(); cq.select(); });
  cq.addEventListener('click', openList);
  cq.addEventListener('blur', closeList);
  // typing in the search is not a change to the estimate
  for (const ev of ['input', 'change']) cq.addEventListener(ev, (e) => e.stopPropagation());
  cq.addEventListener('input', () => { if (clist.hidden) openList(); drawList(cq.value); });
  cq.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (clist.hidden) openList();
      else if (shown.length) setActive((active + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length);
    } else if (e.key === 'Enter') { e.preventDefault(); if (!clist.hidden && active >= 0) choose(shown[active]); }
    else if (e.key === 'Escape' && !clist.hidden) { e.preventDefault(); e.stopPropagation(); closeList(); }
  });
  // the list keeps the focus in the field, so a click chooses before the field blurs
  clist.addEventListener('mousedown', (e) => e.preventDefault());
  clist.addEventListener('click', (e) => { const li = e.target.closest('.est__combo-opt'); if (li) choose(shown[+li.dataset.i]); });
  clist.addEventListener('mousemove', (e) => { const li = e.target.closest('.est__combo-opt'); if (li && +li.dataset.i !== active) setActive(+li.dataset.i); });
  caret.addEventListener('mousedown', (e) => e.preventDefault());
  caret.addEventListener('click', () => { if (clist.hidden) cq.focus(); else closeList(); });

  // ---------- wiring ----------
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  $('[data-est-copy]')?.addEventListener('click', async (ev) => {
    try { await navigator.clipboard.writeText(location.href); ev.currentTarget.dataset.done = '1'; ev.currentTarget.textContent = T.share; } catch (err) { /* nothing to do */ }
  });
  $('[data-est-print]')?.addEventListener('click', () => window.print());

  fetch(new URL('../data/costs.json', SCRIPT)).then((r) => r.json()).then((d) => {
    D = d;
    fromUrl();
    range.value = box.value;
    root.classList.add('is-ready');
    update();
  }).catch(() => { root.classList.add('is-failed'); });
})();
