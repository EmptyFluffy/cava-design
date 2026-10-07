// Builds the project pages, in English and Spanish, from data/projects.json. No dependencies.
//
//   node scripts/build.mjs
//
// Writes:
//   site/projects/index.html                 all projects
//   site/projects/<slug>/index.html          one page per project: images and technical sheet
//   site/es/proyectos/...                    the same pages in Spanish (text in scripts/strings.mjs)
//   site/studio/index.html, site/es/estudio/ what we believe, and the process (text in data/studio.json)
//   site/es/index.html                       the Spanish home: site/index.html with scripts/home-es.mjs applied
//   site/assets/js/renders.js, renders.es.js the list the home page image viewer and hero walk
//
// Run scripts/images.py first when images change (it writes data/image-sizes.json).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UI } from './strings.mjs';
import { PAIRS, SAME } from './home-es.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const { projects, hero } = JSON.parse(readFileSync(join(ROOT, 'data', 'projects.json'), 'utf8'));
const studio = JSON.parse(readFileSync(join(ROOT, 'data', 'studio.json'), 'utf8'));
const bySlug = new Map(projects.map((p) => [p.slug, p]));
const sizes = JSON.parse(readFileSync(join(ROOT, 'data', 'image-sizes.json'), 'utf8'));

const ORIGIN = 'https://cava.design';
const WHATSAPP = '50671737336';
const WHATSAPP_SHOWN = '+506 7173 7336';
const EMAIL = 'hola@cava.design';

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
const otherLang = (lang) => (lang === 'en' ? 'es' : 'en');

// Image helpers. `up` is the path back to site/ ("../", "../../" or "../../../").
const imgBase = (slug, n) => `assets/img/projects/${slug}/${n}`;
function picture(up, slug, n, alt, sizesAttr, { eager = false, cls = '' } = {}) {
  const [w, h] = sizes[`${slug}/${n}`];
  const b = up + imgBase(slug, n);
  return `<img${cls ? ` class="${cls}"` : ''} src="${b}-1600.webp" srcset="${b}-800.webp 800w, ${b}-1600.webp 1600w" sizes="${sizesAttr}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" alt="${esc(alt)}">`;
}

// `paths` = { en, es }: this page in each language, from the site root.
function head(lang, { title, description, paths, image, up, script }) {
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
${script ? `<script defer src="${up}assets/js/${script}"></script>
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
    ${link(up + projectsPath(lang), t.projects, 'projects')}, ${link(studioHref, t.studio, 'studio')}, ${link(`${studioHref}#process`, t.process)}, ${link(`${home}#contact`, t.contact)}, ${langLink(lang, up, paths, 'ulink lang')}
  </nav>
  <a class="btn btn--dark bar__cta" href="${home}#enquiry">${t.cta} <span class="btn__dot" aria-hidden="true"></span></a>
</header>
`;
}

function contact(lang, waText) {
  const t = UI[lang].reach;
  return `<section class="reach grid" aria-labelledby="reach-title">
  <span class="label reach__label" id="reach-title">${t.label}</span>
  <div class="reach__main">
    <p class="h3">${t.text}</p>
    <div class="reach__actions">
      <a class="btn btn--dark" href="${wa(waText)}" target="_blank" rel="noopener">WhatsApp ${WHATSAPP_SHOWN} <span class="btn__dot" aria-hidden="true"></span></a>
      <a class="btn btn--light reach__mail" href="mailto:${EMAIL}">${EMAIL} <span class="btn__dot" aria-hidden="true"></span></a>
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
      <a class="footer__link" href="${up}${studioPath(lang)}">${n.studio}</a>
      <a class="footer__link" href="${up}${studioPath(lang)}#process">${n.process}</a>
      <a class="footer__link" href="${home}#enquiry">${t.contactUs}</a>
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
${contact(lang, t.wa.projects)}</main>
${footer(lang, up, paths)}${waButton(lang, t.wa.projects)}${end}`;
}

// ---------- /projects/<slug>/ and /es/proyectos/<slug>/ ----------
const FACTS = ['location', 'year', 'status', 'siteArea', 'builtArea', 'program', 'structure', 'materials', 'climate', 'team'];

function mapFigure(lang, p) {
  const t = UI[lang].map;
  const [lng, lat] = p.coords;
  const location = tr(lang, p, 'location');
  const place = location ? location.split(',').slice(0, 2).join(',') : 'Guanacaste';
  const label = p.pin === 'placeholder' ? t.tbc : place;
  return `      <figure class="pmap" data-pmap data-lng="${lng}" data-lat="${lat}" data-label="${esc(label)}" data-pin="${p.pin}">
        <div class="pmap__canvas" role="img" aria-label="${esc(p.pin === 'placeholder' ? t.ariaPlaceholder(p.name) : t.aria(p.name, place))}"></div>
        <figcaption class="pmap__cap label"><span>${t.label}</span><span>${esc(label)}</span>${p.pin === 'approximate' ? `<span class="pmap__note">${t.approximate}</span>` : ''}</figcaption>
${p.pin === 'placeholder' ? `        <p class="note pmap__ph">${t.placeholderNote}</p>\n` : ''}      </figure>
`;
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
    ...FACTS.map((k) => [s.rows[k], tr(lang, p, k)]),
    [s.rows.images, s.images(p.images.length)],
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
${gallery}    <nav class="next" aria-label="${s.nextAria}">
      <a class="next__link" href="../${next.slug}/">
        <span class="label">${s.next}</span>
        <span class="h3 next__name">${esc(next.name)} →</span>
      </a>
    </nav>
  </article>
${contact(lang, waText)}</main>
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
${contact(lang, t.wa.general)}</main>
${footer(lang, up, paths)}${waButton(lang, t.wa.general)}${end}`;
}

// ---------- Viewer list and hero slides for each home page ----------
// `up` is the path from that home page back to site/.
function rendersJs(lang, up) {
  const list = projects.flatMap((p) => p.images.map((_, j) => ({ id: `${p.slug}-${j + 1}`, src: up + imgBase(p.slug, j + 1), title: p.name, alt: altOf(lang, p, j + 1) })));
  const slides = hero.map((key) => {
    const [slug, n] = key.split('/');
    const p = bySlug.get(slug);
    const [w, h] = sizes[key];
    const location = tr(lang, p, 'location');
    return { src: up + imgBase(slug, n), w, h, alt: altOf(lang, p, Number(n)), name: p.name, place: location ? location.split(',')[0] : tr(lang, p, 'type'), href: `${UI[lang].projectsDir}/${slug}/` };
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

function homeEs() {
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
    return `../${u}`;
  };
  html = html.replace(/\s(href|src|srcset|imagesrcset)="([^"]*)"/g, (m, attr, val) => {
    const v = /srcset$/.test(attr) ? val.split(',').map((part) => { const [u, ...rest] = part.trim().split(/\s+/); return [fix(u), ...rest].join(' '); }).join(', ') : fix(val);
    return ` ${attr}="${v}"`;
  });
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
}
write('es/index.html', homeEs());
write('assets/js/renders.js', rendersJs('en', ''));
write('assets/js/renders.es.js', rendersJs('es', '../'));
console.log(`built /studio/, /es/estudio/, /projects/, /es/proyectos/ and ${projects.length} project pages in each language, ${projects.reduce((n, p) => n + p.images.length, 0)} images; /es/ home`);
