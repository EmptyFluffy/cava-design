/* Studio CAVA, project pages: the location map in the technical sheet.
   MapLibre and the tiles load only when the map comes near the viewport. */
(() => {
  'use strict';

  // Town pages: the 3D sun path (sun3d.js) loads when its figure nears the viewport, if the browser
  // has WebGL. Otherwise, or if the CDN fails, the SVG diagram stays.
  const SCRIPT = document.currentScript && document.currentScript.src;
  const sunFig = document.querySelector('[data-sun3d]');
  const webgl = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } };
  if (sunFig && SCRIPT && 'IntersectionObserver' in window && webgl()) {
    const io3 = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io3.disconnect();
      import(new URL('sun3d.js', SCRIPT).href).then((m) => m.mount(sunFig)).catch(() => {});
    }, { rootMargin: '500px 0px' });
    io3.observe(sunFig);
  }

  // The drawings: one row the arrows walk a drawing at a time; a swipe or a trackpad moves it too, and
  // the arrows and the count follow wherever it stops.
  for (const car of document.querySelectorAll('[data-carousel]')) {
    const track = car.querySelector('[data-car-track]');
    const items = [...track.children];
    const at = car.querySelector('[data-car-at]');
    const [prev, next] = [...car.querySelectorAll('[data-car-step]')];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // where each item lands when it is the first one: its left edge, less the page margin
    const stops = () => { const pad = parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0; return items.map((li) => li.offsetLeft - pad); };
    const max = () => track.scrollWidth - track.clientWidth;
    const sync = () => {
      const x = track.scrollLeft;
      prev.disabled = x <= 2;
      next.disabled = x >= max() - 2;
      // the count: the first drawing at the left edge, or the last one once the row has run out
      if (at) at.textContent = String(next.disabled ? items.length : stops().filter((v) => v <= x + 2).length || 1).padStart(2, '0');
    };
    // a step goes to the next drawing past the left edge, either way; the last steps end where the row does
    car.querySelectorAll('[data-car-step]').forEach((b) => b.addEventListener('click', () => {
      const s = stops(), x = track.scrollLeft, fwd = b.dataset.carStep === '1';
      const to = fwd ? (s.find((v) => v > x + 2) ?? max()) : ([...s].reverse().find((v) => v < x - 2) ?? 0);
      track.scrollTo({ left: Math.min(to, max()), behavior: reduced ? 'auto' : 'smooth' });
    }));
    let raf = 0;
    track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  const fig = document.querySelector('[data-pmap]');
  if (!fig) return;
  const canvas = fig.querySelector('.pmap__canvas');
  const MAPLIBRE = 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/';
  const STYLE = 'https://tiles.openfreemap.org/styles/positron';
  const lng = Number(fig.dataset.lng), lat = Number(fig.dataset.lat);
  const label = fig.dataset.label.split(',')[0];
  const placeholder = fig.dataset.pin === 'placeholder';
  const ES = document.documentElement.lang === 'es';

  // one MapLibre for the whole page, shared with climate-map.js
  function loadMapLib() {
    return (window.CAVA_MAPLIBRE ||= new Promise((resolve, reject) => {
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
    }));
  }

  function init() {
    const gl = window.maplibregl;
    // A still map: the coast and the nearby towns for context, nothing to drag or zoom.
    const map = new gl.Map({
      container: canvas,
      style: STYLE,
      center: [lng, lat],
      zoom: 9.2,
      interactive: false,
      attributionControl: { compact: true },
    });
    map.on('load', () => {
      // keep the credit folded into its (i) button so it does not cover the small map
      canvas.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      const paint = (id, prop, val) => { if (map.getLayer(id)) map.setPaintProperty(id, prop, val); };
      paint('background', 'background-color', '#f1f0ee');
      paint('water', 'fill-color', '#dcddde');
      paint('park', 'fill-color', '#e8e7e3');
      paint('landcover_wood', 'fill-color', '#e8e7e3');
      paint('landuse_residential', 'fill-color', '#ebeae6');
    });
    const pin = document.createElement('div');
    pin.className = placeholder ? 'pin pin--placeholder' : 'pin';
    pin.innerHTML = `<span class="pin__label">${placeholder ? (ES ? 'Por confirmar' : 'To be confirmed') : label}</span><span class="pin__dot"></span>`;
    new gl.Marker({ element: pin, anchor: 'bottom', offset: [0, 7] }).setLngLat([lng, lat]).addTo(map);
  }

  function fallback() {
    canvas.innerHTML = `<div class="map__fallback"><p>${ES ? 'El mapa no cargó.' : 'The map did not load.'}</p></div>`;
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
  let started = false;
  const start = () => { if (started) return; started = true; settled(() => loadMapLib().then(init).catch(fallback)); };
  settled(warm);
  onFirstScroll(start);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      start();
    }, { rootMargin: '300px 0px' });
    io.observe(canvas);
  } else {
    start();
  }
})();
