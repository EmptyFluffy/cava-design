/* Studio CAVA: the wind and sun map (where we work, and every town page).
   Lines drift with the average wind of the season picked; the colour is the sunlight the ground gets in a
   year. Built on the same MapLibre map as the rest of the site; MapLibre and the data load only when the
   map comes near the viewport. Wind: NASA POWER (MERRA-2). Sun: Global Solar Atlas. */
(() => {
  'use strict';

  const figs = [...document.querySelectorAll('[data-cmap]')];
  const SCRIPT = document.currentScript && document.currentScript.src;
  if (!figs.length || !SCRIPT) return;
  const asset = (p) => new URL(p, SCRIPT).href;
  const MAPLIBRE = 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/';
  const STYLE = 'https://tiles.openfreemap.org/styles/positron';
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // one MapLibre for the whole page, whichever script asks first
  const loadMapLib = () => (window.CAVA_MAPLIBRE ||= new Promise((resolve, reject) => {
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
  const getJSON = (p) => fetch(asset(p)).then((r) => r.json());

  function init(fig, wind, ghi) {
    const gl = window.maplibregl;
    const box = fig.querySelector('.cmap__canvas');
    const [lng, lat] = fig.dataset.center.split(',').map(Number);
    const pins = JSON.parse(fig.dataset.pins);
    // a town opens on its centre and zoom; the country map fits its bounds to any screen
    const view = fig.dataset.bounds
      ? { bounds: JSON.parse(fig.dataset.bounds), fitBoundsOptions: { padding: 16 } }
      : { center: [lng, lat], zoom: +fig.dataset.zoom };
    const map = new gl.Map({
      container: box,
      style: STYLE,
      ...view,
      minZoom: 6,
      maxZoom: 11,
      cooperativeGestures: true,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-left');
    map.touchZoomRotate.disableRotation();

    // ---- wind: particles that drift with the season's mean wind ----
    const canvas = document.createElement('canvas');
    canvas.className = 'cmap__wind';
    box.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let field = wind.seasons[fig.dataset.season || 'dry'];
    const { lons, lats } = wind;
    const lo0 = lons[0], dlo = lons[1] - lons[0], la0 = lats[0], dla = lats[1] - lats[0];
    const sample = (x, y) => {
      const fx = (x - lo0) / dlo, fy = (y - la0) / dla;
      if (fx < 0 || fy < 0 || fx > lons.length - 1 || fy > lats.length - 1) return null;
      const i = Math.min(Math.floor(fx), lons.length - 2), j = Math.min(Math.floor(fy), lats.length - 2);
      const ax = fx - i, ay = fy - j;
      const bl = (g) => g[j][i] * (1 - ax) * (1 - ay) + g[j][i + 1] * ax * (1 - ay) + g[j + 1][i] * (1 - ax) * ay + g[j + 1][i + 1] * ax * ay;
      return [bl(field.u), bl(field.v)];
    };
    const N = window.innerWidth < 768 ? 700 : 1800;
    const parts = Array.from({ length: N }, () => ({}));
    const spawn = (p) => {
      const b = map.getBounds();
      p.x = b.getWest() + Math.random() * (b.getEast() - b.getWest());
      p.y = b.getSouth() + Math.random() * (b.getNorth() - b.getSouth());
      p.age = Math.floor(Math.random() * 90);
      return p;
    };
    const size = () => {
      canvas.width = box.clientWidth * dpr;
      canvas.height = box.clientHeight * dpr;
      canvas.style.width = `${box.clientWidth}px`;
      canvas.style.height = `${box.clientHeight}px`;
    };
    // degrees per frame for 1 m/s, so that 5 m/s crosses about 1.7 px a frame at any zoom
    const step = () => 0.34 / ((512 * 2 ** map.getZoom()) / 360);
    const drawLine = (p, k) => {
      const v = sample(p.x, p.y);
      if (!v) return false;
      const a = map.project([p.x, p.y]);
      p.x += (v[0] * k) / Math.cos((p.y * Math.PI) / 180);
      p.y += v[1] * k;
      const b = map.project([p.x, p.y]);
      ctx.moveTo(a.x * dpr, a.y * dpr);
      ctx.lineTo(b.x * dpr, b.y * dpr);
      return true;
    };
    const ink = () => {
      ctx.strokeStyle = 'rgba(8, 8, 7, 0.5)';
      ctx.lineWidth = 1.1 * dpr;
      ctx.lineCap = 'round';
    };
    let raf = null, visible = false;
    function frame() {
      raf = null;
      if (!visible || document.hidden) return;
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.93)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      ink();
      ctx.beginPath();
      const k = step();
      for (const p of parts) {
        if (p.x === undefined || p.age++ > 90 || !drawLine(p, k)) spawn(p);
      }
      ctx.stroke();
      raf = requestAnimationFrame(frame);
    }
    // with reduced motion: still streamlines, drawn once per view
    function streamlines() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ink();
      ctx.beginPath();
      const k = step() * 2;
      for (let n = 0; n < N / 3; n++) {
        const p = spawn({});
        for (let s = 0; s < 28 && drawLine(p, k); s++);
      }
      ctx.stroke();
    }
    const restart = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach(spawn);
      if (still) streamlines();
      else if (!raf && visible) raf = requestAnimationFrame(frame);
    };
    new IntersectionObserver((en) => { visible = en.some((e) => e.isIntersecting); restart(); }).observe(box);
    document.addEventListener('visibilitychange', restart);
    map.on('movestart', () => ctx.clearRect(0, 0, canvas.width, canvas.height));
    map.on('moveend', restart);
    map.on('resize', () => { size(); restart(); });

    // ---- sun: the radiation overlay, and the towns ----
    map.on('load', () => {
      const paint = (id, prop, val) => { if (map.getLayer(id)) map.setPaintProperty(id, prop, val); };
      paint('background', 'background-color', '#f1f0ee');
      paint('water', 'fill-color', '#dcddde');
      paint('park', 'fill-color', '#e8e7e3');
      paint('landcover_wood', 'fill-color', '#e8e7e3');
      paint('landuse_residential', 'fill-color', '#ebeae6');
      const firstSymbol = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
      map.addSource('ghi', { type: 'image', url: asset('../img/ghi-cr.webp'), coordinates: ghi.corners });
      map.addLayer({ id: 'ghi', type: 'raster', source: 'ghi', paint: { 'raster-opacity': 0.62, 'raster-resampling': 'linear' } }, firstSymbol);
      const font = map.getLayoutProperty('label_city', 'text-font') || ['Noto Sans Regular'];
      map.addSource('towns', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: pins.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p.c }, properties: { name: p.n, href: p.h, here: !!p.here } })) },
      });
      map.addLayer({ id: 'towns-dot', type: 'circle', source: 'towns', paint: { 'circle-radius': ['case', ['get', 'here'], 6, 4], 'circle-color': ['case', ['get', 'here'], '#080807', '#545454'], 'circle-stroke-color': '#fcfcfc', 'circle-stroke-width': 1.5 } });
      map.addLayer({
        id: 'towns-label', type: 'symbol', source: 'towns',
        layout: { 'text-field': ['get', 'name'], 'text-font': font, 'text-size': ['case', ['get', 'here'], 14, 12], 'text-offset': [0, 1.1], 'text-anchor': 'top', 'symbol-sort-key': ['case', ['get', 'here'], 0, 1] },
        paint: { 'text-color': '#080807', 'text-halo-color': '#fcfcfc', 'text-halo-width': 1.6 },
      });
      for (const id of ['towns-dot', 'towns-label']) {
        map.on('click', id, (e) => { const h = e.features[0].properties.href; if (h) window.location.href = h; });
        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
      }
      box.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      size();
      restart();
    });

    // ---- controls ----
    fig.querySelectorAll('[data-season]').forEach((b) => b.addEventListener('click', () => {
      field = wind.seasons[b.dataset.season];
      fig.querySelectorAll('[data-season]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      restart();
    }));
    const sunBtn = fig.querySelector('[data-sun]');
    sunBtn?.addEventListener('click', () => {
      const on = sunBtn.getAttribute('aria-pressed') !== 'true';
      sunBtn.setAttribute('aria-pressed', String(on));
      if (map.getLayer('ghi')) map.setLayoutProperty('ghi', 'visibility', on ? 'visible' : 'none');
      fig.querySelector('.cmap__sun')?.toggleAttribute('hidden', !on);
    });
  }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      Promise.all([loadMapLib(), getJSON('../data/wind.json'), getJSON('../data/ghi.json')])
        .then(([, wind, ghi]) => init(e.target, wind, ghi))
        .catch(() => { e.target.querySelector('.cmap__canvas').innerHTML = `<div class="map__fallback"><p>${document.documentElement.lang === 'es' ? 'El mapa no cargó.' : 'The map did not load.'}</p></div>`; });
    }
  }, { rootMargin: '600px 0px' });
  figs.forEach((f) => io.observe(f));
})();
