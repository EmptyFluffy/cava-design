/* Studio CAVA: the permit route, redrawn as the questions change.
   The page arrives with the route already drawn by the build; this only loads the shared rules
   (permit-route.mjs, the same module the build used) on the first change and draws again. */
(() => {
  'use strict';

  const roots = document.querySelectorAll('[data-permit-route]');
  const SCRIPT = document.currentScript && document.currentScript.src;
  if (!roots.length || !SCRIPT) return;
  const lang = document.documentElement.lang === 'es' ? 'es' : 'en';
  let mod = null;
  const rules = () => (mod ||= import(new URL('permit-route.mjs', SCRIPT).href));

  for (const root of roots) {
    const form = root.querySelector('[data-pr-form]');
    const out = root.querySelector('[data-pr-out]');
    const cite = root.dataset.cite || '#source-';
    const read = () => {
      const f = new FormData(form);
      return { type: f.get('type'), size: f.get('size'), town: f.get('town') || '', zmt: f.has('zmt'), river: f.has('river'), forest: f.has('forest'), condo: f.has('condo'), road: f.has('road') };
    };
    const draw = async () => {
      const M = await rules();
      const q = read();
      // Papagayo already brings its own reviews: the condominium box would repeat them
      const condo = form.querySelector('[name=condo]');
      if (condo) condo.closest('label').hidden = q.town === 'papagayo';
      out.classList.add('is-drawing');
      out.innerHTML = M.render(M.route(q, lang), lang, (n) => `${cite}${n}`);
      requestAnimationFrame(() => out.classList.remove('is-drawing'));
    };
    form.addEventListener('change', draw);
  }
})();
