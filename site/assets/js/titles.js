/* Studio CAVA: two-line display titles step down, the second line starting where the first ends
   (the grid in site.css). A second line too long for the room left would wrap: it takes the whole
   width instead, set right, as the titles were before. */
(() => {
  'use strict';

  const titles = [...document.querySelectorAll('.display')].filter((h) => h.querySelector(':scope > .right'));
  if (!titles.length) return;
  const fit = () => {
    for (const h of titles) {
      const b = h.querySelector(':scope > .right');
      b.classList.remove('is-wide');
      b.style.whiteSpace = 'nowrap';
      const wide = b.scrollWidth > b.clientWidth + 1;
      b.style.whiteSpace = '';
      b.classList.toggle('is-wide', wide);
    }
  };
  fit();
  document.fonts?.ready.then(fit);
  if (window.ResizeObserver) { const ro = new ResizeObserver(fit); titles.forEach((h) => ro.observe(h)); }
})();
