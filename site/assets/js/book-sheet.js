/* Studio CAVA: the free call, in a sheet over the page.
   Any link to the booking page (/book/, /es/agendar/) opens the same scheduler in an animated sheet
   instead of leaving the page. The sheet takes the scheduler's markup from that page the first time
   (one source for both) and starts it with the link's town and estimate. The page itself stays for
   direct links and ads. */
(() => {
  'use strict';

  const SCRIPT = document.currentScript && document.currentScript.src;
  if (!SCRIPT) return;
  const ES = document.documentElement.lang === 'es';
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isBook = (a) => { const u = new URL(a.href, location.href); return u.origin === location.origin && /\/(book|agendar)\/$/.test(u.pathname); };
  let sheet, panel, body, loaded = null, opener = null;

  const load = (src) => new Promise((resolve, reject) => {
    if (window.CAVA_BOOK) return resolve();
    const js = document.createElement('script');
    js.src = src;
    js.onload = resolve;
    js.onerror = reject;
    document.head.appendChild(js);
  });

  function build() {
    sheet = document.createElement('div');
    sheet.className = 'bks';
    sheet.innerHTML = `<div class="bks__scrim" data-bks-close></div>
      <div class="bks__panel" role="dialog" aria-modal="true" aria-label="${ES ? 'Agendar una llamada gratis' : 'Book a free call'}">
        <button class="bks__close" type="button" data-bks-close aria-label="${ES ? 'Cerrar' : 'Close'}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9m0-9-9 9"/></svg></button>
        <div class="bks__body"><p class="bks__loading note">${ES ? 'Abriendo la agenda…' : 'Opening the calendar…'}</p></div>
      </div>`;
    document.body.appendChild(sheet);
    panel = sheet.querySelector('.bks__panel');
    body = sheet.querySelector('.bks__body');
    sheet.addEventListener('click', (e) => { if (e.target.closest('[data-bks-close]')) close(); });
    document.addEventListener('keydown', (e) => {
      if (!sheet.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      // keep the focus inside the sheet
      if (e.key === 'Tab') {
        const f = [...panel.querySelectorAll('button, a[href], input, select, textarea')].filter((el) => !el.disabled && el.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  async function open(href) {
    if (!sheet) build();
    opener = document.activeElement;
    const url = new URL(href, location.href);
    document.documentElement.classList.add('bks-lock');
    sheet.classList.add('is-on');
    requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('is-open')));
    try {
      // the scheduler's markup, from the booking page, once per sheet
      if (!loaded) {
        loaded = (async () => {
          const html = await (await fetch(url.pathname)).text();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const bk = doc.querySelector('[data-booking]');
          if (!bk) throw new Error('no scheduler');
          // images in it are relative to the booking page
          bk.querySelectorAll('img[src]').forEach((im) => { im.src = new URL(im.getAttribute('src'), url).href; });
          bk.setAttribute('lang', doc.documentElement.lang);
          // the scheduler's script at the version the booking page names, so its markup and its script
          // always match (an unversioned file could come from a cache hours old)
          const js = doc.querySelector('script[src*="booking.js"]');
          await load(js ? new URL(js.getAttribute('src'), url).href : new URL('booking.js', SCRIPT).href);
          return bk;
        })();
      }
      const bk = await loaded;
      if (!body.contains(bk)) { body.innerHTML = ''; body.appendChild(bk); }
      if (!bk.dataset.bkInit) window.CAVA_BOOK.init(bk, url.searchParams);
      else if (url.searchParams.get('town')) { const o = bk.querySelector(`select[name=where] option[value="${CSS.escape(url.searchParams.get('town'))}"]`); if (o) o.selected = true; }
      if (url.searchParams.get('est')) bk.querySelector('[name=est]').value = url.searchParams.get('est');
      setTimeout(() => panel.querySelector('.bk__day[aria-pressed="true"], .bk__time, .bks__close')?.focus({ preventScroll: true }), still ? 0 : 350);
    } catch {
      // without the sheet, the page still works
      window.location.href = href;
    }
  }

  function close() {
    sheet.classList.remove('is-open');
    document.documentElement.classList.remove('bks-lock');
    setTimeout(() => sheet.classList.remove('is-on'), still ? 0 : 450);
    opener?.focus?.({ preventScroll: true });
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!isBook(a)) return;
    e.preventDefault();
    open(a.href);
  });
})();
