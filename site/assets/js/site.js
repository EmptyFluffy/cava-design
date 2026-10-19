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
      if (el) { e.preventDefault(); if (el.id === 'enquiry') { resetIfDone(); opened = Date.now(); } open(el, opener); }
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

  /* ---------- Project enquiry: three steps, the contact details last, sent by email (/api/enquiry) ---------- */
  const modal = $('#enquiry');
  const form = $('[data-enq]');
  const steps = $$('[data-step]', form);
  const bar = $('[data-progress]');
  const back = $('[data-back]', form);
  const next = $('[data-next]', form);
  const done = $('[data-done]');
  let step = 0;

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const panel = modal.querySelector('.modal__panel');
  function showStep(i, focus = true) {
    step = i;
    panel.dataset.step = i;   // on a phone the introduction shows with the first step only (site.css)
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    bar.style.width = `${((i + 1) / steps.length) * 100}%`;
    back.hidden = i === 0;
    panel.scrollTop = 0;   // a step opens at its top, not where the last one was scrolled to
    next.textContent = i === steps.length - 1 ? (ES ? 'Enviar →' : 'Send →') : (ES ? 'Siguiente →' : 'Next →');
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
    if (firstBad) {
      // the sticky Back and Next can cover the question at the foot of a long step: bring it to the middle
      firstBad.focus({ preventScroll: true });
      firstBad.closest('.field').scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    return ok;
  }

  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.getAttribute('aria-invalid') === 'true') setErr(t.name, false, t);
    if (t.type === 'radio' || t.type === 'checkbox') setErr(t.name, false);
  });
  // Enter moves to the step's next box, and from its last one to the next step
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    e.preventDefault();
    const boxes = $$('input.input, textarea.input', steps[step]).filter((x) => x.offsetParent);
    const after = boxes[boxes.indexOf(e.target) + 1];
    if (after && e.target.classList.contains('input')) after.focus();
    else next.click();
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
      ? ['Nombre', 'Correo', 'Teléfono o WhatsApp', 'Proyecto', 'Tiene el lote', 'Lugar', 'Presupuesto de construcción', 'Inicio de obra', 'Algo más']
      : ['Name', 'Email', 'Phone or WhatsApp', 'Planning', 'Owns the land', 'Site', 'Construction budget', 'Start of construction', 'Anything else'];
    return [
      d.get('name'), d.get('email'), d.get('phone'), all('type'), d.get('land'), d.get('site'), d.get('budget'), d.get('start'), d.get('brief'),
    ].map((v, k) => [keys[k], v]).filter(([, v]) => v && String(v).trim());
  }

  // the answers go to the studio by email (/api/enquiry, workers/enquiry); if that fails, the same answers
  // are ready in a mailto link. The hidden "company" field and the time spent keep bots out.
  let opened = Date.now();
  function finish() {
    const a = answers();
    const d = new FormData(form);
    const first = String(d.get('name') || '').trim().split(/\s+/)[0];
    const subject = ES
      ? `Consulta de proyecto: ${d.getAll('type').join(', ') || 'proyecto nuevo'} en ${d.get('site') || 'Costa Rica'}`
      : `Project enquiry: ${d.getAll('type').join(', ') || 'new project'} in ${d.get('site') || 'Costa Rica'}`;
    const body = a.map(([k, v]) => `${k}: ${v}`).join('\n');
    const mail = $('[data-mailto]');
    mail.href = `mailto:hola@cava.design?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const show = (ok) => {
      $('[data-thanks]').textContent = ok
        ? (ES ? (first ? `Gracias, ${first}.` : 'Gracias.') : (first ? `Thank you, ${first}.` : 'Thank you.'))
        : (ES ? 'No se envió.' : 'Not sent.');
      $('.enq__done .label').textContent = ok ? (ES ? '(Enviado)' : '(Sent)') : (ES ? '(Error)' : '(Error)');
      $('[data-sent]').hidden = !ok;
      $('[data-failed]').hidden = ok;
      mail.hidden = ok;
      form.hidden = true;
      done.hidden = false;
      panel.dataset.step = 'done';
      bar.style.width = '100%';
      $('[data-thanks]').focus({ preventScroll: true });
      src.hidden = !ok;
      if (ok) window.dispatchEvent(new CustomEvent('cava:enquiry', { detail: { site: d.get('site'), budget: d.get('budget') } }));
    };
    sent = { name: d.get('name'), email: d.get('email'), subject };
    next.disabled = true;
    next.textContent = ES ? 'Enviando…' : 'Sending…';
    fetch('/api/enquiry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lang: ES ? 'es' : 'en', rows: a, name: d.get('name'), email: d.get('email'), subject, hp: d.get('company') || '', ms: Date.now() - opened }),
    })
      .then((r) => r.json().then((j) => { sent.id = j.id; return r.ok && j.ok; }))
      .catch(() => false)
      .then((ok) => { next.disabled = false; show(ok); });
  }

  // after it is sent, one optional tap: how they found us. It reaches the studio as a reply in the same
  // thread; nothing on the form waited for it.
  const src = $('[data-source]');
  let sent = {};
  src.addEventListener('click', (e) => {
    const b = e.target.closest('[data-src]');
    if (!b || src.dataset.done) return;
    src.dataset.done = '1';
    $$('[data-src]', src).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('[data-source-done]', src).hidden = false;
    if (!sent.id) return;
    fetch('/api/enquiry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'source', ref: sent.id, source: b.dataset.src, lang: ES ? 'es' : 'en', name: sent.name, email: sent.email, subject: sent.subject, hp: '', ms: Date.now() - opened }),
    }).catch(() => {});
  });

  function resetIfDone() {
    if (done.hidden) return;
    form.reset();
    $$('[aria-invalid]', form).forEach((n) => n.removeAttribute('aria-invalid'));
    $$('.err.is-on', form).forEach((n) => n.classList.remove('is-on'));
    done.hidden = true;
    form.hidden = false;
    src.hidden = true;
    delete src.dataset.done;
    $$('[data-src]', src).forEach((x) => x.removeAttribute('aria-pressed'));
    $('[data-source-done]', src).hidden = true;
    showStep(0, false);
  }

  modal.dataset.focus = 'input[name="type"]';
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
  // the studio's two addresses: Condominio Tekali, Barrio Escalante (San José), and Reserva Conchal (Guanacaste)
  const OFFICES = [[[-84.0639, 9.9364], 'Studio CAVA, San José'], [[-85.8059, 10.3996], 'Studio CAVA, Guanacaste']];
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
    mapEl.innerHTML = `<div class="map__fallback"><p>${ES ? 'El mapa no cargó.' : 'The map did not load.'} <a class="ulink" href="https://www.google.com/maps/search/?api=1&amp;query=Condominio+Tekali%2C+Barrio+Escalante%2C+San+Jos%C3%A9%2C+Costa+Rica" target="_blank" rel="noopener">${ES ? 'San José en Google Maps ↗' : 'San José on Google Maps ↗'}</a> · <a class="ulink" href="https://www.google.com/maps/search/?api=1&amp;query=Reserva+Conchal%2C+Guanacaste%2C+Costa+Rica" target="_blank" rel="noopener">${ES ? 'Guanacaste en Google Maps ↗' : 'Guanacaste on Google Maps ↗'}</a></p></div>`;
  }

  function initMap() {
    const gl = window.maplibregl;
    const map = new gl.Map({
      container: mapEl,
      style: STYLE,
      bounds: [[-85.95, 9.45], [-83.7, 10.95]],
      // on a phone both pins sit near the edges: leave room on both sides for their labels
      fitBoundsOptions: { padding: mapEl.clientWidth < 600 ? { top: 40, bottom: 40, left: 100, right: 100 } : 40 },
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

    for (const [lngLat, name] of OFFICES) {
      const pin = document.createElement('div');
      pin.className = 'pin';
      pin.innerHTML = `<span class="pin__label">${name}</span><span class="pin__dot"></span>`;
      new gl.Marker({ element: pin, anchor: 'bottom', offset: [0, 7] }).setLngLat(lngLat).addTo(map);
    }
  }

  // warm the map: once the page has loaded and is idle, fetch the library (and the base map's style) into the
  // cache without running it, so the map is ready when the visitor gets to it
  const warm = () => {
    const links = [[MAPLIBRE + 'maplibre-gl.js'], [MAPLIBRE + 'maplibre-gl.css'], ['https://tiles.openfreemap.org/styles/positron', 'anonymous']];
    for (const [href, cors] of links) {
      if (document.querySelector(`link[href="${href}"]`)) continue;
      const l = document.createElement('link'); l.rel = 'prefetch'; l.href = href; if (cors) l.crossOrigin = cors; document.head.appendChild(l);
    }
  };
  const settled = (fn) => {
    const go = () => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 300));
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  };
  // build it on the visitor's first scroll, or when it comes near the screen, whichever is first
  const onFirstScroll = (fn) => window.addEventListener('scroll', fn, { once: true, passive: true });
  let mapStarted = false;
  const startMap = () => { if (mapStarted) return; mapStarted = true; settled(() => loadMapLib().then(initMap).catch(mapFallback)); };
  settled(warm);
  onFirstScroll(startMap);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((en) => en.isIntersecting)) return;
      io.disconnect();
      startMap();
    }, { rootMargin: '800px 0px' });
    io.observe(mapEl);
  } else {
    startMap();
  }

  /* ---------- Hero: the sea from above, then the best exterior views in turn (data/projects.json "hero") ---------- */
  // The sea opens the home when the head added .sea (motion welcome, Save-Data off): ten seconds of video,
  // then a photo every 6.5 s, and after the last photo the sea again. The photos crossfade on two <img>
  // layers; the sea is a third layer over them. The project row shows only with a photo.
  const SLIDES = window.CAVA_HERO || [];
  const hero = $('.hero');
  const heroImg = $('.hero__img');
  const heroRow = $('.hero__row');
  let seaVid = $('[data-hero-video]');   // replaced by a fresh copy after Safari's back-forward cache (below)
  const withSea = !!seaVid && root.classList.contains('sea');
  if (hero && heroImg && heroRow && (SLIDES.length > 1 || withSea) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const nameEl = $('[data-hero-name]', heroRow);
    const placeEl = $('[data-hero-place]', heroRow);
    const linkEl = $('[data-hero-link]', heroRow);
    const SEA_MS = 9000, PHOTO_MS = 6500, FADE_MS = 1600;
    const layer = heroImg.cloneNode(false);
    layer.removeAttribute('fetchpriority');
    layer.classList.add('is-off');
    layer.setAttribute('aria-hidden', 'true');
    heroImg.after(layer);
    heroImg.dataset.k = '0';   // the page arrives with the first photo in it
    const order = withSea ? ['sea', ...SLIDES] : SLIDES;
    let shown = withSea ? seaVid : heroImg, at = 0;
    // only while the hero is on screen and the tab is visible
    const away = () => document.hidden || window.scrollY > window.innerHeight * 0.9;
    const load = (img, sl) => {
      img.srcset = `${sl.src}-800.webp?v=${sl.v} 800w, ${sl.src}-1600.webp?v=${sl.v} 1600w`;
      img.src = `${sl.src}-1600.webp?v=${sl.v}`;
      img.width = sl.w; img.height = sl.h; img.alt = sl.alt;
    };
    const row = (sl) => { nameEl.textContent = sl.name; placeEl.textContent = sl.place; linkEl.href = sl.href; };
    const show = (el) => {
      el.classList.remove('is-off'); el.removeAttribute('aria-hidden');
      shown.classList.add('is-off'); shown.setAttribute('aria-hidden', 'true');
      if (shown === seaVid) setTimeout(() => { if (shown !== seaVid) seaVid.pause(); }, FADE_MS);
      shown = el;
    };
    let wasAway = false;
    const next = () => {
      if (away()) { wasAway = true; setTimeout(next, 1000); return; }
      // back on the hero: what is on screen stays a moment longer before the turn
      if (wasAway) { wasAway = false; setTimeout(next, 3000); return; }
      const to = (at + 1) % order.length;
      if (order[to] === 'sea') {
        // back to the sea from its first frame, once it plays (a browser that will not play it shows its still)
        seaVid.currentTime = 0;
        const go = () => { show(seaVid); hero.classList.remove('is-photo'); at = to; setTimeout(next, SEA_MS); };
        seaVid.play().then(go, go);
        return;
      }
      const k = String(withSea ? to - 1 : to), sl = order[to];
      // after the sea, the layer that already holds this photo if one does; otherwise the one not on screen
      const img = shown === seaVid ? ([heroImg, layer].find((x) => x.dataset.k === k) || layer) : (shown === heroImg ? layer : heroImg);
      if (img.dataset.k !== k) { load(img, sl); img.dataset.k = k; }
      (img.decode ? img.decode() : Promise.resolve()).then(() => {
        const fromSea = shown === seaVid;
        show(img);
        at = to;
        if (fromSea) { row(sl); hero.classList.add('is-photo'); } else {
          heroRow.classList.add('is-fading');
          setTimeout(() => { row(sl); heroRow.classList.remove('is-fading'); }, 350);
        }
        setTimeout(next, PHOTO_MS);
      }, () => { setTimeout(next, 1000); });
    };
    if (withSea) {
      // the cut for the screen (upright on a portrait one), in VP9 where the browser plays it
      const d = seaVid.dataset, tall = window.matchMedia('(max-aspect-ratio: 1/1)').matches;
      const vp9 = seaVid.canPlayType('video/webm; codecs="vp9"') !== '';
      seaVid.preload = 'auto';
      seaVid.src = vp9 ? (tall ? d.webmP : d.webm) : (tall ? d.mp4P : d.mp4);
      heroImg.classList.add('is-off'); heroImg.setAttribute('aria-hidden', 'true');
      seaVid.play().catch(() => {});
      // it plays only while it can be seen
      const keep = () => {
        if (shown !== seaVid) return;
        if (away()) { if (!seaVid.paused) seaVid.pause(); } else if (seaVid.paused) seaVid.play().catch(() => {});
      };
      window.addEventListener('scroll', keep, { passive: true });
      document.addEventListener('visibilitychange', keep);
      // Safari keeps the page in its back-forward cache and drops the video's frames: back from the portal the sea
      // showed a flat colour, and reloading the same element left it still. A page restored from that cache gets a
      // fresh copy of the element, which Safari plays like a new one. The poster also paints the video's own
      // background, so a missing frame shows the sea, never the flat colour.
      seaVid.style.backgroundImage = `url("${seaVid.poster}")`;
      let renewals = 0;
      const renew = () => {
        if (renewals++ > 2) return;
        const fresh = seaVid.cloneNode(false);
        fresh.muted = true;
        const on = shown === seaVid;
        seaVid.replaceWith(fresh); seaVid = fresh;
        if (on) { shown = fresh; if (!away()) fresh.play().catch(() => {}); }
      };
      window.addEventListener('pageshow', (e) => { if (e.persisted) renew(); });
      // while the sea is on screen it has to move: a paused one is asked to play again, a stuck one is replaced
      let lastT = -1;
      setInterval(() => {
        if (shown !== seaVid || away()) { lastT = -1; return; }
        if (seaVid.paused) seaVid.play().catch(() => {});
        else if (seaVid.currentTime === lastT && seaVid.readyState >= 3) renew();   // loaded, playing, yet still
        lastT = seaVid.currentTime;
      }, 1500);
    } else {
      hero.classList.add('is-photo');
    }
    setTimeout(next, withSea ? SEA_MS : PHOTO_MS);
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
