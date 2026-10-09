// Builds the project pages, in English and Spanish, from data/projects.json. No dependencies.
//
//   node scripts/build.mjs
//
// Writes:
//   site/projects/index.html                 all projects
//   site/projects/<slug>/index.html          one page per project: images and technical sheet
//   site/es/proyectos/...                    the same pages in Spanish (text in scripts/strings.mjs)
//   site/studio/index.html, site/es/estudio/ what we believe, and the process (text in data/studio.json)
//   site/architects/, site/es/arquitectos/   where we work, and one page per town (data/towns.json + data/town-data.json)
//   site/es/index.html                       the Spanish home: site/index.html with scripts/home-es.mjs applied
//   site/sitemap.xml, site/robots.txt
//   site/assets/js/renders.js, renders.es.js the list the home page image viewer and hero walk
//
// Run scripts/images.py first when images change (it writes data/image-sizes.json).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UI } from './strings.mjs';
import { PAIRS, SAME } from './home-es.mjs';
import { sunFacts, path as sunPath, SOLSTICE_JUNE, EQUINOX_MARCH, SOLSTICE_DECEMBER } from './sun.mjs';
import { route as permitRoute, render as permitRender, TOWN_MUNI } from './permit-route.mjs';
import { T as TT, MONTHS, MONTHS_SHORT, climate, paragraphs, faq, num, duration } from './towns-text.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const { projects, hero } = JSON.parse(readFileSync(join(ROOT, 'data', 'projects.json'), 'utf8'));
const studio = JSON.parse(readFileSync(join(ROOT, 'data', 'studio.json'), 'utf8'));
const bySlug = new Map(projects.map((p) => [p.slug, p]));
const sizes = JSON.parse(readFileSync(join(ROOT, 'data', 'image-sizes.json'), 'utf8'));
const { towns, regions } = JSON.parse(readFileSync(join(ROOT, 'data', 'towns.json'), 'utf8'));
const townData = JSON.parse(readFileSync(join(ROOT, 'data', 'town-data.json'), 'utf8'));
const { stations } = JSON.parse(readFileSync(join(ROOT, 'data', 'stations.json'), 'utf8'));
// Guides (data/guides/*.json): long-form pages with sources. Each says where it lives in each language.
const GUIDE_DIR = join(ROOT, 'data', 'guides');
const guides = existsSync(GUIDE_DIR) ? readdirSync(GUIDE_DIR).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(GUIDE_DIR, f), 'utf8'))) : [];

const ORIGIN = 'https://cava.design';
const WHATSAPP = '50671737336';
const WHATSAPP_SHOWN = '+506 7173 7336';
const EMAIL = 'hola@cava.design';
const CAREERS = 'careers@cava.design';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
const wa = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
const MARK = '<svg class="brand__mark" viewBox="-366 -366 734 732" aria-hidden="true" focusable="false"><path d="M0-366A366 366 0 0 0 0 366Z"/><path d="M2-366H368V366Z"/></svg>';
const WA_ICON = '<svg class="wa__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

// A project's text in one language: Spanish takes <field>_es where the data has it.
const tr = (lang, obj, key) => (lang === 'es' && obj[`${key}_es`] != null ? obj[`${key}_es`] : obj[key]);
const altOf = (lang, p, n) => tr(lang, p.images[n - 1], 'alt');

// Site paths of each page, per language, from the site root.
const projectsPath = (lang) => `${UI[lang].dir}${UI[lang].projectsDir}/`;
const projectPath = (lang, slug) => `${projectsPath(lang)}${slug}/`;
const studioPath = (lang) => `${UI[lang].dir}${UI[lang].studioDir}/`;
const townsPath = (lang) => `${UI[lang].dir}${UI[lang].townsDir}/`;
const townPath = (lang, slug) => `${townsPath(lang)}${slug}/`;
const otherLang = (lang) => (lang === 'en' ? 'es' : 'en');

// Image helpers. `up` is the path back to site/ ("../", "../../" or "../../../").
const imgBase = (slug, n) => `assets/img/projects/${slug}/${n}`;
// A short fingerprint of an image's files, added to its URL as ?v=. Image files are named by position
// (1 = cover), so a new cover keeps the old name; the fingerprint makes browsers fetch it again.
const versions = new Map();
const imgVer = (key) => {
  if (!versions.has(key)) {
    const h = createHash('md5');
    for (const w of [1600, 800]) h.update(readFileSync(join(SITE, `assets/img/projects/${key}-${w}.webp`)));
    versions.set(key, h.digest('hex').slice(0, 8));
  }
  return versions.get(key);
};
// The same for stylesheets, scripts and data: a fingerprint of the file the page asks for, so a deploy
// never pairs new markup with an old stylesheet or script held in a browser's cache.
const assetVers = new Map();
const md5 = (x) => createHash('md5').update(x).digest('hex').slice(0, 8);
const assetVer = (rel) => {
  if (!assetVers.has(rel)) {
    // files the build writes itself are hashed from what it will write
    const made = { 'assets/js/renders.js': () => rendersJs('en', ''), 'assets/js/renders.es.js': () => rendersJs('es', '../'), 'assets/data/costs.json': () => JSON.stringify(costsData()) }[rel];
    assetVers.set(rel, md5(made ? made() : readFileSync(join(SITE, rel))));
  }
  return assetVers.get(rel);
};
function picture(up, slug, n, alt, sizesAttr, { eager = false, cls = '' } = {}) {
  const [w, h] = sizes[`${slug}/${n}`];
  const b = up + imgBase(slug, n);
  const v = `?v=${imgVer(`${slug}/${n}`)}`;
  return `<img${cls ? ` class="${cls}"` : ''} src="${b}-1600.webp${v}" srcset="${b}-800.webp${v} 800w, ${b}-1600.webp${v} 1600w" sizes="${sizesAttr}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" alt="${esc(alt)}">`;
}

// Images for the process stages and the services (data/process.json, scripts/process-images.py): 3:2,
// the studio's drawings in the page's language where they carry words.
const PROCESS_PATH = join(ROOT, 'data', 'process.json');
const proc = existsSync(PROCESS_PATH) ? JSON.parse(readFileSync(PROCESS_PATH, 'utf8')) : null;
const procName = (lang, id) => (proc.images[id].lang && lang === 'es' ? `${id}-es` : id);
const procVer = new Map();
function procImg(lang, up, id, sizesAttr, { eager = false, cls = '' } = {}) {
  const name = procName(lang, id);
  if (!procVer.has(name)) {
    const h = createHash('md5');
    for (const w of [1600, 800]) h.update(readFileSync(join(SITE, `assets/img/process/${name}-${w}.webp`)));
    procVer.set(name, h.digest('hex').slice(0, 8));
  }
  const b = `${up}assets/img/process/${name}`, v = `?v=${procVer.get(name)}`;
  return `<img${cls ? ` class="${cls}"` : ''} src="${b}-1600.webp${v}" srcset="${b}-800.webp${v} 800w, ${b}-1600.webp${v} 1600w" sizes="${sizesAttr}" width="1600" height="1066" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" alt="${esc(proc.images[id][`alt_${lang}`])}">`;
}
// a row of images that scrolls sideways (credits stay in data/process.json: the licences ask for none)
const procStrip = (lang, up, ids, cls = '') => `<ul class="pstrip${cls ? ` ${cls}` : ''}">${ids.map((id) => `<li>${procImg(lang, up, id, '(min-width: 768px) 26vw, 78vw')}</li>`).join('')}</ul>`;
const serviceImages = (slug) => proc?.services[slug] ?? [];

// `paths` = { en, es }: this page in each language, from the site root.
function head(lang, { title, description, paths, image, up, script, jsonld }) {
  const t = UI[lang];
  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${ORIGIN}/${paths[lang]}">
<link rel="alternate" hreflang="en" href="${ORIGIN}/${paths.en}">
<link rel="alternate" hreflang="es" href="${ORIGIN}/${paths.es}">
<link rel="alternate" hreflang="x-default" href="${ORIGIN}/${paths.en}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${t.locale}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${ORIGIN}/${paths[lang]}">
<meta property="og:image" content="${ORIGIN}/${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#fcfcfc">
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${up}apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300..700&display=swap">
<link rel="stylesheet" href="${up}assets/css/site.css?v=${assetVer('assets/css/site.css')}">
${[].concat(script ?? [], booking && ![].concat(script ?? []).includes('booking.js') ? ['book-sheet.js'] : [], 'accordion.js', 'titles.js', 'info-sheet.js').map((s) => `<script defer src="${up}assets/js/${s}?v=${assetVer(`assets/js/${s}`)}"></script>
`).join('')}${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>
` : ''}</head>
<body class="sub">
`;
}

// The link to this page in the other language.
function langLink(lang, up, paths, cls) {
  const o = UI[lang].other;
  return `<a class="${cls}" href="${up}${paths[otherLang(lang)]}" hreflang="${o.lang}" lang="${o.lang}" aria-label="${o.name}">(${o.code})</a>`;
}

// The client portal: a lock, drawn to sit with the uppercase labels.
const LOCK = '<svg class="lock" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="3" y="7.2" width="10" height="7.3" rx="1.7"/><path d="M5.3 7.2V5.1a2.7 2.7 0 0 1 5.4 0v2.1"/></svg>';
const portalPath = (lang) => (lang === 'en' ? 'portal/' : 'es/portal/');

function bar(lang, up, paths, current) {
  const t = UI[lang].nav;
  const home = up + UI[lang].dir;
  const link = (href, label, key) => `<a class="ulink" href="${href}"${current === key ? ' aria-current="page"' : ''}>${label}</a>`;
  const studioHref = up + studioPath(lang);
  return `<header class="bar">
  <a class="bar__brand" href="${home}" aria-label="${t.home}">${MARK}<span>Studio CAVA</span></a>
  <nav class="bar__links label" aria-label="${t.aria}">
    ${link(up + projectsPath(lang), t.projects, 'projects')}, ${services.length ? `${link(up + servicesPath(lang), SVT[lang].link, 'services')}, ` : ''}${link(studioHref, t.studio, 'studio')}, ${link(`${home}#contact`, t.contact)}, ${langLink(lang, up, paths, 'ulink lang')}
  </nav>
  <div class="bar__acts">
    <a class="pill portal-btn" href="${up}${portalPath(lang)}" aria-label="${t.portal}"${current === 'portal' ? ' aria-current="page"' : ''}>${LOCK}<span class="portal-btn__t">${t.portalShort}</span></a>
    <a class="btn btn--dark bar__cta" href="${home}#enquiry">${t.cta} <span class="btn__dot" aria-hidden="true"></span></a>
  </div>
</header>
`;
}

function contact(lang, waText, up = null, q = '') {
  const t = UI[lang].reach;
  return `<section class="reach grid" aria-labelledby="reach-title">
  <span class="label reach__label" id="reach-title">${t.label}</span>
  <div class="reach__main">
    <p class="h3">${t.text}</p>
    <div class="reach__actions">
      <a class="btn btn--dark" href="${wa(waText)}" target="_blank" rel="noopener">WhatsApp ${WHATSAPP_SHOWN} <span class="btn__dot" aria-hidden="true"></span></a>
${up !== null && booking ? `      <a class="btn btn--light" href="${up}${bookPath(lang)}${q}">${BK[lang].link} <span class="btn__dot" aria-hidden="true"></span></a>
` : ''}      <a class="btn btn--light reach__mail" href="mailto:${EMAIL}">${EMAIL} <span class="btn__dot" aria-hidden="true"></span></a>
    </div>
  </div>
</section>
`;
}

function footer(lang, up, paths) {
  const t = UI[lang].footer;
  const n = UI[lang].nav;
  const o = UI[lang].other;
  const home = up + UI[lang].dir;
  return `<footer class="footer page">
  <div class="grid footer__top">
    <div class="footer__brand cq">
      <p class="footer__word" aria-label="CAVA">CAVA</p>
    </div>
    <nav class="footer__nav" aria-label="${t.aria}">
      <span class="label">${t.nav}</span>
      <a class="footer__link" href="${up}${projectsPath(lang)}">${n.projects}</a>
${services.length ? `      <a class="footer__link" href="${up}${servicesPath(lang)}">${SVT[lang].link}</a>
` : ''}      <a class="footer__link" href="${up}${studioPath(lang)}">${n.studio}</a>
      <a class="footer__link" href="${home}#enquiry">${n.contact}</a>
    </nav>
    <div class="footer__info">
      <div>
        <span class="label">${t.studio}</span>
        <p>${t.about}</p>
      </div>
      <div>
        <span class="label">${t.info}</span>
        <dl class="info">
          <div><dt>${t.address}</dt><dd>San José, Costa Rica</dd></div>
          <div><dt>W:</dt><dd><a class="ulink" href="${wa(UI[lang].wa.general)}" target="_blank" rel="noopener">${WHATSAPP_SHOWN}</a></dd></div>
          <div><dt>E:</dt><dd><a class="ulink" href="mailto:${EMAIL}">${EMAIL}</a></dd></div>
          <div><dt>${t.hoursKey}</dt><dd>${t.hours}</dd></div>
        </dl>
        <a class="footer__careers ulink" href="mailto:${CAREERS}?subject=Portfolio">${t.careersCta}: ${CAREERS} →</a>
      </div>
      <img class="footer__mark" src="${up}assets/mark.svg" width="56" height="56" alt="">
    </div>
    <div class="footer__more">
${costs || land || permitGuide ? `      <div class="footer__group"><span class="label">${t.tools}</span>
${costs ? `        <a class="ulink" href="${up}${estimatorPath(lang)}">${ET[lang].link}</a>
` : ''}${land ? `        <a class="ulink" href="${up}${landPath(lang)}">${LT[lang].link}</a>
` : ''}${permitGuide ? `        <a class="ulink" href="${up}${permitPath(lang)}">${PR[lang].link}</a>
` : ''}      </div>
` : ''}      <div class="footer__group"><span class="label">${t.cr}</span>
        <a class="ulink" href="${up}${townsPath(lang)}">${t.where}</a>
${guides.length ? `        <a class="ulink" href="${up}${guidesIndexPath(lang)}">${GT[lang].guides}</a>
` : ''}      </div>
      <div class="footer__group"><span class="label">${t.more}</span>
${identity ? `        <a class="ulink" href="${up}${identityPath(lang)}">${esc(identity[lang].footer)}</a>
` : ''}${books ? `        <a class="ulink" href="${up}${libraryPath(lang)}">${lang === 'en' ? 'Library' : 'Biblioteca'}</a>
` : ''}        <a class="ulink" href="${up}${portalPath(lang)}">${n.portal}</a>
      </div>
    </div>
  </div>
  <div class="grid footer__bottom label">
    <p>© 2026 Studio CAVA<br>San José, Costa Rica</p>
    <p>cava.design</p>
    <a class="ulink" href="${up}${paths[otherLang(lang)]}" hreflang="${o.lang}" lang="${o.lang}">${o.name}</a>
    <a class="ulink" href="#top">${t.top}</a>
  </div>
</footer>
`;
}

const waButton = (lang, text) => `<a class="wa is-on" href="${wa(text)}" target="_blank" rel="noopener" aria-label="${UI[lang].wa.aria}">
  ${WA_ICON}
  <span class="wa__label label">WhatsApp</span>
</a>
`;

const end = '</body>\n</html>\n';
const upFrom = (path) => '../'.repeat(path.split('/').filter(Boolean).length);

// ---------- /projects/ and /es/proyectos/ ----------
function indexPage(lang) {
  const t = UI[lang];
  const paths = { en: projectsPath('en'), es: projectsPath('es') };
  const up = upFrom(paths[lang]);
  const cards = projects.map((p, i) => `    <li class="card">
      <a class="card__link" href="${p.slug}/">
        <span class="card__media">${picture(up, p.slug, 1, altOf(lang, p, 1), '(min-width: 768px) 48vw, 92vw')}</span>
        <span class="card__cap label"><span>(${pad(i + 1)})</span><span class="card__name">${esc(p.name)}</span><span class="card__meta">${esc(tr(lang, p, 'type'))}</span></span>
      </a>
    </li>`).join('\n');
  return head(lang, {
    title: t.index.title,
    description: t.index.description(projects.length),
    paths,
    image: `${imgBase(projects[0].slug, 1)}-1600.webp`,
    up,
  }) + `<div id="top"></div>
${bar(lang, up, paths, 'projects')}
<main class="page">
  <section class="plist cq" aria-labelledby="plist-title">
    <div class="plist__head">
      <h1 class="display" id="plist-title"><span>${t.index.h1}</span></h1>
      <span class="display plist__count" aria-hidden="true">(${pad(projects.length)})</span>
    </div>
    <ol class="cards">
${cards}
    </ol>
  </section>
${contact(lang, t.wa.projects, up)}</main>
${footer(lang, up, paths)}${waButton(lang, t.wa.projects)}${end}`;
}

// Cards that link to projects, three across on wide screens. `items` = [{ p, meta }].
function projectCards(lang, up, items) {
  return `      <ol class="cards cards--three">
${items.map(({ p, meta }) => `        <li class="card">
          <a class="card__link" href="${up}${projectPath(lang, p.slug)}">
            <span class="card__media">${picture(up, p.slug, 1, altOf(lang, p, 1), '(min-width: 768px) 31vw, 92vw')}</span>
            <span class="card__cap label"><span class="card__name">${esc(p.name)}</span><span class="card__meta">${esc(meta)}</span></span>
          </a>
        </li>`).join('\n')}
      </ol>
`;
}
const placeOf = (lang, p) => (tr(lang, p, 'location') ?? tr(lang, p, 'type')).split(',')[0];
// Projects like this one: the same typology first, then the closest.
const similar = (p, n = 3) => projects.filter((o) => o.slug !== p.slug)
  .map((o) => ({ o, score: (o.typology === p.typology ? 0 : 1e5) + km(p.coords, o.coords) }))
  .sort((a, b) => a.score - b.score).slice(0, n).map(({ o }) => o);

// ---------- /projects/<slug>/ and /es/proyectos/<slug>/ ----------
const FACTS = ['location', 'year', 'status', 'siteArea', 'builtArea'];
const AREAS = new Set(['siteArea', 'builtArea']);
// Areas are kept in m²; the sheet adds square feet (1 m² = 10.7639 ft²), rounded to 10 because the metres are round figures too.
const group = (lang, n) => (lang === 'en' ? n.toLocaleString('en-US') : n >= 10000 ? n.toLocaleString('en-US').replace(/,/g, '\u00a0') : String(n));
const area = (lang, m2) => `${group(lang, m2)} m² (${group(lang, Math.round((m2 * 10.7639) / 10) * 10)} ft²)`;

function mapFigure(lang, p) {
  const t = UI[lang].map;
  const [lng, lat] = p.coords;
  const location = tr(lang, p, 'location');
  const place = location ? location.split(',').slice(0, 2).join(',') : 'Guanacaste';
  const label = p.pin === 'placeholder' ? t.tbc : place;
  return `      <figure class="pmap" data-pmap data-lng="${lng}" data-lat="${lat}" data-label="${esc(label)}" data-pin="${p.pin}">
        <div class="pmap__canvas" role="img" aria-label="${esc(p.pin === 'placeholder' ? t.ariaPlaceholder(p.name) : t.aria(p.name, place))}"></div>
        <figcaption class="pmap__cap label"><span>${t.label}</span><span>${esc(label)}</span>${p.pin === 'approximate' ? `<span class="pmap__note">${t.approximate}</span>` : ''}</figcaption>
${p.pin === 'placeholder' ? `        <p class="note pmap__ph">${t.placeholderNote}</p>\n` : ''}${townLink(lang, p)}      </figure>
`;
}

// The town page nearest a project, when it is close enough to be the same place (not for placeholder pins).
function townLink(lang, p) {
  if (p.pin === 'placeholder') return '';
  const [best] = towns.map((t) => ({ t, km: km(p.coords, townData.towns[t.slug].coords) })).sort((a, b) => a.km - b.km);
  if (!best || best.km > 25) return '';
  return `        <p class="label pmap__town"><a class="ulink" href="../../${lang === 'es' ? '../' : ''}${townPath(lang, best.t.slug)}">${TT[lang].kicker} ${esc(best.t.name)} →</a></p>\n`;
}

// The house typologies of a master plan as axonometric volumes, all at one scale and standing on one
// baseline, so they read from the smallest to the largest. boxes: [x, y, z, length, width, height] in
// metres; pools: [x, y, length, width] at ground level.
function typologyAxos(list) {
  // Each typology is one prism: an orthogonal footprint (plan, metres) extruded to h, with a line at each
  // floor; pools are flat at ground level. One scale and one baseline for all, so they read in order.
  const C = Math.cos(Math.PI / 6), S = Math.sin(Math.PI / 6);
  const P = (x, y, z) => [(x - y) * C, (x + y) * S - z];
  const PLATE = 1.5;
  const extent = (t) => {
    const xs = [], ys = [];
    const xmax = Math.max(...t.plan.map((q) => q[0]), ...t.pools.map((q) => q[0] + q[2])) + PLATE;
    const ymax = Math.max(...t.plan.map((q) => q[1]), ...t.pools.map((q) => q[1] + q[3])) + PLATE;
    for (const [x, y] of [[-PLATE, -PLATE], [xmax, -PLATE], [xmax, ymax], [-PLATE, ymax]]) { const [u, v] = P(x, y, 0); xs.push(u); ys.push(v); }
    for (const [x, y] of t.plan) { const [u, v] = P(x, y, t.h); xs.push(u); ys.push(v); }
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), xmax, ymax };
  };
  const ex = list.map(extent);
  const W = Math.max(...ex.map((e) => e.x1 - e.x0)) + 2, H = Math.max(...ex.map((e) => e.y1 - e.y0)) + 2;
  const shade = (hex, k) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - k)).toString(16).padStart(2, '0')).join('');
  const path = (pts) => `M${pts.map(([u, v]) => `${u.toFixed(2)} ${v.toFixed(2)}`).join('L')}Z`;
  return list.map((t, i) => {
    const e = ex[i];
    const dx = (W - (e.x1 - e.x0)) / 2 - e.x0, dy = H - 1 - e.y1;
    const Q = (x, y, z) => { const [u, v] = P(x, y, z); return [u + dx, v + dy]; };
    let g = `<path class="tyx__plate" d="${path([Q(-PLATE, -PLATE, 0), Q(e.xmax, -PLATE, 0), Q(e.xmax, e.ymax, 0), Q(-PLATE, e.ymax, 0)])}" fill="none"/>`;
    for (const [x, y, l, w] of t.pools) g += `<path class="tyx__pool" d="${path([Q(x, y, 0), Q(x + l, y, 0), Q(x + l, y + w, 0), Q(x, y + w, 0)])}" fill="#8fd3d6"/>`;
    // the walls that face the viewer (outward normal +x or +y), the farthest first
    const pts = t.plan, n = pts.length;
    const ccw = pts.reduce((a, p, k) => a + p[0] * pts[(k + 1) % n][1] - pts[(k + 1) % n][0] * p[1], 0) > 0;
    const walls = [];
    for (let k = 0; k < n; k++) {
      const [x1, y1] = pts[k], [x2, y2] = pts[(k + 1) % n];
      const nx = ccw ? y2 - y1 : y1 - y2, ny = ccw ? x1 - x2 : x2 - x1;    // outward normal
      if (nx + ny <= 0) continue;
      walls.push({ a: [x1, y1], b: [x2, y2], depth: (x1 + x2 + y1 + y2) / 2, k: nx > 0 ? 0.4 : 0.22 });
    }
    walls.sort((p, q) => p.depth - q.depth);
    for (const w of walls) {
      g += `<path class="tyx__f" d="${path([Q(...w.a, 0), Q(...w.b, 0), Q(...w.b, t.h), Q(...w.a, t.h)])}" fill="${shade(t.color, w.k)}"/>`;
      for (const z of t.floors ?? []) g += `<path class="tyx__fl" d="M${Q(...w.a, z).map((v) => v.toFixed(2)).join(' ')}L${Q(...w.b, z).map((v) => v.toFixed(2)).join(' ')}"/>`;
    }
    g += `<path class="tyx__f" d="${path(pts.map(([x, y]) => Q(x, y, t.h)))}" fill="${t.color}"/>`;
    return `<svg class="tyx__svg" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" role="img" aria-hidden="true">${g}</svg>`;
  });
}

// A project with a site analysis opens on every view of it at once: a matrix on black, plan above and
// axonometric below; each view opens that layer in the analysis further down (analysis.js).
function coverMatrix(lang, up, p) {
  const an = p.analysis;
  return `<figure class="proj__cover pmx" aria-label="${esc(altOf(lang, p, 1))}">
      <div class="pmx__grid" style="--n: ${an.layers.length}">
${an.views.map((v) => `        <p class="label pmx__row">(${esc(v[lang])})</p>\n` + an.layers.map((l, i) => { const k = `${p.slug}/a-${v.key}-${l.key}`; const [w, h] = sizes[k]; return `        <button class="pmx__cell" type="button" data-anl-go="${v.key} ${l.key}"><img src="${up}assets/img/projects/${p.slug}/a-${v.key}-${l.key}.webp?v=${assetVer(`assets/img/projects/${p.slug}/a-${v.key}-${l.key}.webp`)}" width="${w}" height="${h}" decoding="async" fetchpriority="${i < 4 ? 'high' : 'auto'}" alt="${esc(`${l[lang].name}, ${v[lang].toLowerCase()}`)}"><span class="label pmx__cap"><span>${pad(i + 1)}</span>${esc(l[lang].name)}</span></button>`; }).join('\n')).join('\n')}
${an.typologies ? (() => { const svgs = typologyAxos(an.typologies); const tot = an.typologies.reduce((a, t) => a + t.area * t.units, 0); const units = an.typologies.reduce((a, t) => a + t.units, 0); const num = (n) => (lang === 'en' ? n.toLocaleString('en-US') : String(n)); return `        <p class="label pmx__row">(${lang === 'en' ? 'Typologies' : 'Tipologías'})<span class="pmx__tot">${units} ${lang === 'en' ? 'houses' : 'casas'}, ${num(tot)} m²</span></p>
${an.typologies.map((t, i) => `        <button class="pmx__ty" type="button" data-anl-go="plan modules"><span class="tyx">${svgs[i]}</span><span class="pmx__tyhead"><span class="pmx__tyname"><i style="--c: ${t.color}"></i>${lang === 'en' ? 'Typology' : 'Tipología'} ${t.key}</span><b>×${t.units}</b></span><span class="pmx__tyarea">${t.area} m²<span> · ${num(t.area * t.units)} m² ${lang === 'en' ? 'in all' : 'en total'}</span></span><span class="pmx__typrog">${esc(t[lang])}</span></button>`).join('\n')}
${an.amenities ? `        <p class="label pmx__row">(${lang === 'en' ? 'Amenities' : 'Amenidades'})<span class="pmx__tot">${an.amenities.length} ${lang === 'en' ? 'shared buildings' : 'edificios comunes'}, ${num(an.amenities.reduce((a, m) => a + m.area, 0))} m²</span></p>
${an.amenities.map((m) => `        <button class="pmx__am" type="button" data-anl-go="plan modules"><span class="pmx__amname">${esc(m[lang].name)}</span><span class="pmx__tyarea">${m.area} m²</span><span class="pmx__typrog">${esc(m[lang].text)}</span></button>`).join('\n')}` : ''}`; })() : ''}
      </div>
    </figure>`;
}

function projectPage(lang, p, i) {
  const t = UI[lang];
  const s = t.project;
  const paths = { en: projectPath('en', p.slug), es: projectPath('es', p.slug) };
  const up = upFrom(paths[lang]);
  const next = projects[(i + 1) % projects.length];
  const type = tr(lang, p, 'type');
  const rows = [
    [s.rows.project, p.name],
    [s.rows.type, type],
    [s.rows.typology, tr(lang, p, 'typology')],
    ...FACTS.map((k) => [s.rows[k], AREAS.has(k) && p[k] != null ? area(lang, p[k]) : tr(lang, p, k)]),
  ].map(([k, v]) => `        <div><dt>${k}</dt><dd${v == null ? ' class="tbc"' : ''}>${esc(v ?? s.tbc)}</dd></div>`).join('\n');
  const placeholders = FACTS.some((k) => p[k] == null);
  // the gallery: every image after the cover, except those shown in the day/night comparison
  const cmp = p.compare ?? null;
  const rest = p.images.map((_, j) => j + 1).filter((n) => n > 1 && !cmp?.images.includes(n) && !p.images[n - 1].plan);
  // a numbered plan, with its key beside it in the page's language. With a plate (the studio's titled
  // sheet, key included) a wide screen shows the plate in the page's language; a phone keeps the bare
  // plan, larger, with the key in text under it.
  const planLabel = (im) => esc(im[lang === 'en' ? 'label' : 'label_es'] ?? (lang === 'en' ? '(Site plan)' : '(Planta de conjunto)'));
  const planKey = (im) => `<ol>${(im[lang === 'en' ? 'key' : 'key_es'] ?? []).map((k, i) => `<li><b>${i + 1}</b><span>${esc(k)}</span></li>`).join('')}</ol>`;
  // plans laid out in rows (planRows): each plan at its own width (spans of the 12 columns), the keys in
  // text stacked in the columns left over; a plan drawn for that width (desk) on a wide screen, the
  // phone version (file) below 768 px. On a phone each plan is followed by its key.
  const inRows = new Set((p.planRows ?? []).flatMap((r) => r.images));
  const deskSource = (n, vw) => {
    const im = p.images[n - 1], dk = `${p.slug}/${n}-d`, db = up + imgBase(p.slug, `${n}-d`), dv = `?v=${imgVer(dk)}`;
    return im.desk ? `<source media="(min-width: 768px)" srcset="${db}-800.webp${dv} 800w, ${db}-1600.webp${dv} 1600w, ${db}-2400.webp${dv} 2400w, ${db}-3600.webp${dv} 3600w" sizes="${vw}vw" width="${sizes[dk][0]}" height="${sizes[dk][1]}">` : '';
  };
  const planRows = (p.planRows ?? []).map((row) => {
    // a row of plans at one scale (widths = what each covers): they share `span` columns in proportion,
    // each captioned, and the keys that exist stack beside them
    if (row.widths) {
      const total = row.widths.reduce((a, b) => a + b, 0);
      const keyed = row.images.filter((n) => p.images[n - 1].key);
      return `    <section class="prow grid" aria-label="${lang === 'en' ? 'Plans' : 'Planos'}">
      <div class="prow__img prow__set" style="--c: 1 / span ${row.span}; --r: 1 / span ${Math.max(1, keyed.length)}">
${row.images.map((n, i) => { const im = p.images[n - 1]; return `        <figure class="prow__fig" style="--w: ${row.widths[i]}"><picture>${deskSource(n, Math.round((row.span / 12) * 96 * row.widths[i] / total))}${picture(up, p.slug, n, altOf(lang, p, n), '100vw')}</picture>${im.caption ? `<figcaption class="label prow__cap">${esc(im[lang === 'en' ? 'caption' : 'caption_es'])}</figcaption>` : ''}</figure>`; }).join('\n')}
      </div>
${keyed.map((n, i) => `      <div class="pplan__key prow__key" style="--c: ${Math.min(row.span + 2, 10)} / -1; --r: ${i + 1}"><p class="label">${planLabel(p.images[n - 1])}</p>${planKey(p.images[n - 1])}</div>`).join('\n')}
    </section>
`;
    }
    const keyStart = Math.min(row.spans.reduce((a, b) => a + b, 0) + 2, 10);   // keys get at least three columns
    let col = 1;
    return `    <section class="prow grid" aria-label="${lang === 'en' ? 'Plans' : 'Planos'}">
${row.images.map((n, i) => {
      const im = p.images[n - 1], span = row.spans[i];
      const dk = `${p.slug}/${n}-d`, db = up + imgBase(p.slug, `${n}-d`), dv = `?v=${imgVer(dk)}`;
      const vw = Math.round((span / 12) * 96);
      const desk = im.desk ? `<source media="(min-width: 768px)" srcset="${db}-800.webp${dv} 800w, ${db}-1600.webp${dv} 1600w, ${db}-2400.webp${dv} 2400w, ${db}-3600.webp${dv} 3600w" sizes="${vw}vw" width="${sizes[dk][0]}" height="${sizes[dk][1]}">` : '';
      const out = `      <div class="prow__img" style="--c: ${col} / span ${span}; --r: 1 / span ${row.images.length}"><picture>${desk}${picture(up, p.slug, n, altOf(lang, p, n), '100vw')}</picture></div>
      <div class="pplan__key prow__key" style="--c: ${keyStart} / -1; --r: ${i + 1}"><p class="label">${planLabel(im)}</p>${planKey(im)}</div>`;
      col += span;
      return out;
    }).join('\n')}
    </section>
`;
  }).join('');
  // site analysis: the layers of each view stacked in one frame on black, switched in place (analysis.js)
  const an = p.analysis;
  const analysis = an ? (() => {
    const n = an.layers.length;
    const first = Math.max(0, an.layers.findIndex((l) => l.key === an.start));   // the layer the section opens on
    const frame = (v) => { const [w, h] = sizes[`${p.slug}/a-${v.key}-${an.layers[0].key}`]; return `        <div class="anl__frame${v === an.views[0] ? ' is-on' : ''}" data-anl-frame="${v.key}" style="--ratio: ${(w / h).toFixed(3)}">
${v.key === 'plan' && an.amenities ? `          <div class="anl__notes" data-anl-notes="modules modules-runoff" style="--ar: ${(w / h).toFixed(4)}"><div class="anl__notebox">${an.amenities.map((m) => `<span class="anl__pin${m.side === 'left' ? ' is-left' : ''}" style="left: ${(m.x * 100).toFixed(1)}%; top: ${(m.y * 100).toFixed(1)}%"><i></i><span class="label">${esc(m[lang].name)}</span></span>`).join('')}</div></div>\n` : ''}
${an.layers.map((l, i) => { const k = `${p.slug}/a-${v.key}-${l.key}`; const [lw, lh] = sizes[k]; return `          <img class="anl__img${i === first ? ' is-on' : ''}" data-anl-img="${l.key}" src="${up}assets/img/projects/${p.slug}/a-${v.key}-${l.key}.webp?v=${assetVer(`assets/img/projects/${p.slug}/a-${v.key}-${l.key}.webp`)}" width="${lw}" height="${lh}" ${i === first && v === an.views[0] ? '' : 'loading="lazy" '}decoding="async" alt="${esc(`${l[lang].name}, ${v[lang].toLowerCase()}`)}">`; }).join('\n')}
        </div>`; };
    return `    <section class="anl" aria-labelledby="anl-title" data-anl${an.then ? ` data-anl-then="${an.then}"` : ''}>
      <div class="anl__head grid">
        <h2 class="label anl__label" id="anl-title">${lang === 'en' ? '(Site analysis)' : '(Análisis del terreno)'}</h2>
        <p class="h3 anl__lead">${esc(an.lead[lang])}</p>
        <p class="anl__note">${esc(an.lead[`note_${lang}`])}</p>
      </div>
      <div class="anl__body grid">
        <ol class="anl__list" role="tablist" aria-label="${lang === 'en' ? 'Layers' : 'Capas'}">
${an.layers.map((l, i) => `          <li><button class="anl__tab" type="button" role="tab" aria-selected="${i === first}" data-anl-layer="${l.key}" data-text="${esc(l[lang].text)}"><span class="anl__n">${pad(i + 1)}</span><span>${esc(l[lang].name)}</span></button></li>`).join('\n')}
        </ol>
        <div class="anl__main">
          <div class="anl__stage">
${an.views.map(frame).join('\n')}
${an.layers.map((l, i) => { const L = l.legend; if (!L) return `            <p class="label anl__legend${i === first ? ' is-on' : ''}" data-anl-legend="${l.key}" aria-hidden="true"></p>\n`; const inner = L.ramp ? `<span class="anl__lo">${esc(L[lang][0])}</span><span class="anl__ramp"></span><span class="anl__hi">${esc(L[lang][1])}</span>` : L.keys.map((k) => `<span class="anl__key"><i style="${k.line ? `--c: ${k.line}` : `--c: ${k.box}`}" class="${k.line ? 'is-line' : 'is-box'}"></i>${esc(k[lang])}${k.sub ? `<b class="anl__sub">${esc(k.sub)}</b>` : ''}</span>`).join(''); return `            <p class="label anl__legend${i === first ? ' is-on' : ''}" data-anl-legend="${l.key}" aria-hidden="true">${inner}</p>\n`; }).join('')}            <p class="label anl__tag" aria-hidden="true"><span data-anl-count>${pad(first + 1)}/${pad(n)}</span><span data-anl-name>${esc(an.layers[first][lang].name)}</span></p>
          </div>
          <div class="anl__foot">
            <p class="anl__text" data-anl-text aria-live="polite">${esc(an.layers[first][lang].text)}</p>
            <div class="anl__views" role="group" aria-label="${lang === 'en' ? 'View' : 'Vista'}"><button class="anl__play label" type="button" data-anl-play data-pause="${lang === 'en' ? 'Pause' : 'Pausa'}" data-resume="${lang === 'en' ? 'Play' : 'Reproducir'}" aria-pressed="false">${lang === 'en' ? 'Pause' : 'Pausa'}</button>${an.views.map((v, i) => `<button class="anl__view label" type="button" aria-pressed="${i === 0}" data-anl-view="${v.key}">${esc(v[lang])}</button>`).join('')}</div>
          </div>
        </div>
      </div>
    </section>
`;
  })() : '';
  // a collage of the plan over an illustrative aerial, after the analysis: the same frame as the plan
  // layers, so the amenity pins and a letter on each roof (its typology) land where they do there
  const cl = p.collage;
  const collage = cl ? (() => {
    const k = `${p.slug}/c`, [w, h] = sizes[k], base = up + imgBase(p.slug, 'c'), v = `?v=${imgVer(k)}`;
    const key = an?.typologies ? [...an.typologies].reverse().map((t) => `${t.key} ${t.area} m²`).join(' · ') : '';
    return `    <section class="clg" aria-labelledby="clg-title">
      <h2 class="label clg__label" id="clg-title">(Collage)</h2>
      <figure class="clg__fig">
        <div class="clg__img" style="--ar: ${(w / h).toFixed(4)}">
          <img src="${base}-1600.webp${v}" srcset="${base}-800.webp${v} 800w, ${base}-1600.webp${v} 1600w, ${base}-2400.webp${v} 2400w, ${base}-3600.webp${v} 3600w" sizes="100vw" width="${w}" height="${h}" loading="lazy" decoding="async" alt="${esc(lang === 'en' ? cl.alt : cl.alt_es)}">
          <div class="clg__marks" aria-hidden="true">
${cl.labels.map((l) => `            <span class="clg__ty" style="left: ${(l.x * 100).toFixed(2)}%; top: ${(l.y * 100).toFixed(2)}%">${l.ty}</span>`).join('\n')}
${(an?.amenities ?? []).map((m) => `            <span class="anl__pin${m.side === 'left' ? ' is-left' : ''}" style="left: ${(m.x * 100).toFixed(1)}%; top: ${(m.y * 100).toFixed(1)}%"><i></i><span class="label">${esc(m[lang].name)}</span></span>`).join('\n')}
          </div>
        </div>
        <figcaption class="label clg__cap"><span>${lang === 'en' ? 'The master plan over an illustrative aerial. Not built.' : 'El plan maestro sobre una aérea ilustrativa. No construido.'}</span>${key ? `<span class="clg__key">${esc(key)}</span>` : ''}</figcaption>
      </figure>
    </section>
`;
  })() : '';
  // drawings and views (elevation, axonometrics): small, two to a row, captioned
  const views = p.views?.length ? `    <section class="pview" aria-labelledby="pview-title">
      <h2 class="label" id="pview-title">${lang === 'en' ? '(Drawings)' : '(Dibujos)'}</h2>
      <div class="pview__grid">
${p.views.map((v) => `        <figure class="pview__fig">${picture(up, p.slug, `d-${v.id}`, lang === 'en' ? v.alt : v.alt_es, '(min-width: 768px) 32vw, 92vw')}<figcaption class="label pview__cap">${esc(v[lang])}</figcaption></figure>`).join('\n')}
      </div>
    </section>
` : '';
  // design iterations (vector SVGs): the schemes tried, small and in a row, all alike
  const it = p.iterations;
  const iterations = it ? `    <section class="iter" aria-labelledby="iter-title">
      <h2 class="label" id="iter-title">${lang === 'en' ? '(Iteration process and selection)' : '(Proceso de iteración y selección)'}</h2>
      <ol class="iter__list">
${it.files.map((f, i) => {
    const L = String.fromCharCode(65 + i);
    const date = new Date(`${it.dates[i]}T12:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-CR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '');
    const rel = `assets/img/projects/${p.slug}/${f}`;
    const [, w, h] = readFileSync(join(SITE, rel), 'utf8').match(/width="(\d+)" height="(\d+)"/);
    return `        <li class="iter__item"><img src="${up}${rel}?v=${assetVer(rel)}" width="${w}" height="${h}" loading="lazy" decoding="async" alt="${esc(lang === 'en' ? `Site plan, iteration ${L}` : `Planta de conjunto, iteración ${L}`)}"><p class="label iter__cap"><span>${L}</span><span class="iter__date">${date}</span></p></li>`;
  }).join('\n')}
      </ol>
    </section>
` : '';
  const plans = p.images.map((im, j) => [im, j + 1]).filter(([im, n]) => im.plan && !inRows.has(n)).map(([im, n]) => {
    const pk = `${p.slug}/${n}-${lang}`, pb = up + imgBase(p.slug, `${n}-${lang}`), pv = `?v=${imgVer(pk)}`;
    const plate = im.plate ? `<source media="(min-width: 768px)" srcset="${pb}-800.webp${pv} 800w, ${pb}-1600.webp${pv} 1600w, ${pb}-2400.webp${pv} 2400w, ${pb}-3600.webp${pv} 3600w" sizes="86vw" width="${sizes[pk][0]}" height="${sizes[pk][1]}">` : '';
    return `    <figure class="pplan grid${im.plate ? ' pplan--plate' : ''}">
      <div class="pplan__img">${im.plate ? `<picture>${plate}${picture(up, p.slug, n, altOf(lang, p, n), '100vw')}</picture>` : picture(up, p.slug, n, altOf(lang, p, n), '(min-width: 768px) 64vw, 100vw')}</div>
      <figcaption class="pplan__key"><p class="label">${esc(im[lang === 'en' ? 'label' : 'label_es'] ?? (lang === 'en' ? '(Site plan)' : '(Planta de conjunto)'))}</p><ol>${(im[lang === 'en' ? 'key' : 'key_es'] ?? []).map((k, i) => `<li><b>${i + 1}</b><span>${esc(k)}</span></li>`).join('')}</ol></figcaption>
    </figure>
`;
  }).join('');
  // construction drawings, one row per part of the house. The drawings in a row share one scale: each
  // takes width in proportion to what it covers on site (span, in metres), and they sit on one line.
  const drawings = p.drawings?.length ? `    <section class="pdraw" aria-labelledby="pdraw-title">
      <h2 class="label" id="pdraw-title">${lang === 'en' ? '(Drawings)' : '(Planos)'}</h2>
${p.drawings.map((set) => {
    const total = set.items.reduce((a, d) => a + d.span, 0);
    return `      <div class="pdraw__set">
${set.items.map((d) => `        <figure class="pdraw__fig" style="--span: ${d.span}">
          ${picture(up, p.slug, `d-${d.id}`, lang === 'en' ? d.alt : d.alt_es, `(min-width: 768px) ${Math.round((96 * d.span) / total)}vw, 92vw`)}
          <figcaption class="label pdraw__cap"><span>${esc(set[lang])}</span><span class="pdraw__view">${esc(d[lang])}</span></figcaption>
        </figure>`).join('\n')}
      </div>`;
  }).join('\n')}
    </section>
` : '';
  // Every image in the gallery shares the narrowest image's proportion, so rows line up
  // and wider images are cropped at the sides, never at the top or bottom.
  const ratio = Math.min(...rest.map((n) => { const [w, h] = sizes[`${p.slug}/${n}`]; return w / h; }));
  const gallery = rest.length ? `    <section class="gallery${rest.length === 1 ? ' gallery--one' : rest.length === 3 ? ' gallery--three' : ''}" style="--ratio: ${ratio.toFixed(3)}" aria-label="${esc(s.more(p.name))}">
${rest.map((n) => `      <figure class="gallery__item">${picture(up, p.slug, n, altOf(lang, p, n), rest.length === 1 ? '92vw' : rest.length === 3 ? '(min-width: 768px) 31vw, 92vw' : '(min-width: 768px) 46vw, 92vw')}</figure>`).join('\n')}
    </section>
` : '';
  // two views of the same place, one over the other, with a divider to drag (compare.js)
  const compare = cmp ? (() => {
    const [a, b] = cmp.images, [la, lb] = cmp[lang];
    const [w, h] = sizes[`${p.slug}/${a}`];
    return `    <figure class="compare" style="--ratio: ${(w / h).toFixed(3)}">
      <div class="compare__frame" data-compare style="--pos: 50%">
        ${picture(up, p.slug, b, altOf(lang, p, b), '(min-width: 768px) 96vw, 100vw', { cls: 'compare__img' })}
        <div class="compare__top">${picture(up, p.slug, a, altOf(lang, p, a), '(min-width: 768px) 96vw, 100vw', { cls: 'compare__img' })}</div>
        <span class="compare__tag compare__tag--a label" aria-hidden="true">${esc(la)}</span><span class="compare__tag compare__tag--b label" aria-hidden="true">${esc(lb)}</span>
        <span class="compare__line" aria-hidden="true"><span class="compare__knob"><svg viewBox="0 0 24 12"><path d="M7 1 2 6l5 5M17 1l5 5-5 5"/></svg></span></span>
        <input class="compare__range" type="range" min="0" max="100" value="50" step="0.5" aria-label="${lang === 'en' ? `Drag to compare ${la.toLowerCase()} and ${lb.toLowerCase()}` : `Arrastre para comparar ${la.toLowerCase()} y ${lb.toLowerCase()}`}">
      </div>
      <figcaption class="label compare__cap"><span>${esc(la)} / ${esc(lb)}</span><span class="compare__hint">${lang === 'en' ? 'Drag the line' : 'Arrastre la línea'}</span></figcaption>
    </figure>
`;
  })() : '';
  const waText = t.wa.project(p.name);
  return head(lang, {
    title: `${p.name} | Studio CAVA`,
    description: s.description(p.name, type),
    paths,
    image: `${imgBase(p.slug, 1)}-1600.webp`,
    up,
    script: ['project.js', ...(p.compare ? ['compare.js'] : []), ...(p.analysis ? ['analysis.js'] : [])],
  }) + `<div id="top"></div>
${bar(lang, up, paths, 'projects')}
<main class="page">
  <article class="proj" aria-labelledby="proj-title">
    <header class="proj__head cq">
      <p class="label proj__crumb"><a class="ulink" href="../">${s.crumb}</a><span aria-hidden="true">(${pad(i + 1)}/${pad(projects.length)})</span></p>
      <h1 class="display proj__title" id="proj-title">${esc(p.name)}</h1>
    </header>
    ${p.analysis ? coverMatrix(lang, up, p) : `<figure class="proj__cover">${picture(up, p.slug, 1, altOf(lang, p, 1), '100vw', { eager: true })}</figure>`}
    <section class="proj__body grid" aria-labelledby="sheet-title">
      <h2 class="label sheet__label" id="sheet-title">${s.sheet}</h2>
      <dl class="sheet">
${rows}
      </dl>
${placeholders ? `      <p class="note sheet__note">${s.tbcNote}</p>\n` : ''}${mapFigure(lang, p)}    </section>
${analysis}${collage}${gallery}${compare}${plans}${iterations}${planRows}${views}${drawings}    <section class="related" aria-labelledby="related-title">
      <h2 class="label" id="related-title">${s.similar}</h2>
${projectCards(lang, up, similar(p).map((o) => ({ p: o, meta: placeOf(lang, o) })))}    </section>
    <nav class="next" aria-label="${s.nextAria}">
      <a class="next__link" href="../${next.slug}/">
        <span class="label">${s.next}</span>
        <span class="h3 next__name">${esc(next.name)} →</span>
      </a>
    </nav>
  </article>
${contact(lang, waText, up)}</main>
${footer(lang, up, paths)}${waButton(lang, waText)}${end}`;
}

// A question that opens: the answer slides open and shut (site/assets/js/accordion.js).
const faqItem = (q, a) => `        <details class="faq__item"><summary class="faq__q"><h3>${esc(q)}</h3><span class="faq__sign" aria-hidden="true"></span></summary><div class="faq__a"><p class="large">${a}</p></div></details>`;

// ---------- /studio/identity/ and /es/estudio/identidad/: how the mark was drawn ----------
// Text in data/identity.json; the explorations are SVGs exported from the studio's Illustrator file;
// the diagrams below are drawn here from the mark's geometry: a half circle of radius 100 and the
// triangle (100,0) (200,0) (200,200), which meet at a point at the top.
const IDENTITY_PATH = join(ROOT, 'data', 'identity.json');
const identity = existsSync(IDENTITY_PATH) ? JSON.parse(readFileSync(IDENTITY_PATH, 'utf8')) : null;
const identityPath = (lang) => `${studioPath(lang)}${lang === 'en' ? 'identity' : 'identidad'}/`;
const IDM = { disc: 'M100 0A100 100 0 0 0 100 200Z', tri: 'M100 0H200V200Z', void: 'M100 0V200H200Z' };
const VOID = '#e07b52';
// the word in full, from the Illustrator file (height 176): C, a void (A), V, a void (A), and the closing form
const IDW = { c: 'M88 0A88 88 0 0 0 88 176Z', v: 'M88 0H257.6L175 176Z', end: 'M220.3 0H254.4A88 88 0 0 1 254.4 176H220.3Z', a1: 'M88 0V176H175Z', a2: 'M220.3 79.5L175 176H220.3Z' };
function identityFigures(lang, S, up) {
  const t = (x, y, s, o = '') => `<text x="${x}" y="${y}" class="idn-t"${o}>${s}</text>`;
  const voids = `<div class="idn-pair">
        <svg viewBox="-20 -10 240 270" role="img" aria-label="${esc(S.voids.key)}"><path d="${IDM.void}" fill="${VOID}"/><path d="${IDM.disc}"/><path d="${IDM.tri}"/>
          <path class="idn-tick" d="M50 215v12M133 215v12"/>${t(50, 252, 'C', ' text-anchor="middle"')}${t(133, 252, 'A', ' text-anchor="middle" fill="' + VOID + '"')}</svg>
        <svg viewBox="-12 -10 366 246" role="img" aria-label="${esc(S.voids.text[1])}"><path d="${IDW.a1}" fill="${VOID}"/><path d="${IDW.a2}" fill="${VOID}"/><path d="${IDW.c}"/><path d="${IDW.v}"/><path d="${IDW.end}"/>
          <path class="idn-tick" d="M44 190v12M117 190v12M172 190v12M205 190v12"/>${t(44, 228, 'C', ' text-anchor="middle"')}${t(117, 228, 'A', ' text-anchor="middle" fill="' + VOID + '"')}${t(172, 228, 'V', ' text-anchor="middle"')}${t(205, 228, 'A', ' text-anchor="middle" fill="' + VOID + '"')}</svg>
      </div>
      <p class="note idn-key"><i style="background:#080807"></i><i style="background:${VOID}"></i>${esc(S.voids.key)}</p>`;
  // Rubin's vase, redrawn: two profiles; the space between them is the vase
  const P = [[84, 0], [86, 34], [93, 64], [86, 80], [106, 102], [93, 115], [98, 127], [92, 136], [97, 147], [87, 163], [93, 180], [77, 202], [79, 260]];
  const smooth = (pts) => pts.slice(1).map((p, i) => { const a = pts[i - 1] ?? pts[i], b = pts[i], c = p, d = pts[i + 2] ?? p; return `C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (d[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (d[1] - b[1]) / 6).toFixed(1)} ${c[0]} ${c[1]}`; }).join('');
  const face = `M0 0H${P[0][0]}${smooth(P)}H0Z`;
  const rubin = `<svg viewBox="-20 -20 280 300" role="img" aria-label="${esc(S.gestalt.rubin)}"><rect x="-20" y="-20" width="280" height="300" fill="#fcfcfc"/><path d="${face}"/><path d="${face}" transform="matrix(-1 0 0 1 240 0)"/></svg>`;
  // Kanizsa's triangle: three discs and an outlined triangle, with a white triangle that is never drawn
  const kanizsa = `<svg viewBox="-10 -10 260 280" role="img" aria-label="${esc(S.gestalt.kanizsa)}"><rect x="-10" y="-10" width="260" height="280" fill="#fcfcfc"/><path d="M120 242L212 82H28Z" fill="none" stroke="#080807" stroke-width="3"/>${[[120, 34], [28, 194], [212, 194]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="30"/>`).join('')}<path d="M120 34L28 194H212Z" fill="#fcfcfc"/></svg>`;
  const gestalt = `<div class="idn-trio">
        <figure>${rubin}<figcaption class="note">${esc(S.gestalt.rubin)}</figcaption></figure>
        <figure>${kanizsa}<figcaption class="note">${esc(S.gestalt.kanizsa)}</figcaption></figure>
        <figure><svg viewBox="-50 -61 300 322" role="img" aria-label="${esc(S.gestalt.neg)}"><rect x="-50" y="-61" width="300" height="322" fill="#080807"/><path d="${IDM.void}" fill="#fcfcfc"/></svg><figcaption class="note">${esc(S.gestalt.neg)}</figcaption></figure>
      </div>`;
  const nolli = `<figure class="idn-nolli"><img src="${up}assets/img/identity/nolli-1600.webp" srcset="${up}assets/img/identity/nolli-800.webp 800w, ${up}assets/img/identity/nolli-1600.webp 1600w" sizes="(min-width: 768px) 60vw, 92vw" width="1600" height="1067" loading="lazy" decoding="async" alt="${esc(S.nolli.alt)}"><figcaption class="note"><a class="ulink" href="https://commons.wikimedia.org/wiki/File:Giovanni_Battista_Nolli-Nuova_Pianta_di_Roma_(1748)_05-12.JPG" target="_blank" rel="noopener">${esc(S.nolli.caption)}</a></figcaption></figure>`;
  const g = (d, cls = 'idn-g') => `<path class="${cls}" d="${d}"/>`;
  const grid = `<svg class="idn-grid" viewBox="-70 -70 340 340" role="img" aria-label="${esc(S.grid.text[0])}">
        <path d="${IDM.disc}"/><path d="${IDM.tri}"/>
        ${g('M0 0H200V200H0Z')}${g('M100 -40V240M-40 100H240', 'idn-g idn-g--axis')}
        <circle class="idn-g idn-g--dash" cx="100" cy="100" r="100"/><circle class="idn-g idn-g--dash" cx="200" cy="100" r="100" opacity=".45"/>
        ${g('M90 -20L210 220', 'idn-g idn-g--diag')}${g('M100 100H0', 'idn-g idn-g--dim')}
        <circle cx="100" cy="0" r="4" class="idn-dot"/>
        ${g('M0 -38H200M0 -44V-32M200 -44V-32', 'idn-g idn-g--dim')}${g('M238 0V200M232 0H244M232 200H244', 'idn-g idn-g--dim')}
        ${t(100, -48, '2r', ' text-anchor="middle" class="idn-t idn-t--g"')}${t(252, 105, '2r', ' class="idn-t idn-t--g"')}${t(50, 92, 'r', ' text-anchor="middle" class="idn-t idn-t--g"')}${t(214, 232, '2 : 1', ' class="idn-t idn-t--g"')}
      </svg>`;
  const mark = `<div class="idn-marks">
        <figure class="idn-tile"><svg viewBox="-70 -70 340 340" role="img" aria-label="${esc(S.mark.clear)}"><rect class="idn-g idn-g--dash" x="-50" y="-50" width="300" height="300"/><path d="${IDM.disc}"/><path d="${IDM.tri}"/>${t(-46, -56, 'r/2', ' class="idn-t idn-t--g idn-t--s"')}</svg><figcaption class="label">${esc(S.mark.clear)}</figcaption></figure>
        <figure class="idn-tile idn-tile--dark"><svg viewBox="-70 -70 340 340" aria-hidden="true"><path d="${IDM.disc}" fill="#fcfcfc"/><path d="${IDM.tri}" fill="#fcfcfc"/></svg><figcaption class="label">${lang === 'en' ? 'White on black' : 'Blanco sobre negro'}</figcaption></figure>
        <figure class="idn-tile idn-tile--sizes"><div>${[64, 32, 16].map((n) => `<svg width="${n}" height="${n}" viewBox="0 0 200 200" aria-hidden="true"><path d="${IDM.disc}"/><path d="${IDM.tri}"/></svg>`).join('')}</div><figcaption class="label">${esc(S.mark.sizes)}</figcaption></figure>
      </div>`;
  const T = S.type;
  const type = `<div class="idn-type">
        <ul class="idn-weights">${T.weights.map(([w, n, use]) => `<li><span class="idn-aa" style="font-weight:${w}">Aa</span><span class="label">${w} · ${esc(n)}</span><span class="note">${esc(use)}</span></li>`).join('')}</ul>
        <ol class="idn-scale">${T.scale.map(([n, x], i) => `<li><span class="label idn-scale__n">${esc(n)}</span><span class="idn-scale__x idn-scale__x--${i}">${esc(x)}</span></li>`).join('')}</ol>
      </div>`;
  const core = [['Black', 'Negro', '#080807'], ['White', 'Blanco', '#fcfcfc'], ['Light grey', 'Gris claro', '#f1f0ee'], ['Grey', 'Gris', '#dcddde'], ['Mid grey', 'Gris medio', '#8b8b88'], ['Dark grey', 'Gris oscuro', '#545454']];
  const data = ['#5e4b35', '#3a3d40', '#b4502e', '#4f7fa8', '#dcc7a1', '#2c7a73', '#8fc6db', '#b47b45', '#e6b53f', '#6c9a52'];
  const land = ['#f1ebdf', '#e0cfae', '#c9aa76', '#a9824b', '#82592b', '#55381a', '#24170a'];
  const colour = `<div class="idn-colour">
        <p class="label">${esc(S.colour.core)}</p>
        <ul class="idn-sw idn-sw--core">${core.map(([en, es, hex]) => `<li><i style="background:${hex}"></i><b>${lang === 'en' ? en : es}</b><span>${hex}</span></li>`).join('')}</ul>
        <p class="label">${esc(S.colour.data)}</p>
        <ul class="idn-sw idn-sw--data">${data.map((hex) => `<li><i style="background:${hex}"></i><span>${hex}</span></li>`).join('')}</ul>
        <ul class="idn-ramp">${land.map((hex) => `<li style="background:${hex}"></li>`).join('')}</ul>
      </div>`;
  return { voids, gestalt, nolli, grid, mark, type, colour };
}
function identityPage(lang) {
  const D = identity[lang];
  const S = D.sections;
  const paths = { en: identityPath('en'), es: identityPath('es') };
  const up = upFrom(paths[lang]);
  const F = identityFigures(lang, S, up);
  const sec = (key, n, body) => `    <section class="tw__sec grid idn-sec" aria-labelledby="idn-${key}">
      <h2 class="label tw__label" id="idn-${key}">(${pad(n)}) ${esc(S[key].label.replace(/[()]/g, ''))}</h2>
      <div class="tw__text idn-text">
        <h3 class="idn-h">${esc(S[key].title)}</h3>
${S[key].text.map((x) => `        <p class="large">${esc(x)}</p>`).join('\n')}
      </div>
      <div class="idn-fig">
      ${body}
      </div>
    </section>
`;
  const tries = identity.explorations.map((g) => `<div class="idn-tries__group">
        <p class="label">${esc(S.tries.groups[g.group])}</p>
        <ol class="idn-tries">${g.ids.map((id) => `<li${id === 'e20' ? ' class="is-final"' : ''}><img src="${up}assets/img/identity/${id}.svg?v=${assetVer(`assets/img/identity/${id}.svg`)}" alt="" loading="lazy" decoding="async"></li>`).join('')}</ol>
      </div>`).join('\n      ');
  // the mark in use: mock-ups on photographs of blank objects, three to a row, the wide ones over two
  const U = S.use.items;
  const tile = (n, wide) => { const b = `${up}assets/img/identity/use-${n}`, [w1, w2] = wide ? [1600, 800] : [1200, 600]; return `<figure class="idn-u${wide ? ' idn-u--wide' : ''}"><img src="${b}-${w1}.webp?v=${assetVer(`assets/img/identity/use-${n}-${w1}.webp`)}" srcset="${b}-${w2}.webp ${w2}w, ${b}-${w1}.webp ${w1}w" sizes="(min-width: 768px) ${wide ? 62 : 31}vw, 92vw" width="${w1}" height="${wide ? w1 * 2 / 3 : w1 * 5 / 4}" loading="lazy" decoding="async" alt="${esc(U[n])}"><figcaption class="label">${esc(U[n])}</figcaption></figure>`; };
  const use = `<div class="idn-uses">${tile('stationery', true)}${tile('tote')}${tile('cards')}${tile('brochure', true)}${tile('booklet')}${tile('poster')}${tile('mugs')}${tile('laptop', true)}${tile('notebook')}</div>`;
  const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: D.h1.join(' '), description: D.description, inLanguage: lang, url: `${ORIGIN}/${paths[lang]}`, publisher: { '@type': 'Organization', name: 'Studio CAVA', url: ORIGIN } };
  return head(lang, { title: D.title, description: D.description, paths, image: `${imgBase('rancho-cartagena', 3)}-1600.webp`, up, jsonld: ld }) + `<div id="top"></div>
${bar(lang, up, paths, 'studio')}
<main class="page">
  <article class="mf idn" aria-labelledby="idn-title">
    <header class="mf__head grid">
      <p class="label mf__label"><a class="ulink" href="${up}${studioPath(lang)}">${UI[lang].nav.studio}</a> ${esc(D.label)}</p>
      <h1 class="display mf__title" id="idn-title"><span>${esc(D.h1[0])}</span><span class="right">${esc(D.h1[1])}</span></h1>
      <p class="h3 mf__intro">${esc(D.intro)}</p>
    </header>
    <figure class="idn-hero" aria-hidden="true"><svg viewBox="-110 -60 420 320"><path d="${IDM.disc}"/><path d="${IDM.tri}"/></svg></figure>
${sec('brief', 1, '')}${sec('tries', 2, tries)}${sec('voids', 3, F.voids)}${sec('gestalt', 4, F.gestalt)}${sec('nolli', 5, F.nolli)}${sec('grid', 6, F.grid)}${sec('mark', 7, F.mark)}${sec('type', 8, F.type)}${sec('colour', 9, F.colour)}${sec('use', 10, use)}  </article>
${contact(lang, UI[lang].wa.general, up)}</main>
${footer(lang, up, paths)}${end}`;
}

// ---------- /studio/ and /es/estudio/: what we believe, and the process ----------
// ---------- recognition before the studio (data/recognition.json), on the Studio page ----------
const RECOG_PATH = join(ROOT, 'data', 'recognition.json');
const recognition = existsSync(RECOG_PATH) ? JSON.parse(readFileSync(RECOG_PATH, 'utf8')) : null;
function recognitionSection(lang, up) {
  if (!recognition) return '';
  const R = recognition[lang];
  return `  <section class="rec" id="recognition" aria-labelledby="rec-title">
    <h2 class="label rec__label" id="rec-title">${esc(R.label)}</h2>
${recognition.items.map((it) => { const T = it[lang]; return `    <article class="rec__item">
      <div class="rec__head grid">
        <p class="label rec__award">${esc(T.award)}</p>
        <h3 class="rec__title">${esc(it.name)}<span class="rec__sub">${esc(T.sub)}</span></h3>
      </div>
      <div class="rec__pics">
${it.images.map((im) => { const b = `${up}assets/img/recognition/${it.id}-${im.key}`, v = `?v=${assetVer(`assets/img/recognition/${it.id}-${im.key}-1600.webp`)}`; return `        <figure class="rec__fig"><img src="${b}-1600.webp${v}" srcset="${b}-800.webp${v} 800w, ${b}-1600.webp${v} 1600w, ${b}-2400.webp${v} 2400w" sizes="(min-width: 768px) 48vw, 92vw" width="${im.w}" height="${im.h}" loading="lazy" decoding="async" alt="${esc(im[lang])}"></figure>`; }).join('\n')}
      </div>
      <div class="rec__body grid">
        <div class="rec__text">${T.text.map((x) => `<p class="large">${esc(x)}</p>`).join('')}</div>
        <dl class="rec__facts">
          <div><dt class="label">${lang === 'en' ? 'Credits' : 'Créditos'}</dt><dd>${esc(T.credits)}</dd></div>
          <div><dt class="label">${lang === 'en' ? 'Images' : 'Imágenes'}</dt><dd class="rec__credit">${esc(T.images.replace(/^(Images|Imágenes): /, ''))}</dd></div>
        </dl>
      </div>
      <div class="rec__press grid">
        <h4 class="label rec__presslabel">${lang === 'en' ? '(Press)' : '(Prensa)'}</h4>
        <ul class="rec__cards">
${it.press.map((pr) => `          <li><a class="pcard" href="${pr.url}" target="_blank" rel="noopener"${pr.lang && pr.lang !== lang ? ` hreflang="${pr.lang}"` : ''}>
            <span class="pcard__img"><img src="${up}assets/img/recognition/${pr.image}.webp?v=${assetVer(`assets/img/recognition/${pr.image}.webp`)}" width="800" height="600" loading="lazy" decoding="async" alt=""></span>
            <span class="pcard__body">
              <span class="pcard__pub"><b>${esc(pr.name)}</b><span>${esc(pr.edition ?? '')}</span></span>
              <span class="pcard__title"${pr.lang && pr.lang !== lang ? ` lang="${pr.lang}"` : ''}>${esc(pr.headline)}</span>
              <span class="label pcard__meta"><span>${esc(pr.date[lang])}</span><span>${lang === 'en' ? 'Read the article' : 'Leer el artículo'} ↗</span></span>
            </span>
          </a></li>`).join('\n')}
        </ul>
      </div>
    </article>`; }).join('\n')}
  </section>
`;
}

function studioPage(lang) {
  const t = UI[lang];
  const d = studio[lang];
  const paths = { en: studioPath('en'), es: studioPath('es') };
  const up = upFrom(paths[lang]);
  const beliefs = d.beliefs.map((b, i) => {
    // images are set on the English beliefs and shared by both languages
    const [slug, n] = (b.image ?? studio.en.beliefs[i].image).split('/');
    const p = bySlug.get(slug);
    return `      <details class="belief"${i === 0 ? ' open' : ''}>
        <summary class="belief__head"><span class="belief__word">${esc(b.word)}</span><span class="belief__sign" aria-hidden="true"></span></summary>
        <div class="belief__body">
          <p class="label belief__sub">${esc(b.sub)}</p>
          <div class="belief__text">
${b.text.map((x) => `            <p class="large">${esc(x)}</p>`).join('\n')}
          </div>
          <figure class="belief__img">${picture(up, slug, Number(n), altOf(lang, p, Number(n)), '(min-width: 768px) 56vw, 92vw')}<figcaption class="label"><a class="ulink" href="${up}${projectPath(lang, slug)}">${esc(p.name)}</a></figcaption></figure>
        </div>
      </details>`;
  }).join('\n');
  const stages = d.process.stages.map(([title, text], i) => `      <li class="stage">
        <span class="label stage__n">(${pad(i + 1)})</span>
        <h3 class="stage__title">${esc(title)}</h3>
        <p class="large stage__text">${esc(text)}</p>
${proc?.stages[i] ? `        ${procStrip(lang, up, proc.stages[i], 'stage__strip')}\n` : ''}      </li>`).join('\n');
  return head(lang, {
    title: d.title,
    description: d.description,
    paths,
    image: `${imgBase(...studio.image.split('/'))}-1600.webp`,
    up,
  }) + `<div id="top"></div>
${bar(lang, up, paths, 'studio')}
<main class="page">
  <article class="mf" aria-labelledby="mf-title">
    <header class="mf__head grid">
      <span class="label mf__label">${d.label}</span>
      <h1 class="display mf__title" id="mf-title"><span>${esc(d.h1[0])}</span><span class="indent-2">${esc(d.h1[1])}</span></h1>
      <p class="h3 mf__intro">${esc(d.intro)}</p>
    </header>
    <div class="beliefs">
${beliefs}
    </div>
  </article>
  <section class="stages-sec" id="process" aria-labelledby="process-title">
    <div class="stages__head grid">
      <span class="label stages__label">${d.process.label}</span>
      <h2 class="display stages__title" id="process-title"><span>${esc(d.process.h2[0])}</span><span class="right">${esc(d.process.h2[1])}</span></h2>
      <p class="h3 stages__intro">${esc(d.process.intro)}</p>
    </div>
    <ol class="stages">
${stages}
    </ol>
  </section>
${recognitionSection(lang, up)}${identity ? `  <section class="idn-teaser grid">
    <a class="idn-teaser__link" href="${up}${identityPath(lang)}"><svg viewBox="0 0 200 200" aria-hidden="true"><path d="${IDM.disc}"/><path d="${IDM.tri}"/></svg><span class="label">${lang === 'en' ? '(Identity)' : '(Identidad)'}</span><span class="idn-teaser__t">${esc(identity[lang].link)} →</span></a>
  </section>` : ''}
${contact(lang, t.wa.general, up)}</main>
${footer(lang, up, paths)}${waButton(lang, t.wa.general)}${end}`;
}

// ---------- Town pages: /architects/<slug>/ and /es/arquitectos/<slug>/ ----------
const km = ([lng1, lat1], [lng2, lat2]) => {
  const r = (d) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
};
// A town's data, with temperature and wind from its nearest weather station. Temperatures are moved
// to the town's elevation at the standard lapse rate, 0.65 °C per 100 m.
const LAPSE = 0.0065;
const townCache = new Map();
const townOf = (t) => {
  if (townCache.has(t.slug)) return townCache.get(t.slug);
  const base = townData.towns[t.slug];
  const [wmo, st, dist] = Object.entries(stations).map(([w, s]) => [w, s, km(base.coords, s.coords)]).sort((a, b) => a[2] - b[2])[0];
  const dt = -LAPSE * (base.elevation - st.elevation);
  const adj = (v) => +(v + dt).toFixed(1);
  const d = {
    ...base, canton: base.canton ?? t.canton,
    station: { wmo, name: st.name, name_es: st.name_es, km: Math.round(dist), elevation: st.elevation },
    tmax: st.tmax.map(adj), tmin: st.tmin.map(adj), temp: st.temp.map((row) => row.map(adj)),
    wind: st.noon, rose: st.rose, calm: st.calm,
  };
  townCache.set(t.slug, d);
  return d;
};
const RAIN_MAX = Math.ceil(Math.max(...towns.flatMap((t) => townData.towns[t.slug].rain)) / 200) * 200; // one scale for every town
const fetchedLabel = (lang) => { const [y, m] = townData.fetched.split('-'); return lang === 'en' ? `${MONTHS.en[m - 1]} ${y}` : `${MONTHS.es[m - 1]} de ${y}`; };

// Rain by month. The year starts with the rains, so the best time to build closes the chart in one
// block; it is dimensioned like a drawing: hatched, with extension lines and a dimension line carrying
// its total rain and its heavy-rain days. A bottom row counts the heavy-rain days of every month.
function rainChart(lang, t, d, c) {
  const L = TT[lang];
  const b = c.build;
  const order = Array.from({ length: 12 }, (_, k) => (c.chartStart + k) % 12);
  const ticks = Array.from({ length: RAIN_MAX / 200 }, (_, i) => (i + 1) * 200);
  const MS = MONTHS_SHORT[lang];
  const label = `${MS[b.start]} → ${MS[(b.start + b.n - 1) % 12]} · Σ ${num(lang, b.rain)} mm · ${L.year.heavy(b.heavyIn)}`;
  const restN = 12 - b.n;
  const restLabel = `${MS[b.after]} → ${MS[(b.start + 11) % 12]} · ${L.year.restSub}`;
  return `      <figure class="rain tw__fig" style="--wn: ${b.n}">
        <div class="rain__plot" role="img" aria-label="${esc(L.year.chart(t, d))}. ${esc(b.isDry ? L.year.best : L.year.driest)}: ${esc(label)}">
${ticks.map((v) => `          <span class="rain__tick" style="--v: ${(v / RAIN_MAX).toFixed(3)}"><span>${v}</span></span>`).join('\n')}
          <div class="rain__window" aria-hidden="true">
            <span class="rain__hatch"></span>
            <span class="rain__dim"></span>
            <span class="rain__dimlabel"><b>${b.isDry ? L.year.best : L.year.driest}</b><span>${label}</span></span>
          </div>
${restN ? `          <div class="rain__rest" aria-hidden="true"><span class="rain__dim"></span><span class="rain__dimlabel"><b>${L.year.rest}</b><span>${restLabel}</span></span></div>` : ''}
          <ol class="rain__bars" aria-hidden="true">
${order.map((m) => `            <li class="rain__col${d.rain[m] < 60 ? ' is-dry' : ''}" style="--v: ${(d.rain[m] / RAIN_MAX).toFixed(3)}"><span class="rain__val">${d.rain[m]}</span><span class="rain__bar"></span></li>`).join('\n')}
          </ol>
        </div>
        <ol class="rain__months" aria-hidden="true">${order.map((m) => `<li>${MS[m]}</li>`).join('')}</ol>
        <ol class="rain__days" aria-hidden="true" data-row="${L.year.row}">${order.map((m) => `<li${b.heavy[m] >= 5 ? ' class="is-many"' : ''}>${Math.round(b.heavy[m])}</li>`).join('')}</ol>
        <figcaption class="note">${L.year.caption}</figcaption>
      </figure>
`;
}

// Wind roses: where the wind comes from (petals point into the wind), how often, how strong.
// Months are the season's months; every rose on a page shares one scale.
function roseShares(d, months) {
  const total = months.reduce((n, m) => n + d.calm[m] + d.rose[m].flat().reduce((a, b) => a + b, 0), 0);
  return { calm: months.reduce((n, m) => n + d.calm[m], 0) / total, dirs: d.rose[0].map((_, k) => d.rose[0][k].map((_, b) => months.reduce((n, m) => n + d.rose[m][k][b], 0) / total)) };
}
function roseSvg(lang, t, sh, max, season) {
  const L = TT[lang];
  const R = 100;
  const step = max > 0.3 ? 0.1 : 0.05;
  const top = Math.ceil(max / step) * step;
  const r = (v) => (v / top) * R;
  const pt = (rad, deg) => [rad * Math.sin((deg * Math.PI) / 180), -rad * Math.cos((deg * Math.PI) / 180)].map((n) => n.toFixed(1));
  const sector = (r0, r1, a0, a1) => { const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1), [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0); return `M${x0} ${y0}A${r1.toFixed(1)} ${r1.toFixed(1)} 0 0 1 ${x1} ${y1}L${x2} ${y2}${r0 > 0 ? `A${r0.toFixed(1)} ${r0.toFixed(1)} 0 0 0 ${x3} ${y3}` : ''}Z`; };
  const petals = sh.dirs.map((bands, k) => {
    let acc = 0;
    return bands.map((v, b) => { if (!v) return ''; const r0 = r(acc); acc += v; return `<path class="rose__b${b}" d="${sector(r0, r(acc), k * 22.5 - 9, k * 22.5 + 9)}"/>`; }).join('');
  }).join('');
  const rings = Array.from({ length: Math.round(top / step) }, (_, i) => (i + 1) * step).map((v) => `<circle class="rose__ring" r="${r(v).toFixed(1)}"/>`).join('');
  const ringLabel = `<text class="rose__pct" x="3" y="${(-r(top) + 9).toFixed(1)}">${Math.round(top * 100)}%</text>`;
  const [N, E, S, W] = L.sun.compass;
  return `<svg viewBox="-125 -125 250 250" role="img" aria-label="${esc(L.wind.aria(t, season.replace(/[()]/g, '').toLowerCase()))}">${rings}<path class="rose__axis" d="M0 -${R}V${R}M-${R} 0H${R}"/>${petals}${ringLabel}<text class="rose__card" x="0" y="-108">${N}</text><text class="rose__card" x="113" y="4">${E}</text><text class="rose__card" x="0" y="116">${S}</text><text class="rose__card" x="-113" y="4">${W}</text></svg>`;
}
function windSection(lang, t, d, c, P) {
  const L = TT[lang];
  const dry = c.dry ? Array.from({ length: c.dry.n }, (_, k) => (c.dry.start + k) % 12) : [];
  const wet = Array.from({ length: 12 }, (_, m) => m).filter((m) => !dry.includes(m));
  const seasons = dry.length ? [[L.wind.dry, dry], [L.wind.wet, wet]] : [[L.wind.all, wet]];
  const shares = seasons.map(([label, months]) => [label, roseShares(d, months)]);
  const max = Math.max(...shares.flatMap(([, sh]) => sh.dirs.map((b) => b.reduce((x, y) => x + y, 0))));
  return `    <section class="tw__sec grid" aria-labelledby="wind-title">
      <h2 class="label tw__label" id="wind-title">${L.wind.label}</h2>
      <figure class="roses tw__fig">
        <div class="roses__row${shares.length === 1 ? ' roses__row--one' : ''}">
${shares.map(([label, sh]) => `          <figure class="rose">${roseSvg(lang, t, sh, max, label)}<figcaption class="label"><span>${label}</span><span class="rose__calm">${L.wind.calm(Math.round(sh.calm * 100))}</span></figcaption></figure>`).join('\n')}
        </div>
        <p class="rose__legend label">${L.wind.speeds.map((x, b) => `<span class="rose__key"><i class="rose__b${b}"></i>${x}</span>`).join('')}</p>
        <figcaption class="note">${esc(L.wind.caption(d.station))}</figcaption>
      </figure>
      <div class="tw__text">
${P.wind.map((x) => `        <p class="large">${esc(x)}</p>`).join('\n')}
      </div>
    </section>
`;
}

// The wind and sun map (site/assets/js/climate-map.js). `pins` = [{ n: name, c: [lng, lat], h: href, here }].
function climateMap(lang, { center, zoom, bounds, pins, where }) {
  const M = TT[lang].map;
  const ghi = JSON.parse(readFileSync(join(SITE, 'assets', 'data', 'ghi.json'), 'utf8'));
  const bar = `linear-gradient(90deg, ${ghi.stops.map(([a, c]) => `${c} ${Math.round(a * 100)}%`).join(', ')})`;
  return `      <figure class="cmap" data-cmap data-center="${center.join(',')}" data-zoom="${zoom}"${bounds ? ` data-bounds="${JSON.stringify(bounds)}"` : ''} data-pins="${esc(JSON.stringify(pins))}">
        <div class="cmap__canvas" role="region" aria-label="${esc(M.aria(where))}"></div>
        <div class="cmap__controls">
          <div class="cmap__seg" role="group" aria-label="${M.season}"><button type="button" data-season="dry" aria-pressed="true">${M.dry}</button><button type="button" data-season="wet" aria-pressed="false">${M.wet}</button></div>
          <button class="cmap__toggle" type="button" data-sun aria-pressed="false">${M.sun}</button>
        </div>
        <div class="cmap__sun label" hidden><span>${M.scale}</span><span class="cmap__scale"><i class="cmap__bar" style="background: ${bar}"></i><span class="cmap__ticks"><span>${num(lang, ghi.low)}</span><span>${num(lang, (ghi.low + ghi.high) / 2)}</span><span>${num(lang, ghi.high)}</span></span></span></div>
        <figcaption class="note">${M.caption}</figcaption>
      </figure>
`;
}

// The sun's track over the town, seen from above, north at the top: the horizon is the outer ring,
// overhead is the centre, and the inner rings are 30 and 60 degrees above the horizon.
function sunDiagram(lang, t, d) {
  const L = TT[lang];
  const [lng, lat] = d.coords;
  const R = 120;
  const xy = ({ alt, az }) => { const r = ((90 - Math.max(0, alt)) / 90) * R; return [r * Math.sin((az * Math.PI) / 180), -r * Math.cos((az * Math.PI) / 180)]; };
  const f = (n) => n.toFixed(1);
  const days = [[SOLSTICE_JUNE, 'sun__jun'], [EQUINOX_MARCH, 'sun__equ'], [SOLSTICE_DECEMBER, 'sun__dec']];
  const tracks = days.map(([doy, cls]) => {
    const { pts, hours } = sunPath(lat, lng, doy);
    const line = pts.map((p) => xy(p).map(f).join(',')).join(' ');
    const dots = hours.filter((h) => h.alt > 0).map((h) => { const [x, y] = xy(h); return `<circle class="sun__dot" cx="${f(x)}" cy="${f(y)}" r="1.8"/>`; }).join('');
    const labels = cls === 'sun__dec' ? hours.filter((h) => [9, 12, 15].includes(h.h)).map((h) => { const [x, y] = xy(h); const k = 1 + 13 / Math.max(1, Math.hypot(x, y)); return `<text class="sun__hour" x="${f(x * k)}" y="${f(y * k + 3.5)}">${h.h}:00</text>`; }).join('') : '';
    return `<polyline class="${cls}" points="${line}"/>${dots}${labels}`;
  }).join('\n          ');
  const [N, E, S, W] = L.sun.compass;
  return `      <figure class="sunpath tw__fig" data-sun3d data-lat="${lat}" data-lng="${lng}" data-temps="${esc(JSON.stringify(d.temp))}">
        <svg viewBox="-150 -150 300 300" role="img" aria-label="${esc(L.sun.aria(t))}">
          <circle class="sun__ring" r="${R}"/><circle class="sun__ring sun__ring--in" r="${(R * 2) / 3}"/><circle class="sun__ring sun__ring--in" r="${R / 3}"/>
          <path class="sun__axis" d="M0 ${-R}V${R}M${-R} 0H${R}"/>
          <text class="sun__card" x="0" y="-130">${N}</text><text class="sun__card" x="136" y="4">${E}</text><text class="sun__card" x="0" y="139">${S}</text><text class="sun__card" x="-136" y="4">${W}</text>
          ${tracks}
        </svg>
        <figcaption class="sun__legend label">${L.sun.legend.map((txt, i) => `<span class="sun__key sun__key--${['jun', 'equ', 'dec'][i]}">${txt}</span>`).join('')}</figcaption>
        <div class="sun3d__legend label"><span class="sun3d__legend-title">${L.sun.temps}</span>${L.sun.bands.map((txt, i) => `<span class="sun3d__key"><i class="sun3d__t${i}"></i>${txt}</span>`).join('')}</div>
        <p class="note sun3d__note">${L.sun.note}</p>
      </figure>
`;
}

function townPage(lang, t) {
  const L = TT[lang];
  const d = townOf(t);
  const c = climate(d);
  const s = sunFacts(d.coords[1], d.coords[0]);
  const muni = L.municipality(t, d);
  const P = paragraphs(lang, t, d, c, s, muni);
  const Q = faq(lang, t, d, c, s, muni);
  const paths = { en: townPath('en', t.slug), es: townPath('es', t.slug) };
  const up = upFrom(paths[lang]);
  const home = up + UI[lang].dir;
  const waText = L.wa(t);
  // our projects, nearest first (invented placeholder pins do not count)
  const work = projects.filter((p) => p.pin !== 'placeholder').map((p) => ({ p, km: km(d.coords, p.coords) })).sort((a, b) => a.km - b.km).slice(0, 3);
  const near = work[0].km <= 60;
  const others = towns.filter((o) => o.slug !== t.slug).map((o) => ({ o, km: km(d.coords, townData.towns[o.slug].coords) })).sort((a, b) => a.km - b.km).slice(0, 3);
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'ProfessionalService', '@id': `${ORIGIN}/#studio`, name: 'Studio CAVA', url: `${ORIGIN}/`, telephone: `+${WHATSAPP}`, email: EMAIL,
        address: { '@type': 'PostalAddress', addressLocality: 'San José', addressCountry: 'CR' },
        areaServed: { '@type': 'Place', name: `${t.name}, ${d.canton}, ${d.province}, Costa Rica`, geo: { '@type': 'GeoCoordinates', latitude: d.coords[1], longitude: d.coords[0] } } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Studio CAVA', item: `${ORIGIN}/${UI[lang].dir}` },
        { '@type': 'ListItem', position: 2, name: L.crumb, item: `${ORIGIN}/${townsPath(lang)}` },
        { '@type': 'ListItem', position: 3, name: t.name, item: `${ORIGIN}/${paths[lang]}` } ] },
      { '@type': 'FAQPage', mainEntity: Q.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  const fact = (k, v) => `        <div><dt>${k}</dt><dd>${esc(v)}</dd></div>`;
  return head(lang, {
    title: L.title(t), description: L.description(t, d, c, muni), paths,
    image: `${imgBase(work[0].p.slug, 1)}-1600.webp`, up, script: ['project.js', 'climate-map.js', 'permit-flow.js'], jsonld: ld,
  }) + `<div id="top"></div>
${bar(lang, up, paths, 'towns')}
<main class="page">
  <article class="tw" aria-labelledby="tw-title">
    <header class="proj__head cq">
      <p class="label proj__crumb"><a class="ulink" href="../">${L.crumb}</a><span>(${regions[t.region][lang]})</span></p>
      <h1 class="tw__title" id="tw-title"><span class="label tw__kicker">${L.kicker}</span> <span class="display">${esc(t.name)}</span></h1>
    </header>
${places?.towns[t.slug] ? placePhoto(lang, up, places.towns[t.slug], { eager: true }) : ''}    <section class="tw__intro grid">
      <div class="tw__lead">
        <p class="tw__standfirst">${esc(L.intro(t, d, c, muni)[0])}</p>
        <p class="large">${esc(L.intro(t, d, c, muni)[1])}</p>
        <div class="reach__actions">
          <a class="btn btn--dark" href="${wa(waText)}" target="_blank" rel="noopener">WhatsApp ${WHATSAPP_SHOWN} <span class="btn__dot" aria-hidden="true"></span></a>
          ${booking ? `<a class="btn btn--light" href="${up}${bookPath(lang)}?town=${t.slug}">${BK[lang].link} <span class="btn__dot" aria-hidden="true"></span></a>` : `<a class="btn btn--light reach__mail" href="${home}#enquiry">${UI[lang].nav.cta} <span class="btn__dot" aria-hidden="true"></span></a>`}
        </div>
      </div>
    </section>
    <section class="proj__body grid tw__facts" aria-labelledby="facts-title">
      <h2 class="label sheet__label" id="facts-title">${L.facts.label}</h2>
      <dl class="sheet">
${[
  fact(L.facts.canton, d.canton === d.province ? d.canton : L.facts.cantonV(d)),
  fact(L.facts.permits, t.extra?.[lang]?.permitsFact ?? muni.replace(/^(the|la|el) /, '')),
  fact(L.facts.elevation, L.facts.elevationV(d)),
  fact(L.facts.rain, L.facts.rainV(c)),
  fact(L.facts.dry, L.facts.dryV(c)),
  fact(L.facts.lir, L.facts.road(d.roads.LIR)),
  fact(L.facts.sjo, L.facts.road(d.roads.SJO)),
  fact(L.facts.sun, L.facts.sunV(d)),
  fact(L.facts.pv, L.facts.pvV(d)),
].join('\n')}
      </dl>
      <figure class="pmap" data-pmap data-lng="${d.coords[0]}" data-lat="${d.coords[1]}" data-label="${esc(t.name)}" data-pin="exact">
        <div class="pmap__canvas" role="img" aria-label="${esc(lang === 'en' ? `Map of ${t.name} and the coast around it` : `Mapa de ${t.name} y sus alrededores`)}"></div>
        <figcaption class="pmap__cap label"><span>${esc(t.name)}</span><span class="pmap__note">${d.coords[1].toFixed(3)}° N, ${Math.abs(d.coords[0]).toFixed(3)}° ${lang === 'en' ? 'W' : 'O'}</span></figcaption>
      </figure>
    </section>
    <section class="tw__sec grid" aria-labelledby="year-title">
      <h2 class="label tw__label" id="year-title">${L.year.label}</h2>
${rainChart(lang, t, d, c)}      <div class="tw__text">
${P.year.map((x) => `        <p class="large">${esc(x)}</p>`).join('\n')}
      </div>
      <div class="tw__text tw__build">
        <h3 class="tw__build-title">${TT[lang].year.best}</h3>
${P.build.map((x) => `        <p class="large">${esc(x)}</p>`).join('\n')}
      </div>
    </section>
${windSection(lang, t, d, c, P)}    <section class="tw__sec grid" aria-labelledby="map-title">
      <h2 class="label tw__label" id="map-title">${L.map.label}</h2>
${climateMap(lang, { center: d.coords, zoom: 8.2, where: t.name, pins: towns.map((o) => ({ n: o.name, c: townData.towns[o.slug].coords, h: o.slug === t.slug ? '' : `../${o.slug}/`, here: o.slug === t.slug })) })}    </section>
    <section class="tw__sec grid" aria-labelledby="sun-title">
      <h2 class="label tw__label" id="sun-title">${L.sun.label}</h2>
${sunDiagram(lang, t, d)}      <div class="tw__text tw__text--side">
${P.sun.map((x) => `        <p class="large">${esc(x)}</p>`).join('\n')}
      </div>
    </section>
    <section class="tw__sec grid" aria-labelledby="build-title">
      <h2 class="label tw__label" id="build-title">${L.build.label}</h2>
${P.ownSteps ? `      <p class="large tw__aside">${lang === 'en' ? 'Building here follows its own route, set out below.' : 'Construir aquí sigue su propia ruta, que se explica abajo.'}</p>\n` : ''}${permitGuide && TOWN_MUNI[t.slug] ? `      <div class="tw__route" id="permits">
        <p class="note">${PR[lang].hereNote}</p>
${permitWidget(lang, up, { town: t.slug }, `${up}${guidePath(lang, permitGuide)}#source-`)}      </div>` : `      <ol class="tw__steps">
${P.steps.map(([h, x], i) => `        <li><span class="label">(${pad(i + 1)})</span><h3>${esc(h)}</h3><p>${esc(x)}</p></li>`).join('\n')}
      </ol>`}
${[P.zmt, P.note].filter(Boolean).map((x) => `      <p class="large tw__aside">${cite(x)}</p>`).join('\n')}
${guides.length || costs ? `      <ul class="tw__aside guide__links">
${costs ? `        <li><a class="ulink" href="${up}${townCostPath(lang, t.slug)}">${esc(ET[lang].town(t.name))} →</a></li>\n` : ''}${land?.towns[t.slug] ? `        <li><a class="ulink" href="${up}${landTownPath(lang, t.slug)}">${esc(LT[lang].town(t.name))} →</a></li>\n` : ''}${guides.map((g) => `        <li><a class="ulink" href="${up}${guidePath(lang, g)}">${esc(g[lang].link)} →</a></li>`).join('\n')}
      </ul>` : ''}
    </section>
${townExtra(lang, t)}    <section class="tw__sec tw__work" aria-labelledby="work-title">
      <h2 class="label" id="work-title">${near ? L.work.near : L.work.far}</h2>
${projectCards(lang, up, work.map(({ p, km: dist }) => ({ p, meta: near ? L.work.km(Math.round(dist)) : tr(lang, p, 'type') })))}    </section>
    <section class="tw__sec grid" aria-labelledby="faq-title">
      <h2 class="label tw__label" id="faq-title">${L.faq.label}</h2>
      <div class="faq">
${Q.map(([q, a]) => faqItem(q, esc(a))).join('\n')}
      </div>
    </section>
    <nav class="tw__sec grid" aria-labelledby="near-title">
      <h2 class="label tw__label" id="near-title">${L.nearby.label}</h2>
      <ul class="near">
${others.map(({ o, km: dist }) => `        <li><a class="ulink" href="../${o.slug}/">${esc(o.name)}</a><span class="label">${L.nearby.km(Math.round(dist))}</span></li>`).join('\n')}
        <li><a class="ulink near__all" href="../">${L.nearby.all} →</a></li>
      </ul>
    </nav>
    <p class="note tw__sources">${esc(L.sources(fetchedLabel(lang), d.station))}</p>
  </article>
${contact(lang, waText, up, `?town=${t.slug}`).replace(UI[lang].reach.text, esc(L.reach(t)))}</main>
${footer(lang, up, paths)}${waButton(lang, waText)}${end}`;
}

// A town's own permits section, when the place has rules beyond the usual (data/towns.json "extra").
function townExtra(lang, t) {
  const x = t.extra?.[lang];
  if (!x) return '';
  return `    <section class="tw__sec grid" id="${x.id}" aria-labelledby="extra-title">
      <h2 class="label tw__label" id="extra-title">${x.label}</h2>
      <div class="tw__text guide__body">
        <h3 class="guide__h2">${esc(x.title)}</h3>
${x.body.map((p) => `        <p class="large">${cite(p)}</p>`).join('\n')}
${x.steps ? `        <ol class="tw__steps guide__steps">
${x.steps.map(([h, p], k) => `          <li><span class="label">(${pad(k + 1)})</span><h3>${esc(h)}</h3><p>${cite(p)}</p></li>`).join('\n')}
        </ol>` : ''}
${x.tips ? `        <ul class="guide__tips">
${x.tips.map((p) => `          <li>${cite(p)}</li>`).join('\n')}
        </ul>` : ''}
        <ol class="guide__sources guide__sources--inline">
${(Array.isArray(x.sources) ? x.sources : t.extra[x.sources].sources).map((s, k) => sourceItem(lang, s, k, '          ')).join('\n')}
        </ol>
      </div>
    </section>
`;
}

// ---------- /architects/ and /es/arquitectos/: where we work ----------
function hubPage(lang) {
  const L = TT[lang];
  const H = L.hub;
  const paths = { en: townsPath('en'), es: townsPath('es') };
  const up = upFrom(paths[lang]);
  const rows = Object.keys(regions).map((r) => {
    const list = towns.filter((t) => t.region === r);
    if (!list.length) return '';
    return `        <tbody>
          <tr class="hub__region"><th colspan="8" scope="rowgroup">${regions[r][lang]}</th></tr>
${list.map((t) => { const d = townOf(t); const c = climate(d); return `          <tr><th scope="row"><a class="ulink" href="${t.slug}/">${esc(t.name)}</a></th><td>${esc(d.canton)}</td><td>${num(lang, c.total)} mm</td><td>${esc(L.facts.dryV(c))}</td><td>${c.tmaxHot} °C, ${MONTHS[lang][c.hottest]}</td><td>${num(lang, d.ghi)} kWh/m²</td><td>${duration(d.roads.LIR.min)}</td><td>${duration(d.roads.SJO.min)}</td></tr>`; }).join('\n')}
        </tbody>`;
  }).join('\n');
  return head(lang, { title: H.title, description: H.description, paths, image: `${imgBase('tragaluz-retreat', 3)}-1600.webp`, up, script: 'climate-map.js' }) + `<div id="top"></div>
${bar(lang, up, paths, 'towns')}
<main class="page">
  <article class="mf" aria-labelledby="hub-title">
    <header class="mf__head grid">
      <span class="label mf__label">${H.label}</span>
      <h1 class="display mf__title" id="hub-title"><span>${esc(H.h1[0])}</span><span class="right">${esc(H.h1[1])}</span></h1>
      <p class="h3 mf__intro">${esc(H.intro)}</p>
    </header>
${places?.hub ? placePhoto(lang, up, places.hub, { eager: true }).replace('<figure class="place">', '<figure class="place place--hub">') : ''}    <div class="hub__map">
${climateMap(lang, { center: [-84.25, 9.85], zoom: 6.9, bounds: [[-85.95, 8.0], [-82.55, 11.22]], where: 'Costa Rica', pins: towns.map((o) => ({ n: o.name, c: townData.towns[o.slug].coords, h: `${o.slug}/` })) })}    </div>
    <div class="hub__wrap">
      <table class="hub__table">
        <thead><tr>${H.cols.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead>
${rows}
      </table>
    </div>
    <p class="note tw__sources">${esc(L.sources(fetchedLabel(lang)))}</p>
  </article>
${guides.length ? `  <section class="related" aria-labelledby="hub-guides-title">
    <div class="related__head"><h2 class="label" id="hub-guides-title">${GT[lang].label}</h2><a class="label ulink" href="${up}${guidesIndexPath(lang)}">${GT[lang].guides} →</a></div>
    <ol class="stages">
${guides.map((g, i) => `      <li class="stage"><span class="label stage__n">(${pad(i + 1)})</span><h3 class="stage__title"><a class="ulink" href="${up}${guidePath(lang, g)}">${esc(g[lang].title.split(' | ')[0])}</a></h3><p class="large stage__text">${esc(g[lang].description)}</p></li>`).join('\n')}
${costs ? `      <li class="stage"><span class="label stage__n">(${pad(guides.length + 1)})</span><h3 class="stage__title"><a class="ulink" href="${up}${estimatorPath(lang)}">${esc(ET[lang].name)}</a></h3><p class="large stage__text">${esc(ET[lang].description)}</p></li>\n` : ''}${land ? `      <li class="stage"><span class="label stage__n">(${pad(guides.length + (costs ? 2 : 1))})</span><h3 class="stage__title"><a class="ulink" href="${up}${landPath(lang)}">${esc(LT[lang].name)}</a></h3><p class="large stage__text">${esc(LT[lang].description)}</p></li>\n` : ''}${permitGuide ? `      <li class="stage"><span class="label stage__n">(${pad(guides.length + (costs ? 1 : 0) + (land ? 1 : 0) + 1)})</span><h3 class="stage__title"><a class="ulink" href="${up}${permitPath(lang)}">${esc(PR[lang].name)}</a></h3><p class="large stage__text">${esc(PR[lang].description)}</p></li>\n` : ''}    </ol>
  </section>
` : ''}  <section class="related" aria-labelledby="hub-work-title">
    <div class="related__head"><h2 class="label" id="hub-work-title">${H.work}</h2><a class="label ulink" href="${up}${projectsPath(lang)}">${H.all} →</a></div>
${projectCards(lang, up, [...projects].sort((a, b) => (a.status === 'Built' ? 0 : 1) - (b.status === 'Built' ? 0 : 1)).slice(0, 6).map((p) => ({ p, meta: placeOf(lang, p) })))}  </section>
${contact(lang, UI[lang].wa.general, up)}</main>
${footer(lang, up, paths)}${waButton(lang, UI[lang].wa.general)}${end}`;
}

// ---------- Guides: /guides/<slug>/, /es/guias/<slug>/ (or under where we work) ----------
const guidePath = (lang, g) => `${UI[lang].dir}${g.dir[lang]}/${g.slug[lang]}/`;
const GT = {
  en: { label: '(Guide)', reviewed: (d) => `Reviewed ${d}. General information, not legal advice: rules change, and each municipality applies them its own way.`, contents: '(Contents)', faq: '(Questions)', sources: '(Sources)', guides: 'Guides' },
  es: { label: '(Guía)', reviewed: (d) => `Revisada en ${d}. Información general, no asesoría legal: las reglas cambian y cada municipalidad las aplica a su manera.`, contents: '(Contenido)', faq: '(Preguntas)', sources: '(Fuentes)', guides: 'Guías' },
};
// One source line, in the page's language when the source has a Spanish version.
const sourceItem = (lang, s, k, indent) => {
  const f = (key) => (lang === 'es' && s[`${key}_es`]) || s[key];
  return `${indent}<li id="source-${k + 1}"><a class="ulink" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(f('title'))}</a>${s.publisher ? `. ${esc(f('publisher'))}` : ''}${s.date ? `, ${esc(f('date'))}` : ''}.</li>`;
};
// The method and its sources as a product page sets its footnotes: small, light, in a centred column at
// the foot of the page, after the contact block.
const finePrint = (lang, id, title, paras, sources, cls = '') => `  <section class="fine${cls ? ` ${cls}` : ''}" aria-labelledby="${id}">
    <div class="fine__in">
      <h2 class="fine__title" id="${id}">${esc(title)}</h2>
${paras.map((x) => `      <p>${cite(x)}</p>`).join('\n')}
      <ol class="fine__sources">
${sources.map((x, k) => sourceItem(lang, x, k, '        ')).join('\n')}
      </ol>
    </div>
  </section>
`;
// "[3]" in a guide's text becomes a numbered link to its source
const cite = (s) => esc(s).replace(/\[(\d+(?:,\s*\d+)*)\]/g, (m, ns) => `<sup class="cite">${ns.split(/,\s*/).map((n) => `<a href="#source-${n}">${n}</a>`).join(',')}</sup>`);
function guidePage(lang, g) {
  const G = g[lang];
  const L = GT[lang];
  const paths = { en: guidePath('en', g), es: guidePath('es', g) };
  const up = upFrom(paths[lang]);
  const [y, m] = g.reviewed.split('-');
  const reviewed = lang === 'en' ? `${MONTHS.en[m - 1]} ${y}` : `${MONTHS.es[m - 1]} de ${y}`;
  const sec = (s, i) => `    <section class="tw__sec grid" id="${s.id}" aria-labelledby="g-${s.id}">
      <p class="label tw__label">${s.label ?? `(${pad(i + 1)})`}</p>
      <div class="tw__text guide__body">
        <h2 class="guide__h2" id="g-${s.id}">${esc(s.title)}</h2>
${(s.body ?? []).map((x) => `        <p class="large">${cite(x)}</p>`).join('\n')}
${s.steps ? `        <ol class="tw__steps guide__steps">
${s.steps.map(([h, x], k) => `          <li><span class="label">(${pad(k + 1)})</span><h3>${esc(h)}</h3><p>${cite(x)}</p></li>`).join('\n')}
        </ol>` : ''}
${s.table ? `        <div class="hub__wrap"><table class="hub__table guide__table"><thead><tr>${s.table.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>
${s.table.rows.map((r) => `          <tr>${r.map((c, k) => (k === 0 ? `<th scope="row">${cite(c)}</th>` : `<td>${cite(c)}</td>`)).join('')}</tr>`).join('\n')}
        </tbody></table></div>` : ''}
${s.tips ? `        <ul class="guide__tips">
${s.tips.map((x) => `          <li>${cite(x)}</li>`).join('\n')}
        </ul>` : ''}
${(s.after ?? []).map((x) => `        <p class="large">${cite(x)}</p>`).join('\n')}
      </div>
    </section>
`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Article', headline: G.title.split(' | ')[0], description: G.description, inLanguage: lang, dateModified: g.reviewed, author: { '@type': 'Organization', name: 'Studio CAVA', url: `${ORIGIN}/` }, publisher: { '@type': 'Organization', name: 'Studio CAVA' }, mainEntityOfPage: `${ORIGIN}/${paths[lang]}` },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Studio CAVA', item: `${ORIGIN}/${UI[lang].dir}` }, { '@type': 'ListItem', position: 2, name: G.crumb, item: `${ORIGIN}/${UI[lang].dir}${g.dir[lang]}/` }, { '@type': 'ListItem', position: 3, name: G.title.split(' | ')[0], item: `${ORIGIN}/${paths[lang]}` }] },
      ...(G.faq?.length ? [{ '@type': 'FAQPage', mainEntity: G.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/\s*\[\d+(?:,\s*\d+)*\]/g, '') } })) }] : []),
    ],
  };
  return head(lang, { title: G.title, description: G.description, paths, image: `${imgBase(g.image.split('/')[0], g.image.split('/')[1])}-1600.webp`, up, jsonld: ld }) + `<div id="top"></div>
${bar(lang, up, paths, 'guides')}
<main class="page">
  <article class="guide" aria-labelledby="guide-title">
    <header class="mf__head grid guide__head">
      <p class="label mf__label">${L.label}</p>
      <h1 class="display mf__title" id="guide-title"><span>${esc(G.h1[0])}</span><span class="right">${esc(G.h1[1])}</span></h1>
      <p class="h3 mf__intro">${cite(G.intro)}</p>
      <p class="note guide__reviewed">${L.reviewed(reviewed)}</p>
    </header>
    <nav class="tw__sec grid guide__toc" aria-labelledby="toc-title">
      <h2 class="label tw__label" id="toc-title">${L.contents}</h2>
      <ol class="guide__contents">
${G.sections.map((s) => `        <li><a class="ulink" href="#${s.id}">${esc(s.title)}</a></li>`).join('\n')}
      </ol>
    </nav>
${G.sections.map(sec).join('')}${G.faq?.length ? `    <section class="tw__sec grid" aria-labelledby="faq-title">
      <h2 class="label tw__label" id="faq-title">${L.faq}</h2>
      <div class="faq">
${G.faq.map(([q, a]) => faqItem(q, cite(a))).join('\n')}
      </div>
    </section>
` : ''}    <section class="tw__sec grid" aria-labelledby="sources-title">
      <h2 class="label tw__label" id="sources-title">${L.sources}</h2>
      <ol class="guide__sources">
${(Array.isArray(G.sources) ? G.sources : g[G.sources].sources).map((s, k) => sourceItem(lang, s, k, '        ')).join('\n')}
      </ol>
    </section>
    <nav class="tw__sec grid" aria-labelledby="related-guides">
      <h2 class="label tw__label" id="related-guides">${lang === 'en' ? '(Related)' : '(Relacionado)'}</h2>
      <ul class="tw__aside guide__links">
${guides.filter((o) => o !== g).map((o) => `        <li><a class="ulink" href="${up}${guidePath(lang, o)}">${esc(o[lang].link)} →</a></li>`).join('\n')}
${towns.filter((t) => t.extra).map((t) => `        <li><a class="ulink" href="${up}${townPath(lang, t.slug)}">${esc(t.extra[lang].title)} →</a></li>`).join('\n')}
${costs ? `        <li><a class="ulink" href="${up}${estimatorPath(lang)}">${esc(ET[lang].name)} →</a></li>\n` : ''}${permitGuide ? `        <li><a class="ulink" href="${up}${permitPath(lang)}">${esc(PR[lang].name)} →</a></li>\n` : ''}        <li><a class="ulink" href="${up}${townsPath(lang)}">${lang === 'en' ? 'Rain, sun, wind and permits, town by town' : 'Lluvia, sol, viento y permisos, pueblo por pueblo'} →</a></li>
      </ul>
    </nav>
  </article>
${contact(lang, UI[lang].wa.general, up)}</main>
${footer(lang, up, paths)}${waButton(lang, UI[lang].wa.general)}${end}`;
}

// /guides/ and /es/guias/: the list of guides
const GUIDES_DIR = { en: 'guides', es: 'guias' };
const guidesIndexPath = (lang) => `${UI[lang].dir}${GUIDES_DIR[lang]}/`;
function guidesIndex(lang) {
  const paths = { en: guidesIndexPath('en'), es: guidesIndexPath('es') };
  const up = upFrom(paths[lang]);
  const H = lang === 'en'
    ? { title: 'Guides | Studio CAVA', description: 'What it takes to build in Costa Rica: permits, condominiums and the places we work, with sources.', h1: ['Guides', 'to building'], intro: 'What it takes to build in Costa Rica, step by step, with the law or the office behind every step.' }
    : { title: 'Guías | Studio CAVA', description: 'Lo que hace falta para construir en Costa Rica: permisos, condominios y los lugares donde trabajamos, con fuentes.', h1: ['Guías', 'para construir'], intro: 'Lo que hace falta para construir en Costa Rica, paso a paso, con la ley o la oficina detrás de cada paso.' };
  return head(lang, { title: H.title, description: H.description, paths, image: `${imgBase('papagayo-404', 1)}-1600.webp`, up }) + `<div id="top"></div>
${bar(lang, up, paths, 'guides')}
<main class="page">
  <article class="mf" aria-labelledby="gi-title">
    <header class="mf__head grid">
      <span class="label mf__label">${GT[lang].label}</span>
      <h1 class="display mf__title" id="gi-title"><span>${esc(H.h1[0])}</span><span class="right">${esc(H.h1[1])}</span></h1>
      <p class="h3 mf__intro">${esc(H.intro)}</p>
    </header>
    <ol class="stages">
${guides.map((g, i) => `      <li class="stage"><span class="label stage__n">(${pad(i + 1)})</span><h2 class="stage__title"><a class="ulink" href="${up}${guidePath(lang, g)}">${esc(g[lang].title.split(' | ')[0])}</a></h2><p class="large stage__text">${esc(g[lang].description)}</p></li>`).join('\n')}
      <li class="stage"><span class="label stage__n">(${pad(guides.length + 1)})</span><h2 class="stage__title"><a class="ulink" href="${up}${townsPath(lang)}">${lang === 'en' ? 'Where we work' : 'Dónde trabajamos'}</a></h2><p class="large stage__text">${lang === 'en' ? 'Rain, sun, wind and permits for every town where we design.' : 'Lluvia, sol, viento y permisos de cada pueblo donde diseñamos.'}</p></li>
    </ol>
  </article>
${contact(lang, UI[lang].wa.general, up)}</main>
${footer(lang, up, paths)}${waButton(lang, UI[lang].wa.general)}${end}`;
}

// ---------- /tools/cost-estimator/ and /es/herramientas/estimador-de-costos/ ----------
// The numbers live in data/costs.json, each with its source; the build adds the towns' dry season and
// solar yield and publishes it as site/assets/data/costs.json for site/assets/js/estimator.js.
const COSTS_PATH = join(ROOT, 'data', 'costs.json');
const costs = existsSync(COSTS_PATH) ? JSON.parse(readFileSync(COSTS_PATH, 'utf8')) : null;
const estimatorPath = (lang) => (lang === 'en' ? 'tools/cost-estimator/' : 'es/herramientas/estimador-de-costos/');
const ET = {
  en: {
    title: 'Building cost estimator for Costa Rica | Studio CAVA',
    description: 'What a house, a hotel or any other building costs to build in Costa Rica, from the Ministry of Finance\'s official values, CFIA fees, VAT and builders\' prices by town, with a schedule month by month.',
    label: '(Tool)', h1: ['Cost', 'estimator'],
    intro: 'What a house, a hotel or any other building costs to build in Costa Rica, and how long it takes, in a few choices. The numbers come from the Ministry of Finance, the CFIA and builders, and every one has its source below.',
    where: 'Where', other: 'Somewhere else in Costa Rica', what: 'What you are building', typeSearch: 'Type to search: house, cabins, restaurant…', typeNone: 'Nothing by that name. Try house, hotel, cabins or warehouse.', typeSingle: 'Hacienda gives a single value for this type, so the finish does not change it.',
    size: 'Built area', storeys: 'Storeys', quality: 'Finish level', qualities: { standard: 'Standard', high: 'High', luxury: 'Luxury' },
    qualityNotes: { standard: 'Three or four good bathrooms, a designed facade, some double heights', high: 'Very good bathrooms, ceilings of 3 to 5 m, large glazing', luxury: 'Marble, fine woods, imported finishes' },
    site: 'Lot', slopes: { flat: 'Flat', gentle: 'Gentle slope', steep: 'Steep' },
    extras: 'Extras', pool: 'Pool', pools: { 0: 'None', 15: 'Plunge, 15 m²', 32: 'Pool, 32 m²', 50: 'Large, 50 m²' }, deck: 'Terraces and decks',
    solar: 'Solar panels', landscape: 'Landscaping', furniture: 'Furniture, ready to rent', land: 'The land', lot: 'Lot, m²', condo: 'In a condominium or gated community', currency: 'Show in',
    resultLabel: '(Estimate)', hard: 'Construction', soft: 'Design, permits and taxes', parts: '(Construction, by part)', softs: '(Design, permits and taxes)',
    massing: '(The volume)', likelyL: 'Likely', allIn: 'All in, a m² built', softShort: 'Fees, permits, VAT', schedule: '(Schedule)', dry: 'Dry season', flags: '(To keep in mind)',
    copy: 'Copy the link', print: 'Print or save as PDF', whatsapp: 'Send it to the studio on WhatsApp',
    noscript: 'The estimator needs JavaScript.', failed: 'The estimator did not load. Try again in a moment.',
    method: '(How we estimate)', methodTitle: 'Where the numbers come from',
    sticky: 'Estimate',
    link: 'Cost estimator', name: 'Building cost estimator', town: (n) => `What it costs to build in ${n}`,
    budget: '(From a budget)', budgetNote: 'What a budget builds here, with the choices above. Pick one to use it.', budgetCur: { usd: 'US$', crc: '₡ million' },
    scope: '(What the estimate covers)', inLabel: 'Included', outLabel: 'Not included',
    included: ['Construction, with the builder\'s profit and administration', 'Studies, design, drawings, cost estimate and technical direction, at the CFIA minimum', 'Municipal permit, CFIA charges and the INS work insurance', 'VAT at 13%', 'A reserve of 5 to 10%', 'The pool, terraces, solar, landscaping and furniture you pick, and condominium design reviews'],
    excluded: ['The land unless you tick it, and its legal and transfer costs', 'The water letter, a long water line or a well', 'A power line to the lot', 'Access roads and long driveways', 'A septic tank or a treatment plant', 'Condominium review fees and deposits'],
    dated: (fx) => `Rates updated ${fx.date}, at ₡${fx.crcPerUsd.toFixed(2)} to the dollar. They price houses designed by an architect; a typical local house (Hacienda types VC01 to VC04) runs about US$640 to 1,050 a m².`,
    work: '(Our work at this size)', allWork: 'All projects',
  },
  es: {
    title: 'Estimador de costos de construcción en Costa Rica | Studio CAVA',
    description: 'Cuánto cuesta construir una casa, un hotel o cualquier otra edificación en Costa Rica, con los valores oficiales de Hacienda, los honorarios del CFIA, el IVA y precios de constructores por pueblo, y un cronograma mes a mes.',
    label: '(Herramienta)', h1: ['Estimador', 'de costos'],
    intro: 'Cuánto cuesta construir una casa, un hotel o cualquier otra edificación en Costa Rica, y cuánto tarda, en unas pocas decisiones. Los números salen del Ministerio de Hacienda, del CFIA y de constructores, y cada uno tiene su fuente abajo.',
    where: 'Dónde', other: 'En otro lugar de Costa Rica', what: 'Qué va a construir', typeSearch: 'Escriba para buscar: casa, cabinas, restaurante…', typeNone: 'Nada con ese nombre. Pruebe casa, hotel, cabinas o bodega.', typeSingle: 'Hacienda da un solo valor para este tipo, así que el acabado no lo cambia.',
    size: 'Área construida', storeys: 'Pisos', quality: 'Nivel de acabados', qualities: { standard: 'Estándar', high: 'Alto', luxury: 'Lujo' },
    qualityNotes: { standard: 'Tres o cuatro baños buenos, fachada diseñada, algunas dobles alturas', high: 'Baños muy buenos, cielos de 3 a 5 m, grandes ventanales', luxury: 'Mármol, maderas finas, acabados importados' },
    site: 'Lote', slopes: { flat: 'Plano', gentle: 'Pendiente suave', steep: 'Pendiente fuerte' },
    extras: 'Extras', pool: 'Piscina', pools: { 0: 'Ninguna', 15: 'Pequeña, 15 m²', 32: 'Piscina, 32 m²', 50: 'Grande, 50 m²' }, deck: 'Terrazas y decks',
    solar: 'Paneles solares', landscape: 'Paisajismo', furniture: 'Mobiliario, listo para alquilar', land: 'El terreno', lot: 'Lote, m²', condo: 'En un condominio o residencial cerrado', currency: 'Mostrar en',
    resultLabel: '(Estimación)', hard: 'Construcción', soft: 'Diseño, permisos e impuestos', parts: '(Construcción, por partida)', softs: '(Diseño, permisos e impuestos)',
    massing: '(El volumen)', likelyL: 'Probable', allIn: 'Todo incluido, por m²', softShort: 'Honorarios e IVA', schedule: '(Cronograma)', dry: 'Época seca', flags: '(A tomar en cuenta)',
    copy: 'Copiar el enlace', print: 'Imprimir o guardar en PDF', whatsapp: 'Enviarla al estudio por WhatsApp',
    noscript: 'El estimador necesita JavaScript.', failed: 'El estimador no cargó. Intente de nuevo en un momento.',
    method: '(Cómo estimamos)', methodTitle: 'De dónde salen los números',
    sticky: 'Estimación',
    link: 'Estimador de costos', name: 'Estimador de costos de construcción', town: (n) => `Cuánto cuesta construir en ${n}`,
    budget: '(Desde un presupuesto)', budgetNote: 'Lo que construye un presupuesto aquí, con las decisiones de arriba. Elija una opción para usarla.', budgetCur: { usd: 'US$', crc: 'millones de ₡' },
    scope: '(Qué incluye la estimación)', inLabel: 'Incluye', outLabel: 'No incluye',
    included: ['La construcción, con la utilidad y la administración del constructor', 'Estudios, diseño, planos, estimación de costos y dirección técnica, al mínimo del CFIA', 'Permiso municipal, cargos del CFIA y la póliza de riesgos del trabajo del INS', 'IVA del 13%', 'Una reserva del 5 al 10%', 'La piscina, las terrazas, los paneles, el paisajismo y el mobiliario que elija, y las revisiones de diseño del condominio'],
    excluded: ['El terreno si no lo marca, y sus gastos legales y de traspaso', 'La carta de agua, una tubería larga o un pozo', 'Una línea eléctrica hasta el lote', 'Caminos de acceso y entradas largas', 'Tanque séptico o planta de tratamiento', 'Cuotas y depósitos de revisión del condominio'],
    dated: (fx) => `Tarifas al ${fx.date_es}, a ₡${fx.crcPerUsd.toFixed(2)} por dólar. Corresponden a casas diseñadas por un arquitecto; una casa local típica (tipologías VC01 a VC04 de Hacienda) sale en unos US$640 a 1,050 el m².`,
    work: '(Obras de este tamaño)', allWork: 'Todos los proyectos',
  },
};
// Resolves Hacienda's colón codes into dollars per m², so the browser only multiplies; drops the notes.
function costsData() {
  const H = costs.hacienda, fx = costs.fx.crcPerUsd;
  const usd = (code, kind) => (H.values[code] * H.index[kind] * (1 + H.margin)) / fx;
  const val = (c, kind) => (c == null ? null : Array.isArray(c) ? (usd(c[0], kind) + usd(c[1], kind)) / 2 : usd(c, kind));
  const range = (codes, kind) => { const v = codes.map((c) => val(c, kind)); v[1] ??= (v[0] + v[2]) / 2; return v.map(Math.round); };
  const tiers = (t, kind) => Object.fromEntries(Object.entries(t).filter(([k]) => k !== '_note').map(([k, codes]) => [k, range(codes, kind)]));
  const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === '_note' ? undefined : v)));
  const X = costs.extras;
  // every other type: its codes from cheap to dear, read at three points per finish (data/costs.json, programs)
  const spread = (codes, kind) => {
    const v = codes.map((c) => usd(c, kind)).sort((a, b) => a - b);
    if (v.length === 1) { const t = [v[0] * 0.92, v[0], v[0] * 1.08].map(Math.round); return { standard: t, high: t, luxury: t }; }
    const at = (p) => { const i = p * (v.length - 1), a = Math.floor(i), b = Math.min(v.length - 1, a + 1); return v[a] + (v[b] - v[a]) * (i - a); };
    const r = (...ps) => ps.map((p) => Math.round(at(p)));
    return { standard: r(0, 0.2, 0.45), high: r(0.3, 0.55, 0.8), luxury: r(0.6, 0.85, 1) };
  };
  const PL = costs.programs.list;
  return {
    updated: costs.updated,
    fx: costs.fx,
    perM2: Object.fromEntries(PL.map((p) => [p.key, costs.tiers[p.key] ? tiers(costs.tiers[p.key], p.kind) : spread(p.codes, p.kind)])),
    // the levels sheet: every type's value in US$ (before the town factor), Hacienda's words, the house table
    codes: Object.fromEntries(PL.flatMap((p) => p.codes.map((c) => [c, Math.round(usd(c, p.kind))]))),
    codesCrc: Object.fromEntries(PL.flatMap((p) => p.codes.map((c) => [c, [H.values[c], p.kind]]))),
    notes: JSON.parse(readFileSync(join(ROOT, 'data', 'typology-notes.json'), 'utf8')).types,
    tierCodes: { house: costs.tiers.house, hotel: costs.tiers.hotel },
    levels: JSON.parse(readFileSync(join(ROOT, 'data', 'finish-levels.json'), 'utf8')),
    method: { index: H.index, margin: H.margin, fx },
    programs: { groups: costs.programs.groups, list: PL.map(({ key, group, codes, en, es, aliases, permit, works, roof, multi }) => ({ key, group, codes, en, es, aliases, permit, works, roof, multi: !!multi, single: codes.length === 1 && !costs.tiers[key] })) },
    place: clean(costs.place),
    slope: clean(costs.slope),
    shares: clean(costs.shares),
    pool: { perM2Shell: range(X.pool.codes, 'house'), ratio: X.pool.ratio, depth: X.pool.depth },
    deck: { perM2: range(X.deck.codes, 'house') },
    solar: { ...clean(X.solar), perKwp: X.solar.perKwpCrc.map((v) => Math.round(v / fx)), perKwpCrc: undefined },
    landscape: X.landscape.usd,
    furniture: X.furniture.perM2,
    connection: clean(X.connection),
    review: clean(X.review),
    soft: clean(costs.soft),
    durations: clean(costs.durations),
    towns: towns.map((t) => {
      const d = townOf(t);
      const c = climate(d);
      // land, US$ a m²: lots for sale (middle half and median), or Hacienda's residential values where too few are listed
      const L = land?.towns[t.slug];
      const res = L?.official.residential?.map((z) => z.v / costs.fx.crcPerUsd);
      const lnd = !L || t.slug === 'papagayo' ? null : L.market ? { src: 'market', r: [L.market.p25, L.market.median, L.market.p75], n: L.market.n } : res?.length ? { src: 'official', r: [Math.min(...res), (Math.min(...res) + Math.max(...res)) / 2, Math.max(...res)].map(Math.round), y: L.edition } : null;
      return { slug: t.slug, name: t.name, region: t.region, coastal: !!t.coastal, pvout: d.pvout, dry: c.dry ? { start: c.dry.start, n: c.dry.n } : null, heavy: d.heavyDays, land: lnd };
    }),
  };
}
// `pg` (optional) makes a preset page: { paths, title, description, label, h1, intro, preset, photo, extra, ld, cls }
const EST_DEFAULT = { town: 'tamarindo', type: 'house', area: 250, storeys: 1, quality: 'high', slope: 'flat', pool: 32, deck: 40, solar: true, landscape: true, furniture: false, land: false, lot: 1000, condo: false };
function estimatorPage(lang, pg = null) {
  const E = ET[lang];
  const M = costs[lang];
  const P = { ...EST_DEFAULT, ...(pg?.preset ?? {}) };
  const paths = pg?.paths ?? { en: estimatorPath('en'), es: estimatorPath('es') };
  const up = upFrom(paths[lang]);
  const on = (k) => (P[k] ? ' checked' : '');
  // each option carries what it changes in the likely total, filled in by estimator.js
  const seg = (name, opts, checked, labels, notes) => `<div class="est__seg" role="radiogroup">${opts.map((o) => `<label class="est__opt"><input type="radio" name="${name}" value="${o}"${String(o) === String(checked) ? ' checked' : ''}><span>${esc(labels[o])}</span>${notes ? `<small>${esc(notes[o])}</small>` : ''}${name === 'cur' ? '' : '<em class="est__delta" data-delta></em>'}</label>`).join('')}</div>`;
  const kindOf = (p) => (p.typology === 'Residential' ? 'house' : ['Hospitality', 'Mixed use'].includes(p.typology) ? 'hotel' : null);
  const work = projects.filter((p) => kindOf(p) && p.builtArea);
  const ld = pg?.ld ?? { '@context': 'https://schema.org', '@type': 'WebApplication', name: E.title.split(' | ')[0], applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', inLanguage: lang, url: `${ORIGIN}/${paths[lang]}`, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, provider: { '@type': 'Organization', name: 'Studio CAVA', url: `${ORIGIN}/` } };
  const H = pg ?? E;
  const image = pg?.photo ? `assets/img/places/${pg.photo}-1600.webp` : `${imgBase('papagayo-404', 1)}-1600.webp`;
  return head(lang, { title: H.title, description: H.description, paths, image, up, script: 'estimator.js', jsonld: ld }) + `<div id="top"></div>
${bar(lang, up, paths, 'tools')}
<main class="page">
  <article class="est${pg?.cls ? ` ${pg.cls}` : ''}" data-estimator aria-labelledby="est-title">
    <header class="mf__head grid">
      <p class="label mf__label">${pg ? `<a class="ulink" href="${up}${estimatorPath(lang)}">${E.label}</a>` : E.label}</p>
      <h1 class="display mf__title" id="est-title"><span>${esc(H.h1[0])}</span><span class="right">${esc(H.h1[1])}</span></h1>
      <p class="h3 mf__intro">${esc(H.intro)}</p>
${pg ? `      <p class="svc__cta mf__intro"><a class="btn btn--dark" href="${up}${bookPath(lang)}${pg.q ?? ''}">${BK[lang].link} <span class="btn__dot" aria-hidden="true"></span></a> <a class="btn btn--light" href="${wa(pg.wa ?? UI[lang].wa.general)}" target="_blank" rel="noopener">WhatsApp ${WHATSAPP_SHOWN} <span class="btn__dot" aria-hidden="true"></span></a></p>\n` : ''}    </header>
${pg?.photo ? placePhoto(lang, up, pg.photo, { eager: true }) : ''}
    <header class="est__print-head" aria-hidden="true">
      <img src="${up}assets/mark.svg" width="40" height="40" alt="">
      <div><p class="est__print-brand">Studio CAVA</p><p class="est__print-kind">${lang === 'en' ? 'Building cost estimate' : 'Estimación de costos de construcción'}${pg ? ` · ${esc(pg.h1.join(' '))}` : ''}</p></div>
      <div class="est__print-meta"><p data-est-print-date></p><p>cava.design</p></div>
    </header>
    <noscript><p class="large est__noscript">${E.noscript}</p></noscript>
    <p class="large est__failed">${E.failed}</p>
    <div class="est__app grid">
      <form class="est__form" data-est-form data-v="${assetVer('assets/data/costs.json')}" onsubmit="return false">
        <fieldset class="est__field"><legend class="label">${E.where}</legend>
          <select class="input est__select" name="town">${towns.map((t) => `<option value="${t.slug}"${t.slug === P.town ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}<option value="other">${E.other}</option></select>
        </fieldset>
        <fieldset class="est__field est__type"><legend class="label">${E.what}</legend>
          <div class="est__combo" data-est-combo data-ph="${esc(E.typeSearch)}" data-none="${esc(E.typeNone)}">
            <select class="input est__select" name="type" aria-label="${E.what}">${Object.entries(costs.programs.groups).map(([g, n]) => `<optgroup label="${esc(n[lang])}">${costs.programs.list.filter((pr) => pr.group === g).map((pr) => `<option value="${pr.key}"${pr.key === P.type ? ' selected' : ''}>${esc(pr[lang])}</option>`).join('')}</optgroup>`).join('')}</select>
          </div>
          <p class="note" data-est-single hidden>${E.typeSingle}</p>
        </fieldset>
        <fieldset class="est__field"><legend class="label">${E.size}</legend>
          <div class="est__area"><input type="range" min="60" max="1500" step="10" value="${P.area}" data-est-area-range aria-label="${E.size}"><input class="input est__num" type="number" name="area" min="40" max="3000" step="10" value="${P.area}" data-est-area-box aria-label="${E.size}, m²"></div>
          <p class="note" data-est-area-out></p>
        </fieldset>
        <fieldset class="est__field"><legend class="label">${E.storeys}</legend>${seg('storeys', [1, 2, 3], P.storeys, { 1: '1', 2: '2', 3: '3' })}</fieldset>
        <fieldset class="est__field"><legend class="label est__legend-row"><span>${E.quality}</span><button class="est__help" type="button" data-est-levels aria-haspopup="dialog"><span aria-hidden="true">?</span>${esc(JSON.parse(readFileSync(join(ROOT, 'data', 'finish-levels.json'), 'utf8'))[lang].button)}</button></legend>${seg('quality', ['standard', 'high', 'luxury'], P.quality, E.qualities, E.qualityNotes)}</fieldset>
        <fieldset class="est__field"><legend class="label">${E.site}</legend>${seg('slope', ['flat', 'gentle', 'steep'], P.slope, E.slopes)}</fieldset>
        <fieldset class="est__field"><legend class="label">${E.pool}</legend>${seg('pool', [0, 15, 32, 50], P.pool, E.pools)}</fieldset>
        <fieldset class="est__field"><legend class="label">${E.deck}</legend>
          <div class="est__area"><input type="range" name="deck" min="0" max="300" step="10" value="${P.deck}" aria-label="${E.deck}"></div>
          <p class="note" data-est-deck-out></p>
        </fieldset>
        <fieldset class="est__field est__checks"><legend class="label">${E.extras}</legend>
          <label><input type="checkbox" name="solar"${on('solar')}> ${E.solar}<em class="est__delta" data-delta></em></label>
          <label><input type="checkbox" name="landscape"${on('landscape')}> ${E.landscape}<em class="est__delta" data-delta></em></label>
          <label><input type="checkbox" name="furniture"${on('furniture')}> ${E.furniture}<em class="est__delta" data-delta></em></label>
${land ? `          <label><input type="checkbox" name="land"${on('land')}> ${E.land}<em class="est__delta" data-delta></em></label>
          <label class="est__lot"><span>${E.lot}</span><input class="input est__num" type="number" name="lot" min="100" max="100000" step="50" value="${P.lot}" aria-label="${E.lot}"></label>
` : ''}
          <label><input type="checkbox" name="condo"${on('condo')}> ${E.condo}</label>
        </fieldset>
        <fieldset class="est__field"><legend class="label">${E.currency}</legend>${seg('cur', ['usd', 'crc'], 'usd', { usd: 'US$', crc: '₡' })}</fieldset>
      </form>
      <div class="est__panel"><div class="est__panel-in">
        <section class="est__totals" aria-labelledby="est-result" aria-live="polite">
          <h2 class="label" id="est-result">${E.resultLabel}</h2>
          <p class="note est__choices" data-est-choices></p>
          <p class="est__total" data-est-total></p>
          <dl class="est__stats">
            <div class="est__stat est__stat--likely"><dt class="label">${E.likelyL}</dt><dd data-est-likely></dd></div>
            <div class="est__stat"><dt class="label">${E.hard}</dt><dd data-est-hard></dd><dd class="est__stat-sub" data-est-rate></dd></div>
            <div class="est__stat"><dt class="label">${E.softShort}</dt><dd data-est-soft></dd></div>
            <div class="est__stat"><dt class="label">${E.allIn}</dt><dd data-est-perm2></dd><dd class="est__stat-sub" data-est-perft2></dd></div>
          </dl>
        </section>
        <figure class="est__vol" aria-labelledby="est-massing-t">
          <svg class="est__massing" data-est-massing role="img" aria-label="${E.massing}"></svg>
          <figcaption class="est__vol-cap"><span class="label" id="est-massing-t">${E.massing}</span><span class="note" data-est-massing-cap></span></figcaption>
        </figure>
      </div></div>
      <div class="est__out">
        <section class="est__block est__budget" aria-labelledby="est-budget-t">
          <h2 class="label" id="est-budget-t">${E.budget}</h2>
          <p class="note">${E.budgetNote}</p>
          <label class="est__budget-in"><span class="label" data-est-budget-cur data-usd="${E.budgetCur.usd}" data-crc="${E.budgetCur.crc}">${E.budgetCur.usd}</span><input class="input est__num" type="text" inputmode="decimal" autocomplete="off" value="600,000" data-est-budget aria-label="${E.budget.replace(/[()]/g, '')}"></label>
          <ul class="est__fits" data-est-fits></ul>
        </section>
        <section class="est__block" aria-labelledby="est-parts-t">
          <h2 class="label" id="est-parts-t">${E.parts}</h2>
          <div class="est__bar" data-est-bar></div>
          <ul class="est__list" data-est-parts></ul>
          <p class="note" data-est-solar></p>
          <p class="note" data-est-land></p>
          <h2 class="label est__sub">${E.softs}</h2>
          <ul class="est__list est__list--soft" data-est-softs></ul>
        </section>
        <section class="est__block" aria-labelledby="est-scope-t">
          <h2 class="label" id="est-scope-t">${E.scope}</h2>
          <div class="est__scope">
            <div class="est__scope-in"><h3 class="label">${E.inLabel}</h3><ul>${E.included.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
            <div class="est__scope-out"><h3 class="label">${E.outLabel}</h3><ul>${E.excluded.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
          </div>
          <p class="note">${esc(E.dated(costs.fx))}</p>
        </section>
        <section class="est__block" aria-labelledby="est-sched-t">
          <h2 class="label" id="est-sched-t">${E.schedule}</h2>
          <div class="est__gantt" data-est-gantt></div>
          <p class="est__legend label"><span class="est__key est__key--design">${lang === 'en' ? 'Design' : 'Diseño'}</span><span class="est__key est__key--permits">${lang === 'en' ? 'Permits' : 'Permisos'}</span><span class="est__key est__key--build">${lang === 'en' ? 'Construction' : 'Obra'}</span><span class="est__key est__key--dry" data-est-legend-dry>${E.dry}</span></p>
          <p class="large" data-est-schedule-note></p>
        </section>
        <section class="est__block" aria-labelledby="est-flags-t">
          <h2 class="label" id="est-flags-t">${E.flags}</h2>
          <ul class="guide__tips" data-est-flags></ul>
          <ul class="guide__links est__guides">
${land ? `            <li><a class="ulink" href="${up}${landPath(lang)}">${esc(LT[lang].name)} →</a></li>\n` : ''}${permitGuide ? `            <li><a class="ulink" href="${up}${permitPath(lang)}">${esc(PR[lang].name)} →</a></li>\n` : ''}${guides.map((g) => `            <li><a class="ulink" href="${up}${guidePath(lang, g)}">${esc(g[lang].link)} →</a></li>`).join('\n')}
          </ul>
        </section>
        <div class="est__actions">
          <a class="btn btn--dark" data-est-wa data-phone="${WHATSAPP}" href="${wa(UI[lang].wa.general)}" target="_blank" rel="noopener">${E.whatsapp} <span class="btn__dot" aria-hidden="true"></span></a>
${booking ? `          <a class="btn btn--light" data-est-book href="${up}${bookPath(lang)}">${lang === 'en' ? 'Book a free call about it' : 'Agendar una llamada gratis sobre esto'} <span class="btn__dot" aria-hidden="true"></span></a>
` : ''}          <button class="btn btn--light" type="button" data-est-copy>${E.copy}</button>
          <button class="btn btn--light" type="button" data-est-print>${E.print}</button>
        </div>
      </div>
    </div>
${pg?.extra ?? ''}    <section class="related est__work" aria-labelledby="est-work-t">
      <div class="related__head"><h2 class="label" id="est-work-t">${E.work}</h2><a class="label ulink" href="${up}${projectsPath(lang)}">${E.allWork} →</a></div>
      <ol class="cards cards--three">
${work.map((p) => `        <li class="card" data-area="${p.builtArea}" data-kind="${kindOf(p)}">
          <a class="card__link" href="${up}${projectPath(lang, p.slug)}">
            <span class="card__media">${picture(up, p.slug, 1, altOf(lang, p, 1), '(min-width: 768px) 31vw, 92vw')}</span>
            <span class="card__cap label"><span class="card__name">${esc(p.name)}</span><span class="card__meta">${esc(`${group(lang, p.builtArea)} m² · ${placeOf(lang, p)}`)}</span></span>
          </a>
        </li>`).join('\n')}
      </ol>
    </section>
    <p class="est__sticky label" aria-hidden="true"><span>${E.sticky}</span><b data-est-sticky></b></p>
    <footer class="est__print-foot" aria-hidden="true">
      <p>${lang === 'en' ? 'An estimate to start a budget, not a quote: a builder prices drawings. Reopen and change it at' : 'Una estimación para empezar un presupuesto, no una cotización: un constructor cotiza planos. Ábrala y cámbiela en'} <span data-est-print-url></span></p>
      <p>Studio CAVA · hola@cava.design · +${WHATSAPP_SHOWN.replace(/^\+/, '')} · cava.design</p>
    </footer>
${pg || !scenarios.length ? '' : `    <nav class="tw__sec grid" aria-labelledby="est-examples">
      <h2 class="label tw__label" id="est-examples">${lang === 'en' ? '(Examples)' : '(Ejemplos)'}</h2>
      <ul class="tw__aside guide__links">
${scenarios.map((sc) => `        <li><a class="ulink" href="${up}${scenarioPath(lang, sc)}">${esc(sc[lang].name)} →</a></li>`).join('\n')}
      </ul>
    </nav>
`}${pg ? '' : `    <nav class="tw__sec grid" aria-labelledby="est-towns">
      <h2 class="label tw__label" id="est-towns">${lang === 'en' ? '(By town)' : '(Por pueblo)'}</h2>
      <ul class="tw__aside guide__links est__towns">
${towns.map((t) => `        <li><a class="ulink" href="${up}${townCostPath(lang, t.slug)}">${esc(TC[lang].link(t.name))} →</a></li>`).join('\n')}
      </ul>
    </nav>
`}
  </article>
${contact(lang, pg?.wa ?? UI[lang].wa.general, up, pg?.q ?? '')}${finePrint(lang, 'est-method', E.methodTitle, M.method, costs.sources, 'est__method')}</main>
${footer(lang, up, paths)}${end}`;
}

// ---------- Photos of Costa Rica (data/places.json, scripts/places.py) ----------
const PLACES_PATH = join(ROOT, 'data', 'places.json');
const places = existsSync(PLACES_PATH) ? JSON.parse(readFileSync(PLACES_PATH, 'utf8')) : null;
// a full-width band; `eager` for the first image of a page
function placePhoto(lang, up, id, { eager = false } = {}) {
  const ph = places?.photos[id];
  if (!ph) return '';
  const base = `${up}assets/img/places/${id}`;
  return `    <figure class="place">
      <img src="${base}-1600.webp" srcset="${base}-800.webp 800w, ${base}-1600.webp 1600w" sizes="(min-width: 768px) 96vw, 100vw" width="1600" height="800" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" alt="${esc(ph[`alt_${lang}`])}">
    </figure>
`;
}

// ---------- /book/ and /es/agendar/: book a free call ----------
// site/assets/js/booking.js draws the calendar; data/booking.json says where the open times come from.
const BOOKING_PATH = join(ROOT, 'data', 'booking.json');
const booking = existsSync(BOOKING_PATH) ? JSON.parse(readFileSync(BOOKING_PATH, 'utf8')) : null;
const bookPath = (lang) => (lang === 'en' ? 'book/' : 'es/agendar/');
const BK = {
  en: {
    link: 'Book a free call', title: 'Book a free call with an architect | Studio CAVA',
    description: 'A free 30-minute video call with Studio CAVA about your property and your project in Costa Rica: what the rules allow, what it could cost and how long it takes. Pick a time that suits you.',
    label: '(Free call)', h1: ['Book a', 'free call'],
    intro: 'Thirty minutes by video, free, with the architect who would design your project: your property, what the rules allow, what it could cost and how long it takes.',
    callTitle: (m) => `Free ${m}-minute call`, callText: 'Bring the location of the lot and what you have in mind. We come having looked at the place.',
    minutes: (m) => `${m} min`, video: 'Video call, link by email', prev: 'Previous month', next: 'Next month',
    name: 'Your name', email: 'Email', phone: 'WhatsApp, with country code', optional: 'optional',
    where: 'Where is the project?', other: 'Elsewhere in Costa Rica', unsure: 'Not sure yet',
    what: 'What do you want to build?', whats: { house: 'House', villa: 'Villa to rent', hotel: 'Small hotel', remodel: 'Remodel', unsure: 'Not sure yet' },
    lot: 'The lot', lots: { have: 'I have it', buying: 'I am buying it', looking: 'Still looking' },
    budget: 'Budget for the works', budgets: ['Not sure yet', 'Under US$300,000', 'US$300,000 to 600,000', 'US$600,000 to 1 million', 'Over US$1 million'],
    notes: 'Anything we should look at before the call?', notesHint: 'A link to the lot, its cadastral plan number, references you like.',
    legalLive: 'By confirming you agree to the terms and privacy policy of Cal.com, which handles the booking.', legalReq: 'We use your details only to confirm and prepare the call.',
    back: 'Back', confirm: 'Confirm', confirmReq: 'Send by WhatsApp',
    cover: '(What we cover)', covers: ['Your property: what the land use, the setbacks, the water and the slope allow', 'What it could cost and how long it takes, with our estimator', 'How we work, our fees and the next step'],
    helps: '(What helps)', helpsList: ['The location of the lot, or its cadastral plan', 'Photos of the lot and of houses you like', 'A budget range and when you would like to move in'],
  },
  es: {
    link: 'Agende una llamada gratis', title: 'Agende una llamada gratis con un arquitecto | Studio CAVA',
    description: 'Una videollamada gratis de 30 minutos con Studio CAVA sobre su propiedad y su proyecto en Costa Rica: qué permiten las reglas, cuánto podría costar y cuánto tarda. Elija la hora que le sirva.',
    label: '(Llamada gratis)', h1: ['Agende una', 'llamada gratis'],
    intro: 'Treinta minutos por video, gratis, con el arquitecto que diseñaría su proyecto: su propiedad, qué permiten las reglas, cuánto podría costar y cuánto tarda.',
    callTitle: (m) => `Llamada gratis de ${m} minutos`, callText: 'Traiga la ubicación del lote y lo que tiene en mente. Llegamos habiendo visto el lugar.',
    minutes: (m) => `${m} min`, video: 'Videollamada, el enlace llega por correo', prev: 'Mes anterior', next: 'Mes siguiente',
    name: 'Su nombre', email: 'Correo', phone: 'WhatsApp, con código de país', optional: 'opcional',
    where: '¿Dónde es el proyecto?', other: 'En otro lugar de Costa Rica', unsure: 'Todavía no sé',
    what: '¿Qué quiere construir?', whats: { house: 'Casa', villa: 'Villa de alquiler', hotel: 'Hotel pequeño', remodel: 'Remodelación', unsure: 'Todavía no sé' },
    lot: 'El lote', lots: { have: 'Ya lo tengo', buying: 'Lo estoy comprando', looking: 'Todavía busco' },
    budget: 'Presupuesto de la obra', budgets: ['Todavía no sé', 'Menos de US$300,000', 'US$300,000 a 600,000', 'US$600,000 a 1 millón', 'Más de US$1 millón'],
    notes: '¿Algo que debamos revisar antes de la llamada?', notesHint: 'Un enlace al lote, el número de plano catastrado, referencias que le gusten.',
    legalLive: 'Al confirmar acepta los términos y la política de privacidad de Cal.com, que gestiona la reserva.', legalReq: 'Usamos sus datos solo para confirmar y preparar la llamada.',
    back: 'Atrás', confirm: 'Confirmar', confirmReq: 'Enviar por WhatsApp',
    cover: '(De qué hablamos)', covers: ['Su propiedad: lo que permiten el uso de suelo, los retiros, el agua y la pendiente', 'Cuánto podría costar y cuánto tarda, con nuestro estimador', 'Cómo trabajamos, nuestros honorarios y el siguiente paso'],
    helps: '(Lo que ayuda)', helpsList: ['La ubicación del lote, o su plano catastrado', 'Fotos del lote y de casas que le gusten', 'Un rango de presupuesto y cuándo quisiera mudarse'],
  },
};
const ZONES = ['America/Costa_Rica', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'America/Vancouver', 'America/Mexico_City', 'America/Bogota', 'Europe/London', 'Europe/Madrid', 'Europe/Paris', 'Europe/Berlin', 'Europe/Zurich', 'Europe/Amsterdam'];
const ICON = {
  clock: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M10 5.5V10l3 2"/></svg>',
  video: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="5.5" width="10.5" height="9" rx="1.5"/><path d="M13 9l4.5-2.5v7L13 11"/></svg>',
  globe: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M2.5 10h15M10 2.5c2.2 2.3 2.2 12.7 0 15M10 2.5c-2.2 2.3-2.2 12.7 0 15"/></svg>',
  cal: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4.5" width="14" height="12.5" rx="1.5"/><path d="M3 8.5h14M7 2.5v4M13 2.5v4"/></svg>',
};
function bookPage(lang) {
  const B = BK[lang];
  const paths = { en: bookPath('en'), es: bookPath('es') };
  const up = upFrom(paths[lang]);
  const b = booking;
  const live = !!b.username;
  const seg = (name, opts) => `<div class="est__seg bk__seg" role="radiogroup">${Object.entries(opts).map(([v, l]) => `<label class="est__opt"><input type="radio" name="${name}" value="${v}"><span>${esc(l)}</span></label>`).join('')}</div>`;
  const ld = { '@context': 'https://schema.org', '@type': 'WebPage', name: B.title.split(' | ')[0], description: B.description, inLanguage: lang, url: `${ORIGIN}/${paths[lang]}`, potentialAction: { '@type': 'ReserveAction', name: B.link } };
  return head(lang, { title: B.title, description: B.description, paths, image: `${imgBase('casa-alcaravan', 1)}-1600.webp`, up, script: 'booking.js', jsonld: ld }) + `<div id="top"></div>
${bar(lang, up, paths, 'book')}
<main class="page">
  <article class="mf bkp" aria-labelledby="bk-title">
    <header class="mf__head grid">
      <p class="label mf__label">${B.label}</p>
      <h1 class="display mf__title" id="bk-title"><span>${esc(B.h1[0])}</span><span class="right">${esc(B.h1[1])}</span></h1>
      <p class="h3 mf__intro">${esc(B.intro)}</p>
    </header>
    <div class="bk" data-booking data-username="${esc(b.username)}" data-event="${esc(b.event)}" data-duration="${b.duration}" data-days="${b.days.join(',')}" data-from="${b.from}" data-to="${b.to}" data-notice="${b.noticeHours}" data-weeks="${b.weeks}" data-phone="${WHATSAPP}" data-live="${live ? '1' : '0'}">
      <aside class="bk__info">
        <img class="bk__mark" src="${up}assets/mark.svg" width="36" height="36" alt="">
        <p class="label bk__who">Studio CAVA</p>
        <h2 class="bk__title">${esc(B.callTitle(b.duration))}</h2>
        <p class="bk__text">${esc(B.callText)}</p>
        <ul class="bk__facts">
          <li class="bk__picked">${ICON.cal}<span><span data-bk-when></span></span></li>
          <li>${ICON.clock}<span>${B.minutes(b.duration)}</span></li>
          <li>${ICON.video}<span>${B.video}</span></li>
          <li class="bk__tzrow">${ICON.globe}<label class="bk__tz"><span class="sr-only">Time zone</span><select data-bk-tz>${ZONES.map((z) => `<option value="${z}">${z.replace(/_/g, ' ')}</option>`).join('')}</select></label></li>
          <li class="bk__picked bk__picked-tz"><span></span><span data-bk-when-tz></span></li>
        </ul>
      </aside>
      <section class="bk__cal" aria-label="${lang === 'en' ? 'Days' : 'Días'}">
        <div class="bk__cal-head"><p class="bk__month" data-bk-month></p><div class="bk__nav"><button type="button" data-bk-prev aria-label="${B.prev}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg></button><button type="button" data-bk-next aria-label="${B.next}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></button></div></div>
        <div class="bk__grid" data-bk-days></div>
        <p class="note bk__status" data-bk-status aria-live="polite"></p>
      </section>
      <section class="bk__times" aria-label="${lang === 'en' ? 'Times' : 'Horas'}">
        <div class="bk__times-head"><p class="bk__day" data-bk-day></p><div class="cmap__seg bk__h24" role="group" aria-label="${lang === 'en' ? 'Clock' : 'Formato'}"><button type="button" data-h24="0" aria-pressed="true">12 h</button><button type="button" data-h24="1" aria-pressed="false">24 h</button></div></div>
        <ul class="bk__list" data-bk-times></ul>
      </section>
      <form class="bk__form" data-bk-form novalidate>
        <p class="bk__form-title label bk__wide">${lang === 'en' ? '(Your details)' : '(Sus datos)'}</p>
        <label class="bk__field"><span class="label">${B.name} *</span><input class="input" name="name" autocomplete="name" required></label>
        <label class="bk__field"><span class="label">${B.email} *</span><input class="input" type="email" name="email" autocomplete="email" required></label>
        <label class="bk__field"><span class="label">${B.phone} <i>(${B.optional})</i></span><input class="input" type="tel" name="phone" autocomplete="tel" placeholder="+1 555 123 4567"></label>
        <label class="bk__field"><span class="label">${B.where}</span><select class="input" name="where"><option value="unsure">${B.unsure}</option>${towns.map((t) => `<option value="${t.slug}">${esc(t.name)}</option>`).join('')}<option value="other">${B.other}</option></select></label>
        <fieldset class="bk__field bk__wide"><legend class="label">${B.what}</legend>${seg('what', B.whats)}</fieldset>
        <fieldset class="bk__field"><legend class="label">${B.lot}</legend>${seg('lot', B.lots)}</fieldset>
        <label class="bk__field"><span class="label">${B.budget} <i>(${B.optional})</i></span><select class="input" name="budget">${B.budgets.map((x, i) => `<option value="${i}">${esc(x)}</option>`).join('')}</select></label>
        <label class="bk__field bk__wide"><span class="label">${B.notes} <i>(${B.optional})</i></span><textarea class="input" name="notes" rows="2" placeholder="${esc(B.notesHint)}"></textarea></label>
        <input type="hidden" name="est">
        <p class="note bk__legal bk__wide">${live ? B.legalLive : B.legalReq}</p>
        <p class="bk__error bk__wide" data-bk-error role="alert"></p>
        <div class="bk__actions bk__wide"><button class="btn btn--light" type="button" data-bk-back>${B.back}</button><button class="btn btn--dark" type="submit">${live ? B.confirm : B.confirmReq} <span class="btn__dot" aria-hidden="true"></span></button></div>
      </form>
      <section class="bk__done" aria-live="polite">
        <h3 class="bk__done-title" data-bk-done-title></h3>
        <p class="large" data-bk-done-when></p>
        <p class="large bk__done-text" data-bk-done-text></p>
        <button class="btn btn--light" type="button" data-bk-again>${lang === 'en' ? 'Book another time' : 'Agendar otra hora'}</button>
      </section>
    </div>
    <section class="tw__sec grid" aria-labelledby="bk-cover">
      <h2 class="label tw__label" id="bk-cover">${B.cover}</h2>
      <ul class="svc__for">${B.covers.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </section>
    <section class="tw__sec grid" aria-labelledby="bk-helps">
      <h2 class="label tw__label" id="bk-helps">${B.helps}</h2>
      <ul class="svc__for">${B.helpsList.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </section>
  </article>
</main>
${footer(lang, up, paths)}${end}`;
}

// ---------- /services/ and /es/servicios/: one page per service ----------
// Text lives in data/services.json; "[@key]" cites a shared source, numbered per page in order of use.
const SERVICES_PATH = join(ROOT, 'data', 'services.json');
const svcData = existsSync(SERVICES_PATH) ? JSON.parse(readFileSync(SERVICES_PATH, 'utf8')) : null;
const services = svcData?.services ?? [];
const servicesPath = (lang) => (lang === 'en' ? 'services/' : 'es/servicios/');
const servicePath = (lang, s) => `${servicesPath(lang)}${s.slug[lang]}/`;
const SVT = {
  en: {
    link: 'Services', label: '(Services)', service: '(Service)', h1: ['Our', 'services'],
    title: 'Architecture services in Costa Rica | Studio CAVA',
    description: 'What we do, from the study of a lot before you buy it to supervising the works: what each service includes, what you receive, how long it takes and how it is charged.',
    intro: 'From the study of a lot before you buy it to the last visit to the works: what each service includes, what you receive, how long it takes and how it is charged.',
    order: '(In order)', orderText: 'A project usually takes them in this order: a study of the lot before buying, the design with its interiors, the permits, and supervision while it is built. Each one can also be hired on its own.',
    glance: '(At a glance)', for: '(Who it is for)', how: '(How it runs)', get: 'You receive', fees: '(Fees)', not: '(Not included)',
    work: '(Projects)', all: 'All projects', faq: '(Questions)', others: '(Other services)', sources: '(Sources)',
    estimator: 'What it comes to for your project, in our cost estimator', guide: 'Every step of the permit, with its rules, in our guide',
    talk: 'Talk to us on WhatsApp', start: 'Start a project', wa: (n) => `Hi Studio CAVA, I would like to talk about ${n.toLowerCase()}.`, more: 'More',
  },
  es: {
    link: 'Servicios', label: '(Servicios)', service: '(Servicio)', h1: ['Nuestros', 'servicios'],
    title: 'Servicios de arquitectura en Costa Rica | Studio CAVA',
    description: 'Lo que hacemos, del estudio de un lote antes de comprarlo a la dirección de la obra: qué incluye cada servicio, qué recibe, cuánto tarda y cómo se cobra.',
    intro: 'Del estudio de un lote antes de comprarlo a la última visita a la obra: qué incluye cada servicio, qué recibe, cuánto tarda y cómo se cobra.',
    order: '(En orden)', orderText: 'Un proyecto suele pasar por ellos en este orden: el estudio del lote antes de comprar, el diseño con sus interiores, los permisos y la dirección mientras se construye. Cada uno también se puede contratar por separado.',
    glance: '(En resumen)', for: '(Para quién)', how: '(Cómo funciona)', get: 'Recibe', fees: '(Honorarios)', not: '(No incluye)',
    work: '(Proyectos)', all: 'Todos los proyectos', faq: '(Preguntas)', others: '(Otros servicios)', sources: '(Fuentes)',
    estimator: 'Cuánto da para su proyecto, en nuestro estimador de costos', guide: 'Cada paso del permiso, con sus reglas, en nuestra guía',
    talk: 'Escríbanos por WhatsApp', start: 'Empezar un proyecto', wa: (n) => `Hola Studio CAVA, quisiera conversar sobre ${n.toLowerCase()}.`, more: 'Ver más',
  },
};
// "[@a, @b]" -> "[1, 2]", numbering each source the first time a page cites it
function citer() {
  const order = [];
  const num = (txt) => txt.replace(/\[(@[a-z0-9]+(?:,\s*@[a-z0-9]+)*)\]/g, (m, ks) => `[${ks.split(/,\s*/).map((k) => { const key = k.slice(1); if (!svcData.sources[key]) throw new Error(`services.json: unknown source ${key}`); if (!order.includes(key)) order.push(key); return order.indexOf(key) + 1; }).join(', ')}]`);
  return { order, c: (txt) => cite(num(txt)) };
}
const plain = (txt) => txt.replace(/\s*\[@[^\]]+\]/g, '');
// the home's list of services, between <!-- services --> markers; `up` is the path from that home to site/
function servicesHome(lang, up, dir) {
  const S = SVT[lang];
  return `<!-- services -->
  <section class="svc-home grid" id="services" aria-labelledby="svc-home-title">
    <span class="label svc-home__label" id="svc-home-title">${S.label}</span>
    <ol class="svc-home__list">
${services.map((s, i) => { const T = s[lang]; return `      <li><a class="svc-home__row" href="${dir}${s.slug[lang]}/"><span class="label">(${pad(i + 1)})</span><span class="svc-home__name">${esc(T.name)}</span><span class="svc-home__card">${esc(T.card)}</span><span class="svc-home__meta label">${esc(T.time)} · ${esc(T.fee)}</span><span class="svc-home__go" aria-hidden="true">→</span></a></li>`; }).join('\n')}
    </ol>
  </section>
  <!-- /services -->`;
}
function servicesIndex(lang) {
  const S = SVT[lang];
  const paths = { en: servicesPath('en'), es: servicesPath('es') };
  const up = upFrom(paths[lang]);
  const cards = `      <ol class="cards cards--three svc__cards">
${services.map((s, i) => { const T = s[lang]; const [slug, n] = s.image.split('/'); const pic = serviceImages(s.slug.en)[0]; return `        <li class="card">
          <a class="card__link" href="${s.slug[lang]}/">
            <span class="card__media">${pic ? procImg(lang, up, pic, '(min-width: 768px) 31vw, 92vw') : picture(up, slug, +n, altOf(lang, projects.find((p) => p.slug === slug), +n), '(min-width: 768px) 31vw, 92vw')}</span>
            <span class="card__cap label"><span>(${pad(i + 1)})</span><span class="card__name">${esc(T.name)}</span><span class="card__meta">${esc(T.time)}</span></span>
            <span class="svc__card-text">${esc(T.card)}</span>
            <span class="svc__card-fee label">${esc(T.fee)}</span>
          </a>
        </li>`; }).join('\n')}
      </ol>`;
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: S.title.split(' | ')[0], itemListElement: services.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: `${ORIGIN}/${servicePath(lang, s)}`, name: s[lang].name })) };
  return head(lang, { title: S.title, description: S.description, paths, image: `${imgBase('casa-alcaravan', 1)}-1600.webp`, up, jsonld: ld }) + `<div id="top"></div>
${bar(lang, up, paths, 'services')}
<main class="page">
  <article class="mf svc" aria-labelledby="svc-title">
    <header class="mf__head grid">
      <p class="label mf__label">${S.label}</p>
      <h1 class="display mf__title" id="svc-title"><span>${esc(S.h1[0])}</span><span class="right">${esc(S.h1[1])}</span></h1>
      <p class="h3 mf__intro">${esc(S.intro)}</p>
    </header>
${cards}
    <section class="tw__sec grid" aria-labelledby="svc-order">
      <h2 class="label tw__label" id="svc-order">${S.order}</h2>
      <p class="h3 tw__text">${esc(S.orderText)}</p>
    </section>
  </article>
${contact(lang, UI[lang].wa.general, up)}</main>
${footer(lang, up, paths)}${waButton(lang, UI[lang].wa.general)}${end}`;
}
function servicePage(lang, s, i) {
  const S = SVT[lang];
  const T = s[lang];
  const paths = { en: servicePath('en', s), es: servicePath('es', s) };
  const up = upFrom(paths[lang]);
  const { order, c } = citer();
  const work = s.projects.map((slug) => projects.find((p) => p.slug === slug)).filter(Boolean);
  const body = `    <header class="mf__head grid">
      <p class="label mf__label"><a class="ulink" href="${up}${servicesPath(lang)}">${S.label}</a> (${pad(i + 1)})</p>
      <h1 class="display mf__title" id="svc-title"><span>${esc(T.h1[0])}</span><span class="right">${esc(T.h1[1])}</span></h1>
      <p class="h3 mf__intro">${esc(T.lead)}</p>
      <p class="svc__cta mf__intro"><a class="btn btn--dark" href="${wa(S.wa(T.name))}" target="_blank" rel="noopener">${S.talk} <span class="btn__dot" aria-hidden="true"></span></a> ${booking ? `<a class="btn btn--light" href="${up}${bookPath(lang)}">${BK[lang].link} <span class="btn__dot" aria-hidden="true"></span></a>` : `<a class="btn btn--light" href="${up}${UI[lang].dir}#enquiry">${S.start} <span class="btn__dot" aria-hidden="true"></span></a>`}</p>
    </header>
${serviceImages(s.slug.en).length ? `    <section class="svc__pics" aria-label="${lang === 'en' ? 'Images' : 'Imágenes'}">
      ${procStrip(lang, up, serviceImages(s.slug.en))}
    </section>
` : ''}    <section class="tw__sec grid" aria-labelledby="svc-glance">
      <h2 class="label tw__label" id="svc-glance">${S.glance}</h2>
      <dl class="svc__glance">
${T.glance.map(([k, v]) => `        <div><dt class="label">${esc(k)}</dt><dd>${c(v)}</dd></div>`).join('\n')}
      </dl>
    </section>
    <section class="tw__sec grid" aria-labelledby="svc-for">
      <h2 class="label tw__label" id="svc-for">${S.for}</h2>
      <ul class="svc__for">
${T.for.map((x) => `        <li>${esc(x)}</li>`).join('\n')}
      </ul>
    </section>
${s.strategies?.length ? `    <section class="tw__sec grid" aria-labelledby="svc-strat">
      <h2 class="label tw__label" id="svc-strat">${lang === 'en' ? '(Strategies)' : '(Estrategias)'}</h2>
      <ol class="strats">
${s.strategies.map((st, k) => {
    const X = st[lang];
    const img = st.image.startsWith('proc:') ? procImg(lang, up, st.image.slice(5), '(min-width: 768px) 32vw, 92vw') : (() => { const [sl, n] = st.image.split('/'); const pr = projects.find((o) => o.slug === sl); return picture(up, sl, +n, altOf(lang, pr, +n), '(min-width: 768px) 32vw, 92vw'); })();
    const cap = X.cap ?? projects.find((o) => o.slug === st.image.split('/')[0])?.name ?? '';
    const link = st.link === 'towns' ? `<a class="ulink strat__link" href="${up}${townsPath(lang)}">${lang === 'en' ? 'The climate of each town we work in' : 'El clima de cada pueblo donde trabajamos'} →</a>` : '';
    return `        <li class="strat">
          <figure class="strat__fig">${img}<figcaption class="label strat__cap">${esc(cap)}</figcaption></figure>
          <p class="label strat__n">(${pad(k + 1)}) ${esc(X.kicker)}</p>
          <h3 class="strat__name">${esc(X.name)}</h3>
          <p class="strat__text">${c(X.text)}</p>
          <ul class="strat__items">${X.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>
          ${link}
        </li>`;
  }).join('\n')}
      </ol>
    </section>
` : ''}${s.certs?.length ? `    <section class="tw__sec grid" aria-labelledby="svc-certs">
      <h2 class="label tw__label" id="svc-certs">${lang === 'en' ? '(Certification)' : '(Certificación)'}</h2>
      <ul class="certs">
${s.certs.map((ce) => { const X = ce[lang]; return `        <li class="cert">
          <p class="label cert__kicker">${esc(X.kicker)}</p>
          <h3 class="cert__name">${esc(X.name)}</h3>
          <p class="cert__text">${c(X.text)}</p>
          <dl class="cert__facts">${X.facts.map(([k, v]) => `<div><dt class="label">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        </li>`; }).join('\n')}
      </ul>
    </section>
` : ''}    <section class="tw__sec grid" aria-labelledby="svc-how">
      <h2 class="label tw__label" id="svc-how">${S.how}</h2>
      <ol class="svc__phases">
${T.phases.map((ph, k) => `        <li class="svc__phase">
          <div class="svc__ph-head"><span class="label">(${pad(k + 1)})</span><h3>${esc(ph.name)}</h3><span class="label svc__time">${esc(ph.time)}</span></div>
          ${ph.cfia ? `<p class="svc__cfia label">CFIA: ${esc(ph.cfia)}</p>\n          ` : ''}<p class="large">${c(ph.do)}</p>
          <p class="label svc__get-label">${S.get}</p>
          <ul class="svc__get">${ph.get.map((g) => `<li>${c(g)}</li>`).join('')}</ul>
        </li>`).join('\n')}
      </ol>
    </section>
    <section class="tw__sec grid" aria-labelledby="svc-fees">
      <h2 class="label tw__label" id="svc-fees">${S.fees}</h2>
      <div class="tw__text guide__body">
${T.fees.map((x) => `        <p class="large">${c(x)}</p>`).join('\n')}
        <ul class="guide__links">
${costs ? `          <li><a class="ulink" href="${up}${estimatorPath(lang)}">${S.estimator} →</a></li>\n` : ''}${T.guide && permitGuide ? `          <li><a class="ulink" href="${up}${permitPath(lang)}">${esc(PR[lang].name)} →</a></li>\n          <li><a class="ulink" href="${up}${guidePath(lang, permitGuide)}">${S.guide} →</a></li>\n` : ''}        </ul>
      </div>
    </section>
    <section class="tw__sec grid" aria-labelledby="svc-not">
      <h2 class="label tw__label" id="svc-not">${S.not}</h2>
      <ul class="svc__for svc__not">
${T.not.map((x) => `        <li>${c(x)}</li>`).join('\n')}
      </ul>
    </section>
    <section class="tw__sec grid" aria-labelledby="svc-faq">
      <h2 class="label tw__label" id="svc-faq">${S.faq}</h2>
      <div class="faq">
${T.faq.map(([q, a]) => faqItem(q, c(a))).join('\n')}
      </div>
    </section>
`;
  const sources = order.length ? `    <section class="tw__sec grid" aria-labelledby="svc-sources">
      <h2 class="label tw__label" id="svc-sources">${S.sources}</h2>
      <ol class="guide__sources">
${order.map((k, n) => sourceItem(lang, svcData.sources[k], n, '        ')).join('\n')}
      </ol>
    </section>
` : '';
  const others = `    <nav class="tw__sec grid" aria-labelledby="svc-others">
      <h2 class="label tw__label" id="svc-others">${S.others}</h2>
      <ul class="tw__aside guide__links">
${services.filter((o) => o !== s).map((o) => `        <li><a class="ulink" href="${up}${servicePath(lang, o)}">${esc(o[lang].name)} →</a></li>`).join('\n')}
      </ul>
    </nav>
`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Service', name: T.name, serviceType: T.name, description: T.description, url: `${ORIGIN}/${paths[lang]}`, inLanguage: lang, areaServed: { '@type': 'Country', name: 'Costa Rica' }, provider: { '@type': 'ProfessionalService', name: 'Studio CAVA', url: `${ORIGIN}/`, telephone: WHATSAPP_SHOWN, email: EMAIL, address: { '@type': 'PostalAddress', addressLocality: 'San José', addressCountry: 'CR' } } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Studio CAVA', item: `${ORIGIN}/${UI[lang].dir}` }, { '@type': 'ListItem', position: 2, name: S.link, item: `${ORIGIN}/${servicesPath(lang)}` }, { '@type': 'ListItem', position: 3, name: T.name, item: `${ORIGIN}/${paths[lang]}` }] },
      { '@type': 'FAQPage', mainEntity: T.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: plain(a) } })) },
    ],
  };
  const [slug, n] = s.image.split('/');
  return head(lang, { title: T.title, description: T.description, paths, image: `${imgBase(slug, +n)}-1600.webp`, up, jsonld: ld }) + `<div id="top"></div>
${bar(lang, up, paths, 'services')}
<main class="page">
  <article class="mf svc" aria-labelledby="svc-title">
${body}${work.length ? `    <section class="related svc__work" aria-labelledby="svc-work">
      <div class="related__head"><h2 class="label" id="svc-work">${S.work}</h2><a class="label ulink" href="${up}${projectsPath(lang)}">${S.all} →</a></div>
${projectCards(lang, up, work.map((p) => ({ p, meta: placeOf(lang, p) })))}    </section>
` : ''}${others}${sources}  </article>
${contact(lang, S.wa(T.name), up)}</main>
${footer(lang, up, paths)}${waButton(lang, S.wa(T.name))}${end}`;
}

// ---------- /tools/land-prices/ and /es/herramientas/precios-de-terrenos/ ----------
// The map reads site/assets/data/land.pmtiles (scripts/land-fetch.mjs); the town table reads data/land/towns.json.
const LAND_PATH = join(ROOT, 'data', 'land', 'towns.json');
const land = existsSync(LAND_PATH) ? JSON.parse(readFileSync(LAND_PATH, 'utf8')) : null;
const landEditions = land ? JSON.parse(readFileSync(join(ROOT, 'data', 'land', 'editions.json'), 'utf8')) : null;
const landPath = (lang) => (lang === 'en' ? 'tools/land-prices/' : 'es/herramientas/precios-de-terrenos/');
const LT = {
  en: {
    title: 'Land prices in Costa Rica by zone | Studio CAVA',
    description: 'The official land value of every zone in Costa Rica on one map, from the Ministry of Finance, next to what lots ask in 18 towns. In colones and dollars, with the year of each edition.',
    label: '(Map)', h1: ['Land', 'prices'], link: 'Land prices', name: 'Land prices by zone', town: (n) => `Land prices in ${n}`,
    intro: 'What land is worth per square metre in every zone of Costa Rica, by the official values the Ministry of Finance sets for the property tax, and what lots ask today in the towns where we work.',
    go: 'Go to', all: 'All of Costa Rica', show: 'Show in', legend: 'Official value per m²',
    caption: 'Official value per m² of each homogeneous zone, as the Ministry of Finance publishes it, each canton on its own edition. Tap a zone for its value, the lot it is set for and its year. Source: Órgano de Normalización Técnica, Ministerio de Hacienda.',
    aria: 'Map of land values per zone in Costa Rica',
    table: '(Town by town)', cols: ['Town', 'Centre', 'Residential', 'Beach', 'Edition', 'Lots for sale, asking'],
    tableNote: 'Official values in colones per m², as Hacienda sets them, and in dollars at ₡457.80. Lots for sale: the median asking price per m² of titled residential lots of 300 to 5,000 m², the middle half of them and how many, seen on 7 October 2026.',
    map: 'Map', lots: (n) => `${n} lots`, few: 'few listings', none: 'Too few listings', zmt: 'ZMT',
    method: '(How to read it)', methodTitle: 'Where the numbers come from',
    more: '(Related)', estimator: 'What it costs to build',
  },
  es: {
    title: 'Precio del terreno en Costa Rica por zona | Studio CAVA',
    description: 'El valor oficial del terreno de cada zona de Costa Rica en un mapa, del Ministerio de Hacienda, junto a lo que piden por un lote en 18 pueblos. En colones y dólares, con el año de cada edición.',
    label: '(Mapa)', h1: ['Precio', 'del terreno'], link: 'Precio del terreno', name: 'Precio del terreno por zona', town: (n) => `Precio del terreno en ${n}`,
    intro: 'Cuánto vale el metro cuadrado de terreno en cada zona de Costa Rica, según los valores oficiales que fija Hacienda para el impuesto de bienes inmuebles, y cuánto piden hoy por un lote en los pueblos donde trabajamos.',
    go: 'Ir a', all: 'Todo Costa Rica', show: 'Mostrar en', legend: 'Valor oficial por m²',
    caption: 'Valor oficial por m² de cada zona homogénea, tal como lo publica el Ministerio de Hacienda, cada cantón con su propia edición. Toque una zona para ver su valor, el lote para el que está fijado y su año. Fuente: Órgano de Normalización Técnica, Ministerio de Hacienda.',
    aria: 'Mapa de valores del terreno por zona en Costa Rica',
    table: '(Pueblo por pueblo)', cols: ['Pueblo', 'Centro', 'Residencial', 'Playa', 'Edición', 'Lotes en venta, precio pedido'],
    tableNote: 'Valores oficiales en colones por m², como los fija Hacienda, y en dólares a ₡457.80. Lotes en venta: la mediana del precio pedido por m² de lotes residenciales titulados de 300 a 5,000 m², la mitad central y cuántos, vistos el 7 de octubre de 2026.',
    map: 'Mapa', lots: (n) => `${n} lotes`, few: 'pocos anuncios', none: 'Muy pocos anuncios', zmt: 'ZMT',
    method: '(Cómo leerlo)', methodTitle: 'De dónde salen los números',
    more: '(Relacionado)', estimator: 'Cuánto cuesta construir',
  },
};
const LAND_SOURCES = [
  { title: 'Plataformas de valores de terrenos por zonas homogéneas (servicio de mapas)', publisher: 'Ministerio de Hacienda, Órgano de Normalización Técnica', url: 'https://sig.hacienda.go.cr/server/rest/services/Zonas_Homogeneas_ONT/MapServer', date: 'downloaded 7 October 2026', date_es: 'descargado el 7 de octubre de 2026' },
  { title: 'Plataformas de valores de terrenos por zonas homogéneas: ediciones por cantón', publisher: 'Ministerio de Hacienda', url: 'https://www.hacienda.go.cr/docs/PlataformasDeValoresDeTerrenosPorZonasHomogeneas.pdf', date: '15 June 2026', date_es: '15 de junio de 2026' },
  { title: 'Tipo de cambio de referencia', publisher: 'Banco Central de Costa Rica', url: 'https://gee.bccr.fi.cr/indicadoreseconomicos/Cuadros/frmVerCatCuadro.aspx?idioma=1&CodCuadro=%20400', date: '7 October 2026', date_es: '7 de octubre de 2026' },
  { title: 'Referencias de valor de terreno (servicio de mapas)', publisher: 'Ministerio de Hacienda, Órgano de Normalización Técnica', url: 'https://sig.hacienda.go.cr/server/rest/services/Referencias_Valor_terreno/MapServer', date: 'downloaded 7 October 2026', date_es: 'descargado el 7 de octubre de 2026' },
  { title: 'Ley 7509, Ley de Impuesto sobre Bienes Inmuebles', publisher: 'SINALEVI', url: 'https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=26598&param2=148757&param3=1', date: '1995' },
  { title: 'Reglamento a la Ley sobre la Zona Marítimo Terrestre (Decreto 7841-P), artículos 49 y 50', publisher: 'SINALEVI', url: 'https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=18579&param2=93916&param3=1', date: '2013' },
  { title: 'ICT, acuerdo SJD-196-2022: base del canon en el Polo Turístico Golfo de Papagayo', publisher: 'La Gaceta 158', url: 'https://www.pgr.go.cr/wp-content/uploads/2025/12/RG-220822.pdf', date: '22 August 2022', date_es: '22 de agosto de 2022' },
  { title: 'Lots for sale, the sample behind the market column', title_es: 'Lotes en venta, la muestra detrás de la columna de mercado', publisher: 'Studio CAVA', url: 'https://github.com/EmptyFluffy/cava-design/blob/main/data/land/market-sample.csv', date: '7 October 2026', date_es: '7 de octubre de 2026' },
];
const LAND_METHOD = {
  en: [
    'Every municipality in Costa Rica is split into homogeneous zones, and the Ministry of Finance sets an official value per square metre for each, for a typical lot of that zone [1]. These are the values the property tax starts from, and each municipality makes them law by publishing them in La Gaceta [2, 5]. The map shows them as they are published, 8,750 zones in 82 cantons, with dollars at ₡457.80 [3].',
    'Each canton is on its own edition. Santa Cruz, Carrillo, Liberia, Nicoya and Santa Ana are on 2025 and Escazú on 2024, but Cóbano (Santa Teresa), Garabito (Jacó) and Osa (Dominical and Uvita) are still on 2018, Talamanca on 2020 and Atenas on 2016 [2]. When an edition is made, its values sit close to the sales Hacienda samples in the same zones [4]; the gap with today\'s market grows with the age of the edition. The 2025 edition put the centre of Tamarindo 70% above 2017.',
    'A zone\'s value is for the lot it describes: in the centre of Tamarindo, 800 m² with 20 m of street front. A larger lot is worth less per m², and a corner, a view or a short walk to the beach more. Mixed zones carry a second value, and their rural part a much lower one for large parcels.',
    'Within 200 m of the high-tide line the land is not sold. The municipality grants a concession and charges a yearly fee on an appraisal, up to 3% for a home and 4% for tourism [6]; the map still shows Hacienda\'s value there. In the Papagayo tourism pole the ICT sets the base itself, US$3.39 a m² until July 2027 [7].',
    'The last column is what sellers ask, not what lots sell for: 1,303 titled lots listed on public sites on 7 October 2026, counted only between 300 and 5,000 m², without concessions, farms or commercial lots [8]. A town needs five lots to get a number, and fewer than ten are marked. Asking prices run above closing prices.',
    'None of this is an appraisal. A lot is worth what a valuation of that lot says, and before buying it is worth asking for one, along with the registry study of the property and the zoning certificate.',
  ],
  es: [
    'Cada municipalidad de Costa Rica está dividida en zonas homogéneas, y el Ministerio de Hacienda fija para cada una un valor oficial por metro cuadrado, para un lote típico de esa zona [1]. Son los valores de los que parte el impuesto de bienes inmuebles, y cada municipalidad los vuelve oficiales al publicarlos en La Gaceta [2, 5]. El mapa los muestra tal como se publican, 8,750 zonas en 82 cantones, con los dólares a ₡457.80 [3].',
    'Cada cantón tiene su propia edición. Santa Cruz, Carrillo, Liberia, Nicoya y Santa Ana están en 2025 y Escazú en 2024, pero Cóbano (Santa Teresa), Garabito (Jacó) y Osa (Dominical y Uvita) siguen en 2018, Talamanca en 2020 y Atenas en 2016 [2]. Cuando se hace una edición, sus valores quedan cerca de las ventas que Hacienda muestrea en las mismas zonas [4]; la distancia con el mercado de hoy crece con la edad de la edición. La edición 2025 puso el centro de Tamarindo un 70% por encima de la de 2017.',
    'El valor de una zona es para el lote que describe: en el centro de Tamarindo, 800 m² con 20 m de frente. Un lote más grande vale menos por m², y una esquina, una vista o la playa a pocos pasos, más. Las zonas mixtas llevan un segundo valor, y su parte rural uno mucho más bajo para fincas grandes.',
    'En los 200 m desde la pleamar el terreno no se vende. La municipalidad da una concesión y cobra un canon anual sobre un avalúo, de hasta un 3% para vivienda y un 4% para turismo [6]; el mapa igual muestra ahí el valor de Hacienda. En el Polo Turístico de Papagayo la base la fija el ICT, US$3.39 el m² hasta julio de 2027 [7].',
    'La última columna es lo que piden los vendedores, no lo que se paga: 1,303 lotes titulados anunciados en sitios públicos el 7 de octubre de 2026, contados solo entre 300 y 5,000 m², sin concesiones, fincas ni lotes comerciales [8]. Un pueblo necesita cinco lotes para tener un número, y si son menos de diez se marca. El precio pedido suele quedar por encima del precio de cierre.',
    'Nada de esto es un avalúo. Un lote vale lo que diga un avalúo de ese lote, y antes de comprar conviene pedirlo, junto con el estudio registral de la propiedad y el certificado de uso de suelo.',
  ],
};
// the zone map; `start` opens it on a town
function landFigure(lang, start = '') {
  const E = LT[lang];
  const pins = towns.filter((t) => land.towns[t.slug]).map((t) => ({ slug: t.slug, n: t.name, c: land.towns[t.slug].center }));
  const cantonNames = Object.fromEntries(Object.entries(landEditions.cantons).map(([c, v]) => [c, v.name]));
  return `    <div class="lt__map-wrap">
      <figure class="lmap" data-lmap data-fx="${costs.fx.crcPerUsd}" data-town="${start}" data-towns="${esc(JSON.stringify(pins))}" data-cantons="${esc(JSON.stringify(cantonNames))}">
        <div class="lmap__canvas" role="region" aria-label="${esc(E.aria)}"></div>
        <div class="cmap__controls lmap__controls">
          <label class="lmap__go"><span class="label">${E.go}</span><select class="lmap__select" data-lmap-town><option value="">${E.all}</option>${towns.filter((t) => land.towns[t.slug]).map((t) => `<option value="${t.slug}"${t.slug === start ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
          <div class="cmap__seg" role="group" aria-label="${E.show}"><button type="button" data-cur="usd" aria-pressed="true">US$</button><button type="button" data-cur="crc" aria-pressed="false">₡</button></div>
        </div>
        <div class="lmap__legend"><span class="label">${E.legend}</span><ol data-lmap-legend></ol></div>
        <figcaption class="note">${esc(E.caption)}</figcaption>
      </figure>
    </div>`;
}
function landPage(lang) {
  const E = LT[lang];
  const paths = { en: landPath('en'), es: landPath('es') };
  const up = upFrom(paths[lang]);
  const fx = costs.fx.crcPerUsd;
  const money = (v) => `₡${Math.round(v).toLocaleString('en-US')}`;
  const usd = (v) => `US$${Math.round(v / fx).toLocaleString('en-US')}`;
  // a range of official values: one cell, colones above and dollars below
  const cell = (zs) => {
    if (!zs?.length) return '<td class="lt__na">–</td>';
    const v = zs.map((z) => z.v), lo = Math.min(...v), hi = Math.max(...v);
    const z = zs.some((x) => x.zmt) ? ` <span class="lt__tag">${E.zmt}</span>` : '';
    return `<td><span class="lt__v">${lo === hi ? money(lo) : `${money(lo)}–${Math.round(hi).toLocaleString('en-US')}`}${z}</span><span class="lt__u">${lo === hi ? usd(lo) : `${usd(lo)}–${Math.round(hi / fx).toLocaleString('en-US')}`}</span></td>`;
  };
  const market = (m) => (m
    ? `<td><span class="lt__v">US$${m.median.toLocaleString('en-US')}</span><span class="lt__u">US$${m.p25.toLocaleString('en-US')}–${m.p75.toLocaleString('en-US')} · ${E.lots(m.n)}${m.n < 10 ? `, ${E.few}` : ''}</span></td>`
    : `<td class="lt__na">${E.none}</td>`);
  const rows = towns.map((t) => {
    const L = land.towns[t.slug];
    if (!L) return '';
    return `        <tr><th scope="row"><a class="ulink" href="${up}${landTownPath(lang, t.slug)}">${esc(t.name)}</a> <a class="lt__map label ulink" href="?town=${t.slug}" data-lmap-fly="${t.slug}">${E.map}</a></th>${cell(L.official.centre)}${cell(L.official.residential)}${cell(L.official.beach)}<td>${L.edition ?? '–'}</td>${market(L.market)}</tr>`;
  }).join('\n');
  const pins = towns.filter((t) => land.towns[t.slug]).map((t) => ({ slug: t.slug, n: t.name, c: land.towns[t.slug].center }));
  const cantonNames = Object.fromEntries(Object.entries(landEditions.cantons).map(([c, v]) => [c, v.name]));
  const ld = { '@context': 'https://schema.org', '@type': 'Dataset', name: E.title.split(' | ')[0], description: E.description, inLanguage: lang, url: `${ORIGIN}/${paths[lang]}`, creator: { '@type': 'Organization', name: 'Studio CAVA', url: `${ORIGIN}/` }, isBasedOn: LAND_SOURCES[0].url, spatialCoverage: 'Costa Rica', temporalCoverage: '2016/2026' };
  return head(lang, { title: E.title, description: E.description, paths, image: `${imgBase('papagayo-404', 1)}-1600.webp`, up, script: 'land-map.js', jsonld: ld }) + `<div id="top"></div>
${bar(lang, up, paths, 'tools')}
<main class="page">
  <article class="mf lt" aria-labelledby="lt-title">
    <header class="mf__head grid">
      <p class="label mf__label">${E.label}</p>
      <h1 class="display mf__title" id="lt-title"><span>${esc(E.h1[0])}</span><span class="right">${esc(E.h1[1])}</span></h1>
      <p class="h3 mf__intro">${esc(E.intro)}</p>
    </header>
${landFigure(lang)}
    <section class="tw__sec lt__towns" aria-labelledby="lt-table">
      <h2 class="label" id="lt-table">${E.table}</h2>
      <div class="hub__wrap">
        <table class="hub__table lt__table">
          <thead><tr>${E.cols.map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </div>
      <p class="note">${esc(E.tableNote)}</p>
    </section>
    <nav class="tw__sec grid" aria-labelledby="lt-more">
      <h2 class="label tw__label" id="lt-more">${E.more}</h2>
      <ul class="tw__aside guide__links">
${costs ? `        <li><a class="ulink" href="${up}${estimatorPath(lang)}">${esc(ET[lang].name)} →</a></li>\n` : ''}${guides.map((g) => `        <li><a class="ulink" href="${up}${guidePath(lang, g)}">${esc(g[lang].link)} →</a></li>`).join('\n')}
        <li><a class="ulink" href="${up}${townsPath(lang)}">${lang === 'en' ? 'Rain, sun, wind and permits, town by town' : 'Lluvia, sol, viento y permisos, pueblo por pueblo'} →</a></li>
      </ul>
    </nav>
  </article>
${contact(lang, UI[lang].wa.general, up)}${finePrint(lang, 'lt-method', E.methodTitle, LAND_METHOD[lang], LAND_SOURCES)}</main>
${footer(lang, up, paths)}${end}`;
}

// ---------- "What it costs to build in <town>": the estimator preset for one town ----------
// Also the landing page for that town's ads: the number first, then the tool, the place, the answers, the call.
const townCostPath = (lang, slug) => `${estimatorPath(lang)}${slug}/`;
// the estimator's sums, here so the page can quote them (site/assets/js/estimator.js does the same in the browser)
function estimateNode(D, st) {
  const town = D.towns.find((t) => t.slug === st.town) ?? null;
  const place = (town && D.place.town[town.slug]) || D.place.region[town ? town.region : 'other'] || 1;
  const rate = (D.perM2[st.type] ?? D.perM2.house)[st.quality].map((x) => x * place);
  const base = rate.map((x) => x * st.area);
  let works = [...base];
  const sl = D.slope[st.slope];
  if (sl[1] > 0) works = works.map((w, i) => w + base[i] * sl[i]);
  if (st.pool) { const w = Math.sqrt(st.pool * D.pool.ratio), dd = st.pool / w, shell = st.pool + 2 * (w + dd) * D.pool.depth; works = works.map((x, i) => x + D.pool.perM2Shell[i] * shell * place); }
  if (st.deck) works = works.map((x, i) => x + D.deck.perM2[i] * st.deck * place);
  let bought = [0, 0, 0];
  if (st.solar) { const kwp = Math.max(D.solar.minKwp, Math.min(D.solar.maxKwp, Math.round(st.area / D.solar.m2PerKwp))); bought = bought.map((x, i) => x + D.solar.perKwp[i] * kwp); }
  if (st.landscape) bought = bought.map((x, i) => x + D.landscape[i]);
  if (st.furniture) bought = bought.map((x, i) => x + D.furniture[i] * st.area);
  const S = D.soft, pick = (v, i) => (Array.isArray(v) ? v[i] : v);
  const total = [0, 1, 2].map((i) => {
    const w = works[i], des = w * pick(S.design, i), sup = w * pick(S.supervision, i);
    let soft = des + sup + w * (S.municipal + S.cfia) + w * pick(S.insurance, i) + (w + des + sup) * S.vat + (w + bought[i]) * pick(S.contingency, i);
    if (town && D.connection[town.slug]) soft += D.connection[town.slug];
    if (town?.slug === 'papagayo') soft += D.review.papagayo.perReview * D.review.papagayo.rounds;
    else if (st.condo) soft += D.review.perReview[i] * D.review.rounds;
    const lnd = st.land && town?.land ? town.land.r[i] * st.lot : 0;
    return w + bought[i] + soft + lnd;
  });
  return { rate, total };
}
const usdK = (n) => `US$${(Math.round(n / 1000) * 1000).toLocaleString('en-US')}`;
const TC = {
  en: {
    link: (n) => `What it costs to build in ${n}`,
    title: (n) => `Cost to build a house in ${n}, Costa Rica | Studio CAVA`,
    description: (n, e) => `A 250 m² house with a pool in ${n} costs about ${usdK(e.total[0])} to ${usdK(e.total[2])} to build, with design, permits and VAT. Change the size, finish and extras, and see how long it takes.`,
    label: '(Estimator)', h1: (n) => ['Cost to build', `in ${n}`],
    intro: (n, e) => `A 250 m² house with a high finish and a pool in ${n} comes to about ${usdK(e.total[0])} to ${usdK(e.total[2])}, likely ${usdK(e.total[1])}, with design, permits, VAT and a reserve. Change anything below and the numbers follow.`,
    facts: (n) => `(${n}, in numbers)`, rate: 'Construction, high finish', landM: 'Land, lots for sale', landO: 'Land, Hacienda residential values', dry: 'Dry season', rainDays: 'Days of heavy rain a year', permits: 'Permits', drive: 'From Liberia airport',
    perM2: (v) => `US$${v.toLocaleString('en-US')} a m²`, lots: (m) => `US$${m.median.toLocaleString('en-US')} a m², median of ${m.n} lots`, none: 'No dry season', days: (n) => `about ${n}`,
    faq: '(Questions)', more: '(Also on this town)', arch: (n) => `Architects in ${n}: climate, permits and our work`, landLink: (n) => `Land prices in ${n}`,
    wa: (n) => `Hi Studio CAVA, I am looking at building in ${n} and would like to talk about it.`,
    q: {
      cost: (n) => `How much does it cost to build a house in ${n}, Costa Rica?`,
      costA: (n, e, s, l) => `A 250 m² house with a high finish, a 32 m² pool, solar panels and landscaping comes to about ${usdK(e.total[0])} to ${usdK(e.total[2])} in ${n}, likely ${usdK(e.total[1])}. That is construction at about US$${Math.round(e.rate[1]).toLocaleString('en-US')} a m², plus design, permits, VAT and a reserve. With a standard finish the likely figure drops to about ${usdK(s.total[1])}; with a luxury one it rises to about ${usdK(l.total[1])}.`,
      land: (n) => `How much is land in ${n}?`,
      landM: (n, m) => `Titled residential lots of 300 to 5,000 m² listed in ${n} ask a median of US$${m.median.toLocaleString('en-US')} a m², with the middle half between US$${m.p25.toLocaleString('en-US')} and ${m.p75.toLocaleString('en-US')} (${m.n} lots, October 2026). These are asking prices; sales close lower.`,
      landO: (n, lo, hi, y) => `Few lots are listed in ${n}. Hacienda's official values for its residential zones run from about US$${lo} to ${hi} a m² (${y} edition), and the market usually sits above them.`,
      landP: () => 'Inside Península Papagayo the land is not sold: it is a concession from the ICT, with its own fees.',
      when: (n) => `When is the best time to start building in ${n}?`,
      whenA: (n, dry, open, heavy) => `Ideally at the opening of the dry season, which in ${n} runs ${dry}: earthworks and foundations then go in with ${heavy < 1 ? 'almost no days' : `about ${heavy} days`} of heavy rain in their first four months. It is a recommendation, not a rule: building goes on through the rains, which here fall mostly in the afternoon, and no project should sit for months waiting for the dry season. Design and permits take most of a year, so the time to start the design is the year before.`,
      whenNo: (n) => `${n} has no dry season to wait for: rain falls all year, so works start once the permits are in and are planned around the wettest months.`,
      hotel: (n) => `How much does it cost to build a small hotel in ${n}, Costa Rica?`,
      hotelA: (n, h) => `A boutique hotel of 12 rooms, about 600 m² over two storeys with a high finish, a 50 m² pool and furniture ready for guests, comes to about ${usdK(h.total[0])} to ${usdK(h.total[2])} in ${n}, likely ${usdK(h.total[1])}, with design, permits, VAT and a reserve. A hotel also passes the Health and Fire review in the CFIA's APC and must meet the accessibility law.`,
      who: (n) => `Who issues building permits in ${n}?`,
      whoA: (n, muni) => `${muni.charAt(0).toUpperCase() + muni.slice(1)} issues the licence, after the drawings are approved in the CFIA's APC. Under 500 m² a house does not need SETENA; between 500 and 1,000 m² it does only on fragile sites, and over 1,000 m² it does.`,
    },
  },
  es: {
    link: (n) => `Cuánto cuesta construir en ${n}`,
    title: (n) => `Cuánto cuesta construir una casa en ${n}, Costa Rica | Studio CAVA`,
    description: (n, e) => `Una casa de 250 m² con piscina en ${n} cuesta de ${usdK(e.total[0])} a ${usdK(e.total[2])}, con diseño, permisos e IVA. Cambie el tamaño, los acabados y los extras, y vea cuánto tarda.`,
    label: '(Estimador)', h1: (n) => ['Construir', `en ${n}`],
    intro: (n, e) => `Una casa de 250 m² con acabados altos y piscina en ${n} sale en unos ${usdK(e.total[0])} a ${usdK(e.total[2])}, lo probable ${usdK(e.total[1])}, con diseño, permisos, IVA y una reserva. Cambie lo que quiera abajo y los números lo siguen.`,
    facts: (n) => `(${n}, en números)`, rate: 'Construcción, acabados altos', landM: 'Terreno, lotes en venta', landO: 'Terreno, valores residenciales de Hacienda', dry: 'Época seca', rainDays: 'Días de lluvia fuerte al año', permits: 'Permisos', drive: 'Desde el aeropuerto de Liberia',
    perM2: (v) => `US$${v.toLocaleString('en-US')} el m²`, lots: (m) => `US$${m.median.toLocaleString('en-US')} el m², mediana de ${m.n} lotes`, none: 'No hay época seca', days: (n) => `unos ${n}`,
    faq: '(Preguntas)', more: '(También de este pueblo)', arch: (n) => `Arquitectos en ${n}: clima, permisos y nuestro trabajo`, landLink: (n) => `Precio del terreno en ${n}`,
    wa: (n) => `Hola Studio CAVA, estoy pensando en construir en ${n} y quisiera conversarlo.`,
    q: {
      cost: (n) => `¿Cuánto cuesta construir una casa en ${n}, Costa Rica?`,
      costA: (n, e, s, l) => `Una casa de 250 m² con acabados altos, piscina de 32 m², paneles solares y paisajismo sale en unos ${usdK(e.total[0])} a ${usdK(e.total[2])} en ${n}, lo probable ${usdK(e.total[1])}. Es la construcción a unos US$${Math.round(e.rate[1]).toLocaleString('en-US')} el m², más diseño, permisos, IVA y una reserva. Con acabados estándar lo probable baja a unos ${usdK(s.total[1])}; con acabados de lujo sube a unos ${usdK(l.total[1])}.`,
      land: (n) => `¿Cuánto cuesta el terreno en ${n}?`,
      landM: (n, m) => `Los lotes residenciales titulados de 300 a 5,000 m² anunciados en ${n} piden una mediana de US$${m.median.toLocaleString('en-US')} el m², con la mitad central entre US$${m.p25.toLocaleString('en-US')} y ${m.p75.toLocaleString('en-US')} (${m.n} lotes, octubre de 2026). Son precios pedidos; las ventas cierran más abajo.`,
      landO: (n, lo, hi, y) => `En ${n} hay pocos lotes anunciados. Los valores oficiales de Hacienda para sus zonas residenciales van de unos US$${lo} a ${hi} el m² (edición ${y}), y el mercado suele estar por encima.`,
      landP: () => 'Dentro de la Península Papagayo el terreno no se vende: es una concesión del ICT, con sus propios cobros.',
      when: (n) => `¿Cuál es el mejor momento para empezar a construir en ${n}?`,
      whenA: (n, dry, open, heavy) => `Idealmente al inicio de la época seca, que en ${n} va de ${dry}: el movimiento de tierra y las fundaciones se hacen entonces con ${heavy < 1 ? 'casi ningún día' : `unos ${heavy} días`} de lluvia fuerte en sus primeros cuatro meses. Es una recomendación, no una regla: en lluvias se sigue construyendo, porque aquí llueve sobre todo en las tardes, y ninguna obra debería quedar parada meses esperando la época seca. El diseño y los permisos toman casi un año, así que el momento de empezar el diseño es el año anterior.`,
      whenNo: (n) => `En ${n} no hay época seca que esperar: llueve todo el año, así que la obra arranca cuando salen los permisos y se planifica alrededor de los meses más lluviosos.`,
      hotel: (n) => `¿Cuánto cuesta construir un hotel pequeño en ${n}, Costa Rica?`,
      hotelA: (n, h) => `Un hotel boutique de 12 habitaciones, unos 600 m² en dos pisos con acabados altos, piscina de 50 m² y mobiliario listo para huéspedes, sale en unos ${usdK(h.total[0])} a ${usdK(h.total[2])} en ${n}, lo probable ${usdK(h.total[1])}, con diseño, permisos, IVA y una reserva. Un hotel además pasa la revisión de Salud y Bomberos en el APC del CFIA y tiene que cumplir la ley de accesibilidad.`,
      who: (n) => `¿Quién da los permisos de construcción en ${n}?`,
      whoA: (n, muni) => `${muni.charAt(0).toUpperCase() + muni.slice(1)} da la licencia, después de que los planos se aprueban en el APC del CFIA. Con menos de 500 m² una casa no necesita SETENA; entre 500 y 1,000 m² solo en sitios frágiles, y con más de 1,000 m² sí.`,
    },
  },
};
function townCostPage(lang, t) {
  const C = TC[lang];
  const L = TT[lang];
  const D = costsData();
  const d = townOf(t);
  const c = climate(d);
  const muni = L.municipality(t, d);
  const base = { ...EST_DEFAULT, town: t.slug };
  const e = estimateNode(D, base), es = estimateNode(D, { ...base, quality: 'standard' }), el = estimateNode(D, { ...base, quality: 'luxury' });
  const eh = estimateNode(D, { ...base, type: 'hotel', area: 600, storeys: 2, pool: 50, deck: 150, furniture: true });
  const paths = { en: townCostPath('en', t.slug), es: townCostPath('es', t.slug) };
  const up = upFrom(paths[lang]);
  const lnd = land?.towns[t.slug];
  const T = D.towns.find((x) => x.slug === t.slug);
  const heavyYear = Math.round((T.heavy ?? []).reduce((a, b) => a + b, 0));
  const dryText = c.dry ? `${MONTHS[lang][c.dry.start]} ${lang === 'en' ? 'to' : 'a'} ${MONTHS[lang][(c.dry.start + c.dry.n - 1) % 12]}` : null;
  const heavy4 = c.dry ? Math.round([0, 1, 2, 3].reduce((n, k) => n + (T.heavy?.[(c.dry.start + k) % 12] ?? 0), 0)) : 0;
  const res = lnd?.official.residential?.map((z) => Math.round(z.v / costs.fx.crcPerUsd)) ?? [];
  const Q = [
    [C.q.cost(t.name), C.q.costA(t.name, e, es, el)],
    [C.q.hotel(t.name), C.q.hotelA(t.name, eh)],
    [C.q.land(t.name), t.slug === 'papagayo' ? C.q.landP() : lnd?.market ? C.q.landM(t.name, lnd.market) : res.length ? C.q.landO(t.name, Math.min(...res), Math.max(...res), lnd.edition) : null],
    [C.q.when(t.name), c.dry ? C.q.whenA(t.name, dryText, MONTHS[lang][c.dry.start], heavy4) : C.q.whenNo(t.name)],
    [C.q.who(t.name), C.q.whoA(t.name, muni)],
  ].filter(([, a]) => a);
  const fact = (k, v) => `        <div><dt>${k}</dt><dd>${esc(v)}</dd></div>`;
  const extra = `    <section class="proj__body grid tw__facts est__facts" aria-labelledby="tc-facts">
      <h2 class="label sheet__label" id="tc-facts">${C.facts(t.name)}</h2>
      <dl class="sheet">
${[
  fact(C.rate, C.perM2(Math.round(e.rate[1]))),
  lnd?.market ? fact(C.landM, C.lots(lnd.market)) : res.length ? fact(C.landO, `US$${Math.min(...res)}–${Math.max(...res)} ${lang === 'en' ? 'a m²' : 'el m²'}`) : '',
  fact(C.dry, dryText ?? C.none),
  fact(C.rainDays, C.days(heavyYear)),
  fact(C.permits, muni.replace(/^(the|la|el) /, '')),
  d.roads?.LIR ? fact(C.drive, L.facts.road(d.roads.LIR)) : '',
].filter(Boolean).join('\n')}
      </dl>
    </section>
    <section class="tw__sec grid est__faq" aria-labelledby="tc-faq">
      <h2 class="label tw__label" id="tc-faq">${C.faq}</h2>
      <div class="faq">
${Q.map(([q, a]) => faqItem(q, esc(a))).join('\n')}
      </div>
    </section>
    <nav class="tw__sec grid" aria-labelledby="tc-more">
      <h2 class="label tw__label" id="tc-more">${C.more}</h2>
      <ul class="tw__aside guide__links">
        <li><a class="ulink" href="${up}${townPath(lang, t.slug)}">${esc(C.arch(t.name))} →</a></li>
${land ? `        <li><a class="ulink" href="${up}${landTownPath(lang, t.slug)}">${esc(C.landLink(t.name))} →</a></li>\n` : ''}${services.length ? `        <li><a class="ulink" href="${up}${servicePath(lang, services.find((x) => x.slug.en === 'lot-study') ?? services[0])}">${esc(services.find((x) => x.slug.en === 'lot-study')?.[lang].name ?? '')} →</a></li>\n` : ''}      </ul>
    </nav>
`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: C.title(t.name).split(' | ')[0], description: C.description(t.name, e), inLanguage: lang, url: `${ORIGIN}/${paths[lang]}` },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Studio CAVA', item: `${ORIGIN}/${UI[lang].dir}` }, { '@type': 'ListItem', position: 2, name: ET[lang].h1.join(' '), item: `${ORIGIN}/${estimatorPath(lang)}` }, { '@type': 'ListItem', position: 3, name: t.name, item: `${ORIGIN}/${paths[lang]}` }] },
      { '@type': 'FAQPage', mainEntity: Q.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  return estimatorPage(lang, {
    paths, title: C.title(t.name), description: C.description(t.name, e), h1: C.h1(t.name), intro: C.intro(t.name, e),
    preset: base, photo: places?.towns[t.slug], extra, ld, cls: 'est--town', wa: C.wa(t.name), q: `?town=${t.slug}`,
  });
}

// ---------- "Land prices in <town>": the map on the town, its zones, its lots for sale ----------
const landTownPath = (lang, slug) => `${landPath(lang)}${slug}/`;
const ZONES_NEAR_PATH = join(ROOT, 'data', 'land', 'zones-by-town.json');
const zonesNear = existsSync(ZONES_NEAR_PATH) ? JSON.parse(readFileSync(ZONES_NEAR_PATH, 'utf8')) : {};
// the asking prices behind the market column, per town (data/land/market-sample.csv)
const marketSample = (() => {
  const f = join(ROOT, 'data', 'land', 'market-sample.csv');
  if (!existsSync(f)) return {};
  const [headRow, ...rows] = readFileSync(f, 'utf8').trim().split('\n');
  const keys = headRow.split(',');
  const out = {};
  for (const line of rows) { const v = line.split(','); const o = Object.fromEntries(keys.map((k, i) => [k, v[i]])); if (+o.area_m2 >= 300 && +o.area_m2 <= 5000) (out[o.town] ||= []).push(+o.usd_m2); }
  return out;
})();
// each lot for sale as a dot on a log scale of US$ a m², with the middle half and the median
function lotStrip(lang, vals, m) {
  const W = 640, H = 96, L = 8, R = 8, lo = 10, hi = 2500;
  const x = (v) => L + ((Math.log(Math.max(lo, Math.min(hi, v))) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * (W - L - R);
  const dots = vals.map((v, i) => `<circle cx="${x(v).toFixed(1)}" cy="${(30 + ((i * 37) % 23)).toFixed(1)}" r="3.4"/>`).join('');
  const ticks = [25, 50, 100, 200, 400, 800, 1600].map((t) => `<g class="ls__tick"><line x1="${x(t).toFixed(1)}" x2="${x(t).toFixed(1)}" y1="62" y2="67"/><text x="${x(t).toFixed(1)}" y="82">${t}</text></g>`).join('');
  return `<svg class="ls" viewBox="0 0 ${W} ${H}" role="img" aria-label="${lang === 'en' ? `Asking prices of ${vals.length} lots, US$ a m²; median ${m.median}` : `Precios pedidos de ${vals.length} lotes, US$ por m²; mediana ${m.median}`}">
        <rect class="ls__iqr" x="${x(m.p25).toFixed(1)}" y="22" width="${(x(m.p75) - x(m.p25)).toFixed(1)}" height="36" rx="3"/>
        <g class="ls__dots">${dots}</g>
        <line class="ls__median" x1="${x(m.median).toFixed(1)}" x2="${x(m.median).toFixed(1)}" y1="16" y2="62"/>
        <text class="ls__label" x="${x(m.median).toFixed(1)}" y="10">${lang === 'en' ? 'median' : 'mediana'} US$${m.median.toLocaleString('en-US')}</text>
        <text class="ls__unit" x="${W - R}" y="96">US$ ${lang === 'en' ? 'a' : 'por'} m²</text>
        <line class="ls__axis" x1="${L}" x2="${W - R}" y1="62" y2="62"/>${ticks}
      </svg>`;
}
const LTT = {
  en: {
    title: (n) => `Land prices in ${n}, Costa Rica: price per m² | Studio CAVA`,
    description: (n, txt) => `Land in ${n}: ${txt} Every zone on a map, with the year of its edition.`,
    label: '(Land prices)', h1: (n) => ['Land prices', `in ${n}`],
    introO: (n, lo, hi, y) => `In ${n}, the Ministry of Finance values residential and central land at ₡${lo.toLocaleString('en-US')} to ₡${hi.toLocaleString('en-US')} a m² (US$${Math.round(lo / costs.fx.crcPerUsd)} to ${Math.round(hi / costs.fx.crcPerUsd).toLocaleString('en-US')}), in its ${y} edition.`,
    introM: (m) => ` Lots for sale ask a median of US$${m.median.toLocaleString('en-US')} a m².`,
    introP: () => 'Inside Península Papagayo the land is not sold: it is a concession of the ICT. Around it, the Ministry of Finance values the tourism pole at ₡325,000 a m² (2025 edition).',
    study: 'Study the lot first', zones: '(Zones around the town)', zcols: ['Zone', 'Name', 'Official value, ₡/m²', 'US$/m²', 'Set for a lot of', 'Edition'],
    zonesNote: (y) => `Official values of the Ministry of Finance (Órgano de Normalización Técnica), as published, for the zones whose centre lies within 3 km of the town; ${y} edition. Each value is set for a typical lot of the zone.`,
    lots: '(Lots for sale)', lotsText: (m) => `Each dot is a titled residential lot of 300 to 5,000 m² listed for sale on 7 October 2026: ${m.n} lots, a median of US$${m.median.toLocaleString('en-US')} a m², and half of them between US$${m.p25.toLocaleString('en-US')} and ${m.p75.toLocaleString('en-US')}. Asking prices run above closing prices.`,
    few: ' Few lots are listed here, so read it as a hint.', noLots: 'Too few lots are listed here to give a market figure.',
    faq: '(Questions)', more: '(Also on this town)', work: '(Our work nearby)', all: 'All projects',
    cost: (n) => `What it costs to build in ${n}`, arch: (n) => `Architects in ${n}: climate, permits and our work`, map: 'Land prices across Costa Rica',
    q: {
      price: (n) => `How much is land in ${n}?`,
      what: () => "What are the Ministry of Finance's land values for?",
      whatA: (y, c) => `They are the base of the property tax: each municipality is split into zones with an official value per m² for a typical lot, and publishes them in La Gaceta. ${c} is on its ${y} edition. When an edition is made its values sit close to the sales in each zone; the older the edition, the further the market has moved.`,
      zmt: (n) => `Can I buy beachfront land in ${n}?`,
      zmtA: () => 'Within 200 m of the high-tide line the land is not sold but granted in concession by the municipality, which charges a yearly fee, and the law does not grant concessions to foreigners with less than five years of residence. Titled land beyond that strip can be bought freely.',
      check: () => 'How do I check a lot before buying it?',
      checkA: () => 'Ask for the land use certificate, the water availability letter and the alignments, read the cadastral plan and the registry, and check slope, access and any condominium rules. Our lot study does all of it in two to four weeks, with a cost range for what fits.',
    },
    wa: (n) => `Hi Studio CAVA, I am looking at land in ${n} and would like to talk about it.`,
  },
  es: {
    title: (n) => `Precio del terreno en ${n}, Costa Rica: valor por m² | Studio CAVA`,
    description: (n, txt) => `Terreno en ${n}: ${txt} Cada zona en un mapa, con el año de su edición.`,
    label: '(Precio del terreno)', h1: (n) => ['Terreno', `en ${n}`],
    introO: (n, lo, hi, y) => `En ${n}, el Ministerio de Hacienda valora el terreno residencial y del centro en ₡${lo.toLocaleString('en-US')} a ₡${hi.toLocaleString('en-US')} el m² (US$${Math.round(lo / costs.fx.crcPerUsd)} a ${Math.round(hi / costs.fx.crcPerUsd).toLocaleString('en-US')}), en su edición ${y}.`,
    introM: (m) => ` Los lotes en venta piden una mediana de US$${m.median.toLocaleString('en-US')} el m².`,
    introP: () => 'Dentro de la Península Papagayo el terreno no se vende: es una concesión del ICT. Alrededor, Hacienda valora el polo turístico en ₡325,000 el m² (edición 2025).',
    study: 'Estudiar el lote', zones: '(Zonas alrededor del pueblo)', zcols: ['Zona', 'Nombre', 'Valor oficial, ₡/m²', 'US$/m²', 'Fijado para un lote de', 'Edición'],
    zonesNote: (y) => `Valores oficiales del Ministerio de Hacienda (Órgano de Normalización Técnica), tal como se publican, para las zonas cuyo centro está a menos de 3 km del pueblo; edición ${y}. Cada valor está fijado para un lote típico de la zona.`,
    lots: '(Lotes en venta)', lotsText: (m) => `Cada punto es un lote residencial titulado de 300 a 5,000 m² anunciado el 7 de octubre de 2026: ${m.n} lotes, una mediana de US$${m.median.toLocaleString('en-US')} el m² y la mitad de ellos entre US$${m.p25.toLocaleString('en-US')} y ${m.p75.toLocaleString('en-US')}. El precio pedido suele quedar por encima del de cierre.`,
    few: ' Aquí hay pocos lotes anunciados, así que tómelo como una pista.', noLots: 'Aquí hay muy pocos lotes anunciados para dar una cifra de mercado.',
    faq: '(Preguntas)', more: '(También de este pueblo)', work: '(Nuestro trabajo cerca)', all: 'Todos los proyectos',
    cost: (n) => `Cuánto cuesta construir en ${n}`, arch: (n) => `Arquitectos en ${n}: clima, permisos y nuestro trabajo`, map: 'Precio del terreno en todo Costa Rica',
    q: {
      price: (n) => `¿Cuánto cuesta el terreno en ${n}?`,
      what: () => '¿Para qué sirven los valores de terreno de Hacienda?',
      whatA: (y, c) => `Son la base del impuesto de bienes inmuebles: cada municipalidad se divide en zonas con un valor oficial por m² para un lote típico, y las publica en La Gaceta. ${c} está en su edición ${y}. Cuando se hace una edición, sus valores quedan cerca de las ventas de cada zona; entre más vieja la edición, más se ha movido el mercado.`,
      zmt: (n) => `¿Puedo comprar un terreno frente a la playa en ${n}?`,
      zmtA: () => 'En los 200 m desde la pleamar el terreno no se vende: la municipalidad lo da en concesión y cobra un canon anual, y la ley no da concesiones a extranjeros con menos de cinco años de residencia. El terreno titulado más allá de esa franja se puede comprar sin esa limitación.',
      check: () => '¿Cómo reviso un lote antes de comprarlo?',
      checkA: () => 'Pida el certificado de uso de suelo, la carta de disponibilidad de agua y los alineamientos, lea el plano catastrado y el registro, y revise la pendiente, el acceso y las reglas del condominio si lo hay. Nuestro estudio de lote hace todo eso en dos a cuatro semanas, con un rango de costo para lo que cabe.',
    },
    wa: (n) => `Hola Studio CAVA, estoy viendo terrenos en ${n} y quisiera conversarlo.`,
  },
};
function landTownPage(lang, t) {
  const E = LTT[lang];
  const Lmap = LT[lang];
  const L = land.towns[t.slug];
  const zs = zonesNear[t.slug] ?? [];
  const fx = costs.fx.crcPerUsd;
  const paths = { en: landTownPath('en', t.slug), es: landTownPath('es', t.slug) };
  const up = upFrom(paths[lang]);
  const d = townOf(t);
  const pick = [...(L.official.centre ?? []), ...(L.official.residential ?? [])].map((z) => z.v);
  const year = L.edition;
  const cantonName = landEditions.cantons[zs[0]?.c]?.name ?? d.canton;
  const intro = t.slug === 'papagayo' ? E.introP() : `${pick.length ? E.introO(t.name, Math.min(...pick), Math.max(...pick), year) : ''}${L.market ? E.introM(L.market) : ''}`;
  const lot = services.find((x) => x.slug.en === 'lot-study');
  const vals = marketSample[t.slug] ?? [];
  const priceA = t.slug === 'papagayo' ? E.introP() : `${intro}${L.market && L.market.n < 10 ? E.few : ''}`;
  const Q = [
    [E.q.price(t.name), priceA.trim()],
    [E.q.what(), E.q.whatA(year, cantonName)],
    ...(t.coastal ? [[E.q.zmt(t.name), E.q.zmtA()]] : []),
    [E.q.check(), E.q.checkA()],
  ];
  const work = projects.filter((p) => p.pin !== 'placeholder').map((p) => ({ p, km: km(d.coords, p.coords) })).sort((a, b) => a.km - b.km).slice(0, 3);
  const rows = zs.map((z) => `            <tr><td class="label">${esc(z.z)}</td><th scope="row">${esc(z.n)}${z.zmt ? ` <span class="lt__tag">ZMT</span>` : ''}</th><td>₡${z.v.toLocaleString('en-US')}</td><td>US$${Math.round(z.v / fx).toLocaleString('en-US')}</td><td>${z.a ? `${z.a.toLocaleString('en-US')} m²` : '–'}</td><td>${z.y ?? '–'}</td></tr>`).join('\n');
  const desc = E.description(t.name, intro.trim());
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: E.title(t.name).split(' | ')[0], description: desc, inLanguage: lang, url: `${ORIGIN}/${paths[lang]}` },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Studio CAVA', item: `${ORIGIN}/${UI[lang].dir}` }, { '@type': 'ListItem', position: 2, name: Lmap.name, item: `${ORIGIN}/${landPath(lang)}` }, { '@type': 'ListItem', position: 3, name: t.name, item: `${ORIGIN}/${paths[lang]}` }] },
      { '@type': 'FAQPage', mainEntity: Q.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  return head(lang, { title: E.title(t.name), description: desc, paths, image: `${imgBase(work[0].p.slug, 1)}-1600.webp`, up, script: 'land-map.js', jsonld: ld }) + `<div id="top"></div>
${bar(lang, up, paths, 'tools')}
<main class="page">
  <article class="mf lt lt--town" aria-labelledby="lt-title">
    <header class="mf__head grid">
      <p class="label mf__label"><a class="ulink" href="${up}${landPath(lang)}">${Lmap.label}</a></p>
      <h1 class="display mf__title" id="lt-title"><span>${esc(E.h1(t.name)[0])}</span><span class="right">${esc(E.h1(t.name)[1])}</span></h1>
      <p class="h3 mf__intro">${esc(intro.trim())}</p>
      <p class="svc__cta mf__intro">${lot ? `<a class="btn btn--dark" href="${up}${servicePath(lang, lot)}">${E.study} <span class="btn__dot" aria-hidden="true"></span></a> ` : ''}${booking ? `<a class="btn btn--light" href="${up}${bookPath(lang)}?town=${t.slug}">${BK[lang].link} <span class="btn__dot" aria-hidden="true"></span></a>` : ''}</p>
    </header>
${landFigure(lang, t.slug)}
${zs.length ? `    <section class="tw__sec lt__towns" aria-labelledby="ltt-zones">
      <h2 class="label" id="ltt-zones">${E.zones}</h2>
      <div class="hub__wrap">
        <table class="hub__table lt__table lt__zones">
          <thead><tr>${E.zcols.map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </div>
      <p class="note">${esc(E.zonesNote(year))}</p>
    </section>
` : ''}    <section class="tw__sec grid" aria-labelledby="ltt-lots">
      <h2 class="label tw__label" id="ltt-lots">${E.lots}</h2>
      <div class="tw__text">
${L.market && vals.length ? `      ${lotStrip(lang, vals, L.market)}
        <p class="note">${esc(E.lotsText(L.market))}${L.market.n < 10 ? esc(E.few) : ''}</p>` : `        <p class="large">${esc(E.noLots)}</p>`}
      </div>
    </section>
    <section class="tw__sec grid" aria-labelledby="ltt-faq">
      <h2 class="label tw__label" id="ltt-faq">${E.faq}</h2>
      <div class="faq">
${Q.map(([q, a]) => faqItem(q, esc(a))).join('\n')}
      </div>
    </section>
    <section class="related lt__work" aria-labelledby="ltt-work">
      <div class="related__head"><h2 class="label" id="ltt-work">${E.work}</h2><a class="label ulink" href="${up}${projectsPath(lang)}">${E.all} →</a></div>
${projectCards(lang, up, work.map(({ p }) => ({ p, meta: placeOf(lang, p) })))}    </section>
    <nav class="tw__sec grid" aria-labelledby="ltt-more">
      <h2 class="label tw__label" id="ltt-more">${E.more}</h2>
      <ul class="tw__aside guide__links">
        <li><a class="ulink" href="${up}${townCostPath(lang, t.slug)}">${esc(E.cost(t.name))} →</a></li>
        <li><a class="ulink" href="${up}${townPath(lang, t.slug)}">${esc(E.arch(t.name))} →</a></li>
        <li><a class="ulink" href="${up}${landPath(lang)}">${E.map} →</a></li>
      </ul>
    </nav>
  </article>
${contact(lang, E.wa(t.name), up, `?town=${t.slug}`)}</main>
${footer(lang, up, paths)}${end}`;
}

// ---------- Example projects, priced: /tools/cost-estimator/<scenario>/ (data/scenarios.json) ----------
const SCEN_PATH = join(ROOT, 'data', 'scenarios.json');
const scenarios = existsSync(SCEN_PATH) ? JSON.parse(readFileSync(SCEN_PATH, 'utf8')).scenarios : [];
const scenarioPath = (lang, sc) => `${estimatorPath(lang)}${sc.slug[lang]}/`;
const lcFirst = (x) => x.charAt(0).toLowerCase() + x.slice(1);
// months of design, permits and works, as the estimator's schedule counts them
function scheduleNode(D, st) {
  const M = D.durations, a = st.area, pr = D.programs.list.find((p) => p.key === st.type) ?? { permit: 'home', works: 1 };
  const design = M.concept + M.schematic + a / M.schematicPerM2 + M.drawings + a / M.drawingsPerM2;
  const permits = M.prepermits + (st.condo || st.town === 'papagayo' ? M.condo : 0) + (st.town === 'papagayo' ? M.ict : 0) + (a > 1000 ? M.setena : 0) + M.apc + (pr.permit !== 'home' ? M.publicReview : 0);
  const works = Math.min(M.maxWorks, (M.worksBase + a / M.worksPerM2) * M.qualityFactor[st.quality] * pr.works);
  return { design: Math.round(design), permits: Math.round(permits), works: Math.round(works) };
}
const SC = {
  en: {
    title: (n) => `Cost to build ${lcFirst(n)}, Costa Rica | Studio CAVA`,
    total: (e) => ` The estimate comes to ${usdK(e.total[0])} to ${usdK(e.total[2])}, likely ${usdK(e.total[1])}, with design, permits, VAT and a reserve.`,
    project: '(The project)', moves: '(What moves the number)', more: '(More examples)',
    movesNote: 'The likely figure, with one thing changed and the rest as above.',
    facts: { area: (a, s) => `${a.toLocaleString('en-US')} m² over ${s === 1 ? 'one storey' : `${s} storeys`}`, quality: { standard: 'Standard finish', high: 'High finish', luxury: 'Luxury finish' }, slope: { flat: 'Flat lot', gentle: 'Gentle slope', steep: 'Steep lot' }, pool: (m) => `A ${m} m² pool`, deck: (m) => `${m} m² of terraces and decks`, solar: 'Solar panels', landscape: 'Landscaping', furniture: 'Furniture, ready to rent', hotel: 'A small hotel', house: 'A house' },
    alt: { down: (q) => `A ${q.toLowerCase()}`, up: (q) => `A ${q.toLowerCase()}`, noPool: 'Without the pool', steep: 'On a steep lot', smaller: '20% less area', noFurniture: 'Without furniture' },
    town: (n) => `What it costs to build in ${n}`, land: (n) => `Land prices in ${n}`,
    wa: (n) => `Hi Studio CAVA, I saw your estimate for ${lcFirst(n)} and would like to talk about my project.`,
    faq: '(Questions)',
    q: {
      cost: (n) => `How much does it cost to build ${lcFirst(n)}, Costa Rica?`,
      costA: (e, area) => `About ${usdK(e.total[0])} to ${usdK(e.total[2])}, likely ${usdK(e.total[1])}, with design, permits, VAT and a reserve: construction at about US$${Math.round(e.rate[1]).toLocaleString('en-US')} a m², and about US$${Math.round(e.total[1] / area).toLocaleString('en-US')} a m² with everything in.`,
      time: (it) => `How long does it take to build ${it}?`,
      timeA: (s, dry) => `About ${s.design} months of design, ${s.permits} of permits and ${s.works} of works, which start once the permits are in and run straight through the rains. From the first meeting to moving in, plan on ${Math.round((s.design + s.permits + s.works) / 12 * 2) / 2} years or a little more.`,
      moves: () => 'What makes it cost more or less?',
      land: () => 'Does the estimate include the land?',
      landM: (n, m) => `No. Titled lots of 300 to 5,000 m² listed in ${n} ask a median of US$${m.median.toLocaleString('en-US')} a m²; tick "The land" in the estimator above to add it.`,
      landP: () => 'No: inside Península Papagayo the land is an ICT concession, with its own fees, and the estimate leaves it out.',
      landX: () => 'No. Tick "The land" in the estimator above to add it at the asking prices of the town.',
      it: { hotel: 'the hotel', house: 'the house' },
    },
  },
  es: {
    title: (n) => `Cuánto cuesta construir ${lcFirst(n)}, Costa Rica | Studio CAVA`,
    total: (e) => ` La estimación da de ${usdK(e.total[0])} a ${usdK(e.total[2])}, lo probable ${usdK(e.total[1])}, con diseño, permisos, IVA y una reserva.`,
    project: '(El proyecto)', moves: '(Qué mueve el número)', more: '(Más ejemplos)',
    movesNote: 'La cifra probable, cambiando una sola cosa y dejando el resto como arriba.',
    facts: { area: (a, s) => `${a.toLocaleString('en-US')} m² en ${s === 1 ? 'un piso' : `${s} pisos`}`, quality: { standard: 'Acabados estándar', high: 'Acabados altos', luxury: 'Acabados de lujo' }, slope: { flat: 'Lote plano', gentle: 'Pendiente suave', steep: 'Pendiente fuerte' }, pool: (m) => `Piscina de ${m} m²`, deck: (m) => `${m} m² de terrazas y decks`, solar: 'Paneles solares', landscape: 'Paisajismo', furniture: 'Mobiliario listo para alquilar', hotel: 'Un hotel pequeño', house: 'Una casa' },
    alt: { down: (q) => `${q}`, up: (q) => `${q}`, noPool: 'Sin piscina', steep: 'En pendiente fuerte', smaller: 'Un 20% menos de área', noFurniture: 'Sin mobiliario' },
    town: (n) => `Cuánto cuesta construir en ${n}`, land: (n) => `Precio del terreno en ${n}`,
    wa: (n) => `Hola Studio CAVA, vi su estimación de ${lcFirst(n)} y quisiera conversar sobre mi proyecto.`,
    faq: '(Preguntas)',
    q: {
      cost: (n) => `¿Cuánto cuesta construir ${lcFirst(n)}, Costa Rica?`,
      costA: (e, area) => `Unos ${usdK(e.total[0])} a ${usdK(e.total[2])}, lo probable ${usdK(e.total[1])}, con diseño, permisos, IVA y una reserva: la construcción a unos US$${Math.round(e.rate[1]).toLocaleString('en-US')} el m², y unos US$${Math.round(e.total[1] / area).toLocaleString('en-US')} el m² con todo.`,
      time: (it) => `¿Cuánto tarda construir ${it}?`,
      timeA: (s, dry) => `Unos ${s.design} meses de diseño, ${s.permits} de permisos y ${s.works} de obra, que arranca apenas salen los permisos y sigue sin pausa en lluvias. De la primera reunión a la mudanza, cuente con ${String(Math.round((s.design + s.permits + s.works) / 12 * 2) / 2).replace('.', ',')} años o un poco más.`,
      moves: () => '¿Qué lo hace costar más o menos?',
      land: () => '¿La estimación incluye el terreno?',
      landM: (n, m) => `No. Los lotes titulados de 300 a 5,000 m² anunciados en ${n} piden una mediana de US$${m.median.toLocaleString('en-US')} el m²; marque "El terreno" en el estimador de arriba para sumarlo.`,
      landP: () => 'No: dentro de la Península Papagayo el terreno es una concesión del ICT, con sus propios cobros, y la estimación lo deja fuera.',
      landX: () => 'No. Marque "El terreno" en el estimador de arriba para sumarlo a los precios pedidos del pueblo.',
      it: { hotel: 'el hotel', house: 'la casa' },
    },
  },
};
function scenarioPage(lang, sc) {
  const S = SC[lang];
  const T = sc[lang];
  const D = costsData();
  const st = { ...EST_DEFAULT, ...sc.preset };
  const e = estimateNode(D, st);
  const t = towns.find((x) => x.slug === st.town);
  const paths = { en: scenarioPath('en', sc), es: scenarioPath('es', sc) };
  const up = upFrom(paths[lang]);
  const F = S.facts;
  const facts = [F[st.type], F.area(st.area, st.storeys), F.quality[st.quality], F.slope[st.slope], st.pool ? F.pool(st.pool) : '', st.deck ? F.deck(st.deck) : '', st.solar ? F.solar : '', st.landscape ? F.landscape : '', st.furniture ? F.furniture : ''].filter(Boolean);
  // one change at a time, against the likely total
  const Q = ['standard', 'high', 'luxury'], qi = Q.indexOf(st.quality);
  const alts = [
    qi > 0 ? [S.alt.down(F.quality[Q[qi - 1]]), { quality: Q[qi - 1] }] : null,
    qi < 2 ? [S.alt.up(F.quality[Q[qi + 1]]), { quality: Q[qi + 1] }] : null,
    st.pool ? [S.alt.noPool, { pool: 0 }] : null,
    st.slope !== 'steep' ? [S.alt.steep, { slope: 'steep' }] : null,
    [S.alt.smaller, { area: Math.round(st.area * 0.8) }],
    st.furniture ? [S.alt.noFurniture, { furniture: false }] : null,
  ].filter(Boolean).map(([label, over]) => { const d = estimateNode(D, { ...st, ...over }).total[1] - e.total[1]; return [label, d]; });
  const sign = (d) => `${d > 0 ? '+' : '−'}${usdK(Math.abs(d))}`;
  const intro = `${T.lede}${S.total(e)}`;
  const sch = scheduleNode(D, st);
  const dc = climate(townOf(t)).dry;
  const lnd = land?.towns[st.town];
  const QQ = [
    [S.q.cost(T.name), S.q.costA(e, st.area)],
    [S.q.time(S.q.it[st.type]), S.q.timeA(sch, dc ? MONTHS[lang][dc.start] : null)],
    [S.q.moves(), alts.map(([l, d]) => `${l}: ${sign(d)}`).join('; ') + '.'],
    [S.q.land(), st.town === 'papagayo' ? S.q.landP() : lnd?.market ? S.q.landM(t.name, lnd.market) : S.q.landX()],
  ];
  const extra = `    <section class="tw__sec grid" aria-labelledby="sc-project">
      <h2 class="label tw__label" id="sc-project">${S.project}</h2>
      <div class="tw__text">
        <ul class="svc__for sc__facts">${facts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <p class="large">${esc(T.note)}</p>
      </div>
    </section>
    <section class="tw__sec grid" aria-labelledby="sc-moves">
      <h2 class="label tw__label" id="sc-moves">${S.moves}</h2>
      <div class="tw__text">
        <ul class="est__list est__list--soft sc__moves">${alts.map(([l, d]) => `<li><span>${esc(l)}</span><b>${sign(d)}</b></li>`).join('')}</ul>
        <p class="note">${S.movesNote}</p>
      </div>
    </section>
    <section class="tw__sec grid" aria-labelledby="sc-faq">
      <h2 class="label tw__label" id="sc-faq">${S.faq}</h2>
      <div class="faq">
${QQ.map(([q, a]) => faqItem(q, esc(a))).join('\n')}
      </div>
    </section>
    <nav class="tw__sec grid" aria-labelledby="sc-more">
      <h2 class="label tw__label" id="sc-more">${S.more}</h2>
      <ul class="tw__aside guide__links">
${scenarios.filter((o) => o !== sc).map((o) => `        <li><a class="ulink" href="${up}${scenarioPath(lang, o)}">${esc(o[lang].name)} →</a></li>`).join('\n')}
${t ? `        <li><a class="ulink" href="${up}${townCostPath(lang, t.slug)}">${esc(S.town(t.name))} →</a></li>\n` : ''}${t && land?.towns[t.slug] ? `        <li><a class="ulink" href="${up}${landTownPath(lang, t.slug)}">${esc(S.land(t.name))} →</a></li>\n` : ''}      </ul>
    </nav>
`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: S.title(T.name).split(' | ')[0], description: intro, inLanguage: lang, url: `${ORIGIN}/${paths[lang]}` },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Studio CAVA', item: `${ORIGIN}/${UI[lang].dir}` }, { '@type': 'ListItem', position: 2, name: ET[lang].h1.join(' '), item: `${ORIGIN}/${estimatorPath(lang)}` }, { '@type': 'ListItem', position: 3, name: T.name, item: `${ORIGIN}/${paths[lang]}` }] },
      { '@type': 'FAQPage', mainEntity: QQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  return estimatorPage(lang, { paths, title: S.title(T.name), description: intro, h1: T.h1, intro, preset: st, photo: sc.photo, extra, ld, cls: 'est--town', wa: S.wa(T.name), q: `?town=${st.town}` });
}

// ---------- The permit route: /tools/permit-route/ and drawn on every town page ----------
// The rules live in scripts/permit-route.mjs (also served to the browser); citations are the permits guide's sources.
const permitGuide = guides.find((g) => g.slug.en === 'building-permits');
const permitPath = (lang) => (lang === 'en' ? 'tools/permit-route/' : 'es/herramientas/ruta-de-permisos/');
const PR = {
  en: {
    title: 'Building permits in Costa Rica, step by step for your project | Studio CAVA',
    description: 'Which permits a house, a hotel or a shop in Costa Rica needs, in what order and from whom: answer five questions and the route draws itself, with the municipality, SETENA, the CFIA and every source.',
    label: '(Tool)', h1: ['Permit', 'route'], link: 'Permit route', name: 'The permit route for your project',
    intro: 'Which permits a project in Costa Rica needs, in what order and from whom. Answer five questions and the route draws itself, step by step, with the rules behind each one.',
    what: 'What', whats: { house: 'House', units: 'Villas, up to 3', apartments: 'Apartments, 4 or more', hotel: 'Hotel', shop: 'Shop or restaurant' },
    size: 'Built area', sizes: { s: 'Under 300 m²', m: '300 to 500 m²', l: '500 to 1,000 m²', xl: 'Over 1,000 m²' },
    lot: 'The lot', lots: { zmt: 'Within 200 m of the beach', river: 'Near a river or spring', forest: 'Forest on the lot', condo: 'In a condominium', road: 'Faces a national road' },
    where: 'Where', elsewhere: 'Elsewhere in Costa Rica',
    town: (n) => `Permits in ${n}`, here: '(The permit route here)', hereNote: 'A house of 300 to 500 m² to start with: change the project and the route redraws.',
    guide: 'Every step explained, in the building permits guide', service: 'We file the permits for you', sources: '(Sources)',
    note: 'General information, not legal advice: rules change, and each municipality applies them its own way. Reviewed October 2026.',
  },
  es: {
    title: 'Permisos de construcción en Costa Rica, paso a paso para su proyecto | Studio CAVA',
    description: 'Qué permisos necesita una casa, un hotel o un comercio en Costa Rica, en qué orden y ante quién: responda cinco preguntas y la ruta se dibuja sola, con la municipalidad, SETENA, el CFIA y cada fuente.',
    label: '(Herramienta)', h1: ['Ruta de', 'permisos'], link: 'Ruta de permisos', name: 'La ruta de permisos de su proyecto',
    intro: 'Qué permisos necesita un proyecto en Costa Rica, en qué orden y ante quién. Responda cinco preguntas y la ruta se dibuja sola, paso a paso, con las reglas detrás de cada uno.',
    what: 'Qué', whats: { house: 'Casa', units: 'Villas, hasta 3', apartments: 'Apartamentos, 4 o más', hotel: 'Hotel', shop: 'Comercio o restaurante' },
    size: 'Área construida', sizes: { s: 'Menos de 300 m²', m: '300 a 500 m²', l: '500 a 1,000 m²', xl: 'Más de 1,000 m²' },
    lot: 'El lote', lots: { zmt: 'A menos de 200 m de la playa', river: 'Cerca de un río o naciente', forest: 'Bosque en el lote', condo: 'En un condominio', road: 'Frente a una ruta nacional' },
    where: 'Dónde', elsewhere: 'En otro lugar de Costa Rica',
    town: (n) => `Permisos en ${n}`, here: '(La ruta de permisos aquí)', hereNote: 'Una casa de 300 a 500 m² para empezar: cambie el proyecto y la ruta se vuelve a dibujar.',
    guide: 'Cada paso explicado, en la guía de permisos de construcción', service: 'Tramitamos los permisos por usted', sources: '(Fuentes)',
    note: 'Información general, no asesoría legal: las reglas cambian y cada municipalidad las aplica a su manera. Revisado en octubre de 2026.',
  },
};
// the questions and the route, drawn for `preset`; `cite` is where source n lives
function permitWidget(lang, up, preset, cite) {
  const P = PR[lang];
  const q = { type: 'house', size: 'm', town: '', ...preset };
  const seg = (name, opts, checked) => `<div class="est__seg pr__seg" role="radiogroup">${Object.entries(opts).map(([v, l]) => `<label class="est__opt"><input type="radio" name="${name}" value="${v}"${v === checked ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>`;
  const r = permitRoute(q, lang);
  return `      <div class="pr" data-permit-route data-cite="${cite}">
        <form class="pr__form" data-pr-form onsubmit="return false">
          <fieldset class="est__field"><legend class="label">${P.what}</legend>${seg('type', P.whats, q.type)}</fieldset>
          <fieldset class="est__field"><legend class="label">${P.size}</legend>${seg('size', P.sizes, q.size)}</fieldset>
          <fieldset class="est__field est__checks pr__checks"><legend class="label">${P.lot}</legend>${Object.entries(P.lots).map(([k, l]) => `<label${k === 'condo' && q.town === 'papagayo' ? ' hidden' : ''}><input type="checkbox" name="${k}"${q[k] ? ' checked' : ''}> ${esc(l)}</label>`).join('')}</fieldset>
          <fieldset class="est__field"><legend class="label">${P.where}</legend><select class="input est__select" name="town"><option value="">${P.elsewhere}</option>${towns.filter((t) => TOWN_MUNI[t.slug]).map((t) => `<option value="${t.slug}"${t.slug === q.town ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select></fieldset>
        </form>
        <div class="pr__out" data-pr-out aria-live="polite">
${permitRender(r, lang, (n) => `${cite}${n}`)}
        </div>
      </div>
`;
}
function permitPage(lang) {
  const P = PR[lang];
  const paths = { en: permitPath('en'), es: permitPath('es') };
  const up = upFrom(paths[lang]);
  const permits = services.find((x) => x.slug.en === 'permits');
  const ld = { '@context': 'https://schema.org', '@type': 'WebApplication', name: P.name, description: P.description, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', inLanguage: lang, url: `${ORIGIN}/${paths[lang]}`, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, provider: { '@type': 'Organization', name: 'Studio CAVA', url: `${ORIGIN}/` } };
  return head(lang, { title: P.title, description: P.description, paths, image: `${imgBase('papagayo-404', 1)}-1600.webp`, up, script: 'permit-flow.js', jsonld: ld }) + `<div id="top"></div>
${bar(lang, up, paths, 'tools')}
<main class="page">
  <article class="mf prp" aria-labelledby="pr-title">
    <header class="mf__head grid">
      <p class="label mf__label">${P.label}</p>
      <h1 class="display mf__title" id="pr-title"><span>${esc(P.h1[0])}</span><span class="right">${esc(P.h1[1])}</span></h1>
      <p class="h3 mf__intro">${esc(P.intro)}</p>
      <p class="svc__cta mf__intro">${booking ? `<a class="btn btn--dark" href="${up}${bookPath(lang)}">${BK[lang].link} <span class="btn__dot" aria-hidden="true"></span></a> ` : ''}${permits ? `<a class="btn btn--light" href="${up}${servicePath(lang, permits)}">${P.service} <span class="btn__dot" aria-hidden="true"></span></a>` : ''}</p>
    </header>
${permitWidget(lang, up, { town: 'tamarindo' }, '#source-')}
    <p class="note pr__disclaimer">${esc(P.note)}</p>
    <nav class="tw__sec grid" aria-labelledby="pr-more">
      <h2 class="label tw__label" id="pr-more">${lang === 'en' ? '(Related)' : '(Relacionado)'}</h2>
      <ul class="tw__aside guide__links">
${permitGuide ? `        <li><a class="ulink" href="${up}${guidePath(lang, permitGuide)}">${P.guide} →</a></li>\n` : ''}${permits ? `        <li><a class="ulink" href="${up}${servicePath(lang, permits)}">${P.service} →</a></li>\n` : ''}${towns.filter((t) => TOWN_MUNI[t.slug]).map((t) => `        <li><a class="ulink" href="${up}${townPath(lang, t.slug)}#permits">${esc(P.town(t.name))} →</a></li>`).join('\n')}
      </ul>
    </nav>
${permitGuide ? `    <section class="tw__sec grid" aria-labelledby="pr-sources">
      <h2 class="label tw__label" id="pr-sources">${P.sources}</h2>
      <ol class="guide__sources">
${(Array.isArray(permitGuide[lang].sources) ? permitGuide[lang].sources : permitGuide[permitGuide[lang].sources].sources).map((x, k) => sourceItem(lang, x, k, '        ')).join('\n')}
      </ol>
    </section>
` : ''}  </article>
${contact(lang, UI[lang].wa.general, up)}</main>
${footer(lang, up, paths)}${end}`;
}

// ---------- sitemap.xml and robots.txt ----------
function sitemap() {
  const pairs = [
    { en: '', es: 'es/' },
    { en: projectsPath('en'), es: projectsPath('es') },
    ...projects.map((p) => ({ en: projectPath('en', p.slug), es: projectPath('es', p.slug) })),
    { en: studioPath('en'), es: studioPath('es') },
    ...(identity ? [{ en: identityPath('en'), es: identityPath('es') }] : []),
    ...(books ? [{ en: libraryPath('en'), es: libraryPath('es') }] : []),
    { en: townsPath('en'), es: townsPath('es') },
    ...towns.map((t) => ({ en: townPath('en', t.slug), es: townPath('es', t.slug) })),
    ...guides.map((g) => ({ en: guidePath('en', g), es: guidePath('es', g) })),
    ...(guides.length ? [{ en: guidesIndexPath('en'), es: guidesIndexPath('es') }] : []),
    ...(costs ? [{ en: estimatorPath('en'), es: estimatorPath('es') }, ...towns.map((t) => ({ en: townCostPath('en', t.slug), es: townCostPath('es', t.slug) })), ...scenarios.map((sc) => ({ en: scenarioPath('en', sc), es: scenarioPath('es', sc) }))] : []),
    ...(land ? [{ en: landPath('en'), es: landPath('es') }, ...towns.filter((t) => land.towns[t.slug]).map((t) => ({ en: landTownPath('en', t.slug), es: landTownPath('es', t.slug) }))] : []),
    ...(services.length ? [{ en: servicesPath('en'), es: servicesPath('es') }, ...services.map((x) => ({ en: servicePath('en', x), es: servicePath('es', x) }))] : []),
    ...(booking ? [{ en: bookPath('en'), es: bookPath('es') }] : []),
    ...(permitGuide ? [{ en: permitPath('en'), es: permitPath('es') }] : []),
  ];
  const alt = (pr) => ['en', 'es'].map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${ORIGIN}/${pr[l]}"/>`).join('\n') + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}/${pr.en}"/>`;
  const urls = pairs.flatMap((pr) => ['en', 'es'].map((l) => `  <url>\n    <loc>${ORIGIN}/${pr[l]}</loc>\n${alt(pr)}\n  </url>`));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

// ---------- Viewer list and hero slides for each home page ----------
// `up` is the path from that home page back to site/.
function rendersJs(lang, up) {
  // the home lightbox walks the photographs; plans stay on their project pages
  const list = projects.flatMap((p) => p.images.map((im, j) => [im, j]).filter(([im]) => !im.plan).map(([, j]) => ({ id: `${p.slug}-${j + 1}`, src: up + imgBase(p.slug, j + 1), v: imgVer(`${p.slug}/${j + 1}`), title: p.name, alt: altOf(lang, p, j + 1) })));
  const slides = hero.map((key) => {
    const [slug, n] = key.split('/');
    const p = bySlug.get(slug);
    const [w, h] = sizes[key];
    const location = tr(lang, p, 'location');
    return { src: up + imgBase(slug, n), v: imgVer(key), w, h, alt: altOf(lang, p, Number(n)), name: p.name, place: location ? location.split(',')[0] : tr(lang, p, 'type'), href: `${UI[lang].projectsDir}/${slug}/` };
  });
  return `/* Generated by scripts/build.mjs from data/projects.json. Do not edit by hand. */\nwindow.CAVA_RENDERS = ${JSON.stringify(list, null, 1)};\nwindow.CAVA_HERO = ${JSON.stringify(slides, null, 1)};\n`;
}

// ---------- /es/: the English home with scripts/home-es.mjs applied ----------
// Visible text and the attributes people read or hear: what must not stay in English.
function texts(html) {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->|<svg[\s\S]*?<\/svg>/g, '');
  const out = new Set();
  for (const m of body.matchAll(/>([^<]+)</g)) {
    const t = m[1].replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
    if (/\p{L}{2}/u.test(t)) out.add(t);
  }
  for (const m of body.matchAll(/\s(alt|aria-label|placeholder|title|value|content)="([^"]+)"/g)) {
    const t = m[2].trim();
    if (/\p{L}{2}/u.test(t) && !/^(https?:|width=)/.test(t)) out.add(t);
  }
  return out;
}

// The hand-written home page follows the data: "All projects (N)", "View all images (N)",
// and the fingerprint on every project image it shows.
// The home's process: the steps (buttons) and one image per stage that follows them (site.js).
function processSteps(lang, studioHref) {
  const st = studio[lang].process.stages;
  return `<!-- process -->
      <ol class="steps" data-psteps>
${st.map(([title], i) => `        <li><button class="steps__btn" type="button" data-pstep="${i}" aria-pressed="${i === 0}"><span>(${pad(i + 1)})</span>${esc(title)}</button></li>`).join('\n')}
      </ol>
      <a class="ulink steps__more" href="${studioHref}#process">${lang === 'en' ? 'How each stage works' : 'Cómo funciona cada etapa'} →</a>
      <!-- /process -->`;
}
function processFigure(lang, up) {
  const st = studio[lang].process.stages;
  return `<!-- process-fig -->
      <figure class="process__fig" data-pfig>
        <div class="process__frame">
${proc.stages.map((ids, i) => `          <div class="process__pic${i === 0 ? ' is-on' : ''}" data-pic="${i}">${procImg(lang, up, ids[0], '(min-width: 768px) 60vw, 92vw')}</div>`).join('\n')}
        </div>
        <figcaption class="process__cap">
${proc.stages.map((ids, i) => `          <span class="process__capline label${i === 0 ? ' is-on' : ''}" data-cap="${i}"><span>(${pad(i + 1)}) ${esc(st[i][0])}</span></span>`).join('\n')}
        </figcaption>
      </figure>
      <!-- /process-fig -->`;
}

function homeCounts() {
  const path = join(SITE, 'index.html');
  const before = readFileSync(path, 'utf8');
  const after = before
    .replace(/All projects \(\d+\)/, `All projects (${projects.length})`)
    .replace(/View all images \(\d+\)/, `View all images (${projects.reduce((n, p) => n + p.images.filter((im) => !im.plan).length, 0)})`)
    .replace(/(assets\/img\/projects\/([a-z0-9-]+)\/(\d+)-(?:800|1600)\.webp)(?:\?v=[0-9a-f]+)?/g, (m, url, slug, n) => `${url}?v=${imgVer(`${slug}/${n}`)}`)
    .replace(/(assets\/(?:css\/[a-z-]+\.css|js\/[a-z0-9.-]+\.js))(?:\?v=[0-9a-f]+)?"/g, (m, url) => `${url}?v=${assetVer(url)}"`)
    // the services list, from data/services.json: between its markers, or first put before the process
    .replace(/<!-- services -->[\s\S]*?<!-- \/services -->|(?=  <section class="process grid")/, (m) => (services.length ? servicesHome('en', '', 'services/') + (m ? '' : '\n\n') : m))
    .replace(/<!-- process -->[\s\S]*?<!-- \/process -->/, () => (proc ? processSteps('en', 'studio/') : ''))
    .replace(/<!-- process-fig -->[\s\S]*?<!-- \/process-fig -->/, () => (proc ? processFigure('en', '') : ''));
  if (after !== before) writeFileSync(path, after);
}

function homeEs() {
  homeCounts();
  const en = readFileSync(join(SITE, 'index.html'), 'utf8');
  let html = en;
  const missing = [];
  for (const [from, to] of PAIRS) {
    const before = html;
    html = from instanceof RegExp ? html.replace(from, to) : html.split(from).join(to);
    if (html === before) missing.push(String(from));
  }
  // image alt texts, from the data
  for (const p of projects) p.images.forEach((im, j) => {
    html = html.split(`alt="${esc(im.alt)}"`).join(`alt="${esc(altOf('es', p, j + 1))}"`);
  });
  // paths: /es/ sits one level down; project links go to /es/proyectos/
  const fix = (u) => {
    if (!u || /^(https?:|mailto:|tel:|data:|#|\/|\.\.\/)/.test(u)) return u;
    if (u.startsWith('projects/')) return `${UI.es.projectsDir}/${u.slice('projects/'.length)}`;
    if (u.startsWith('studio/identity/')) return identityPath('es').slice(3) + u.slice('studio/identity/'.length);
    if (u.startsWith('studio/library/')) return libraryPath('es').slice(3) + u.slice('studio/library/'.length);
    if (u.startsWith('studio/')) return `${UI.es.studioDir}/${u.slice('studio/'.length)}`;
    if (u.startsWith('architects/')) return `${UI.es.townsDir}/${u.slice('architects/'.length)}`;
    if (u.startsWith('guides/')) return `guias/${u.slice('guides/'.length)}`;
    if (u.startsWith('tools/cost-estimator/')) return `herramientas/estimador-de-costos/${u.slice('tools/cost-estimator/'.length)}`;
    if (u.startsWith('tools/land-prices/')) return `herramientas/precios-de-terrenos/${u.slice('tools/land-prices/'.length)}`;
    if (u.startsWith('tools/permit-route/')) return `herramientas/ruta-de-permisos/${u.slice('tools/permit-route/'.length)}`;
    if (u.startsWith('services/')) return `servicios/${u.slice('services/'.length)}`;
    if (u.startsWith('portal/')) return u;
    return `../${u}`;
  };
  html = html.replace(/\s(href|src|srcset|imagesrcset)="([^"]*)"/g, (m, attr, val) => {
    const v = /srcset$/.test(attr) ? val.split(',').map((part) => { const [u, ...rest] = part.trim().split(/\s+/); return [fix(u), ...rest].join(' '); }).join(', ') : fix(val);
    return ` ${attr}="${v}"`;
  });
  // the services list is written from data in each language, not translated pair by pair
  html = html.replace(/(assets\/js\/renders\.es\.js)\?v=[0-9a-f]+/, (m, url) => `${url}?v=${assetVer(url)}`);
  if (services.length) html = html.replace(/<!-- services -->[\s\S]*?<!-- \/services -->/, servicesHome('es', '../', 'servicios/'));
  if (proc) html = html.replace(/<!-- process -->[\s\S]*?<!-- \/process -->/, () => processSteps('es', `${UI.es.studioDir}/`)).replace(/<!-- process-fig -->[\s\S]*?<!-- \/process-fig -->/, () => processFigure('es', '../'));
  // project names and photo credits read the same in both languages
  const names = new Set([...projects.map((p) => p.name), ...Object.values(proc?.images ?? {}).filter((im) => im.by).map((im) => `${im.by}, ${im.site}`)]);
  const enTexts = texts(en);
  const left = [...texts(html)].filter((t) => enTexts.has(t) && !SAME.has(t) && !names.has(t));
  if (missing.length || left.length) {
    if (missing.length) console.error(`home-es.mjs: ${missing.length} replacement(s) no longer match site/index.html:\n  ${missing.join('\n  ')}`);
    if (left.length) console.error(`English text left on /es/ (translate it in scripts/home-es.mjs, or add it to SAME):\n  ${left.join('\n  ')}`);
    process.exit(1);
  }
  return html;
}

// ---------- /studio/library/ and /es/estudio/biblioteca/: the books on the studio's shelf ----------
// Text in data/books.json; covers (Open Library) in site/assets/img/books, sizes in data/book-covers.json.
const BOOKS_PATH = join(ROOT, 'data', 'books.json');
const books = existsSync(BOOKS_PATH) ? JSON.parse(readFileSync(BOOKS_PATH, 'utf8')) : null;
const bookCovers = books ? JSON.parse(readFileSync(join(ROOT, 'data', 'book-covers.json'), 'utf8')) : {};
const libraryPath = (lang) => (lang === 'en' ? 'studio/library/' : 'es/estudio/biblioteca/');
function libraryPage(lang) {
  const L = books[lang];
  const paths = { en: libraryPath('en'), es: libraryPath('es') };
  const up = upFrom(paths[lang]);
  const all = books.shelves.flatMap((sh) => sh.books);
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: L.h1.join(' '), itemListElement: all.map((b, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Book', name: b.title, author: b.by, url: `https://openlibrary.org/works/${b.ol}` } })) };
  return head(lang, { title: L.title, description: L.description, paths, image: `${imgBase('papagayo-404', 7)}-1600.webp`, up, jsonld: ld }) + `<div id="top"></div>
${bar(lang, up, paths, 'studio')}
<main class="page">
  <article class="mf lib" aria-labelledby="lib-title">
    <header class="mf__head grid">
      <p class="label mf__label"><a class="ulink" href="${up}${studioPath(lang)}">${UI[lang].nav.studio}</a> ${esc(L.label)}</p>
      <h1 class="display mf__title" id="lib-title"><span>${esc(L.h1[0])}</span><span class="right">${esc(L.h1[1])}</span></h1>
      <p class="h3 mf__intro">${esc(L.intro)}</p>
    </header>
${books.shelves.map((sh, k) => `    <section class="tw__sec grid lib__shelf" aria-labelledby="lib-s${k}">
      <h2 class="label tw__label" id="lib-s${k}">(${pad(k + 1)}) ${esc(sh[lang])}</h2>
      <ol class="lib__books">
${sh.books.map((b) => { const [w, h] = bookCovers[b.id]; const src = `${up}assets/img/books/${b.id}.webp?v=${assetVer(`assets/img/books/${b.id}.webp`)}`; return `        <li class="book">
          <a class="book__cover" href="https://openlibrary.org/works/${b.ol}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true"><img src="${src}" width="${w}" height="${h}" loading="lazy" decoding="async" alt=""></a>
          <h3 class="book__title"><a class="ulink" href="https://openlibrary.org/works/${b.ol}" target="_blank" rel="noopener">${esc(b.title)}</a></h3>
          <p class="label book__by">${esc(b.by)}<span>${esc(b.pub)}</span></p>
          <p class="book__why">${esc(b[lang])}</p>
        </li>`; }).join('\n')}
      </ol>
    </section>
`).join('')}    <p class="note lib__note">${esc(L.covers)}</p>
  </article>
${contact(lang, UI[lang].wa.general, up)}</main>
${footer(lang, up, paths)}${waButton(lang, UI[lang].wa.general)}${end}`;
}

// ---------- /portal/ and /es/portal/: the client sign-in (not connected yet) ----------
// The form sends nothing: its fields have no names and portal.js stops the submit and says so.
// The page is kept out of search (noindex, not in the sitemap).
const PT = {
  en: {
    title: 'Client portal | Studio CAVA', description: 'Sign in to the Studio CAVA client portal.',
    kicker: '(Sign in)', h1: 'Client portal',
    intro: 'Drawings, permits, the schedule, site visit reports and invoices for your project, in one place. Sign in with the email address we have on file.',
    email: 'Email', pw: 'Password', show: 'Show', hide: 'Hide', go: 'Sign in',
    forgot: 'Forgot your password?', link: 'Email me a sign-in link',
    inside: '(Inside)', items: ['Drawings', 'Permits', 'Schedule', 'Site visits', 'Invoices'],
    notYet: '(Not a client yet)', notYetText: 'The portal is for projects in progress with the studio. To start one, talk to us.',
    closed: (mail, waLink) => `The portal is not open yet, so nothing was sent and nothing was stored. For your files, write to ${mail} or ${waLink}.`,
    badEmail: 'Enter the email address we have on file, for example name@domain.com.',
    photo: '(Papagayo 404)',
  },
  es: {
    title: 'Portal de clientes | Studio CAVA', description: 'Ingreso al portal de clientes de Studio CAVA.',
    kicker: '(Ingreso)', h1: 'Portal de clientes',
    intro: 'Planos, permisos, cronograma, reportes de visita y facturas de su proyecto, en un solo lugar. Ingrese con el correo que tenemos registrado.',
    email: 'Correo', pw: 'Contraseña', show: 'Ver', hide: 'Ocultar', go: 'Ingresar',
    forgot: '¿Olvidó su contraseña?', link: 'Enviarme un enlace de acceso',
    inside: '(Adentro)', items: ['Planos', 'Permisos', 'Cronograma', 'Visitas de obra', 'Facturas'],
    notYet: '(Aún no es cliente)', notYetText: 'El portal es para proyectos en curso con el estudio. Para empezar uno, hablemos.',
    closed: (mail, waLink) => `El portal todavía no está abierto, así que no se envió ni se guardó nada. Para sus archivos, escriba a ${mail} o por ${waLink}.`,
    badEmail: 'Escriba el correo que tenemos registrado, por ejemplo nombre@dominio.com.',
    photo: '(Papagayo 404)',
  },
};
function portalPage(lang) {
  const P = PT[lang];
  const paths = { en: portalPath('en'), es: portalPath('es') };
  const up = upFrom(paths[lang]);
  const home = up + UI[lang].dir;
  const mail = `<a class="ulink" href="mailto:${EMAIL}">${EMAIL}</a>`;
  const waLink = `<a class="ulink" href="${wa(UI[lang].wa.general)}" target="_blank" rel="noopener">WhatsApp ${WHATSAPP_SHOWN}</a>`;
  const page = head(lang, { title: P.title, description: P.description, paths, image: `${imgBase('papagayo-404', 2)}-1600.webp`, up, script: 'portal.js' })
    .replace('<head>', '<head>\n<meta name="robots" content="noindex">');
  return page + `<div id="top"></div>
${bar(lang, up, paths, 'portal')}
<main class="page">
  <section class="portal" aria-labelledby="portal-title">
    <figure class="portal__media">
      ${picture(up, 'papagayo-404', 2, altOf(lang, projects.find((x) => x.slug === 'papagayo-404'), 2), '(min-width: 768px) 50vw, 100vw', { eager: true })}
      <figcaption class="label portal__cap">${esc(P.photo)}</figcaption>
    </figure>
    <div class="portal__panel">
      <p class="label">${esc(P.kicker)}</p>
      <h1 class="h3 portal__title" id="portal-title">${esc(P.h1)}</h1>
      <p class="portal__intro">${esc(P.intro)}</p>
      <form class="portal__form" data-portal novalidate onsubmit="return false">
        <label class="portal__field"><span class="label">${esc(P.email)}</span><input class="input" id="portal-email" type="email" autocomplete="username" inputmode="email" spellcheck="false" required></label>
        <label class="portal__field"><span class="label">${esc(P.pw)}</span><span class="portal__pw"><input class="input" id="portal-pw" type="password" autocomplete="current-password" required><button class="label portal__show" type="button" data-portal-show data-show="${esc(P.show)}" data-hide="${esc(P.hide)}" aria-pressed="false" aria-controls="portal-pw">${esc(P.show)}</button></span></label>
        <button class="btn btn--dark portal__go" type="submit">${esc(P.go)} <span class="btn__dot" aria-hidden="true"></span></button>
        <p class="portal__alt"><button class="ulink" type="button" data-portal-link>${esc(P.forgot)}</button><button class="ulink" type="button" data-portal-link>${esc(P.link)}</button></p>
        <p class="portal__status" data-portal-status role="status" aria-live="polite" hidden></p>
        <template data-msg="closed">${P.closed(mail, waLink)}</template>
        <template data-msg="email">${esc(P.badEmail)}</template>
      </form>
      <div class="portal__inside">
        <p class="label">${esc(P.inside)}</p>
        <ul>${P.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>
      </div>
      <div class="portal__new">
        <p class="label">${esc(P.notYet)}</p>
        <p>${esc(P.notYetText)}</p>
        <p class="portal__new-acts">${booking ? `<a class="btn btn--light" href="${up}${bookPath(lang)}">${BK[lang].link} <span class="btn__dot" aria-hidden="true"></span></a> ` : ''}<a class="btn btn--light" href="${home}#enquiry">${UI[lang].nav.cta} <span class="btn__dot" aria-hidden="true"></span></a></p>
      </div>
    </div>
  </section>
</main>
${footer(lang, up, paths)}${waButton(lang, UI[lang].wa.general)}${end}`;
}

// Projects that changed name: the old address forwards to the new page (GitHub Pages has no redirects).
const RENAMED = { 'portland-house': 'rancho-cartagena' };
const forward = (to, rel) => `<!doctype html>\n<html><head><meta charset="utf-8"><meta name="robots" content="noindex"><link rel="canonical" href="${ORIGIN}/${to}"><meta http-equiv="refresh" content="0; url=${rel}"><title>Moved</title></head><body><a href="${rel}">${to}</a></body></html>\n`;

const write = (path, html) => {
  // every page carries the floating WhatsApp button
  if (path.endsWith('.html') && !/class="wa["\s]/.test(html) && !html.includes('http-equiv="refresh"')) {
    const lang = /<html lang="es"/.test(html) ? 'es' : 'en';
    html = html.replace('</body>', `${waButton(lang, UI[lang].wa.general)}</body>`);
  }
  mkdirSync(join(SITE, dirname(path)), { recursive: true });
  writeFileSync(join(SITE, path), html);
};

for (const lang of ['en', 'es']) {
  write(`${projectsPath(lang)}index.html`, indexPage(lang));
  projects.forEach((p, i) => write(`${projectPath(lang, p.slug)}index.html`, projectPage(lang, p, i)));
  write(`${studioPath(lang)}index.html`, studioPage(lang));
  if (identity) write(`${identityPath(lang)}index.html`, identityPage(lang));
  write(`${townsPath(lang)}index.html`, hubPage(lang));
  towns.forEach((t) => write(`${townPath(lang, t.slug)}index.html`, townPage(lang, t)));
  guides.forEach((g) => write(`${guidePath(lang, g)}index.html`, guidePage(lang, g)));
  if (guides.length) write(`${guidesIndexPath(lang)}index.html`, guidesIndex(lang));
  if (costs) {
    write(`${estimatorPath(lang)}index.html`, estimatorPage(lang));
    towns.forEach((t) => write(`${townCostPath(lang, t.slug)}index.html`, townCostPage(lang, t)));
    scenarios.forEach((sc) => write(`${scenarioPath(lang, sc)}index.html`, scenarioPage(lang, sc)));
  }
  if (land && costs) {
    write(`${landPath(lang)}index.html`, landPage(lang));
    towns.filter((t) => land.towns[t.slug]).forEach((t) => write(`${landTownPath(lang, t.slug)}index.html`, landTownPage(lang, t)));
  }
  if (booking) write(`${bookPath(lang)}index.html`, bookPage(lang));
  write(`${portalPath(lang)}index.html`, portalPage(lang));
  if (books) write(`${libraryPath(lang)}index.html`, libraryPage(lang));
  for (const [from, to] of Object.entries(RENAMED)) write(`${projectPath(lang, from)}index.html`, forward(projectPath(lang, to), `../${to}/`));
  if (permitGuide) write(`${permitPath(lang)}index.html`, permitPage(lang));
  if (services.length) {
    write(`${servicesPath(lang)}index.html`, servicesIndex(lang));
    services.forEach((x, i) => write(`${servicePath(lang, x)}index.html`, servicePage(lang, x, i)));
  }
}
if (costs) write('assets/data/costs.json', JSON.stringify(costsData()));
write('sitemap.xml', sitemap());
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);

// ---------- 404.html: served for any missing path, so its links start at the root ----------
// Without it Cloudflare Pages would answer every unknown address with the home page (and a 200).
{
  const paths = { en: '', es: 'es/' };
  const page = head('en', { title: 'Page not found | Studio CAVA', description: 'This page does not exist.', paths, image: `${imgBase('casa-alcaravan', 1)}-1600.webp`, up: '/' }).replace('<head>', '<head>\n<meta name="robots" content="noindex">') + `<div id="top"></div>
${bar('en', '/', paths, '')}
<main class="page">
  <article class="mf" aria-labelledby="nf-title">
    <header class="mf__head grid">
      <p class="label mf__label">(404)</p>
      <h1 class="display mf__title" id="nf-title"><span>Page not</span><span class="right">found</span></h1>
      <p class="h3 mf__intro">This address does not exist, or it moved. Esta dirección no existe, o cambió de lugar.</p>
    </header>
    <nav class="tw__sec grid" aria-labelledby="nf-links">
      <h2 class="label tw__label" id="nf-links">(Studio CAVA)</h2>
      <ul class="tw__aside guide__links">
        <li><a class="ulink" href="/">Home →</a></li>
        <li><a class="ulink" href="/${projectsPath('en')}">Projects →</a></li>
        <li><a class="ulink" href="/${servicesPath('en')}">Services →</a></li>
        <li><a class="ulink" href="/${estimatorPath('en')}">${ET.en.name} →</a></li>
        <li><a class="ulink" href="/es/">Inicio en español →</a></li>
      </ul>
    </nav>
  </article>
</main>
${footer('en', '/', paths)}${end}`;
  write('404.html', page);
}

// ---------- _headers: how long Cloudflare Pages lets browsers keep each kind of file ----------
// Project images carry ?v=<hash> in every reference, so they can be kept for good; the rest changes in place.
write('_headers', `/assets/img/projects/*
  Cache-Control: public, max-age=31536000, immutable
/assets/img/places/*
  Cache-Control: public, max-age=604800
/assets/data/*
  Cache-Control: public, max-age=86400
/assets/css/*
  Cache-Control: public, max-age=600
/assets/js/*
  Cache-Control: public, max-age=600
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
`);
write('es/index.html', homeEs());
write('assets/js/renders.js', rendersJs('en', ''));
// the 3D sun path (site/assets/js/sun3d.js) runs the same solar maths as the build
write('assets/js/sun.mjs', readFileSync(join(ROOT, 'scripts', 'sun.mjs'), 'utf8'));
write('assets/js/permit-route.mjs', readFileSync(join(ROOT, 'scripts', 'permit-route.mjs'), 'utf8'));
write('assets/js/glossary.mjs', readFileSync(join(ROOT, 'scripts', 'glossary.mjs'), 'utf8'));
write('assets/js/renders.es.js', rendersJs('es', '../'));
console.log(`built ${towns.length} town pages and /architects/, /studio/, /projects/ and ${projects.length} project pages in each language, ${projects.reduce((n, p) => n + p.images.length, 0)} images; /es/ home`);
