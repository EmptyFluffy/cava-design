/* Studio CAVA: a project's site analysis. The layers of a view (terrain, slope, runoff...) are stacked in one
   frame and swapped in place. While the section is on screen they advance by themselves, through the plan
   and then the axonometric; a click on a layer or a view, or the pause button, stops that. The views in the
   cover matrix open their layer here. */
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
  const play = root.querySelector('[data-anl-play]');
  const total = String(tabs.length).padStart(2, '0');
  const STEP = 3600;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let layer = tabs[0].dataset.anlLayer;
  let view = frames[0].dataset.anlFrame;
  let stopped = still, hover = false, visible = false, timer = 0;

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
        // keep the active pill in view where the list scrolls sideways (phones), without moving the page
        const list = t.closest('ol');
        if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: t.offsetLeft - list.clientWidth / 2 + t.offsetWidth / 2, behavior: still ? 'auto' : 'smooth' });
      }
    });
    for (const b of views) b.setAttribute('aria-pressed', String(b.dataset.anlView === view));
    for (const l of root.querySelectorAll('[data-anl-legend]')) l.classList.toggle('is-on', l.dataset.anlLegend === layer);
    for (const n of root.querySelectorAll('[data-anl-notes]')) n.classList.toggle('is-on', n.dataset.anlNotes.split(' ').includes(layer));
  };

  // autoplay: the progress bar on the active tab restarts with every step
  const running = () => !stopped && !hover && visible;
  const tick = () => {
    const i = tabs.findIndex((t) => t.dataset.anlLayer === layer);
    if (i === tabs.length - 1) {
      const v = views.findIndex((b) => b.dataset.anlView === view);
      view = views[(v + 1) % views.length].dataset.anlView;
    }
    layer = tabs[(i + 1) % tabs.length].dataset.anlLayer;
    show(); schedule();
  };
  const schedule = () => {
    clearTimeout(timer);
    root.classList.remove('is-playing');
    if (!running()) return;
    void root.offsetWidth;                 // restart the progress animation
    root.classList.add('is-playing');
    timer = setTimeout(tick, STEP);
  };
  const stop = () => {
    stopped = true;
    if (play) { play.textContent = play.dataset.resume; play.setAttribute('aria-pressed', 'true'); }
    schedule();
  };
  root.style.setProperty('--anl-step', `${STEP}ms`);

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { layer = t.dataset.anlLayer; show(); stop(); });
    t.addEventListener('keydown', (e) => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const n = tabs[(i + d + tabs.length) % tabs.length];
      layer = n.dataset.anlLayer; show(); stop(); n.focus();
    });
  });
  for (const b of views) b.addEventListener('click', () => { view = b.dataset.anlView; show(); stop(); });
  if (play) {
    if (still) { play.textContent = play.dataset.resume; play.setAttribute('aria-pressed', 'true'); }
    play.addEventListener('click', () => {
      stopped = !stopped;
      play.textContent = stopped ? play.dataset.resume : play.dataset.pause;
      play.setAttribute('aria-pressed', String(stopped));
      schedule();
    });
  }
  const stage = root.querySelector('.anl__stage');
  stage.addEventListener('pointerenter', () => { hover = true; schedule(); });
  stage.addEventListener('pointerleave', () => { hover = false; schedule(); });
  root.addEventListener('focusin', () => { hover = true; schedule(); });
  root.addEventListener('focusout', () => { hover = root.contains(document.activeElement); schedule(); });
  document.addEventListener('visibilitychange', () => { visible = !document.hidden && visible; schedule(); });

  // the cover matrix: each view opens its layer here
  for (const b of document.querySelectorAll('[data-anl-go]')) {
    b.addEventListener('click', () => {
      [view, layer] = b.dataset.anlGo.split(' ');
      show(); stop();
      root.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    });
  }

  // the other layers load once the section is near, so a switch is instant; it plays while in view
  new IntersectionObserver((es, ob) => {
    if (!es.some((e) => e.isIntersecting)) return;
    for (const img of root.querySelectorAll('[data-anl-img]')) img.loading = 'eager';
    ob.disconnect();
  }, { rootMargin: '600px' }).observe(root);
  new IntersectionObserver((es) => { visible = es[0].isIntersecting && !document.hidden; schedule(); }, { threshold: 0.35 }).observe(stage);
  show();
})();
