/* Studio CAVA: motion. No library; the Web Animations API.
   1. The preloader (home, the first visit of a session): the word CAVA on black rolls once, a line runs
      across the top, then the black lifts. The hero image paints underneath from the start.
   2. The entrance, on every page: the nav and the labels rise in turn, the title rises line by line out of
      its own mask, the first image settles from a slight zoom.
   3. On the way down: titles rise line by line, paragraphs and text list items rise a little, each once,
      when they come into view. Images do not move. Only what starts below the first screen.
   Timing and curves after OH Architecture's: ease-secondary (0.16, 1, 0.35, 1), 1 s, 0.0825 s between
   lines. Nothing moves with prefers-reduced-motion. The page reads in full if this file never runs:
   the head adds .motion, and site.css shows everything after 2.5 s on its own. */
(() => {
  'use strict';

  const root = document.documentElement;
  if (!root.classList.contains('motion') || !Element.prototype.animate) {
    root.classList.remove('motion', 'is-pre');
    return;
  }
  const EASE = 'cubic-bezier(0.16, 1, 0.35, 1)';
  const ROLL = 'cubic-bezier(0.83, 0, 0.17, 1)';
  const LINE = 'cubic-bezier(0.76, 0, 0.24, 1)';
  const small = window.matchMedia('(max-width: 767px)').matches;

  // ---- a line's mask, without wrappers: the element moves up while its clip follows, so it seems to rise
  // out of the box it ends in. A little room below for descenders.
  const rise = (el, delay = 0, dur = 1000) => el.animate([
    { transform: 'translateY(110%)', clipPath: 'inset(-0.1em -0.2em 110% -0.2em)' },
    { transform: 'translateY(0)', clipPath: 'inset(-0.1em -0.2em -0.3em -0.2em)' },
  ], { duration: dur, delay, easing: EASE, fill: 'backwards' });
  const lift = (el, delay = 0, y = 24) => el.animate([
    { opacity: 0, transform: `translateY(${y}px)` },
    { opacity: 1, transform: 'none' },
  ], { duration: 900, delay, easing: EASE, fill: 'backwards' });

  // ---- plain text split into its rendered lines (each a block with its own mask), put back once it has risen
  function lines(el) {
    if (el.children.length || !el.textContent.trim()) return null;
    const text = el.textContent;
    el.innerHTML = text.trim().split(/\s+/).map((w) => `<span class="mo-w">${w}</span>`).join(' ');
    const rows = [];
    for (const w of el.querySelectorAll('.mo-w')) {
      const top = w.offsetTop;
      if (!rows.length || Math.abs(rows[rows.length - 1].top - top) > 2) rows.push({ top, words: [] });
      rows[rows.length - 1].words.push(w.textContent);
    }
    el.innerHTML = rows.map((r) => `<span class="mo-ln">${r.words.join(' ')}</span>`).join('');
    const spans = [...el.querySelectorAll('.mo-ln')];
    return { spans, restore: () => { el.textContent = text; } };
  }
  function riseLines(el, delay = 0) {
    const split = lines(el);
    if (!split) { el.style.visibility = 'visible'; return rise(el, delay); }
    el.style.visibility = 'visible';
    const anims = split.spans.map((s, i) => rise(s, delay + i * 82.5));
    Promise.all(anims.map((a) => a.finished)).then(split.restore, split.restore);
    return anims[anims.length - 1];
  }
  // a two-line display title: its two spans are its lines already
  function riseTitle(h, delay = 0) {
    h.style.visibility = 'visible';
    const parts = [...h.children].filter((c) => c.matches('span'));
    // a display title is a grid: split into lines its text would become several grid items and move the
    // page under it. One line or two, it rises whole.
    if (!parts.length) return rise(h, delay);
    parts.forEach((s, i) => rise(s, delay + i * 82.5));
  }

  // ---- 2. the entrance
  function enter(base = 0) {
    root.classList.add('is-entering');
    const hero = document.querySelector('.hero');
    if (hero) {
      const img = hero.querySelector('.hero__img');
      if (img) img.animate([
        { transform: 'scale(1.1)', filter: small ? 'none' : 'blur(5px)' },
        { transform: 'none', filter: 'none' },
      ], { duration: 1800, delay: base, easing: EASE });
      [...hero.querySelectorAll('.nav__brand, .nav__links, .nav__acts > *')].forEach((el, i) => rise(el, base + 100 + i * 62.5));
      [...hero.querySelectorAll('.hero__row > *')].forEach((el, i) => rise(el, base + 250 + i * 125));
      const t = hero.querySelector('.hero__title');
      if (t) riseLines(t, base + 350);
      const s = hero.querySelector('.hero__scroll');
      if (s) rise(s, base + 700);
    } else {
      [...document.querySelectorAll('.bar__brand, .bar__links, .bar__acts > *')].forEach((el, i) => rise(el, base + i * 62.5, 900));
      const h1 = document.querySelector('main h1');
      if (h1) (h1.classList.contains('display') ? riseTitle : riseLines)(h1, base + 120);
      const label = document.querySelector('main .mf__label, main .proj__crumb');
      if (label) rise(label, base + 60, 900);
      const cover = document.querySelector('.proj__cover > img, .proj__cover picture img');
      if (cover) cover.animate([{ transform: 'scale(1.06)' }, { transform: 'none' }], { duration: 1600, delay: base, easing: EASE });
    }
    // everything hidden for the entrance shows now (each piece animates from its own start)
    root.classList.add('is-entered');
  }

  // ---- 1. the preloader
  const pre = document.querySelector('.pre');
  if (root.classList.contains('is-pre') && pre) {
    try { sessionStorage.setItem('cava-pre', '1'); } catch (e) { /* private mode: it plays again next time */ }
    const words = pre.querySelectorAll('.pre__word');
    const line = pre.querySelector('.pre__line');
    // the word rolls up once and its copy comes in under it
    if (words.length === 2) {
      words[0].animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-105%)' }], { duration: 875, delay: 200, easing: ROLL, fill: 'forwards' });
      words[1].animate([{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], { duration: 875, delay: 200, easing: ROLL, fill: 'forwards' });
    }
    if (line) {
      line.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(0.58)' }], { duration: 1000, easing: LINE, fill: 'forwards' });
      line.animate([{ transform: 'scaleX(0.58)' }, { transform: 'scaleX(1)' }], { duration: 400, delay: 1200, easing: LINE, fill: 'forwards' });
    }
    // it lifts at 1.6 s, or later if the hero image is not in yet (never past 3 s)
    const img = document.querySelector('.hero__img');
    const ready = Promise.race([
      Promise.all([img && !img.complete ? new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); }) : null, document.fonts?.ready]),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
    Promise.all([ready, new Promise((r) => setTimeout(r, 1600))]).then(() => {
      enter(0);
      pre.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, easing: 'cubic-bezier(0.53, 0.23, 0.25, 1)', fill: 'forwards' })
        .finished.then(() => { pre.remove(); root.classList.remove('is-pre'); });
    });
  } else {
    if (pre) pre.remove();
    root.classList.remove('is-pre');
    (document.fonts?.ready ?? Promise.resolve()).then(() => enter(0));
  }

  // ---- 3. on the way down
  const SKIP = '.hero, .anl, .pmx, .compare, .lmap, .pmap, .cmap, .fg, .tyx, .est, .sunpath, .bk, .faq, nav, header, .bar, .float, .wa';
  const pick = (sel) => [...document.querySelectorAll(sel)].filter((el) => !el.closest(SKIP));
  const below = (el) => el.getBoundingClientRect().top > window.innerHeight * 0.95;
  const jobs = new Map();
  const add = (el, run) => { if (below(el)) { el.classList.add('mo-wait'); jobs.set(el, run); } };
  const addGroup = (list, run) => list.forEach((el) => add(el, run));

  pick('main h2.display, main .display:not(h1)').forEach((el) => add(el, (d) => riseTitle(el, d)));
  pick('main .h3, main .mf__intro, main .rec__title, main .gcard__title').forEach((el) => add(el, (d) => riseLines(el, d)));
  pick('main .tw__label, main .label.sheet__label, main h2.label').forEach((el) => add(el, (d) => rise(el, d, 900)));
  // images do not move on the way down: they have their own hover, and many at once felt heavy (Carlos)
  // list items in turn
  // list items in turn; not the lists of image cards (projects, strategies, press), for the same reason
  const lists = 'main .gcards, main .svc__phases, main .stages, main .certs, main .svc__for, main .svc__glance, main .sheet, main .guide__sources';
  pick(lists).forEach((list) => {
    [...list.children].filter((c) => !c.closest(SKIP)).forEach((it) => add(it, (d) => lift(it, d)));
  });

  // what comes into view together goes in turn: items of one list 62.5 ms apart, in page order
  const io = new IntersectionObserver((entries) => {
    const now = entries.filter((e) => e.isIntersecting).map((e) => e.target)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const turn = new Map();
    for (const el of now) {
      io.unobserve(el);
      const run = jobs.get(el);
      if (!run) continue;
      const k = turn.get(el.parentElement) ?? 0;
      turn.set(el.parentElement, k + 1);
      run(k * 62.5);
      jobs.delete(el);
      el.classList.remove('mo-wait');
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  jobs.forEach((_, el) => io.observe(el));
  // at the very bottom of a page the last items may never cross that line: run what is on screen
  let tick = 0;
  window.addEventListener('scroll', () => {
    if (tick || !jobs.size) return;
    tick = requestAnimationFrame(() => {
      tick = 0;
      if (window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 4) return;
      let k = 0;
      for (const [el, run] of jobs) {
        if (el.getBoundingClientRect().top >= window.innerHeight) continue;
        io.unobserve(el); jobs.delete(el); el.classList.remove('mo-wait'); run(k++ * 62.5);
      }
    });
  }, { passive: true });
})();
