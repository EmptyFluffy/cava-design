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
    parts: { foundations: 'Fundaciones y contrapiso', structure: 'Paredes y estructura', roof: 'Techo', openings: 'Puertas y ventanas', finishes: 'Divisiones, pisos, enchapes y cielos', mep: 'Instalaciones mecánicas y eléctricas', slope: 'Pendiente: fundaciones, muros y drenajes', pool: 'Piscina', deck: 'Terrazas y decks', solar: 'Paneles solares', landscape: 'Paisajismo', furniture: 'Mobiliario' },
    softs: { design: 'Diseño y planos (CFIA, desde 5%)', supervision: 'Dirección técnica (CFIA, desde 5%)', permits: 'Permiso municipal y cargos del CFIA', insurance: 'Póliza de riesgos del trabajo (INS)', connection: 'Conexión de agua en Península Papagayo', review: 'Revisiones de diseño del condominio', vat: 'IVA, 13% sobre obra y honorarios', contingency: 'Reserva para imprevistos' },
    phases: { design: 'Diseño', concept: 'Concepto', schematic: 'Anteproyecto', drawings: 'Planos constructivos', permits: 'Permisos', prepermits: 'Uso de suelo, agua y alineamientos', setena: 'SETENA', condo: 'Revisión del condominio', ict: 'ICT', apc: 'CFIA y municipalidad', build: 'Obra', earth: 'Tierra y fundaciones', struct: 'Estructura y techo', closing: 'Cerramientos e instalaciones', finish: 'Acabados', outdoor: 'Exteriores' },
    dry: 'Época seca', today: 'Hoy',
    startNote: (permit, start) => `Los permisos estarían listos hacia ${permit}; el movimiento de tierra y las fundaciones arrancan con la época seca, en ${start}.`,
    rainNote: (now, nowDays, start, startDays) => ` Arrancar de una vez en ${now} significaría unos ${nowDays} días de lluvia fuerte en los primeros cuatro meses, contra ${startDays < 1 ? 'casi ninguno' : `unos ${startDays}`} empezando en ${start}.`,
    noDry: 'Aquí no hay época seca: el cronograma arranca la obra apenas salen los permisos.',
    flags: {
      setena: 'Más de 1,000 m²: necesita viabilidad ambiental de SETENA (formulario D1) antes del permiso.',
      setenaFragile: 'Entre 500 y 1,000 m²: necesita SETENA (formulario D1-C) solo si el lote es un sitio frágil: zona marítimo terrestre, bosque, cerca de un río o naciente, o en recarga acuífera.',
      hotel: 'Un hotel pasa por la revisión de Salud y Bomberos en el APC, y debe cumplir la Ley 7600 de accesibilidad.',
      condo: 'En condominio, el comité de diseño aprueba antes que la municipalidad. La estimación suma dos revisiones; los depósitos y las cuotas cambian según el desarrollo.',
      papagayo: 'En Papagayo el ICT y el MDRB aprueban antes que la municipalidad. Las tres revisiones de diseño (US$2,000 cada una) y la conexión de agua (US$25,000) ya van en la estimación; aparte va un depósito de cumplimiento de US$20,000 a US$50,000 según el tamaño, que se devuelve.',
      coastal: 'Cerca de la playa: a menos de 200 m de la pleamar rige la Ley de la Zona Marítimo Terrestre.',
    },
    solarNote: (kwp, kwh) => `${kwp} kWp, que aquí producen unos ${kwh} kWh al año.`,
    rate: (b, ft, all) => `Construcción ${b} por m² de casa (${ft} por pie²); todo incluido, ${all} por m² de casa.`,
    share: 'Enlace copiado', wa: (sum) => `Hola Studio CAVA, hice una estimación en su sitio: ${sum}. Quisiera conversar sobre el proyecto.`,
    ft2: 'pie²',
  } : {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    likely: 'likely', perM2: 'per m²', perFt2: 'per ft²', construction: 'Construction', soft: 'Design, permits and taxes', total: 'Project total',
    parts: { foundations: 'Foundations and ground slab', structure: 'Walls and structure', roof: 'Roof', openings: 'Doors and windows', finishes: 'Partitions, floors, tiling and ceilings', mep: 'Plumbing and electrical', slope: 'Slope: foundations, walls and drainage', pool: 'Pool', deck: 'Terraces and decks', solar: 'Solar panels', landscape: 'Landscaping', furniture: 'Furniture' },
    softs: { design: 'Design and drawings (CFIA, from 5%)', supervision: 'Technical direction (CFIA, from 5%)', permits: 'Municipal permit and CFIA charges', insurance: 'Work-risk insurance (INS)', connection: 'Water connection in Península Papagayo', review: 'Condominium design reviews', vat: 'VAT, 13% on works and fees', contingency: 'Contingency reserve' },
    phases: { design: 'Design', concept: 'Concept', schematic: 'Schematic design', drawings: 'Construction drawings', permits: 'Permits', prepermits: 'Land use, water and alignments', setena: 'SETENA', condo: 'Condominium review', ict: 'ICT', apc: 'CFIA and municipality', build: 'Construction', earth: 'Earthworks and foundations', struct: 'Structure and roof', closing: 'Envelope and services', finish: 'Finishes', outdoor: 'Outdoors' },
    dry: 'Dry season', today: 'Today',
    startNote: (permit, start) => `Permits would be ready around ${permit}; earthworks and foundations start with the dry season, in ${start}.`,
    rainNote: (now, nowDays, start, startDays) => ` Starting straight away in ${now} would mean about ${nowDays} days of heavy rain in the first four months, against ${startDays < 1 ? 'almost none' : `about ${startDays}`} from ${start}.`,
    noDry: 'There is no dry season here: the schedule starts work as soon as the permits are in.',
    flags: {
      setena: 'Over 1,000 m²: it needs SETENA environmental viability (form D1) before the permit.',
      setenaFragile: 'Between 500 and 1,000 m²: it needs SETENA (form D1-C) only if the lot is a fragile site: the maritime zone, forest, near a river or spring, or an aquifer recharge area.',
      hotel: 'A hotel goes through the Health and Fire review in the APC and must meet the Ley 7600 accessibility rules.',
      condo: 'In a condominium, the design committee approves before the municipality. The estimate adds two reviews; deposits and dues vary by development.',
      papagayo: 'In Papagayo the ICT and the MDRB approve before the municipality. The three design reviews (US$2,000 each) and the water connection (US$25,000) are in the estimate; a compliance deposit of US$20,000 to US$50,000 by house size comes on top and is returned.',
      coastal: 'Near the beach: within 200 m of the high-tide line the maritime zone law applies.',
    },
    solarNote: (kwp, kwh) => `${kwp} kWp, which make about ${kwh} kWh a year here.`,
    rate: (b, ft, all) => `Construction ${b} a m² of house (${ft} a ft²); everything in, ${all} a m² of house.`,
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
  function estimate() {
    const town = D.towns.find((t) => t.slug === state.town) ?? null;
    const place = (town && D.place.town[town.slug]) || D.place.region[town ? town.region : 'other'] || 1;
    const hotel = state.type === 'hotel';
    const rate = D.perM2[hotel ? 'hotel' : 'house'][state.quality].map((r) => r * place); // US$ a m²: low, likely, high
    const area = state.area;
    const base = rate.map((r) => r * area);
    // the building, by part (Hacienda's weights), then what the lot and the outdoors add
    const shares = D.shares[hotel || +state.storeys > 1 ? '2' : '1'];
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
    const total = [0, 1, 2].map((i) => hard[i] + soft[i]);
    return { town, area, rate, parts: all, softs, hard, soft, total, solar };
  }

  // ---------- schedule: design, permits, works; works open with the dry season ----------
  function schedule(e) {
    const Dd = D.durations;
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
    permits.push(['apc', Dd.apc + (state.type === 'hotel' ? Dd.hotelReview : 0)]);
    const works = Math.min(Dd.maxWorks, (Dd.worksBase + a / Dd.worksPerM2) * qf * (state.type === 'hotel' ? Dd.hotelFactor : 1));
    const split = Dd.worksSplit; // shares of the works time
    const now = new Date();
    const start = now.getFullYear() * 12 + now.getMonth(); // months since year 0
    let t = start;
    const rows = [];
    for (const [k, m] of design) { rows.push({ k, group: 'design', from: t, to: t + m }); t += m; }
    for (const [k, m] of permits) { rows.push({ k, group: 'permits', from: t, to: t + m }); t += m; }
    const permitReady = t;
    let buildStart = Math.ceil(t);
    const dry = e.town?.dry;
    if (dry) {
      // the next opening of the dry season at or after the permits
      while (((buildStart % 12) + 12) % 12 !== dry.start) buildStart++;
    }
    let b = buildStart;
    for (const [k, s] of Object.entries(split)) { rows.push({ k, group: 'build', from: b, to: b + works * s }); b += works * s; }
    return { rows, start, end: b, permitReady, buildStart, dry };
  }

  // ---------- drawing ----------
  const COLORS = { foundations: '#2f2f2d', structure: '#4a4a48', roof: '#666663', openings: '#83837f', finishes: '#a5a5a0', mep: '#c4c3bd', slope: '#8a7356', pool: '#7fa6bd', deck: '#b58a5e', solar: '#e2b45c', landscape: '#7d9a6a', furniture: '#d8c6a8' };

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
    bar.innerHTML = e.parts.map(([k, v]) => `<span style="flex-grow:${v[1].toFixed(0)};background:${COLORS[k]}" title="${T.parts[k]}"></span>`).join('');
    list.innerHTML = e.parts.map(([k, v]) => `<li><i style="background:${COLORS[k]}"></i><span>${T.parts[k]}</span><b>${money(v[1])}</b><em>${Math.round((100 * v[1]) / tot)}%</em></li>`).join('');
    $('[data-est-softs]').innerHTML = e.softs.map(([k, v]) => `<li><span>${T.softs[k]}</span><b>${money(v[1])}</b></li>`).join('');
    const sn = $('[data-est-solar]');
    if (sn) sn.textContent = e.solar ? T.solarNote(e.solar.kwp, num(e.solar.kwh)) : '';
  }

  // a simple massing, isometric, with a person for scale
  function renderMassing(e) {
    const svg = $('[data-est-massing]');
    const storeys = +state.storeys;
    const foot = e.area / storeys;
    const W = Math.sqrt(foot * 1.8), Dp = foot / W, H = 3.2 * storeys, R = 1.6;
    const iso = (x, y, z) => [(x - y) * Math.cos(Math.PI / 6), (x + y) * Math.sin(Math.PI / 6) - z];
    const P = (pts) => pts.map((p) => iso(...p).map((n) => n.toFixed(2)).join(',')).join(' ');
    const pool = +state.pool;
    const pw = pool ? Math.sqrt(pool * 2.5) : 0, pd = pool ? pool / pw : 0;
    const shapes = [];
    // ground pad
    shapes.push(`<polygon class="m-ground" points="${P([[-3, -3, 0], [W + 3, -3, 0], [W + 3, Dp + 4 + pd + 2, 0], [-3, Dp + 4 + pd + 2, 0]])}"/>`);
    if (pool) shapes.push(`<polygon class="m-pool" points="${P([[1, Dp + 2, 0], [1 + pw, Dp + 2, 0], [1 + pw, Dp + 2 + pd, 0], [1, Dp + 2 + pd, 0]])}"/>`);
    // walls: the two faces we see (south and east), then the gabled roof along x
    shapes.push(`<polygon class="m-wall-s" points="${P([[0, Dp, 0], [W, Dp, 0], [W, Dp, H], [0, Dp, H]])}"/>`);
    shapes.push(`<polygon class="m-wall-e" points="${P([[W, 0, 0], [W, Dp, 0], [W, Dp, H], [W, 0, H]])}"/>`);
    shapes.push(`<polygon class="m-gable" points="${P([[W, 0, H], [W, Dp, H], [W, Dp / 2, H + R]])}"/>`);
    shapes.push(`<polygon class="m-roof" points="${P([[0, Dp / 2, H + R], [W, Dp / 2, H + R], [W, Dp, H], [0, Dp, H]])}"/>`);
    for (let s = 1; s < storeys; s++) shapes.push(`<polyline class="m-line" points="${P([[0, Dp, 3.2 * s], [W, Dp, 3.2 * s], [W, 0, 3.2 * s]])}"/>`);
    // a person, 1.75 m, in front
    const [px, py] = iso(W + 1.5, Dp + 1.5, 0), [, ph] = iso(W + 1.5, Dp + 1.5, 1.75);
    shapes.push(`<line class="m-person" x1="${px}" y1="${py}" x2="${px}" y2="${ph}"/><circle class="m-person-head" cx="${px}" cy="${ph - 0.25}" r="0.25"/>`);
    // dimensions
    const [lx1, ly1] = iso(0, Dp + 0.8, 0), [lx2, ly2] = iso(W, Dp + 0.8, 0);
    shapes.push(`<line class="m-dim" x1="${lx1}" y1="${ly1}" x2="${lx2}" y2="${ly2}"/><text class="m-text" x="${(lx1 + lx2) / 2}" y="${(ly1 + ly2) / 2 + 1.6}">${Math.round(W)} m</text>`);
    const all = shapes.join('').match(/-?\d+\.?\d*,-?\d+\.?\d*/g).map((s) => s.split(',').map(Number));
    const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
    const pad = 3;
    const vb = [Math.min(...xs) - pad, Math.min(...ys) - pad - 2, Math.max(...xs) - Math.min(...xs) + pad * 2, Math.max(...ys) - Math.min(...ys) + pad * 2 + 4];
    svg.setAttribute('viewBox', vb.map((n) => n.toFixed(1)).join(' '));
    svg.innerHTML = shapes.join('');
    $('[data-est-massing-cap]').textContent = `${num(e.area)} m² · ${storeys} ${storeys === 1 ? (ES ? 'piso' : 'storey') : (ES ? 'pisos' : 'storeys')} · ${Math.round(W)} × ${Math.round(Dp)} m${pool ? ` · ${ES ? 'piscina' : 'pool'} ${pool} m²` : ''}`;
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
    // what waiting for the dry season saves: heavy-rain days in the first four months of work
    const heavy4 = (m0) => (e.town?.heavy ? [0, 1, 2, 3].reduce((n, k) => n + e.town.heavy[(((m0 + k) % 12) + 12) % 12], 0) : 0);
    const nowStart = Math.ceil(s.permitReady);
    let note = s.dry ? T.startNote(mlabel(s.permitReady), mlabel(s.buildStart)) : T.noDry;
    if (s.dry && s.buildStart - nowStart >= 2 && e.town?.heavy) note += T.rainNote(mlabel(nowStart), Math.round(heavy4(nowStart)), mlabel(s.buildStart), Math.round(heavy4(s.buildStart)));
    $('[data-est-schedule-note]').textContent = note;
    $('[data-est-legend-dry]').hidden = !s.dry;
  }

  function renderFlags(e) {
    const f = [];
    if (e.area > 1000) f.push(T.flags.setena);
    else if (e.area >= 500) f.push(T.flags.setenaFragile);
    if (state.type === 'hotel') f.push(T.flags.hotel);
    if (e.town?.slug === 'papagayo') f.push(T.flags.papagayo);
    else if (state.condo === '1') f.push(T.flags.condo);
    if (e.town?.coastal) f.push(T.flags.coastal);
    $('[data-est-flags]').innerHTML = f.map((x) => `<li>${x}</li>`).join('');
  }

  // the choices, in words, above the total: what a printed or shared estimate is for
  function renderChoices(e) {
    const label = (n) => $(`[name=${n}]:checked + span`)?.textContent ?? '';
    const sel = $('[name=town]');
    const bits = [sel.options[sel.selectedIndex]?.text, label('type'), `${num(e.area)} m²`, `${state.storeys} ${+state.storeys === 1 ? (ES ? 'piso' : 'storey') : (ES ? 'pisos' : 'storeys')}`, `${ES ? 'acabados' : 'finish'}: ${label('quality').toLowerCase()}`, `${ES ? 'lote' : 'lot'}: ${label('slope').toLowerCase()}`];
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
    const kind = state.type === 'hotel' ? 'hotel' : 'house';
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
    const wa = $('[data-est-wa]');
    wa.href = `https://wa.me/${wa.dataset.phone}?text=${encodeURIComponent(T.wa(summary(e)) + ' ' + location.href)}`;
  }

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
