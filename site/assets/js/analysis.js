/* Studio CAVA: a project's site analysis. The layers of a view (terrain, slope, runoff...) are stacked in one
   frame and swapped in place; the tabs pick the layer, the buttons pick the view (plan or axonometric). */
(() => {
  'use strict';
  const root = document.querySelector('[data-anl]');
  if (!root) return;
  const tabs = [...root.querySelectorAll('[data-anl-layer]')];
  const views = [...root.querySelectorAll('[data-anl-view]')];
  const frames = [...root.querySelectorAll('[data-anl-frame]')];
  const text = root.querySelector('[data-anl-text]');
  const name = root.querySelector('[data-anl-name]');
  const count = root.querySelector('[data-anl-count]');
  const total = String(tabs.length).padStart(2, '0');
  let layer = tabs[0].dataset.anlLayer;
  let view = frames[0].dataset.anlFrame;

  const show = () => {
    for (const f of frames) {
      const on = f.dataset.anlFrame === view;
      f.classList.toggle('is-on', on);
      for (const img of f.querySelectorAll('[data-anl-img]')) {
        const vis = on && img.dataset.anlImg === layer;
        if (vis) img.loading = 'eager';
        img.classList.toggle('is-on', vis);
      }
    }
    tabs.forEach((t, i) => {
      const on = t.dataset.anlLayer === layer;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on) {
        text.textContent = t.dataset.text;
        name.textContent = t.querySelector('span:last-child').textContent;
        count.textContent = `${String(i + 1).padStart(2, '0')}/${total}`;
      }
    });
    for (const b of views) b.setAttribute('aria-pressed', String(b.dataset.anlView === view));
    for (const l of root.querySelectorAll('[data-anl-legend]')) l.classList.toggle('is-on', l.dataset.anlLegend === layer);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { layer = t.dataset.anlLayer; show(); });
    t.addEventListener('keydown', (e) => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const n = tabs[(i + d + tabs.length) % tabs.length];
      layer = n.dataset.anlLayer; show(); n.focus();
    });
  });
  for (const b of views) b.addEventListener('click', () => { view = b.dataset.anlView; show(); });
  // the other layers load once the section is near, so a switch is instant
  new IntersectionObserver((es, ob) => {
    if (!es.some((e) => e.isIntersecting)) return;
    for (const img of root.querySelectorAll('[data-anl-img]')) img.loading = 'eager';
    ob.disconnect();
  }, { rootMargin: '600px' }).observe(root);
  show();
})();
