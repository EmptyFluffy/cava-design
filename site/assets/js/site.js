/* Studio CAVA. Plain script, no dependencies except MapLibre, loaded on demand. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;

  /* ---------- Renders (the viewer walks this list) ---------- */
  const RENDERS = [
    ['a', 'Concept render', 'Timber cabin cantilevered over a forested hillside at sunset'],
    ['b', 'Concept render', 'Open kitchen and living room facing a green valley through full-height glass'],
    ['c', 'Concept render', 'Two-storey house with an infinity pool on a concrete plinth above dry forest'],
    ['d', 'Casa Papagayo', 'Single-storey pool house under a deep flat roof, looking over a bay'],
    ['e', 'Concept render', 'Two-storey timber and glass building with lit interiors at dusk'],
    ['f', 'Concept render', 'Stepped two-storey house on a dry hillside with a plunge pool and deck'],
    ['g', 'Concept render', 'Low white house with a timber-clad wall under a wide roof'],
    ['h', 'Refugio Guaitil', 'Pavilion house with a timber deck and a reflecting pool among trees at dusk'],
    ['i', 'Concept render', 'Timber boardwalk to a pavilion with a perforated screen wall and a pool'],
    ['j', 'Casa Celosía', 'Dark perforated screen facade with an exterior stair under a floating roof'],
    ['k', 'Hangar Nº1', 'Two-storey hangar building marked 01 with a deep roof over open bays'],
    ['l', 'Concept render', 'Sunken lounge terrace with built-in sofas and a fire pit under a shade sail'],
    ['m', 'Casa Voladiza', 'White cubic house raised on slender steel columns above a pool deck'],
    ['o', 'Concept render', 'Aerial view of a tensile canopy on a headland above a bay with islands'],
    ['p', 'Concept render', 'Two figures walking past a board-formed concrete wall'],
    ['q', 'Café interior', 'Café counter with a pastry case and rattan pendant lamps'],
    ['r', 'Café interior', 'Café lounge with a timber wall, sofas and ceiling fans'],
    ['s', 'Café interior', 'Café counter in timber and stone under woven pendant lamps'],
    ['t', 'Café interior', 'Café seating area with timber panelling, a low sofa and graphic prints'],
    ['u', 'Concept render', 'Living room with full-height glass opening to a garden'],
    ['v', 'Concept render', 'Kitchen island under a timber ceiling with garden views on both sides'],
    ['x', 'Concept render', 'Dining room under a slatted timber ceiling with glass walls'],
    ['y', 'Concept render', 'Stone and timber house around a pool in a tropical garden'],
    ['z', 'Casa Piedra', 'Two-storey house with a stone wall, a glass balcony and a pool among trees'],
    ['zz', 'Casa Piedra', 'Double-height living room with a stair, a timber kitchen and courtyard light'],
  ].map(([id, title, alt]) => ({ id, title, alt }));

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

  /* ---------- Render viewer ---------- */
  const lb = $('#lightbox');
  const lbImg = $('[data-lb-img]', lb);
  let lbIndex = 0;

  function lbShow(i) {
    lbIndex = (i + RENDERS.length) % RENDERS.length;
    const r = RENDERS[lbIndex];
    lbImg.src = `assets/img/${r.id}-1600.webp`;
    lbImg.alt = r.alt;
    $('[data-lb-count]', lb).textContent = `(${String(lbIndex + 1).padStart(2, '0')}/${RENDERS.length})`;
    $('[data-lb-title]', lb).textContent = r.title;
    $('[data-lb-alt]', lb).textContent = r.alt;
    // warm the next one
    const n = RENDERS[(lbIndex + 1) % RENDERS.length];
    new Image().src = `assets/img/${n.id}-1600.webp`;
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
    next.textContent = i === steps.length - 1 ? 'Submit form →' : 'Next →';
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
    return [
      ['Name', d.get('name')], ['Email', d.get('email')], ['Phone or WhatsApp', d.get('phone')],
      ['Owns the land', d.get('land')], ['Planning', all('type')], ['Site', d.get('site')],
      ['Start of construction', d.get('start')], ['Construction budget', d.get('budget')],
      ['Builder', d.get('builder')], ['Builder details', d.get('builderDetails')],
      ['About the project', d.get('brief')], ['Found us through', [d.get('source'), d.get('sourceOther')].filter(Boolean).join(': ')],
    ].filter(([, v]) => v && String(v).trim());
  }

  function finish() {
    const a = answers();
    const first = String(new FormData(form).get('name') || '').trim().split(/\s+/)[0];
    $('[data-thanks]').textContent = first ? `Thank you, ${first}.` : 'Thank you.';
    const d = new FormData(form);
    const subject = `Project enquiry: ${d.getAll('type').join(', ') || 'new project'} in ${d.get('site') || 'Costa Rica'}`;
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
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', hourCycle: 'h23' });
  function tick() {
    const now = new Date();
    const p = Object.fromEntries(parts.formatToParts(now).map((x) => [x.type, x.value]));
    const h = Number(p.hour);
    const open = !['Sat', 'Sun'].includes(p.weekday) && h >= 8 && h < 17;
    clock.textContent = `${fmt.format(now)} CR, we are ${open ? 'open' : 'closed'}`;
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
    mapEl.innerHTML = '<div class="map__fallback"><p>The map did not load. <a class="ulink" href="https://www.google.com/maps/search/?api=1&amp;query=San+Jos%C3%A9%2C+Costa+Rica" target="_blank" rel="noopener">Open San José in Google Maps ↗</a></p></div>';
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
})();
