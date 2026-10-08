/* Studio CAVA: the land value map (/tools/land-prices/).
   Every homogeneous zone of the Ministry of Finance, coloured by its official value per m², from one
   PMTiles file the browser reads by ranges (only the tiles in view). Tap a zone for its value, the lot it is
   set for and its edition. MapLibre and the tiles load only when the map comes near the viewport. */
(() => {
  'use strict';

  const fig = document.querySelector('[data-lmap]');
  const SCRIPT = document.currentScript && document.currentScript.src;
  if (!fig || !SCRIPT) return;
  const asset = (p) => new URL(p, SCRIPT).href;
  const ES = document.documentElement.lang === 'es';
  const MAPLIBRE = 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/';
  const PMTILES = 'https://cdn.jsdelivr.net/npm/pmtiles@4.5.0/dist/pmtiles.js';
  const STYLE = 'https://tiles.openfreemap.org/styles/positron';
  const FX = +fig.dataset.fx;
  const towns = JSON.parse(fig.dataset.towns);
  const cantons = JSON.parse(fig.dataset.cantons);

  // ₡ per m²: the class edges and their earth tones, light to dark
  const EDGES = [5000, 20000, 50000, 100000, 200000, 400000];
  const TONES = ['#f1ebdf', '#e0cfae', '#c9aa76', '#a9824b', '#82592b', '#55381a', '#24170a'];

  const T = ES ? {
    m2: 'el m²', ft2: 'el pie²', expand: 'Clic para ver el detalle', close: 'Cerrar', lot: (a) => `Fijado para un lote de ${a.toLocaleString('en-US')} m²`, edition: (y) => `Edición ${y}`,
    old: (y) => `Edición de ${y}: el mercado se ha movido desde entonces.`,
    second: 'Segunda parte de la zona', rural: 'Lotes rurales grandes',
    zmt: 'Zona marítimo terrestre: aquí no se compra el terreno, se da en concesión y se paga un canon anual.',
    failed: 'El mapa no cargó.', zone: 'zona',
  } : {
    m2: 'a m²', ft2: 'a ft²', expand: 'Click to expand', close: 'Close', lot: (a) => `Set for a lot of ${a.toLocaleString('en-US')} m²`, edition: (y) => `${y} edition`,
    old: (y) => `${y} edition: the market has moved since.`,
    second: 'Second part of the zone', rural: 'Large rural lots',
    zmt: 'Maritime zone: the land here is not sold; it is granted in concession for a yearly fee.',
    failed: 'The map did not load.', zone: 'zone',
  };

  let cur = 'usd';
  const crc = (v) => `₡${Math.round(v).toLocaleString('en-US')}`;
  const usd = (v) => { const d = v / FX; return `US$${d < 10 ? d.toFixed(1) : Math.round(d).toLocaleString('en-US')}`; };
  // a value in the currency picked first, the other one after; per m² or per ft²
  const FT2 = 10.7639;
  const pick = (v) => (cur === 'crc' ? [crc(v), usd(v)] : [usd(v), crc(v)]);
  const perFt = (v) => pick(v / FT2);
  const short = (v) => (cur === 'crc' ? (v >= 1000 ? `₡${v / 1000}k` : `₡${v}`) : `US$${Math.round(v / FX)}`);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // the legend follows the currency picked
  function legend() {
    const el = fig.querySelector('[data-lmap-legend]');
    el.innerHTML = TONES.map((c, i) => {
      const lo = EDGES[i - 1], hi = EDGES[i];
      const txt = i === 0 ? `< ${short(hi)}` : i === TONES.length - 1 ? `> ${short(lo)}` : `${short(lo)}–${short(hi)}`;
      return `<li><i style="background:${c}"></i>${txt}</li>`;
    }).join('');
  }

  const load = (src) => new Promise((resolve, reject) => {
    const js = document.createElement('script');
    js.src = src;
    js.onload = resolve;
    js.onerror = reject;
    document.head.appendChild(js);
  });
  // one MapLibre for the whole page, shared with the other maps
  const loadMapLib = () => (window.CAVA_MAPLIBRE ||= new Promise((resolve, reject) => {
    if (window.maplibregl) return resolve();
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = MAPLIBRE + 'maplibre-gl.css';
    document.head.appendChild(css);
    load(MAPLIBRE + 'maplibre-gl.js').then(resolve, reject);
  }));

  function init() {
    const gl = window.maplibregl;
    const protocol = new window.pmtiles.Protocol();
    gl.addProtocol('pmtiles', protocol.tile);
    const box = fig.querySelector('.lmap__canvas');
    const start = towns.find((t) => t.slug === (new URLSearchParams(location.search).get('town') || fig.dataset.town));
    const map = new gl.Map({
      container: box,
      style: STYLE,
      ...(start ? { center: start.c, zoom: 12.5 } : { bounds: [[-85.95, 8.0], [-82.55, 11.22]], fitBoundsOptions: { padding: 16 } }),
      minZoom: 6,
      maxZoom: 16,
      cooperativeGestures: true,
      attributionControl: { compact: true, customAttribution: 'ONT, Ministerio de Hacienda' },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-left');
    map.touchZoomRotate.disableRotation();
    if (start) fig.querySelector('[data-lmap-town]').value = start.slug;

    map.on('load', () => {
      const paint = (id, prop, val) => { if (map.getLayer(id)) map.setPaintProperty(id, prop, val); };
      paint('background', 'background-color', '#f1f0ee');
      paint('water', 'fill-color', '#dcddde');
      paint('park', 'fill-color', '#e8e7e3');
      paint('landcover_wood', 'fill-color', '#e8e7e3');
      const firstSymbol = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
      // the base map's place names would repeat ours: leave those out of its labels
      const names = towns.map((t) => t.n);
      for (const l of map.getStyle().layers) {
        if (l.type !== 'symbol' || l['source-layer'] !== 'place') continue;
        const not = ['!', ['in', ['coalesce', ['get', 'name'], ''], ['literal', names]]];
        map.setFilter(l.id, l.filter ? ['all', l.filter, not] : not);
      }
      map.addSource('zones', { type: 'vector', url: `pmtiles://${asset('../data/land.pmtiles')}`, attribution: 'Valores de terrenos por zonas homogéneas, ONT' });
      const step = ['step', ['get', 'v'], TONES[0], ...EDGES.flatMap((e, i) => [e, TONES[i + 1]])];
      map.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', 'source-layer': 'zones', paint: { 'fill-color': step, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.85, 13, 0.62] } }, firstSymbol);
      map.addLayer({ id: 'zones-line', type: 'line', source: 'zones', 'source-layer': 'zones', minzoom: 9, paint: { 'line-color': '#fcfcfc', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.2, 14, 1] } }, firstSymbol);
      map.addLayer({ id: 'zones-hover', type: 'line', source: 'zones', 'source-layer': 'zones', paint: { 'line-color': '#080807', 'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 0] } }, firstSymbol);
      // our towns, on top
      const font = map.getLayoutProperty('label_city', 'text-font') || ['Noto Sans Regular'];
      map.addSource('towns', { type: 'geojson', data: { type: 'FeatureCollection', features: towns.map((t) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: t.c }, properties: { name: t.n, slug: t.slug } })) } });
      map.addLayer({ id: 'towns-dot', type: 'circle', source: 'towns', paint: { 'circle-radius': 4, 'circle-color': '#080807', 'circle-stroke-color': '#fcfcfc', 'circle-stroke-width': 1.5 } });
      map.addLayer({ id: 'towns-label', type: 'symbol', source: 'towns', layout: { 'text-field': ['get', 'name'], 'text-font': font, 'text-size': 12, 'text-offset': [0, 1.1], 'text-anchor': 'top' }, paint: { 'text-color': '#080807', 'text-halo-color': '#fcfcfc', 'text-halo-width': 1.6 } });
      box.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');

      // hover outline
      let hovered = null;
      const setHover = (id) => {
        if (hovered !== null) map.setFeatureState({ source: 'zones', sourceLayer: 'zones', id: hovered }, { hover: false });
        hovered = id;
        if (id !== null) map.setFeatureState({ source: 'zones', sourceLayer: 'zones', id }, { hover: true });
      };

      // One card for a zone: a small bubble that follows the pointer, which opens in place into the
      // zone's detail when clicked (or tapped), and folds away again.
      const card = document.createElement('div');
      card.className = 'lmap__card';
      card.hidden = true;
      box.appendChild(card);
      const canHover = window.matchMedia('(hover: hover)').matches;
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
      let mode = null; // null, 'tip' or 'open'
      let tipFor = null, openAt = null, openP = null, anim = null;
      const now = new Date().getFullYear();
      const priceRows = (p, full) => `<p class="lmap__c-v"><b>${pick(p.v)[0]}</b> <i>${T.m2}</i>${full ? ` <span>${pick(p.v)[1]}</span>` : ''}</p>
          <p class="lmap__c-v lmap__c-v--ft"><b>${perFt(p.v)[0]}</b> <i>${T.ft2}</i>${full ? ` <span>${perFt(p.v)[1]}</span>` : ''}</p>`;
      const tipHTML = (p) => `<div class="lmap__c-in"><p class="lmap__c-name">${esc(p.n)}</p>${priceRows(p, false)}<p class="lmap__c-cta">${T.expand}</p></div>`;
      const openHTML = (p) => {
        const rows = [];
        if (p.v2) rows.push(`<li>${T.second}: ${pick(p.v2)[0]} ${T.m2} (${pick(p.v2)[1]})</li>`);
        if (p.r) rows.push(`<li>${T.rural}: ${pick(p.r)[0]} ${T.m2} (${pick(p.r)[1]})</li>`);
        return `<div class="lmap__c-in">
          <button class="lmap__c-x" type="button" aria-label="${T.close}">×</button>
          <p class="lmap__c-name">${esc(p.n)}</p>
          ${priceRows(p, true)}
          <div class="lmap__c-more">
            <p class="lmap__c-where">${esc(cantons[p.c] ?? '')} · ${T.zone} ${esc(p.z)}</p>
            ${rows.length ? `<ul class="lmap__c-list">${rows.join('')}</ul>` : ''}
            <p class="lmap__c-meta">${[p.a ? T.lot(p.a) : '', p.y ? T.edition(p.y) : ''].filter(Boolean).join(' · ')}</p>
            ${p.y && now - p.y >= 5 ? `<p class="lmap__c-warn">${T.old(p.y)}</p>` : ''}
            ${p.zmt ? `<p class="lmap__c-warn">${T.zmt}</p>` : ''}
          </div>
        </div>`;
      };
      // where the card's top left goes for a point: below right of it, turned back inside the map
      const spot = (x, y) => {
        const W = box.clientWidth, H = box.clientHeight, w = card.offsetWidth, h = card.offsetHeight;
        let l = x + 14, t = y + 14;
        if (l + w > W - 8) l = x - 14 - w;
        if (t + h > H - 8) t = y - 14 - h;
        return [Math.max(8, Math.min(l, W - 8 - w)), Math.max(8, Math.min(t, H - 8 - h))];
      };
      const put = ([l, t]) => { card.style.transform = `translate(${l}px, ${t}px)`; };
      const at = () => { const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(card.style.transform); return m ? [+m[1], +m[2]] : [0, 0]; };
      const stop = () => { if (anim) { anim.cancel(); anim = null; } };
      const showTip = (p, id, pt) => {
        if (tipFor !== id || mode !== 'tip') { stop(); card.className = 'lmap__card'; card.innerHTML = tipHTML(p); tipFor = id; }
        mode = 'tip';
        card.hidden = false;
        put(spot(pt.x, pt.y));
      };
      const hideTip = () => { if (mode === 'tip') { card.hidden = true; mode = null; tipFor = null; } };
      function open(p, lngLat, pt) {
        stop();
        const before = !card.hidden ? { pos: at(), w: card.offsetWidth, h: card.offsetHeight } : null;
        card.className = 'lmap__card is-open';
        card.innerHTML = openHTML(p);
        card.hidden = false;
        mode = 'open'; openAt = lngLat; openP = p; tipFor = null;
        const end = spot(pt.x, pt.y);
        put(end);
        if (still) return;
        const w = card.offsetWidth, h = card.offsetHeight;
        const inner = card.firstElementChild;
        inner.style.width = `${w}px`; // the detail is laid out at its full size and revealed as the card grows
        const from = before ?? { pos: [end[0], end[1]], w: Math.min(w, 140), h: Math.min(h, 60) };
        anim = card.animate([
          { transform: `translate(${from.pos[0]}px, ${from.pos[1]}px)`, width: `${from.w}px`, height: `${from.h}px`, opacity: before ? 1 : 0 },
          { transform: `translate(${end[0]}px, ${end[1]}px)`, width: `${w}px`, height: `${h}px`, opacity: 1 },
        ], { duration: 460, easing: EASE });
        card.querySelector('.lmap__c-more')?.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 140, easing: EASE, fill: 'backwards' });
        anim.onfinish = () => { inner.style.width = ''; anim = null; };
      }
      function close() {
        if (mode !== 'open') return;
        stop();
        mode = null; openAt = null; openP = null;
        if (still) { card.hidden = true; return; }
        const [l, t] = at();
        anim = card.animate([
          { transform: `translate(${l}px, ${t}px)`, opacity: 1 },
          { transform: `translate(${l}px, ${t}px) scale(0.85)`, opacity: 0 },
        ], { duration: 220, easing: 'ease-in' });
        anim.onfinish = () => { card.hidden = true; anim = null; };
      }
      card.addEventListener('click', (e) => { if (e.target.closest('.lmap__c-x')) close(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

      map.on('mousemove', 'zones-fill', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features[0];
        setHover(f.id ?? null);
        if (!canHover || mode === 'open') return;
        // not over a town's dot or name, which fly to the town instead
        if (map.queryRenderedFeatures(e.point, { layers: ['towns-dot', 'towns-label'] }).length) { hideTip(); return; }
        showTip(f.properties, f.id, e.point);
      });
      map.on('mouseleave', 'zones-fill', () => { map.getCanvas().style.cursor = ''; setHover(null); hideTip(); });
      map.on('dragstart', hideTip);
      map.on('zoomstart', hideTip);
      // an open card stays with its point while the map moves
      map.on('move', () => { if (mode === 'open' && openAt && !anim) { const pt = map.project(openAt); put(spot(pt.x, pt.y)); } });
      map.on('click', (e) => {
        if (map.queryRenderedFeatures(e.point, { layers: ['towns-dot', 'towns-label'] }).length) return;
        const f = map.queryRenderedFeatures(e.point, { layers: ['zones-fill'] })[0];
        if (f) open(f.properties, e.lngLat, e.point);
        else close();
      });
      // a new currency redraws the card in it
      fig.addEventListener('lmap:cur', () => {
        if (mode === 'open') { card.innerHTML = openHTML(openP); }
        else hideTip();
      });
      for (const id of ['towns-dot', 'towns-label']) {
        map.on('click', id, (e) => { const t = towns.find((x) => x.slug === e.features[0].properties.slug); fly(t); });
        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
      }
    });

    const fly = (t) => {
      if (!t) return;
      map.flyTo({ center: t.c, zoom: 12.5, essential: true });
      fig.querySelector('[data-lmap-town]').value = t.slug;
      const u = new URL(location.href);
      u.searchParams.set('town', t.slug);
      history.replaceState(null, '', u);
    };
    fig.querySelector('[data-lmap-town]').addEventListener('change', (e) => {
      const t = towns.find((x) => x.slug === e.target.value);
      if (t) fly(t);
      else map.fitBounds([[-85.95, 8.0], [-82.55, 11.22]], { padding: 16 });
    });
    // the table's "map" links fly here too
    document.querySelectorAll('[data-lmap-fly]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      fig.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      fly(towns.find((x) => x.slug === a.dataset.lmapFly));
    }));
  }

  fig.querySelectorAll('[data-cur]').forEach((b) => b.addEventListener('click', () => {
    cur = b.dataset.cur;
    fig.querySelectorAll('[data-cur]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    legend();
    fig.dispatchEvent(new CustomEvent('lmap:cur'));
  }));
  legend();

  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    Promise.all([loadMapLib(), window.pmtiles ? Promise.resolve() : load(PMTILES)])
      .then(init)
      .catch(() => { fig.querySelector('.lmap__canvas').innerHTML = `<div class="map__fallback"><p>${T.failed}</p></div>`; });
  }, { rootMargin: '600px 0px' });
  io.observe(fig);
})();
