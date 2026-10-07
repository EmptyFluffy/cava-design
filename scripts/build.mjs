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
function picture(up, slug, n, alt, sizesAttr, { eager = false, cls = '' } = {}) {
  const [w, h] = sizes[`${slug}/${n}`];
  const b = up + imgBase(slug, n);
  const v = `?v=${imgVer(`${slug}/${n}`)}`;
  return `<img${cls ? ` class="${cls}"` : ''} src="${b}-1600.webp${v}" srcset="${b}-800.webp${v} 800w, ${b}-1600.webp${v} 1600w" sizes="${sizesAttr}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" alt="${esc(alt)}">`;
}

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
<link rel="stylesheet" href="${up}assets/css/site.css">
${[].concat(script ?? []).map((s) => `<script defer src="${up}assets/js/${s}"></script>
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

function bar(lang, up, paths, current) {
  const t = UI[lang].nav;
  const home = up + UI[lang].dir;
  const link = (href, label, key) => `<a class="ulink" href="${href}"${current === key ? ' aria-current="page"' : ''}>${label}</a>`;
  const studioHref = up + studioPath(lang);
  return `<header class="bar">
  <a class="bar__brand" href="${home}" aria-label="${t.home}">${MARK}<span>Studio CAVA</span></a>
  <nav class="bar__links label" aria-label="${t.aria}">
    ${link(up + projectsPath(lang), t.projects, 'projects')}, ${services.length ? `${link(up + servicesPath(lang), SVT[lang].link, 'services')}, ` : ''}${link(studioHref, t.studio, 'studio')}, <span class="nav__process">${link(`${studioHref}#process`, t.process)}, </span>${link(`${home}#contact`, t.contact)}, ${langLink(lang, up, paths, 'ulink lang')}
  </nav>
  <a class="btn btn--dark bar__cta" href="${home}#enquiry">${t.cta} <span class="btn__dot" aria-hidden="true"></span></a>
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
      <a class="footer__link" href="${home}">${t.home}</a>
      <a class="footer__link" href="${up}${projectsPath(lang)}">${n.projects}</a>
${services.length ? `      <a class="footer__link" href="${up}${servicesPath(lang)}">${SVT[lang].link}</a>
` : ''}      <a class="footer__link" href="${up}${studioPath(lang)}">${n.studio}</a>
      <a class="footer__link" href="${up}${studioPath(lang)}#process">${n.process}</a>
      <a class="footer__link" href="${up}${townsPath(lang)}">${t.where}</a>
${guides.length ? `      <a class="footer__link" href="${up}${guidesIndexPath(lang)}">${GT[lang].guides}</a>
` : ''}${costs ? `      <a class="footer__link" href="${up}${estimatorPath(lang)}">${ET[lang].link}</a>
` : ''}${land ? `      <a class="footer__link" href="${up}${landPath(lang)}">${LT[lang].link}</a>
` : ''}      <a class="footer__link" href="${home}#enquiry">${t.contactUs}</a>
      <a class="footer__link" href="${up}${paths[otherLang(lang)]}" hreflang="${o.lang}" lang="${o.lang}">${o.name}</a>
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
  </div>
  <div class="grid footer__bottom label">
    <p>© 2026 Studio CAVA<br>San José, Costa Rica</p>
    <p>cava.design</p>
    <p>Arquitectura</p>
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
  const rest = p.images.slice(1);
  // Every image in the gallery shares the narrowest image's proportion, so rows line up
  // and wider images are cropped at the sides, never at the top or bottom.
  const ratio = Math.min(...rest.map((_, j) => { const [w, h] = sizes[`${p.slug}/${j + 2}`]; return w / h; }));
  const gallery = rest.length ? `    <section class="gallery${rest.length === 1 ? ' gallery--one' : rest.length === 3 ? ' gallery--three' : ''}" style="--ratio: ${ratio.toFixed(3)}" aria-label="${esc(s.more(p.name))}">
${rest.map((_, j) => `      <figure class="gallery__item">${picture(up, p.slug, j + 2, altOf(lang, p, j + 2), rest.length === 1 ? '92vw' : rest.length === 3 ? '(min-width: 768px) 31vw, 92vw' : '(min-width: 768px) 46vw, 92vw')}</figure>`).join('\n')}
    </section>
` : '';
  const waText = t.wa.project(p.name);
  return head(lang, {
    title: `${p.name} | Studio CAVA`,
    description: s.description(p.name, type),
    paths,
    image: `${imgBase(p.slug, 1)}-1600.webp`,
    up,
    script: 'project.js',
  }) + `<div id="top"></div>
${bar(lang, up, paths, 'projects')}
<main class="page">
  <article class="proj" aria-labelledby="proj-title">
    <header class="proj__head cq">
      <p class="label proj__crumb"><a class="ulink" href="../">${s.crumb}</a><span aria-hidden="true">(${pad(i + 1)}/${pad(projects.length)})</span></p>
      <h1 class="display proj__title" id="proj-title">${esc(p.name)}</h1>
    </header>
    <figure class="proj__cover">${picture(up, p.slug, 1, altOf(lang, p, 1), '100vw', { eager: true })}</figure>
    <section class="proj__body grid" aria-labelledby="sheet-title">
      <h2 class="label sheet__label" id="sheet-title">${s.sheet}</h2>
      <dl class="sheet">
${rows}
      </dl>
${placeholders ? `      <p class="note sheet__note">${s.tbcNote}</p>\n` : ''}${mapFigure(lang, p)}    </section>
${gallery}    <section class="related" aria-labelledby="related-title">
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

// ---------- /studio/ and /es/estudio/: what we believe, and the process ----------
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
      </li>`).join('\n');
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
  return `      <figure class="rain tw__fig" style="--wn: ${b.n}">
        <div class="rain__plot" role="img" aria-label="${esc(L.year.chart(t, d))}. ${esc(L.year.best)}: ${esc(label)}">
${ticks.map((v) => `          <span class="rain__tick" style="--v: ${(v / RAIN_MAX).toFixed(3)}"><span>${v}</span></span>`).join('\n')}
          <div class="rain__window" aria-hidden="true">
            <span class="rain__hatch"></span>
            <span class="rain__dim"></span>
            <span class="rain__dimlabel"><b>${L.year.best}</b><span>${label}</span></span>
          </div>
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
    image: `${imgBase(work[0].p.slug, 1)}-1600.webp`, up, script: ['project.js', 'climate-map.js'], jsonld: ld,
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
${P.ownSteps ? `      <p class="large tw__aside">${lang === 'en' ? 'Building here follows its own route, set out below.' : 'Construir aquí sigue su propia ruta, que se explica abajo.'}</p>` : `      <ol class="tw__steps">
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
${Q.map(([q, a]) => `        <div class="faq__item"><h3>${esc(q)}</h3><p class="large">${esc(a)}</p></div>`).join('\n')}
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
${costs ? `      <li class="stage"><span class="label stage__n">(${pad(guides.length + 1)})</span><h3 class="stage__title"><a class="ulink" href="${up}${estimatorPath(lang)}">${esc(ET[lang].name)}</a></h3><p class="large stage__text">${esc(ET[lang].description)}</p></li>\n` : ''}${land ? `      <li class="stage"><span class="label stage__n">(${pad(guides.length + (costs ? 2 : 1))})</span><h3 class="stage__title"><a class="ulink" href="${up}${landPath(lang)}">${esc(LT[lang].name)}</a></h3><p class="large stage__text">${esc(LT[lang].description)}</p></li>\n` : ''}    </ol>
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
${G.faq.map(([q, a]) => `        <div class="faq__item"><h3>${esc(q)}</h3><p class="large">${cite(a)}</p></div>`).join('\n')}
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
${costs ? `        <li><a class="ulink" href="${up}${estimatorPath(lang)}">${esc(ET[lang].name)} →</a></li>\n` : ''}        <li><a class="ulink" href="${up}${townsPath(lang)}">${lang === 'en' ? 'Rain, sun, wind and permits, town by town' : 'Lluvia, sol, viento y permisos, pueblo por pueblo'} →</a></li>
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
    description: 'What a house or a small hotel costs to build in Costa Rica, from the Ministry of Finance\'s official values, CFIA fees, VAT and builders\' prices by town, with a schedule set to the dry season.',
    label: '(Tool)', h1: ['Cost', 'estimator'],
    intro: 'What a house or a small hotel costs to build in Costa Rica, and how long it takes, in a few choices. The numbers come from the Ministry of Finance, the CFIA and builders, and every one has its source below.',
    where: 'Where', other: 'Somewhere else in Costa Rica', what: 'What', types: { house: 'House', hotel: 'Small hotel' },
    size: 'Built area', storeys: 'Storeys', quality: 'Finish level', qualities: { standard: 'Standard', high: 'High', luxury: 'Luxury' },
    qualityNotes: { standard: 'Three or four good bathrooms, a designed facade, some double heights', high: 'Very good bathrooms, ceilings of 3 to 5 m, large glazing', luxury: 'Marble, fine woods, imported finishes' },
    site: 'Lot', slopes: { flat: 'Flat', gentle: 'Gentle slope', steep: 'Steep' },
    extras: 'Extras', pool: 'Pool', pools: { 0: 'None', 15: 'Plunge, 15 m²', 32: 'Pool, 32 m²', 50: 'Large, 50 m²' }, deck: 'Terraces and decks',
    solar: 'Solar panels', landscape: 'Landscaping', furniture: 'Furniture, ready to rent', land: 'The land', lot: 'Lot, m²', condo: 'In a condominium or gated community', currency: 'Show in',
    resultLabel: '(Estimate)', hard: 'Construction', soft: 'Design, permits and taxes', parts: '(Construction, by part)', softs: '(Design, permits and taxes)',
    massing: '(The volume)', schedule: '(Schedule)', dry: 'Dry season', flags: '(To keep in mind)',
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
    description: 'Cuánto cuesta construir una casa o un hotel pequeño en Costa Rica, con los valores oficiales de Hacienda, los honorarios del CFIA, el IVA y precios de constructores por pueblo, y un cronograma ajustado a la época seca.',
    label: '(Herramienta)', h1: ['Estimador', 'de costos'],
    intro: 'Cuánto cuesta construir una casa o un hotel pequeño en Costa Rica, y cuánto tarda, en unas pocas decisiones. Los números salen del Ministerio de Hacienda, del CFIA y de constructores, y cada uno tiene su fuente abajo.',
    where: 'Dónde', other: 'En otro lugar de Costa Rica', what: 'Qué', types: { house: 'Casa', hotel: 'Hotel pequeño' },
    size: 'Área construida', storeys: 'Pisos', quality: 'Nivel de acabados', qualities: { standard: 'Estándar', high: 'Alto', luxury: 'Lujo' },
    qualityNotes: { standard: 'Tres o cuatro baños buenos, fachada diseñada, algunas dobles alturas', high: 'Baños muy buenos, cielos de 3 a 5 m, grandes ventanales', luxury: 'Mármol, maderas finas, acabados importados' },
    site: 'Lote', slopes: { flat: 'Plano', gentle: 'Pendiente suave', steep: 'Pendiente fuerte' },
    extras: 'Extras', pool: 'Piscina', pools: { 0: 'Ninguna', 15: 'Pequeña, 15 m²', 32: 'Piscina, 32 m²', 50: 'Grande, 50 m²' }, deck: 'Terrazas y decks',
    solar: 'Paneles solares', landscape: 'Paisajismo', furniture: 'Mobiliario, listo para alquilar', land: 'El terreno', lot: 'Lote, m²', condo: 'En un condominio o residencial cerrado', currency: 'Mostrar en',
    resultLabel: '(Estimación)', hard: 'Construcción', soft: 'Diseño, permisos e impuestos', parts: '(Construcción, por partida)', softs: '(Diseño, permisos e impuestos)',
    massing: '(El volumen)', schedule: '(Cronograma)', dry: 'Época seca', flags: '(A tomar en cuenta)',
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
  return {
    updated: costs.updated,
    fx: costs.fx,
    perM2: { house: tiers(costs.tiers.house, 'house'), hotel: tiers(costs.tiers.hotel, 'building') },
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
      <form class="est__form" data-est-form onsubmit="return false">
        <fieldset class="est__field"><legend class="label">${E.where}</legend>
          <select class="input est__select" name="town">${towns.map((t) => `<option value="${t.slug}"${t.slug === P.town ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}<option value="other">${E.other}</option></select>
        </fieldset>
        <fieldset class="est__field"><legend class="label">${E.what}</legend>${seg('type', ['house', 'hotel'], P.type, E.types)}</fieldset>
        <fieldset class="est__field"><legend class="label">${E.size}</legend>
          <div class="est__area"><input type="range" min="60" max="1500" step="10" value="${P.area}" data-est-area-range aria-label="${E.size}"><input class="input est__num" type="number" name="area" min="40" max="3000" step="10" value="${P.area}" data-est-area-box aria-label="${E.size}, m²"></div>
          <p class="note" data-est-area-out></p>
        </fieldset>
        <fieldset class="est__field"><legend class="label">${E.storeys}</legend>${seg('storeys', [1, 2, 3], P.storeys, { 1: '1', 2: '2', 3: '3' })}</fieldset>
        <fieldset class="est__field"><legend class="label">${E.quality}</legend>${seg('quality', ['standard', 'high', 'luxury'], P.quality, E.qualities, E.qualityNotes)}</fieldset>
        <fieldset class="est__field"><legend class="label">${E.site}</legend>${seg('slope', ['flat', 'gentle', 'steep'], P.slope, E.slopes)}</fieldset>
        <fieldset class="est__field"><legend class="label">${E.pool}</legend>${seg('pool', [0, 15, 32, 50], P.pool, E.pools)}</fieldset>
        <fieldset class="est__field"><legend class="label">${E.deck}</legend>
          <div class="est__area"><input type="range" name="deck" min="0" max="300" step="10" value="${P.deck}" aria-label="${E.deck}"></div>
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
      <div class="est__out" aria-live="polite">
        <section class="est__block est__totals" aria-labelledby="est-result">
          <h2 class="label" id="est-result">${E.resultLabel}</h2>
          <p class="note est__choices" data-est-choices></p>
          <p class="est__total" data-est-total></p>
          <p class="est__likely label" data-est-likely></p>
          <p class="note" data-est-rate></p>
          <dl class="est__split"><div><dt class="label">${E.hard}</dt><dd data-est-hard></dd></div><div><dt class="label">${E.soft}</dt><dd data-est-soft></dd></div></dl>
        </section>
        <section class="est__block est__budget" aria-labelledby="est-budget-t">
          <h2 class="label" id="est-budget-t">${E.budget}</h2>
          <p class="note">${E.budgetNote}</p>
          <label class="est__budget-in"><span class="label" data-est-budget-cur data-usd="${E.budgetCur.usd}" data-crc="${E.budgetCur.crc}">${E.budgetCur.usd}</span><input class="input est__num" type="text" inputmode="decimal" autocomplete="off" value="600,000" data-est-budget aria-label="${E.budget.replace(/[()]/g, '')}"></label>
          <ul class="est__fits" data-est-fits></ul>
        </section>
        <section class="est__block" aria-labelledby="est-massing-t">
          <h2 class="label" id="est-massing-t">${E.massing}</h2>
          <svg class="est__massing" data-est-massing role="img" aria-label="${E.massing}"></svg>
          <p class="note" data-est-massing-cap></p>
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
            <div><h3 class="label">${E.inLabel}</h3><ul>${E.included.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
            <div><h3 class="label">${E.outLabel}</h3><ul>${E.excluded.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
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
${land ? `            <li><a class="ulink" href="${up}${landPath(lang)}">${esc(LT[lang].name)} →</a></li>\n` : ''}${guides.map((g) => `            <li><a class="ulink" href="${up}${guidePath(lang, g)}">${esc(g[lang].link)} →</a></li>`).join('\n')}
          </ul>
        </section>
        <div class="est__actions">
          <a class="btn btn--dark" data-est-wa data-phone="${WHATSAPP}" href="${wa(UI[lang].wa.general)}" target="_blank" rel="noopener">${E.whatsapp} <span class="btn__dot" aria-hidden="true"></span></a>
${booking ? `          <a class="btn btn--light" data-est-book href="${up}${bookPath(lang)}">${lang === 'en' ? 'Book a free call about it' : 'Agendar una llamada sobre esto'} <span class="btn__dot" aria-hidden="true"></span></a>
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
    <section class="tw__sec grid" aria-labelledby="est-method">
      <h2 class="label tw__label" id="est-method">${E.method}</h2>
      <div class="tw__text guide__body">
        <h3 class="guide__h2">${E.methodTitle}</h3>
${M.method.map((x) => `        <p class="large">${cite(x)}</p>`).join('\n')}
        <ol class="guide__sources guide__sources--inline">
${costs.sources.map((s, k) => sourceItem(lang, s, k, '          ')).join('\n')}
        </ol>
      </div>
    </section>
  </article>
${contact(lang, pg?.wa ?? UI[lang].wa.general, up, pg?.q ?? '')}</main>
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
      <figcaption class="place__credit">${lang === 'en' ? 'Photo' : 'Foto'}: <a href="${esc(ph.url)}" target="_blank" rel="noopener">${esc(ph.by)}, ${ph.site}</a></figcaption>
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
    description: 'A free 30-minute video call with Studio CAVA about your lot and your project in Costa Rica: what the rules allow, what it could cost and how long it takes. Pick a time that suits you.',
    label: '(Free call)', h1: ['Book a', 'free call'],
    intro: 'Thirty minutes by video, free, with the architect who would design your project: your lot, what the rules allow, what it could cost and how long it takes.',
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
    cover: '(What we cover)', covers: ['Your lot: what the land use, the setbacks, the water and the slope allow', 'What it could cost and how long it takes, with our estimator', 'How we work, our fees and the next step'],
    helps: '(What helps)', helpsList: ['The location of the lot, or its cadastral plan', 'Photos of the lot and of houses you like', 'A budget range and when you would like to move in'],
  },
  es: {
    link: 'Agende una llamada', title: 'Agende una llamada gratis con un arquitecto | Studio CAVA',
    description: 'Una videollamada gratis de 30 minutos con Studio CAVA sobre su lote y su proyecto en Costa Rica: qué permiten las reglas, cuánto podría costar y cuánto tarda. Elija la hora que le sirva.',
    label: '(Llamada gratis)', h1: ['Agende una', 'llamada gratis'],
    intro: 'Treinta minutos por video, gratis, con el arquitecto que diseñaría su proyecto: su lote, qué permiten las reglas, cuánto podría costar y cuánto tarda.',
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
    cover: '(De qué hablamos)', covers: ['Su lote: lo que permiten el uso de suelo, los retiros, el agua y la pendiente', 'Cuánto podría costar y cuánto tarda, con nuestro estimador', 'Cómo trabajamos, nuestros honorarios y el siguiente paso'],
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
        <div class="bk__cal-head"><p class="bk__month" data-bk-month></p><div class="bk__nav"><button type="button" data-bk-prev aria-label="${B.prev}">‹</button><button type="button" data-bk-next aria-label="${B.next}">›</button></div></div>
        <div class="bk__grid" data-bk-days></div>
        <p class="note bk__status" data-bk-status aria-live="polite"></p>
      </section>
      <section class="bk__times" aria-label="${lang === 'en' ? 'Times' : 'Horas'}">
        <div class="bk__times-head"><p class="bk__day" data-bk-day></p><div class="cmap__seg bk__h24" role="group" aria-label="${lang === 'en' ? 'Clock' : 'Formato'}"><button type="button" data-h24="0" aria-pressed="true">12 h</button><button type="button" data-h24="1" aria-pressed="false">24 h</button></div></div>
        <ul class="bk__list" data-bk-times></ul>
      </section>
      <form class="bk__form" data-bk-form novalidate>
        <label class="bk__field"><span class="label">${B.name} *</span><input class="input" name="name" autocomplete="name" required></label>
        <label class="bk__field"><span class="label">${B.email} *</span><input class="input" type="email" name="email" autocomplete="email" required></label>
        <label class="bk__field"><span class="label">${B.phone} <i>(${B.optional})</i></span><input class="input" type="tel" name="phone" autocomplete="tel" placeholder="+1 555 123 4567"></label>
        <label class="bk__field"><span class="label">${B.where}</span><select class="input" name="where"><option value="unsure">${B.unsure}</option>${towns.map((t) => `<option value="${t.slug}">${esc(t.name)}</option>`).join('')}<option value="other">${B.other}</option></select></label>
        <fieldset class="bk__field bk__wide"><legend class="label">${B.what}</legend>${seg('what', B.whats)}</fieldset>
        <fieldset class="bk__field bk__wide"><legend class="label">${B.lot}</legend>${seg('lot', B.lots)}</fieldset>
        <label class="bk__field"><span class="label">${B.budget} <i>(${B.optional})</i></span><select class="input" name="budget">${B.budgets.map((x, i) => `<option value="${i}">${esc(x)}</option>`).join('')}</select></label>
        <label class="bk__field bk__wide"><span class="label">${B.notes} <i>(${B.optional})</i></span><textarea class="input" name="notes" rows="3" placeholder="${esc(B.notesHint)}"></textarea></label>
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
${services.map((s, i) => { const T = s[lang]; const [slug, n] = s.image.split('/'); return `        <li class="card">
          <a class="card__link" href="${s.slug[lang]}/">
            <span class="card__media">${picture(up, slug, +n, altOf(lang, projects.find((p) => p.slug === slug), +n), '(min-width: 768px) 31vw, 92vw')}</span>
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
    <section class="tw__sec grid" aria-labelledby="svc-glance">
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
    <section class="tw__sec grid" aria-labelledby="svc-how">
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
${costs ? `          <li><a class="ulink" href="${up}${estimatorPath(lang)}">${S.estimator} →</a></li>\n` : ''}${T.guide && guides[0] ? `          <li><a class="ulink" href="${up}${guidePath(lang, guides[0])}">${S.guide} →</a></li>\n` : ''}        </ul>
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
${T.faq.map(([q, a]) => `        <div class="faq__item"><h3>${esc(q)}</h3><p class="large">${c(a)}</p></div>`).join('\n')}
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
    <section class="tw__sec grid" aria-labelledby="lt-method">
      <h2 class="label tw__label" id="lt-method">${E.method}</h2>
      <div class="tw__text guide__body">
        <h3 class="guide__h2">${E.methodTitle}</h3>
${LAND_METHOD[lang].map((x) => `        <p class="large">${cite(x)}</p>`).join('\n')}
        <ol class="guide__sources guide__sources--inline">
${LAND_SOURCES.map((x, k) => sourceItem(lang, x, k, '          ')).join('\n')}
        </ol>
      </div>
    </section>
    <nav class="tw__sec grid" aria-labelledby="lt-more">
      <h2 class="label tw__label" id="lt-more">${E.more}</h2>
      <ul class="tw__aside guide__links">
${costs ? `        <li><a class="ulink" href="${up}${estimatorPath(lang)}">${esc(ET[lang].name)} →</a></li>\n` : ''}${guides.map((g) => `        <li><a class="ulink" href="${up}${guidePath(lang, g)}">${esc(g[lang].link)} →</a></li>`).join('\n')}
        <li><a class="ulink" href="${up}${townsPath(lang)}">${lang === 'en' ? 'Rain, sun, wind and permits, town by town' : 'Lluvia, sol, viento y permisos, pueblo por pueblo'} →</a></li>
      </ul>
    </nav>
  </article>
${contact(lang, UI[lang].wa.general, up)}</main>
${footer(lang, up, paths)}${end}`;
}

// ---------- "What it costs to build in <town>": the estimator preset for one town ----------
// Also the landing page for that town's ads: the number first, then the tool, the place, the answers, the call.
const townCostPath = (lang, slug) => `${estimatorPath(lang)}${slug}/`;
// the estimator's sums, here so the page can quote them (site/assets/js/estimator.js does the same in the browser)
function estimateNode(D, st) {
  const town = D.towns.find((t) => t.slug === st.town) ?? null;
  const place = (town && D.place.town[town.slug]) || D.place.region[town ? town.region : 'other'] || 1;
  const hotel = st.type === 'hotel';
  const rate = D.perM2[hotel ? 'hotel' : 'house'][st.quality].map((x) => x * place);
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
    description: (n, e) => `A 250 m² house with a pool in ${n} costs about ${usdK(e.total[0])} to ${usdK(e.total[2])} to build, with design, permits and VAT. Change the size, finish and extras, and see the schedule set to its dry season.`,
    label: '(Estimator)', h1: (n) => ['Cost to build', `in ${n}`],
    intro: (n, e) => `A 250 m² house with a high finish and a pool in ${n} comes to about ${usdK(e.total[0])} to ${usdK(e.total[2])}, likely ${usdK(e.total[1])}, with design, permits, VAT and a reserve. Change anything below and the numbers follow.`,
    facts: (n) => `(${n}, in numbers)`, rate: 'Construction, high finish', landM: 'Land, lots for sale', landO: 'Land, Hacienda residential values', dry: 'Dry season', rainDays: 'Days of heavy rain a year', permits: 'Permits', drive: 'From Liberia airport',
    perM2: (v) => `US$${v.toLocaleString('en-US')} a m²`, lots: (m) => `US$${m.median.toLocaleString('en-US')} a m², median of ${m.n} lots`, none: 'No dry season', days: (n) => `about ${n}`,
    faq: '(Questions)', more: '(Also on this town)', arch: (n) => `Architects in ${n}: climate, permits and our work`, landLink: (n) => `Land prices in ${n}`,
    wa: (n) => `Hi Studio CAVA, I am looking at building in ${n} and would like to talk about it.`,
    q: {
      cost: (n) => `How much does it cost to build a house in ${n}?`,
      costA: (n, e, s, l) => `A 250 m² house with a high finish, a 32 m² pool, solar panels and landscaping comes to about ${usdK(e.total[0])} to ${usdK(e.total[2])} in ${n}, likely ${usdK(e.total[1])}. That is construction at about US$${Math.round(e.rate[1]).toLocaleString('en-US')} a m², plus design, permits, VAT and a reserve. With a standard finish the likely figure drops to about ${usdK(s.total[1])}; with a luxury one it rises to about ${usdK(l.total[1])}.`,
      land: (n) => `How much is land in ${n}?`,
      landM: (n, m) => `Titled residential lots of 300 to 5,000 m² listed in ${n} ask a median of US$${m.median.toLocaleString('en-US')} a m², with the middle half between US$${m.p25.toLocaleString('en-US')} and ${m.p75.toLocaleString('en-US')} (${m.n} lots, October 2026). These are asking prices; sales close lower.`,
      landO: (n, lo, hi, y) => `Few lots are listed in ${n}. Hacienda's official values for its residential zones run from about US$${lo} to ${hi} a m² (${y} edition), and the market usually sits above them.`,
      landP: () => 'Inside Península Papagayo the land is not sold: it is a concession from the ICT, with its own fees.',
      when: (n) => `When is the best time to start building in ${n}?`,
      whenA: (n, dry, open, heavy) => `At the opening of the dry season, which in ${n} runs ${dry}: earthworks and foundations then start in ${open}, with ${heavy < 1 ? 'almost no days' : `about ${heavy} days`} of heavy rain in the first four months against many more in the rains. Design and permits take most of a year, so the time to start the design is the year before.`,
      whenNo: (n) => `${n} has no dry season to wait for: rain falls all year, so works start once the permits are in and are planned around the wettest months.`,
      who: (n) => `Who issues building permits in ${n}?`,
      whoA: (n, muni) => `${muni.charAt(0).toUpperCase() + muni.slice(1)} issues the licence, after the drawings are approved in the CFIA's APC. Under 500 m² a house does not need SETENA; between 500 and 1,000 m² it does only on fragile sites, and over 1,000 m² it does.`,
    },
  },
  es: {
    link: (n) => `Cuánto cuesta construir en ${n}`,
    title: (n) => `Cuánto cuesta construir una casa en ${n} | Studio CAVA`,
    description: (n, e) => `Una casa de 250 m² con piscina en ${n} cuesta de ${usdK(e.total[0])} a ${usdK(e.total[2])}, con diseño, permisos e IVA. Cambie el tamaño, los acabados y los extras, y vea el cronograma ajustado a la época seca.`,
    label: '(Estimador)', h1: (n) => ['Construir', `en ${n}`],
    intro: (n, e) => `Una casa de 250 m² con acabados altos y piscina en ${n} sale en unos ${usdK(e.total[0])} a ${usdK(e.total[2])}, lo probable ${usdK(e.total[1])}, con diseño, permisos, IVA y una reserva. Cambie lo que quiera abajo y los números lo siguen.`,
    facts: (n) => `(${n}, en números)`, rate: 'Construcción, acabados altos', landM: 'Terreno, lotes en venta', landO: 'Terreno, valores residenciales de Hacienda', dry: 'Época seca', rainDays: 'Días de lluvia fuerte al año', permits: 'Permisos', drive: 'Desde el aeropuerto de Liberia',
    perM2: (v) => `US$${v.toLocaleString('en-US')} el m²`, lots: (m) => `US$${m.median.toLocaleString('en-US')} el m², mediana de ${m.n} lotes`, none: 'No hay época seca', days: (n) => `unos ${n}`,
    faq: '(Preguntas)', more: '(También de este pueblo)', arch: (n) => `Arquitectos en ${n}: clima, permisos y nuestro trabajo`, landLink: (n) => `Precio del terreno en ${n}`,
    wa: (n) => `Hola Studio CAVA, estoy pensando en construir en ${n} y quisiera conversarlo.`,
    q: {
      cost: (n) => `¿Cuánto cuesta construir una casa en ${n}?`,
      costA: (n, e, s, l) => `Una casa de 250 m² con acabados altos, piscina de 32 m², paneles solares y paisajismo sale en unos ${usdK(e.total[0])} a ${usdK(e.total[2])} en ${n}, lo probable ${usdK(e.total[1])}. Es la construcción a unos US$${Math.round(e.rate[1]).toLocaleString('en-US')} el m², más diseño, permisos, IVA y una reserva. Con acabados estándar lo probable baja a unos ${usdK(s.total[1])}; con acabados de lujo sube a unos ${usdK(l.total[1])}.`,
      land: (n) => `¿Cuánto cuesta el terreno en ${n}?`,
      landM: (n, m) => `Los lotes residenciales titulados de 300 a 5,000 m² anunciados en ${n} piden una mediana de US$${m.median.toLocaleString('en-US')} el m², con la mitad central entre US$${m.p25.toLocaleString('en-US')} y ${m.p75.toLocaleString('en-US')} (${m.n} lotes, octubre de 2026). Son precios pedidos; las ventas cierran más abajo.`,
      landO: (n, lo, hi, y) => `En ${n} hay pocos lotes anunciados. Los valores oficiales de Hacienda para sus zonas residenciales van de unos US$${lo} a ${hi} el m² (edición ${y}), y el mercado suele estar por encima.`,
      landP: () => 'Dentro de la Península Papagayo el terreno no se vende: es una concesión del ICT, con sus propios cobros.',
      when: (n) => `¿Cuál es el mejor momento para empezar a construir en ${n}?`,
      whenA: (n, dry, open, heavy) => `Al inicio de la época seca, que en ${n} va de ${dry}: el movimiento de tierra y las fundaciones arrancan entonces en ${open}, con ${heavy < 1 ? 'casi ningún día' : `unos ${heavy} días`} de lluvia fuerte en los primeros cuatro meses, contra muchos más en lluvias. El diseño y los permisos toman casi un año, así que el momento de empezar el diseño es el año anterior.`,
      whenNo: (n) => `En ${n} no hay época seca que esperar: llueve todo el año, así que la obra arranca cuando salen los permisos y se planifica alrededor de los meses más lluviosos.`,
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
${Q.map(([q, a]) => `        <div class="faq__item"><h3>${esc(q)}</h3><p class="large">${esc(a)}</p></div>`).join('\n')}
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
    title: (n) => `Precio del terreno en ${n}: valor por m² | Studio CAVA`,
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
${Q.map(([q, a]) => `        <div class="faq__item"><h3>${esc(q)}</h3><p class="large">${esc(a)}</p></div>`).join('\n')}
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
const SC = {
  en: {
    title: (n) => `What ${lcFirst(n)} costs to build | Studio CAVA`,
    total: (e) => ` The estimate comes to ${usdK(e.total[0])} to ${usdK(e.total[2])}, likely ${usdK(e.total[1])}, with design, permits, VAT and a reserve.`,
    project: '(The project)', moves: '(What moves the number)', more: '(More examples)',
    movesNote: 'The likely figure, with one thing changed and the rest as above.',
    facts: { area: (a, s) => `${a.toLocaleString('en-US')} m² over ${s === 1 ? 'one storey' : `${s} storeys`}`, quality: { standard: 'Standard finish', high: 'High finish', luxury: 'Luxury finish' }, slope: { flat: 'Flat lot', gentle: 'Gentle slope', steep: 'Steep lot' }, pool: (m) => `A ${m} m² pool`, deck: (m) => `${m} m² of terraces and decks`, solar: 'Solar panels', landscape: 'Landscaping', furniture: 'Furniture, ready to rent', hotel: 'A small hotel', house: 'A house' },
    alt: { down: (q) => `A ${q.toLowerCase()}`, up: (q) => `A ${q.toLowerCase()}`, noPool: 'Without the pool', steep: 'On a steep lot', smaller: '20% less area', noFurniture: 'Without furniture' },
    town: (n) => `What it costs to build in ${n}`, land: (n) => `Land prices in ${n}`,
    wa: (n) => `Hi Studio CAVA, I saw your estimate for ${lcFirst(n)} and would like to talk about my project.`,
  },
  es: {
    title: (n) => `Cuánto cuesta construir ${lcFirst(n)} | Studio CAVA`,
    total: (e) => ` La estimación da de ${usdK(e.total[0])} a ${usdK(e.total[2])}, lo probable ${usdK(e.total[1])}, con diseño, permisos, IVA y una reserva.`,
    project: '(El proyecto)', moves: '(Qué mueve el número)', more: '(Más ejemplos)',
    movesNote: 'La cifra probable, cambiando una sola cosa y dejando el resto como arriba.',
    facts: { area: (a, s) => `${a.toLocaleString('en-US')} m² en ${s === 1 ? 'un piso' : `${s} pisos`}`, quality: { standard: 'Acabados estándar', high: 'Acabados altos', luxury: 'Acabados de lujo' }, slope: { flat: 'Lote plano', gentle: 'Pendiente suave', steep: 'Pendiente fuerte' }, pool: (m) => `Piscina de ${m} m²`, deck: (m) => `${m} m² de terrazas y decks`, solar: 'Paneles solares', landscape: 'Paisajismo', furniture: 'Mobiliario listo para alquilar', hotel: 'Un hotel pequeño', house: 'Una casa' },
    alt: { down: (q) => `${q}`, up: (q) => `${q}`, noPool: 'Sin piscina', steep: 'En pendiente fuerte', smaller: 'Un 20% menos de área', noFurniture: 'Sin mobiliario' },
    town: (n) => `Cuánto cuesta construir en ${n}`, land: (n) => `Precio del terreno en ${n}`,
    wa: (n) => `Hola Studio CAVA, vi su estimación de ${lcFirst(n)} y quisiera conversar sobre mi proyecto.`,
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
    <nav class="tw__sec grid" aria-labelledby="sc-more">
      <h2 class="label tw__label" id="sc-more">${S.more}</h2>
      <ul class="tw__aside guide__links">
${scenarios.filter((o) => o !== sc).map((o) => `        <li><a class="ulink" href="${up}${scenarioPath(lang, o)}">${esc(o[lang].name)} →</a></li>`).join('\n')}
${t ? `        <li><a class="ulink" href="${up}${townCostPath(lang, t.slug)}">${esc(S.town(t.name))} →</a></li>\n` : ''}${t && land?.towns[t.slug] ? `        <li><a class="ulink" href="${up}${landTownPath(lang, t.slug)}">${esc(S.land(t.name))} →</a></li>\n` : ''}      </ul>
    </nav>
`;
  const intro = `${T.lede}${S.total(e)}`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: S.title(T.name).split(' | ')[0], description: intro, inLanguage: lang, url: `${ORIGIN}/${paths[lang]}` },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Studio CAVA', item: `${ORIGIN}/${UI[lang].dir}` }, { '@type': 'ListItem', position: 2, name: ET[lang].h1.join(' '), item: `${ORIGIN}/${estimatorPath(lang)}` }, { '@type': 'ListItem', position: 3, name: T.name, item: `${ORIGIN}/${paths[lang]}` }] },
    ],
  };
  return estimatorPage(lang, { paths, title: S.title(T.name), description: intro, h1: T.h1, intro, preset: st, photo: sc.photo, extra, ld, cls: 'est--town', wa: S.wa(T.name), q: `?town=${st.town}` });
}

// ---------- sitemap.xml and robots.txt ----------
function sitemap() {
  const pairs = [
    { en: '', es: 'es/' },
    { en: projectsPath('en'), es: projectsPath('es') },
    ...projects.map((p) => ({ en: projectPath('en', p.slug), es: projectPath('es', p.slug) })),
    { en: studioPath('en'), es: studioPath('es') },
    { en: townsPath('en'), es: townsPath('es') },
    ...towns.map((t) => ({ en: townPath('en', t.slug), es: townPath('es', t.slug) })),
    ...guides.map((g) => ({ en: guidePath('en', g), es: guidePath('es', g) })),
    ...(guides.length ? [{ en: guidesIndexPath('en'), es: guidesIndexPath('es') }] : []),
    ...(costs ? [{ en: estimatorPath('en'), es: estimatorPath('es') }, ...towns.map((t) => ({ en: townCostPath('en', t.slug), es: townCostPath('es', t.slug) })), ...scenarios.map((sc) => ({ en: scenarioPath('en', sc), es: scenarioPath('es', sc) }))] : []),
    ...(land ? [{ en: landPath('en'), es: landPath('es') }, ...towns.filter((t) => land.towns[t.slug]).map((t) => ({ en: landTownPath('en', t.slug), es: landTownPath('es', t.slug) }))] : []),
    ...(services.length ? [{ en: servicesPath('en'), es: servicesPath('es') }, ...services.map((x) => ({ en: servicePath('en', x), es: servicePath('es', x) }))] : []),
    ...(booking ? [{ en: bookPath('en'), es: bookPath('es') }] : []),
  ];
  const alt = (pr) => ['en', 'es'].map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${ORIGIN}/${pr[l]}"/>`).join('\n') + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}/${pr.en}"/>`;
  const urls = pairs.flatMap((pr) => ['en', 'es'].map((l) => `  <url>\n    <loc>${ORIGIN}/${pr[l]}</loc>\n${alt(pr)}\n  </url>`));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

// ---------- Viewer list and hero slides for each home page ----------
// `up` is the path from that home page back to site/.
function rendersJs(lang, up) {
  const list = projects.flatMap((p) => p.images.map((_, j) => ({ id: `${p.slug}-${j + 1}`, src: up + imgBase(p.slug, j + 1), v: imgVer(`${p.slug}/${j + 1}`), title: p.name, alt: altOf(lang, p, j + 1) })));
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
function homeCounts() {
  const path = join(SITE, 'index.html');
  const before = readFileSync(path, 'utf8');
  const after = before
    .replace(/All projects \(\d+\)/, `All projects (${projects.length})`)
    .replace(/View all images \(\d+\)/, `View all images (${projects.reduce((n, p) => n + p.images.length, 0)})`)
    .replace(/(assets\/img\/projects\/([a-z0-9-]+)\/(\d+)-(?:800|1600)\.webp)(?:\?v=[0-9a-f]+)?/g, (m, url, slug, n) => `${url}?v=${imgVer(`${slug}/${n}`)}`)
    // the services list, from data/services.json: between its markers, or first put before the process
    .replace(/<!-- services -->[\s\S]*?<!-- \/services -->|(?=  <section class="process grid")/, (m) => (services.length ? servicesHome('en', '', 'services/') + (m ? '' : '\n\n') : m));
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
    if (u.startsWith('studio/')) return `${UI.es.studioDir}/${u.slice('studio/'.length)}`;
    if (u.startsWith('architects/')) return `${UI.es.townsDir}/${u.slice('architects/'.length)}`;
    if (u.startsWith('guides/')) return `guias/${u.slice('guides/'.length)}`;
    if (u.startsWith('tools/cost-estimator/')) return `herramientas/estimador-de-costos/${u.slice('tools/cost-estimator/'.length)}`;
    if (u.startsWith('tools/land-prices/')) return `herramientas/precios-de-terrenos/${u.slice('tools/land-prices/'.length)}`;
    if (u.startsWith('services/')) return `servicios/${u.slice('services/'.length)}`;
    return `../${u}`;
  };
  html = html.replace(/\s(href|src|srcset|imagesrcset)="([^"]*)"/g, (m, attr, val) => {
    const v = /srcset$/.test(attr) ? val.split(',').map((part) => { const [u, ...rest] = part.trim().split(/\s+/); return [fix(u), ...rest].join(' '); }).join(', ') : fix(val);
    return ` ${attr}="${v}"`;
  });
  // the services list is written from data in each language, not translated pair by pair
  if (services.length) html = html.replace(/<!-- services -->[\s\S]*?<!-- \/services -->/, servicesHome('es', '../', 'servicios/'));
  const names = new Set(projects.map((p) => p.name));
  const enTexts = texts(en);
  const left = [...texts(html)].filter((t) => enTexts.has(t) && !SAME.has(t) && !names.has(t));
  if (missing.length || left.length) {
    if (missing.length) console.error(`home-es.mjs: ${missing.length} replacement(s) no longer match site/index.html:\n  ${missing.join('\n  ')}`);
    if (left.length) console.error(`English text left on /es/ (translate it in scripts/home-es.mjs, or add it to SAME):\n  ${left.join('\n  ')}`);
    process.exit(1);
  }
  return html;
}

const write = (path, html) => { mkdirSync(join(SITE, dirname(path)), { recursive: true }); writeFileSync(join(SITE, path), html); };

for (const lang of ['en', 'es']) {
  write(`${projectsPath(lang)}index.html`, indexPage(lang));
  projects.forEach((p, i) => write(`${projectPath(lang, p.slug)}index.html`, projectPage(lang, p, i)));
  write(`${studioPath(lang)}index.html`, studioPage(lang));
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
  if (services.length) {
    write(`${servicesPath(lang)}index.html`, servicesIndex(lang));
    services.forEach((x, i) => write(`${servicePath(lang, x)}index.html`, servicePage(lang, x, i)));
  }
}
if (costs) write('assets/data/costs.json', JSON.stringify(costsData()));
write('sitemap.xml', sitemap());
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
write('es/index.html', homeEs());
write('assets/js/renders.js', rendersJs('en', ''));
// the 3D sun path (site/assets/js/sun3d.js) runs the same solar maths as the build
write('assets/js/sun.mjs', readFileSync(join(ROOT, 'scripts', 'sun.mjs'), 'utf8'));
write('assets/js/renders.es.js', rendersJs('es', '../'));
console.log(`built ${towns.length} town pages and /architects/, /studio/, /projects/ and ${projects.length} project pages in each language, ${projects.reduce((n, p) => n + p.images.length, 0)} images; /es/ home`);
