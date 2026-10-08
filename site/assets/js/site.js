/* Studio CAVA. Plain script, no dependencies except MapLibre, loaded on demand. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  // The Spanish home (/es/) runs this same file; text written from here picks its language.
  const ES = root.lang === 'es';

  /* ---------- Renders (the viewer walks this list) ---------- */
  // Generated from data/projects.json by scripts/build.mjs (assets/js/renders.js):
  // { id: '<slug>-<n>', src: 'assets/img/projects/<slug>/<n>', v: fingerprint, title, alt }
  const RENDERS = window.CAVA_RENDERS || [];

  /* ---------- Dialog plumbing shared by the sheets and the viewer ---------- */
  let openDialog = null;
  let returnFocus = null;

  const focusables = (el) =>
    $$('a[href], button:not([disabled]):not([hidden]), input, textarea, select, [tabindex]:not([tabindex="-1"])', el)
      .filter((n) => n.offsetParent !== null || n === document.activeElement);

  function open(el, opener) {
    if (openDialog && openDialog !== el) close(openDialog, false);
    returnFocus = opener || document.activeElement;
    el.removeAttribute('inert');
    el.classList.add('is-open');
    root.classList.add('is-locked');
    openDialog = el;
    const first = el.dataset.focus ? $(el.dataset.focus, el) : focusables(el).find((n) => !n.closest('.modal__overlay'));
    setTimeout(() => (first || el).focus({ preventScroll: true }), 60);
  }

  function close(el, restore = true) {
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('inert', '');
    root.classList.remove('is-locked');
    if (openDialog === el) openDialog = null;
    if (restore && returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) {
      const el = document.getElementById(opener.dataset.open);
      if (el) { e.preventDefault(); if (el.id === 'enquiry') resetIfDone(); open(el, opener); }
      return;
    }
    const closer = e.target.closest('[data-close]');
    if (closer) { close(closer.closest('.modal, .lb')); return; }
    const navLink = e.target.closest('[data-close-nav]');
    if (navLink) close(navLink.closest('.modal'), false);
  });

  document.addEventListener('keydown', (e) => {
    if (!openDialog) return;
    if (e.key === 'Escape') { close(openDialog); return; }
    if (e.key === 'Tab') {
      const f = focusables(openDialog);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    if (openDialog.id === 'lightbox') {
      if (e.key === 'ArrowRight') { e.preventDefault(); lbGo(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); lbGo(-1); }
    }
  });

  /* ---------- Floating pills after the hero ---------- */
  const float = $('[data-float]');
  const floatBtns = $$('button', float);
  let floatOn = false;
  const onScroll = () => {
    const on = window.scrollY > window.innerHeight * 0.55;
    if (on === floatOn) return;
    floatOn = on;
    float.classList.toggle('is-on', on);
    float.setAttribute('aria-hidden', String(!on));
    floatBtns.forEach((b) => (b.tabIndex = on ? 0 : -1));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- WhatsApp button: after the hero, and out of the way of text it would cover ---------- */
  const wa = $('[data-wa]');
  let waOn = null;
  let waTick = false;
  const waUpdate = () => {
    waTick = false;
    let on = window.scrollY > window.innerHeight * 0.55;
    if (on) {
      const a = wa.getBoundingClientRect();
      // queried each time: the map's credit line only exists once the map has loaded
      on = !$$('.map__card, .footer__bottom, .maplibregl-ctrl-bottom-right').some((el) => {
        const b = el.getBoundingClientRect();
        return b.width > 0 && a.left < b.right + 8 && a.right > b.left - 8 && a.top < b.bottom + 8 && a.bottom > b.top - 8;
      });
    }
    if (on === waOn) return;
    waOn = on;
    wa.classList.toggle('is-on', on);
    wa.setAttribute('aria-hidden', String(!on));
    wa.tabIndex = on ? 0 : -1;
  };
  const waSchedule = () => { if (!waTick) { waTick = true; requestAnimationFrame(waUpdate); } };
  window.addEventListener('scroll', waSchedule, { passive: true });
  window.addEventListener('resize', waSchedule);
  waUpdate();

  /* ---------- Image viewer ---------- */
  const lb = $('#lightbox');
  const lbImg = $('[data-lb-img]', lb);
  let lbIndex = 0;

  function lbShow(i) {
    lbIndex = (i + RENDERS.length) % RENDERS.length;
    const r = RENDERS[lbIndex];
    lbImg.src = `${r.src}-1600.webp?v=${r.v}`;
    lbImg.alt = r.alt;
    $('[data-lb-count]', lb).textContent = `(${String(lbIndex + 1).padStart(2, '0')}/${RENDERS.length})`;
    $('[data-lb-title]', lb).textContent = r.title;
    $('[data-lb-alt]', lb).textContent = r.alt;
    // warm the next one
    const n = RENDERS[(lbIndex + 1) % RENDERS.length];
    new Image().src = `${n.src}-1600.webp?v=${n.v}`;
  }
  function lbGo(step) { lbShow(lbIndex + step); }

  $$('[data-lb]').forEach((btn) => btn.addEventListener('click', () => {
    const i = RENDERS.findIndex((r) => r.id === btn.dataset.lb);
    lbShow(i < 0 ? 0 : i);
    open(lb, btn);
  }));
  $('[data-lb-prev]', lb).addEventListener('click', () => lbGo(-1));
  $('[data-lb-next]', lb).addEventListener('click', () => lbGo(1));
  $('.lb__stage', lb).addEventListener('click', (e) => {
    if (e.target === lbImg) lbGo(e.offsetX > lbImg.clientWidth / 2 ? 1 : -1);
  });
  let touchX = null;
  lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) lbGo(dx < 0 ? 1 : -1);
    touchX = null;
  });

  /* ---------- Project enquiry: eight steps, validated, sends nothing ---------- */
  const modal = $('#enquiry');
  const form = $('[data-enq]');
  const steps = $$('[data-step]', form);
  const bar = $('[data-progress]');
  const back = $('[data-back]', form);
  const next = $('[data-next]', form);
  const done = $('[data-done]');
  let step = 0;

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function showStep(i, focus = true) {
    step = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    bar.style.width = `${((i + 1) / steps.length) * 100}%`;
    back.hidden = i === 0;
    next.textContent = i === steps.length - 1 ? (ES ? 'Enviar →' : 'Submit form →') : (ES ? 'Siguiente →' : 'Next →');
    if (focus) {
      const first = $('input, textarea', steps[i]);
      if (first) first.focus({ preventScroll: true });
    }
  }

  function setErr(name, on, input) {
    const el = $(`[data-err="${name}"]`, form);
    if (el) el.classList.toggle('is-on', on);
    if (input) input.setAttribute('aria-invalid', String(on));
  }

  function validate(i) {
    const s = steps[i];
    let ok = true;
    let firstBad = null;
    $$('input[type=text][required], input[type=email][required]', s).forEach((inp) => {
      const v = inp.value.trim();
      const bad = !v || (inp.type === 'email' && !EMAIL.test(v));
      setErr(inp.name, bad, inp);
      if (bad) { ok = false; firstBad = firstBad || inp; }
    });
    const radioReq = $('input[type=radio][required]', s);
    if (radioReq) {
      const bad = !$(`input[name="${radioReq.name}"]:checked`, s);
      setErr(radioReq.name, bad);
      if (bad) { ok = false; firstBad = firstBad || radioReq; }
    }
    if ($('input[name="type"]', s)) {
      const bad = !$('input[name="type"]:checked', s);
      setErr('type', bad);
      if (bad) { ok = false; firstBad = firstBad || $('input[name="type"]', s); }
    }
    if (firstBad) firstBad.focus({ preventScroll: true });
    return ok;
  }

  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.getAttribute('aria-invalid') === 'true') setErr(t.name, false, t);
    if (t.type === 'radio' || t.type === 'checkbox') setErr(t.name, false);
  });
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); next.click(); }
  });

  next.addEventListener('click', () => {
    if (!validate(step)) return;
    if (step < steps.length - 1) showStep(step + 1);
    else finish();
  });
  back.addEventListener('click', () => showStep(Math.max(0, step - 1)));

  function answers() {
    const d = new FormData(form);
    const all = (k) => d.getAll(k).filter(Boolean).join(', ');
    const keys = ES
      ? ['Nombre', 'Correo', 'Teléfono o WhatsApp', 'Tiene el lote', 'Proyecto', 'Lote', 'Inicio de obra', 'Presupuesto de construcción', 'Constructor', 'Datos del constructor', 'Sobre el proyecto', 'Nos encontró por']
      : ['Name', 'Email', 'Phone or WhatsApp', 'Owns the land', 'Planning', 'Site', 'Start of construction', 'Construction budget', 'Builder', 'Builder details', 'About the project', 'Found us through'];
    return [
      d.get('name'), d.get('email'), d.get('phone'), d.get('land'), all('type'), d.get('site'), d.get('start'), d.get('budget'),
      d.get('builder'), d.get('builderDetails'), d.get('brief'), [d.get('source'), d.get('sourceOther')].filter(Boolean).join(': '),
    ].map((v, k) => [keys[k], v]).filter(([, v]) => v && String(v).trim());
  }

  function finish() {
    const a = answers();
    const first = String(new FormData(form).get('name') || '').trim().split(/\s+/)[0];
    $('[data-thanks]').textContent = ES ? (first ? `Gracias, ${first}.` : 'Gracias.') : (first ? `Thank you, ${first}.` : 'Thank you.');
    const d = new FormData(form);
    const subject = ES
      ? `Consulta de proyecto: ${d.getAll('type').join(', ') || 'proyecto nuevo'} en ${d.get('site') || 'Costa Rica'}`
      : `Project enquiry: ${d.getAll('type').join(', ') || 'new project'} in ${d.get('site') || 'Costa Rica'}`;
    const body = a.map(([k, v]) => `${k}: ${v}`).join('\n');
    $('[data-mailto]').href = `mailto:hola@cava.design?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    form.hidden = true;
    done.hidden = false;
    bar.style.width = '100%';
    $('[data-thanks]').focus({ preventScroll: true });
  }

  function resetIfDone() {
    if (done.hidden) return;
    form.reset();
    $$('[aria-invalid]', form).forEach((n) => n.removeAttribute('aria-invalid'));
    $$('.err.is-on', form).forEach((n) => n.classList.remove('is-on'));
    done.hidden = true;
    form.hidden = false;
    showStep(0, false);
  }

  modal.dataset.focus = '#f-name';
  showStep(0, false);

  /* ---------- Footer clock, Costa Rica time ---------- */
  const clock = $('[data-clock]');
  const tz = 'America/Costa_Rica';
  const fmt = new Intl.DateTimeFormat(ES ? 'es-CR' : 'en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', hourCycle: 'h23' });
  function tick() {
    const now = new Date();
    const p = Object.fromEntries(parts.formatToParts(now).map((x) => [x.type, x.value]));
    const h = Number(p.hour);
    const open = !['Sat', 'Sun'].includes(p.weekday) && h >= 8 && h < 17;
    clock.textContent = ES ? `${fmt.format(now)} CR, estamos ${open ? 'abiertos' : 'cerrados'}` : `${fmt.format(now)} CR, we are ${open ? 'open' : 'closed'}`;
  }
  tick();
  setInterval(tick, 30000);
  $('[data-year]').textContent = String(new Date().getFullYear());

  /* ---------- Map, loaded when it comes near the viewport ---------- */
  const MAPLIBRE = 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/';
  const STYLE = 'https://tiles.openfreemap.org/styles/positron';
  const STUDIO = [-84.0795, 9.9325]; // San José centre, placeholder until the studio address is set
  const mapEl = $('#map');

  function loadMapLib() {
    return new Promise((resolve, reject) => {
      if (window.maplibregl) return resolve();
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = MAPLIBRE + 'maplibre-gl.css';
      document.head.appendChild(css);
      const js = document.createElement('script');
      js.src = MAPLIBRE + 'maplibre-gl.js';
      js.onload = () => resolve();
      js.onerror = reject;
      document.head.appendChild(js);
    });
  }

  function mapFallback() {
    mapEl.innerHTML = `<div class="map__fallback"><p>${ES ? 'El mapa no cargó.' : 'The map did not load.'} <a class="ulink" href="https://www.google.com/maps/search/?api=1&amp;query=San+Jos%C3%A9%2C+Costa+Rica" target="_blank" rel="noopener">${ES ? 'Abrir San José en Google Maps ↗' : 'Open San José in Google Maps ↗'}</a></p></div>`;
  }

  function initMap() {
    const gl = window.maplibregl;
    const map = new gl.Map({
      container: mapEl,
      style: STYLE,
      bounds: [[-85.95, 9.45], [-83.7, 10.95]],
      fitBoundsOptions: { padding: 40 },
      cooperativeGestures: true,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-left'); // top-right sits under the floating pills
    map.touchZoomRotate.disableRotation();

    map.on('load', () => {
      const paint = (id, prop, val) => { if (map.getLayer(id)) map.setPaintProperty(id, prop, val); };
      paint('background', 'background-color', '#f1f0ee');
      paint('water', 'fill-color', '#dcddde');
      paint('park', 'fill-color', '#e8e7e3');
      paint('landcover_wood', 'fill-color', '#e8e7e3');
      paint('landuse_residential', 'fill-color', '#ebeae6');
      // the pin names San José, so drop the basemap's own label under it
      const cap = map.getFilter('label_city_capital');
      if (cap) map.setFilter('label_city_capital', ['all', cap, ['!=', ['coalesce', ['get', 'name:latin'], ['get', 'name']], 'San José']]);
    });

    const pin = document.createElement('div');
    pin.className = 'pin';
    pin.innerHTML = '<span class="pin__label">Studio CAVA, San José</span><span class="pin__dot"></span>';
    new gl.Marker({ element: pin, anchor: 'bottom', offset: [0, 7] }).setLngLat(STUDIO).addTo(map);
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((en) => en.isIntersecting)) return;
      io.disconnect();
      loadMapLib().then(initMap).catch(mapFallback);
    }, { rootMargin: '800px 0px' });
    io.observe(mapEl);
  } else {
    loadMapLib().then(initMap).catch(mapFallback);
  }

  /* ---------- Hero: the best exterior views take turns (data/projects.json "hero") ---------- */
  const SLIDES = window.CAVA_HERO || [];
  const heroImg = $('.hero__img');
  const heroRow = $('.hero__row');
  if (heroImg && heroRow && SLIDES.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const nameEl = $('[data-hero-name]', heroRow);
    const placeEl = $('[data-hero-place]', heroRow);
    const linkEl = $('[data-hero-link]', heroRow);
    const layer = heroImg.cloneNode(false);
    layer.removeAttribute('fetchpriority');
    layer.classList.add('is-off');
    layer.setAttribute('aria-hidden', 'true');
    heroImg.after(layer);
    let shown = heroImg, waiting = layer, idx = 0, busy = false;
    const load = (img, sl) => {
      img.srcset = `${sl.src}-800.webp?v=${sl.v} 800w, ${sl.src}-1600.webp?v=${sl.v} 1600w`;
      img.src = `${sl.src}-1600.webp?v=${sl.v}`;
      img.width = sl.w; img.height = sl.h; img.alt = sl.alt;
    };
    const advance = () => {
      // only while the hero is on screen and the tab is visible
      if (busy || document.hidden || window.scrollY > window.innerHeight * 0.9) return;
      busy = true;
      const next = (idx + 1) % SLIDES.length;
      const sl = SLIDES[next];
      load(waiting, sl);
      const swap = () => {
        waiting.classList.remove('is-off'); waiting.removeAttribute('aria-hidden');
        shown.classList.add('is-off'); shown.setAttribute('aria-hidden', 'true');
        [shown, waiting] = [waiting, shown];
        idx = next;
        heroRow.classList.add('is-fading');
        setTimeout(() => {
          nameEl.textContent = sl.name;
          placeEl.textContent = sl.place;
          linkEl.href = sl.href;
          heroRow.classList.remove('is-fading');
          busy = false;
        }, 350);
      };
      (waiting.decode ? waiting.decode() : Promise.resolve()).then(swap, () => { busy = false; });
    };
    setInterval(advance, 6500);
  }

  /* ---------- The process: each step shows its stage's image ---------- */
  const psteps = $('[data-psteps]'), pfig = $('[data-pfig]');
  if (psteps && pfig) {
    const show = (i) => {
      $$('[data-pstep]', psteps).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.pstep === i)));
      $$('[data-pic]', pfig).forEach((p) => p.classList.toggle('is-on', +p.dataset.pic === i));
      $$('[data-cap]', pfig).forEach((c) => c.classList.toggle('is-on', +c.dataset.cap === i));
    };
    const pick = (e) => { const b = e.target.closest('[data-pstep]'); if (b) show(+b.dataset.pstep); };
    psteps.addEventListener('click', pick);
    psteps.addEventListener('focusin', pick);
    if (window.matchMedia('(hover: hover)').matches) psteps.addEventListener('mouseover', pick);
  }

  /* ---------- "Get in touch" from the project pages lands on /#enquiry ---------- */
  if (location.hash === '#enquiry') {
    history.replaceState(null, '', location.pathname + location.search);
    open(modal);
  }
})();
