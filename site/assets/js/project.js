/* Studio CAVA, project pages: the location map in the technical sheet.
   MapLibre and the tiles load only when the map comes near the viewport. */
(() => {
  'use strict';

  const fig = document.querySelector('[data-pmap]');
  if (!fig) return;
  const canvas = fig.querySelector('.pmap__canvas');
  const MAPLIBRE = 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/';
  const STYLE = 'https://tiles.openfreemap.org/styles/positron';
  const lng = Number(fig.dataset.lng), lat = Number(fig.dataset.lat);
  const label = fig.dataset.label.split(',')[0];
  const placeholder = fig.dataset.pin === 'placeholder';
  const ES = document.documentElement.lang === 'es';

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

  const start = () => loadMapLib().then(init).catch(fallback);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      start();
    }, { rootMargin: '600px 0px' });
    io.observe(canvas);
  } else {
    start();
  }
})();
