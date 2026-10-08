/* Studio CAVA: a sheet that explains things. It slides in from the right (from the bottom on a phone).
   - Anything with data-term="<key>" opens that entry of the permits glossary (glossary.mjs, loaded the
     first time), with links to related entries and to the sources.
   - Other scripts call window.CAVA_SHEET.open({ kicker, title, html }) with their own content
     (the estimator's finish levels). */
(() => {
  'use strict';

  const SCRIPT = document.currentScript && document.currentScript.src;
  if (!SCRIPT) return;
  const lang = document.documentElement.lang === 'es' ? 'es' : 'en';
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let sheet, panel, body, opener = null, gloss = null, citeBase = '#source-';

  function build() {
    sheet = document.createElement('div');
    sheet.className = 'isheet';
    sheet.innerHTML = `<div class="isheet__scrim" data-isheet-close></div>
      <aside class="isheet__panel" role="dialog" aria-modal="true" aria-labelledby="isheet-title" tabindex="-1">
        <button class="isheet__close" type="button" data-isheet-close aria-label="${lang === 'es' ? 'Cerrar' : 'Close'}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9m0-9-9 9"/></svg></button>
        <div class="isheet__body"></div>
      </aside>`;
    document.body.appendChild(sheet);
    panel = sheet.querySelector('.isheet__panel');
    body = sheet.querySelector('.isheet__body');
    sheet.addEventListener('click', (e) => {
      if (e.target.closest('[data-isheet-close]')) close();
      if (e.target.closest('.isheet__src a')) close();
      const t = e.target.closest('[data-term]');
      if (t && sheet.contains(t)) { e.preventDefault(); showTerm(t.dataset.term); }
    });
    document.addEventListener('keydown', (e) => {
      if (!sheet.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const f = [...panel.querySelectorAll('button, a[href]')].filter((el) => !el.disabled && el.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  function open({ kicker = '', title, html }) {
    if (!sheet) build();
    if (!sheet.classList.contains('is-open')) opener = document.activeElement;
    body.innerHTML = `${kicker ? `<p class="label isheet__kicker">${esc(kicker)}</p>` : ''}<h2 class="isheet__title" id="isheet-title">${esc(title)}</h2>${html}`;
    body.scrollTop = 0;
    panel.scrollTop = 0;
    document.documentElement.classList.add('isheet-lock');
    sheet.classList.add('is-on');
    requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('is-open')));
    setTimeout(() => panel.focus({ preventScroll: true }), still ? 0 : 300);
  }
  function close() {
    sheet.classList.remove('is-open');
    document.documentElement.classList.remove('isheet-lock');
    setTimeout(() => sheet.classList.remove('is-on'), still ? 0 : 420);
    opener?.focus?.({ preventScroll: true });
  }

  async function showTerm(key) {
    sheet?.classList.remove('isheet--wide');
    gloss ||= await import(new URL('glossary.mjs', SCRIPT).href);
    const e = gloss.G[key];
    if (!e) return;
    const t = e[lang], U = gloss.UI[lang];
    const facts = t.facts?.length ? `<dl class="isheet__facts">${t.facts.map(([k, v]) => `<div><dt class="label">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '';
    const part = (label, text) => (text ? `<section class="isheet__part"><h3 class="label">${label}</h3><p>${esc(text)}</p></section>` : '');
    const related = (e.related ?? []).filter((k) => gloss.G[k]);
    const html = `${facts}${part(U.what, t.what)}${part(U.role, t.role)}${part(U.us, t.us)}
      ${related.length ? `<section class="isheet__part"><h3 class="label">${U.related}</h3><ul class="isheet__rel">${related.map((k) => `<li><button type="button" data-term="${k}">${esc(gloss.G[k][lang].title)} →</button></li>`).join('')}</ul></section>` : ''}
      ${e.cite?.length ? `<p class="note isheet__src">${U.sources}: ${e.cite.map((n) => `<a class="ulink" href="${citeBase}${n}">${n}</a>`).join(', ')}</p>` : ''}`;
    open({ kicker: U.kind[e.kind], title: t.title, html });
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-term]');
    if (!t || (sheet && sheet.contains(t))) return;
    e.preventDefault();
    citeBase = t.closest('[data-cite]')?.dataset.cite ?? citeBase;
    showTerm(t.dataset.term);
  });

  window.CAVA_SHEET = { open, close };
})();
