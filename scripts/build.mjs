// Builds the project pages from data/projects.json. No dependencies.
//
//   node scripts/build.mjs
//
// Writes:
//   site/projects/index.html           all projects
//   site/projects/<slug>/index.html    one page per project: images and technical sheet
//   site/assets/js/renders.js          the list the home page render viewer walks
//
// Run scripts/images.py first when renders change (it writes data/image-sizes.json).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const { projects } = JSON.parse(readFileSync(join(ROOT, 'data', 'projects.json'), 'utf8'));
const sizes = JSON.parse(readFileSync(join(ROOT, 'data', 'image-sizes.json'), 'utf8'));

const ORIGIN = 'https://cava.design';
const WHATSAPP = '50671737336';
const WHATSAPP_SHOWN = '+506 7173 7336';
const EMAIL = 'hola@cava.design';
const TBC = 'To be confirmed';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
const wa = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
const MARK = '<svg class="brand__mark" viewBox="-366 -366 734 732" aria-hidden="true" focusable="false"><path d="M0-366A366 366 0 0 0 0 366Z"/><path d="M2-366H368V366Z"/></svg>';
const WA_ICON = '<svg class="wa__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

// Image helpers. `up` is the path back to site/ ("../" or "../../").
const imgBase = (slug, n) => `assets/img/projects/${slug}/${n}`;
function picture(up, slug, n, alt, sizesAttr, { eager = false, cls = '' } = {}) {
  const [w, h] = sizes[`${slug}/${n}`];
  const b = up + imgBase(slug, n);
  return `<img${cls ? ` class="${cls}"` : ''} src="${b}-1600.webp" srcset="${b}-800.webp 800w, ${b}-1600.webp 1600w" sizes="${sizesAttr}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" alt="${esc(alt)}">`;
}

function head({ title, description, path, image, up }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${ORIGIN}${path}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${ORIGIN}${path}">
<meta property="og:image" content="${ORIGIN}/${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#fcfcfc">
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${up}apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300..700&display=swap">
<link rel="stylesheet" href="${up}assets/css/site.css">
</head>
<body class="sub">
`;
}

function bar(up, current) {
  const link = (href, label, key) => `<a class="ulink" href="${href}"${current === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<header class="bar">
  <a class="bar__brand" href="${up}" aria-label="Studio CAVA, home">${MARK}<span>Studio CAVA</span></a>
  <nav class="bar__links label" aria-label="Main">
    ${link(`${up}projects/`, 'Projects', 'projects')}, ${link(`${up}#studio`, 'Studio')}, ${link(`${up}#process`, 'Process')}, ${link(`${up}#contact`, 'Contact')}
  </nav>
  <a class="btn btn--dark bar__cta" href="${up}#enquiry">Get in touch <span class="btn__dot" aria-hidden="true"></span></a>
</header>
`;
}

function contact(up, waText) {
  return `<section class="reach grid" aria-labelledby="reach-title">
  <span class="label reach__label" id="reach-title">(Start a project)</span>
  <div class="reach__main">
    <p class="h3">Tell us about your lot and what you want to build. We answer within a working day.</p>
    <div class="reach__actions">
      <a class="btn btn--dark" href="${wa(waText)}" target="_blank" rel="noopener">WhatsApp ${WHATSAPP_SHOWN} <span class="btn__dot" aria-hidden="true"></span></a>
      <a class="btn btn--light reach__mail" href="mailto:${EMAIL}">${EMAIL} <span class="btn__dot" aria-hidden="true"></span></a>
    </div>
  </div>
</section>
`;
}

function footer(up) {
  return `<footer class="footer page">
  <div class="grid footer__top">
    <div class="footer__brand cq">
      <p class="footer__word" aria-label="CAVA">CAVA</p>
    </div>
    <nav class="footer__nav" aria-label="Footer">
      <span class="label">(Navigation)</span>
      <a class="footer__link" href="${up}">Home</a>
      <a class="footer__link" href="${up}projects/">Projects</a>
      <a class="footer__link" href="${up}#studio">Studio</a>
      <a class="footer__link" href="${up}#process">Process</a>
      <a class="footer__link" href="${up}#enquiry">Contact us</a>
    </nav>
    <div class="footer__info">
      <div>
        <span class="label">(Studio)</span>
        <p>Studio CAVA is an architecture and interiors practice based in San José, working across Costa Rica. Formerly AVARQ.</p>
      </div>
      <div>
        <span class="label">(Info)</span>
        <dl class="info">
          <div><dt>A:</dt><dd>San José, Costa Rica</dd></div>
          <div><dt>W:</dt><dd><a class="ulink" href="${wa('Hi Studio CAVA, I would like to talk about a project.')}" target="_blank" rel="noopener">${WHATSAPP_SHOWN}</a></dd></div>
          <div><dt>E:</dt><dd><a class="ulink" href="mailto:${EMAIL}">${EMAIL}</a></dd></div>
          <div><dt>H:</dt><dd>Monday to Friday, 8:00 to 17:00</dd></div>
        </dl>
      </div>
      <img class="footer__mark" src="${up}assets/mark.svg" width="56" height="56" alt="">
    </div>
  </div>
  <div class="grid footer__bottom label">
    <p>© 2026 Studio CAVA<br>San José, Costa Rica</p>
    <p>cava.design</p>
    <p>Arquitectura</p>
    <a class="ulink" href="#top">Back to top ↑</a>
  </div>
</footer>
`;
}

const waButton = (text) => `<a class="wa is-on" href="${wa(text)}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp, opens in a new tab">
  ${WA_ICON}
  <span class="wa__label label">WhatsApp</span>
</a>
`;

const end = '</body>\n</html>\n';

// ---------- /projects/ ----------
function indexPage() {
  const up = '../';
  const cards = projects.map((p, i) => `    <li class="card">
      <a class="card__link" href="${p.slug}/">
        <span class="card__media">${picture(up, p.slug, 1, p.images[0].alt, '(min-width: 768px) 48vw, 92vw')}</span>
        <span class="card__cap label"><span>(${pad(i + 1)})</span><span class="card__name">${esc(p.name)}</span><span class="card__meta">${esc(p.type)}</span></span>
      </a>
    </li>`).join('\n');
  return head({
    title: 'Projects | Studio CAVA',
    description: `${projects.length} projects by Studio CAVA: houses, retreats, hangars, a bakery and a museum, each with its renders and technical sheet.`,
    path: '/projects/',
    image: `${imgBase(projects[0].slug, 1)}-1600.webp`,
    up,
  }) + `<div id="top"></div>
${bar(up, 'projects')}
<main class="page">
  <section class="plist cq" aria-labelledby="plist-title">
    <div class="plist__head">
      <h1 class="display" id="plist-title"><span>Projects</span></h1>
      <span class="display plist__count" aria-hidden="true">(${pad(projects.length)})</span>
    </div>
    <ol class="cards">
${cards}
    </ol>
  </section>
${contact(up, 'Hi Studio CAVA, I saw your projects and would like to talk about one of mine.')}</main>
${footer(up)}${waButton('Hi Studio CAVA, I saw your projects and would like to talk about one of mine.')}${end}`;
}

// ---------- /projects/<slug>/ ----------
const FACTS = [
  ['location', 'Location'], ['year', 'Year'], ['status', 'Status'], ['siteArea', 'Site area'], ['builtArea', 'Built area'],
  ['program', 'Program'], ['structure', 'Structure'], ['materials', 'Materials'], ['climate', 'Climate strategy'], ['team', 'Team'],
];

function projectPage(p, i) {
  const up = '../../';
  const next = projects[(i + 1) % projects.length];
  const rows = [
    ['Project', p.name],
    ['Type', p.type],
    ...FACTS.map(([k, label]) => [label, p[k]]),
    ['Images', `${p.images.length} concept render${p.images.length > 1 ? 's' : ''}`],
  ].map(([k, v]) => `        <div><dt>${k}</dt><dd${v == null ? ' class="tbc"' : ''}>${esc(v ?? TBC)}</dd></div>`).join('\n');
  const placeholders = FACTS.some(([k]) => p[k] == null);
  const rest = p.images.slice(1);
  const gallery = rest.length ? `    <section class="gallery${rest.length === 1 ? ' gallery--one' : ''}" aria-label="More images of ${esc(p.name)}">
${rest.map((im, j) => `      <figure class="gallery__item">${picture(up, p.slug, j + 2, im.alt, rest.length === 1 ? '92vw' : '(min-width: 768px) 46vw, 92vw')}</figure>`).join('\n')}
    </section>
` : '';
  const waText = `Hi Studio CAVA, I saw ${p.name} on your site and would like to talk about a project.`;
  return head({
    title: `${p.name} | Studio CAVA`,
    description: `${p.name}, ${p.type.toLowerCase()} by Studio CAVA. Renders and technical sheet.`,
    path: `/projects/${p.slug}/`,
    image: `${imgBase(p.slug, 1)}-1600.webp`,
    up,
  }) + `<div id="top"></div>
${bar(up, 'projects')}
<main class="page">
  <article class="proj" aria-labelledby="proj-title">
    <header class="proj__head cq">
      <p class="label proj__crumb"><a class="ulink" href="../">Projects</a><span aria-hidden="true">(${pad(i + 1)}/${pad(projects.length)})</span></p>
      <h1 class="display proj__title" id="proj-title">${esc(p.name)}</h1>
    </header>
    <figure class="proj__cover">${picture(up, p.slug, 1, p.images[0].alt, '100vw', { eager: true })}</figure>
    <section class="proj__body grid" aria-labelledby="sheet-title">
      <h2 class="label sheet__label" id="sheet-title">(Technical sheet)</h2>
      <dl class="sheet">
${rows}
      </dl>
${placeholders ? '      <p class="note sheet__note">Entries marked "To be confirmed" are placeholders until the studio confirms them.</p>\n' : ''}    </section>
${gallery}    <nav class="next" aria-label="Next project">
      <a class="next__link" href="../${next.slug}/">
        <span class="label">(Next project)</span>
        <span class="h3 next__name">${esc(next.name)} →</span>
      </a>
    </nav>
  </article>
${contact(up, waText)}</main>
${footer(up)}${waButton(waText)}${end}`;
}

// ---------- Viewer list for the home page ----------
function rendersJs() {
  const list = projects.flatMap((p) => p.images.map((im, j) => ({ id: `${p.slug}-${j + 1}`, src: imgBase(p.slug, j + 1), title: p.name, alt: im.alt })));
  return `/* Generated by scripts/build.mjs from data/projects.json. Do not edit by hand. */\nwindow.CAVA_RENDERS = ${JSON.stringify(list, null, 1)};\n`;
}

mkdirSync(join(SITE, 'projects'), { recursive: true });
writeFileSync(join(SITE, 'projects', 'index.html'), indexPage());
projects.forEach((p, i) => {
  mkdirSync(join(SITE, 'projects', p.slug), { recursive: true });
  writeFileSync(join(SITE, 'projects', p.slug, 'index.html'), projectPage(p, i));
});
writeFileSync(join(SITE, 'assets', 'js', 'renders.js'), rendersJs());
console.log(`built /projects/ and ${projects.length} project pages, ${projects.reduce((n, p) => n + p.images.length, 0)} renders`);
