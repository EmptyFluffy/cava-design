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
    m2: 'el m²', ft2: 'el pie²', expand: 'Clic para ver el detalle', lot: (a) => `Fijado para un lote de ${a.toLocaleString('en-US')} m²`, edition: (y) => `Edición ${y}`,
    old: (y) => `Edición de ${y}: el mercado se ha movido desde entonces.`,
    second: 'Segunda parte de la zona', rural: 'Lotes rurales grandes',
    zmt: 'Zona marítimo terrestre: aquí no se compra el terreno, se da en concesión y se paga un canon anual.',
    failed: 'El mapa no cargó.', zone: 'zona',
  } : {
    m2: 'a m²', ft2: 'a ft²', expand: 'Click to expand', lot: (a) => `Set for a lot of ${a.toLocaleString('en-US')} m²`, edition: (y) => `${y} edition`,
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

      // hover outline and the zone card
      let hovered = null;
      const setHover = (id) => {
        if (hovered !== null) map.setFeatureState({ source: 'zones', sourceLayer: 'zones', id: hovered }, { hover: false });
        hovered = id;
        if (id !== null) map.setFeatureState({ source: 'zones', sourceLayer: 'zones', id }, { hover: true });
      };
      // a bubble that follows the pointer with the zone's price, so it is plain that a click opens it
      const tip = document.createElement('div');
      tip.className = 'lmap__tip';
      tip.hidden = true;
      tip.setAttribute('aria-hidden', 'true');
      box.appendChild(tip);
      const canHover = window.matchMedia('(hover: hover)').matches;
      let tipFor = null;
      const hideTip = () => { tip.hidden = true; tipFor = null; };
      map.on('mousemove', 'zones-fill', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features[0];
        setHover(f.id ?? null);
        if (!canHover) return;
        // not over a town's dot or name, which fly to the town instead
        if (map.queryRenderedFeatures(e.point, { layers: ['towns-dot', 'towns-label'] }).length) { hideTip(); return; }
        const p = f.properties;
        if (tipFor !== f.id) {
          tipFor = f.id;
          tip.innerHTML = `<span class="lmap__tip-name">${esc(p.n)}</span><b>${pick(p.v)[0]} <small>${T.m2}</small></b><b>${perFt(p.v)[0]} <small>${T.ft2}</small></b><em>${T.expand}</em>`;
        }
        tip.hidden = false;
        const W = box.clientWidth, H = box.clientHeight, w = tip.offsetWidth, h = tip.offsetHeight;
        const x = e.point.x + 16 + w > W ? e.point.x - 16 - w : e.point.x + 16;
        const y = e.point.y + 16 + h > H ? e.point.y - 16 - h : e.point.y + 16;
        tip.style.transform = `translate(${Math.max(4, x)}px, ${Math.max(4, y)}px)`;
      });
      map.on('mouseleave', 'zones-fill', () => { map.getCanvas().style.cursor = ''; setHover(null); hideTip(); });
      map.on('dragstart', hideTip);
      // a new currency closes an open card; the next one opens in it
      fig.addEventListener('lmap:cur', () => { popup.remove(); hideTip(); });
      map.on('zoomstart', hideTip);
      const popup = new gl.Popup({ closeButton: true, maxWidth: '20rem', className: 'lmap__pop' });
      map.on('click', 'zones-fill', (e) => {
        if (map.queryRenderedFeatures(e.point, { layers: ['towns-dot', 'towns-label'] }).length) return;
        const p = e.features[0].properties;
        const now = new Date().getFullYear();
        const rows = [];
        if (p.v2) rows.push(`<li>${T.second}: ${pick(p.v2)[0]} ${T.m2} (${pick(p.v2)[1]})</li>`);
        if (p.r) rows.push(`<li>${T.rural}: ${pick(p.r)[0]} ${T.m2} (${pick(p.r)[1]})</li>`);
        const html = `<p class="lmap__name">${esc(p.n)}</p>
          <p class="lmap__where">${esc(cantons[p.c] ?? '')} · ${T.zone} ${esc(p.z)}</p>
          <p class="lmap__value"><b>${pick(p.v)[0]}</b> ${T.m2} <span>${pick(p.v)[1]}</span></p>
          <p class="lmap__value lmap__value--ft"><b>${perFt(p.v)[0]}</b> ${T.ft2} <span>${perFt(p.v)[1]}</span></p>
          ${rows.length ? `<ul class="lmap__more">${rows.join('')}</ul>` : ''}
          <p class="lmap__meta">${[p.a ? T.lot(p.a) : '', p.y ? T.edition(p.y) : ''].filter(Boolean).join(' · ')}</p>
          ${p.y && now - p.y >= 5 ? `<p class="lmap__warn">${T.old(p.y)}</p>` : ''}
          ${p.zmt ? `<p class="lmap__warn">${T.zmt}</p>` : ''}`;
        hideTip();
        popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
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
