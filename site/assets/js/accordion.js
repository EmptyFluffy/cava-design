/* Studio CAVA: questions (and the studio's beliefs) open and shut with a short slide.
   The page works without this: <details> opens on its own. With it, the answer's height and opacity
   move together; a second click mid-way turns the movement around from where it is. */
(() => {
  'use strict';

  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const running = new WeakMap();

  document.addEventListener('click', (e) => {
    const sum = e.target.closest('details.faq__item > summary, details.belief > summary');
    if (!sum || still.matches) return;
    const box = sum.parentElement;
    const body = box.querySelector(':scope > .faq__a, :scope > .belief__body');
    if (!body || !body.animate) return;
    e.preventDefault();

    const was = running.get(box);
    const closing = box.open && (!was || was.dir === 'open');
    const cs = getComputedStyle(body);
    const from = { height: cs.height, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, opacity: cs.opacity };
    if (was) was.anim.cancel();
    body.style.overflow = 'hidden';

    let to;
    if (closing) {
      to = { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0 };
    } else {
      box.open = true;
      body.style.height = body.style.paddingTop = body.style.paddingBottom = '';
      const end = getComputedStyle(body);
      to = { height: `${body.offsetHeight}px`, paddingTop: end.paddingTop, paddingBottom: end.paddingBottom, opacity: 1 };
      if (!was) Object.assign(from, { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0 });
    }
    const anim = body.animate([from, to], { duration: closing ? 320 : 420, easing: EASE });
    running.set(box, { anim, dir: closing ? 'close' : 'open' });
    anim.onfinish = () => {
      if (closing) box.open = false;
      body.style.overflow = '';
      running.delete(box);
    };
  });
})();
