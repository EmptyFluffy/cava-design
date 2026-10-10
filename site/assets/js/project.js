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
