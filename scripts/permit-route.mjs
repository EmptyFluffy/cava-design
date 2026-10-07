// The permit route for a project in Costa Rica: which steps apply, in what order, and why.
// One module for the build (each town page gets its route drawn in) and for the browser
// (site/assets/js/permit-route.mjs, copied by the build), so the drawn and the interactive routes agree.
// Numbers in `cite` are the sources of the permits guide (data/guides/building-permits.json).

// Each municipality: its regulating plan (INVU's layer of plans, edited 2026) and how its review went in
// the CFIA's APC in 2024-25 (CFIA, Ranking municipal 2024-2025): average days to approve, share approved
// at the first submission.
export const MUNI = {
  'santa-cruz': { en: 'the Municipalidad de Santa Cruz', es: 'la Municipalidad de Santa Cruz', plan: 'partial', planYears: '1983, 1994', days: 10.1, first: 35 },
  carrillo: { en: 'the Municipalidad de Carrillo', es: 'la Municipalidad de Carrillo', plan: 'none', days: 26.1, first: 34, power: true },
  liberia: { en: 'the Municipalidad de Liberia', es: 'la Municipalidad de Liberia', plan: 'partial', planYears: '1983, 2002, 2008', days: 10.1, first: 61 },
  nicoya: { en: 'the Municipalidad de Nicoya', es: 'la Municipalidad de Nicoya', plan: 'partial', planYears: '1983', days: 5.9, first: 22 },
  cobano: { en: 'the Concejo Municipal de Distrito de Cóbano', es: 'el Concejo Municipal de Distrito de Cóbano', plan: null, days: 20.6, first: 18 },
  garabito: { en: 'the Municipalidad de Garabito', es: 'la Municipalidad de Garabito', plan: 'none', days: 18.6, first: 12 },
  osa: { en: 'the Municipalidad de Osa', es: 'la Municipalidad de Osa', plan: 'partial', planYears: '1997', days: 9.0, first: 16 },
  talamanca: { en: 'the Municipalidad de Talamanca', es: 'la Municipalidad de Talamanca', plan: 'none', days: 2.8, first: 82 },
  escazu: { en: 'the Municipalidad de Escazú', es: 'la Municipalidad de Escazú', plan: 'full', planYears: '2005, updated 2025', days: 1.3, first: 16 },
  'santa-ana': { en: 'the Municipalidad de Santa Ana', es: 'la Municipalidad de Santa Ana', plan: 'full', planYears: '2026', days: 12.3, first: 23 },
  atenas: { en: 'the Municipalidad de Atenas', es: 'la Municipalidad de Atenas', plan: 'none', days: 11.2, first: 62 },
  heredia: { en: 'the Municipalidad de Heredia', es: 'la Municipalidad de Heredia', plan: 'none', days: 36.1, first: 41 },
};
export const TOWN_MUNI = {
  tamarindo: 'santa-cruz', 'playa-grande': 'santa-cruz', 'playa-negra': 'santa-cruz', flamingo: 'santa-cruz',
  'playas-del-coco': 'carrillo', papagayo: 'liberia', liberia: 'liberia', nosara: 'nicoya', samara: 'nicoya',
  'santa-teresa': 'cobano', jaco: 'garabito', dominical: 'osa', uvita: 'osa', 'puerto-viejo': 'talamanca',
  escazu: 'escazu', 'santa-ana': 'santa-ana', atenas: 'atenas', heredia: 'heredia',
};
export const TYPES = ['house', 'units', 'apartments', 'hotel', 'shop'];
export const SIZES = ['s', 'm', 'l', 'xl']; // under 300, 300 to 500, 500 to 1,000, over 1,000 m²

const T = {
  en: {
    stages: ['The lot and its rules', 'Approvals before the drawings', 'The environment', 'Drawings and the CFIA', 'Licence and works', 'Before opening'],
    who: { muni: 'Municipality', water: 'AyA or ASADA', invu: 'INVU', mopt: 'MOPT', power: 'ICE or cooperative', ict: 'ICT', condo: 'Condominium', mdrb: 'MDRB', setena: 'SETENA', cfia: 'CFIA', apc: 'CFIA APC', health: 'Ministry of Health', fire: 'Fire Department', ins: 'INS', access: 'Law 7600' },
    use: ['Land use certificate', 'What the zoning allows on the lot: use, setbacks, coverage, density and height.'],
    water: ['Water availability', 'Every building needs it. AyA answers within 15 working days, free, valid 12 months; where an ASADA supplies the water, it gives its own letter.'],
    river: ['River or spring alignment', 'The protected strip along the river or around the spring, which cannot be built on. 15 working days, valid 24 months.'],
    road: ['National road alignment', 'The setback from a national road, set by MOPT. Up to 3 months.'],
    power: ['Electricity letter', 'Not a national rule, but this municipality asks for it.'],
    zmt: ['Maritime zone concession', 'Within 200 m of the high tide the land is held under a concession, which needs an approved coastal plan; no concessions to foreigners with under 5 years of residence.'],
    condo: ['Condominium design review', "The committee checks the design against the condominium's rules before the municipality sees it."],
    mdrb: ['MDRB design reviews', 'In Península Papagayo: a pre-design meeting, the schematic and the final design, US$2,000 each, before anything else.'],
    ict: ['ICT approval', 'The tourism pole is an ICT concession: the ICT approves the schematic design and stamps the drawings.'],
    setenaNo: ['SETENA', (why) => `Not needed: ${why}.`],
    setenaD1C: ['SETENA, form D1-C', 'Between 500 and 1,000 m² on a fragile site. Resolved within 7 days; the licence comes before the permit.'],
    setenaD1: ['SETENA, form D1', 'Over 1,000 m², on any site. The environmental viability comes before the permit.'],
    whySmall: 'under 500 m²', whyPlain: 'between 500 and 1,000 m² on a site that is not fragile',
    drawings: ['Drawings and contract', "Registered in the CFIA's APC with the architect and engineers responsible; the CFIA charges about 0.27% of its valuation, and its stamp lasts a year."],
    healthDecl: ['Health: sworn declaration', "For a house, or a building of 300 m² or less, Health approves on the professional's sworn declaration."],
    healthFull: ['Health: full review', '15 working days for the first review and 5 for corrections.'],
    fireNo: ['Fire Department', 'No review for a house or fewer than 4 apartments, though the fire rules still apply.'],
    fire: ['Fire Department review', 'Every building other than a house, and apartments from 4 units, under the NFPA codes.'],
    access: ['Accessibility', 'Open to the public, it must meet Law 7600: accessible entrance, 0.90 m doors, 1.20 m corridors, ramps and accessible toilets.'],
    muniReview: ['Municipal review in the APC', (m) => m ? `${cap(m.name)} approved projects in ${fmt(m.days)} days on average in 2024-25, ${m.first}% at the first submission.` : 'Each municipality reviews the drawings in the same platform.'],
    licence: ['Municipal licence', 'A construction tax of up to 1% of the value of the works, after the INS work-risk policy.'],
    logbook: ['Digital site logbook', 'Opened by the director of works, with its QR code on site.'],
    psf: ['Health operating permit', 'The Permiso Sanitario de Funcionamiento, after the works. For most activities issued on submission, valid 5 years.'],
    patente: ['Business licence', 'The patente: the municipality has 30 calendar days, and it needs the land use certificate.'],
    plan: { full: (y) => `a regulating plan for the whole canton (${y})`, partial: (y) => `a partial regulating plan (${y}); outside it, the national construction rules apply`, none: () => 'no regulating plan: the national construction rules apply', unknown: () => 'ask whether a regulating plan covers the lot' },
    muniCard: (name, plan) => `${cap(name)} issues the permit. It has ${plan}.`,
    noMuni: 'Pick the town to see its municipality.',
    applies: 'Applies', skip: 'Not needed',
  },
  es: {
    stages: ['El lote y sus reglas', 'Aprobaciones antes de los planos', 'El ambiente', 'Los planos y el CFIA', 'Licencia y obra', 'Antes de abrir'],
    who: { muni: 'Municipalidad', water: 'AyA o ASADA', invu: 'INVU', mopt: 'MOPT', power: 'ICE o cooperativa', ict: 'ICT', condo: 'Condominio', mdrb: 'MDRB', setena: 'SETENA', cfia: 'CFIA', apc: 'APC del CFIA', health: 'Ministerio de Salud', fire: 'Bomberos', ins: 'INS', access: 'Ley 7600' },
    use: ['Certificado de uso de suelo', 'Lo que la zonificación permite en el lote: uso, retiros, cobertura, densidad y altura.'],
    water: ['Disponibilidad de agua', 'Toda edificación la necesita. AyA responde en 15 días hábiles, gratis, con validez de 12 meses; donde el agua la da una ASADA, ella emite su propia carta.'],
    river: ['Alineamiento de río o naciente', 'La franja protegida a la orilla del río o alrededor de la naciente, donde no se construye. 15 días hábiles, válido 24 meses.'],
    road: ['Alineamiento de ruta nacional', 'El retiro de una ruta nacional, que fija el MOPT. Hasta 3 meses.'],
    power: ['Carta de electricidad', 'No es una regla nacional, pero esta municipalidad la pide.'],
    zmt: ['Concesión en zona marítimo terrestre', 'En los 200 m desde la pleamar el terreno se tiene en concesión, que necesita un plan costero aprobado; no hay concesiones para extranjeros con menos de 5 años de residencia.'],
    condo: ['Revisión del condominio', 'El comité revisa el diseño contra las reglas del condominio antes de que lo vea la municipalidad.'],
    mdrb: ['Revisiones del MDRB', 'En la Península Papagayo: reunión previa, esquema y diseño final, US$2,000 cada una, antes que todo lo demás.'],
    ict: ['Aprobación del ICT', 'El polo turístico es una concesión del ICT: el ICT aprueba el anteproyecto y visa los planos.'],
    setenaNo: ['SETENA', (why) => `No se necesita: ${why}.`],
    setenaD1C: ['SETENA, formulario D1-C', 'Entre 500 y 1,000 m² en un sitio frágil. Se resuelve en 7 días; la licencia va antes del permiso.'],
    setenaD1: ['SETENA, formulario D1', 'Más de 1,000 m², en cualquier sitio. La viabilidad ambiental va antes del permiso.'],
    whySmall: 'menos de 500 m²', whyPlain: 'entre 500 y 1,000 m² en un sitio que no es frágil',
    drawings: ['Planos y contrato', 'Se registran en el APC del CFIA con el arquitecto y los ingenieros responsables; el CFIA cobra cerca del 0.27% de su valoración, y su sello dura un año.'],
    healthDecl: ['Salud: declaración jurada', 'En una casa, o en un edificio de 300 m² o menos, Salud aprueba con la declaración jurada del profesional.'],
    healthFull: ['Salud: revisión completa', '15 días hábiles para la primera revisión y 5 para las correcciones.'],
    fireNo: ['Bomberos', 'No revisan una casa ni menos de 4 apartamentos, aunque las reglas contra incendios igual aplican.'],
    fire: ['Revisión de Bomberos', 'Toda edificación que no sea una casa, y los apartamentos desde 4 unidades, con los códigos NFPA.'],
    access: ['Accesibilidad', 'Al estar abierto al público, debe cumplir la Ley 7600: entrada accesible, puertas de 0.90 m, pasillos de 1.20 m, rampas y servicios accesibles.'],
    muniReview: ['Revisión municipal en el APC', (m) => m ? `${cap(m.name)} aprobó proyectos en ${fmt(m.days)} días en promedio en 2024-25, el ${m.first}% al primer ingreso.` : 'Cada municipalidad revisa los planos en la misma plataforma.'],
    licence: ['Licencia municipal', 'Un impuesto de construcción de hasta el 1% del valor de la obra, después de la póliza de riesgos del trabajo del INS.'],
    logbook: ['Bitácora digital', 'La abre el director de la obra, con su código QR en el sitio.'],
    psf: ['Permiso sanitario de funcionamiento', 'Después de la obra. Para casi todas las actividades se da al presentarlo, y dura 5 años.'],
    patente: ['Patente', 'La municipalidad tiene 30 días naturales para resolverla, y necesita el uso de suelo.'],
    plan: { full: (y) => `un plan regulador para todo el cantón (${y})`, partial: (y) => `un plan regulador parcial (${y}); fuera de él rigen las reglas nacionales de construcción`, none: () => 'no tiene plan regulador: rigen las reglas nacionales de construcción', unknown: () => 'conviene preguntar si un plan regulador cubre el lote' },
    muniCard: (name, plan) => `${cap(name)} da el permiso. ${plan.startsWith('no tiene') || plan.startsWith('conviene') ? cap(plan) : `Tiene ${plan}`}.`,
    noMuni: 'Elija el pueblo para ver su municipalidad.',
    applies: 'Aplica', skip: 'No se necesita',
  },
};
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// input: { type, size, zmt, river, forest, condo, road, town }
export function route(input, lang = 'en') {
  const L = T[lang];
  const q = { type: 'house', size: 'm', ...input };
  const mk = MUNI[TOWN_MUNI[q.town]] ?? null;
  const m = mk ? { ...mk, name: mk[lang] } : null;
  const papagayo = q.town === 'papagayo';
  const area = { s: 250, m: 400, l: 750, xl: 1500 }[q.size];
  const fragile = q.zmt || q.river || q.forest;
  const house = q.type === 'house';
  const residential = ['house', 'units', 'apartments'].includes(q.type);
  const node = (key, [title, note], who, cite, on = true, extra = {}) => ({ key, title, note, who: L.who[who], cite, on, ...extra });
  const stages = [];

  // 1. the lot and its rules: asked for together
  const lot = [node('use', L.use, 'muni', [1, 2]), node('water', L.water, 'water', [2, 6])];
  if (q.river) lot.push(node('river', L.river, 'invu', [4, 5]));
  if (q.road) lot.push(node('road', L.road, 'mopt', [3]));
  if (m?.power) lot.push(node('power', L.power, 'power', [7]));
  if (q.zmt) lot.push(node('zmt', L.zmt, 'muni', [25, 26]));
  stages.push({ name: L.stages[0], nodes: lot, parallel: true });

  // 2. a condominium or the Papagayo pole approve before anyone else
  const pre = [];
  if (papagayo) { pre.push(node('mdrb', L.mdrb, 'mdrb', [])); pre.push(node('ict', L.ict, 'ict', [])); }
  else if (q.condo) pre.push(node('condo', L.condo, 'condo', []));
  if (pre.length) stages.push({ name: L.stages[1], nodes: pre, parallel: false });

  // 3. SETENA, by area and site (Decreto 43898)
  let setena;
  if (area < 500) setena = node('setena', [L.setenaNo[0], L.setenaNo[1](L.whySmall)], 'setena', [8], false);
  else if (area <= 1000) setena = fragile ? node('setena', L.setenaD1C, 'setena', [8, 9]) : node('setena', [L.setenaNo[0], L.setenaNo[1](L.whyPlain)], 'setena', [8], false);
  else setena = node('setena', L.setenaD1, 'setena', [8, 9]);
  stages.push({ name: L.stages[2], nodes: [setena], parallel: false });

  // 4. drawings, then the institutions review them side by side in the APC
  stages.push({ name: L.stages[3], nodes: [node('drawings', L.drawings, 'cfia', [10, 11])], parallel: false });
  const review = [];
  review.push(house || area < 300 ? node('health', L.healthDecl, 'health', [12]) : node('health', L.healthFull, 'health', [12]));
  const fireReview = !(house || q.type === 'units');
  review.push(fireReview ? node('fire', L.fire, 'fire', [12, 18]) : node('fire', L.fireNo, 'fire', [12], false));
  if (!residential) review.push(node('access', L.access, 'access', [19, 20]));
  review.push(node('muni-review', [L.muniReview[0], L.muniReview[1](m)], 'muni', m ? [29] : [10]));
  stages.push({ name: '', nodes: review, parallel: true, sub: true });

  // 5. licence and works
  stages.push({ name: L.stages[4], nodes: [node('licence', L.licence, 'muni', [1, 13, 14]), node('logbook', L.logbook, 'cfia', [15])], parallel: false, chain: true });

  // 6. a hotel or a shop opens with two more permits
  if (!residential) stages.push({ name: L.stages[5], nodes: [node('psf', L.psf, 'health', [16]), node('patente', L.patente, 'muni', [1, 17])], parallel: true });

  const card = m ? L.muniCard(m.name, m.plan ? L.plan[m.plan](lang === 'es' ? (m.planYears ?? '').replace('updated', 'actualizado') : m.planYears) : L.plan.unknown()) : L.noMuni;
  return { stages, card, muni: m ? { ...m } : null };
}

// The route as HTML; `cite(n)` gives the link of source n.
export function render(r, lang = 'en', cite = (n) => `#source-${n}`) {
  const L = T[lang];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sup = (ns) => (ns.length ? `<sup class="cite">${ns.map((n) => `<a href="${cite(n)}">${n}</a>`).join(',')}</sup>` : '');
  let k = 0;
  const stage = (s) => {
    if (!s.sub) k += 1;
    const many = s.nodes.length > 1;
    return `<li class="pf__stage${many && s.parallel ? ' is-parallel' : ''}${many && !s.parallel ? ' is-chain' : ''}${s.sub ? ' is-sub' : ''}">
  ${s.name ? `<p class="pf__name label">(${String(k).padStart(2, '0')}) ${esc(s.name)}</p>` : ''}
  <ul class="pf__row">${s.nodes.map((n) => `
    <li class="pf__node${n.on ? '' : ' is-off'}" data-key="${n.key}">
      <span class="pf__who label">${esc(n.who)}</span>
      <h4 class="pf__title">${esc(n.title)}</h4>
      <p class="pf__note">${esc(n.note)}${sup(n.cite)}</p>
      ${n.on ? '' : `<span class="pf__skip label">${L.skip}</span>`}
    </li>`).join('')}
  </ul>
</li>`;
  };
  return `<p class="pf__card">${esc(r.card)}${r.muni ? sup([21, 29]) : ''}</p>
<ol class="pf">${r.stages.map(stage).join('')}</ol>`;
}
