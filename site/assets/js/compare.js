/* Studio CAVA: two views of the same place, one over the other, with a divider to drag.
   The range input underneath does the work (mouse, touch and keyboard); the first time the figure
   comes into view, the line sweeps once to show it moves. */
(() => {
  'use strict';

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const box of document.querySelectorAll('[data-compare]')) {
    const range = box.querySelector('.compare__range');
    const set = (v) => { box.style.setProperty('--pos', `${v}%`); };
    range.addEventListener('input', () => { box.classList.add('is-touched'); set(range.value); });
    // a click anywhere on the image moves the line there
    box.addEventListener('pointerdown', (e) => {
      const r = box.getBoundingClientRect();
      const v = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
      range.value = v; set(v); box.classList.add('is-touched');
    });
    if (still || !('IntersectionObserver' in window)) continue;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      // a short sweep: 50 → 70 → 30 → 50
      const keys = [[0, 50], [700, 70], [1500, 30], [2100, 50]];
      const t0 = performance.now();
      const ease = (x) => 0.5 - Math.cos(Math.PI * x) / 2;
      const step = (now) => {
        if (box.classList.contains('is-touched')) return;
        const t = now - t0;
        const k = keys.findIndex(([at]) => at > t);
        if (k === -1) { set(50); return; }
        const [ta, va] = keys[k - 1], [tb, vb] = keys[k];
        set(va + (vb - va) * ease((t - ta) / (tb - ta)));
        requestAnimationFrame(step);
      };
      setTimeout(() => requestAnimationFrame(step), 400);
    }, { threshold: 0.6 });
    io.observe(box);
  }
})();
