// The project index (/projects/index/, /es/proyectos/indice/): filters with counts, sortable columns, a
// square and its row lit together, and a peek at a project's image beside the cursor. The table and the
// squares work without any of it: this only adds the handling.
(() => {
  const table = document.querySelector('[data-idx-table]');
  if (!table) return;
  const es = document.documentElement.lang === 'es';
  const body = table.tBodies[0];
  const rows = [...body.rows];
  const rowByNo = new Map(rows.map((r) => [r.dataset.no, r]));
  const sqs = [...document.querySelectorAll('.idx__sq')];
  const sqByNo = new Map(sqs.map((s) => [s.dataset.no, s]));
  const shown = document.querySelector('[data-idx-shown]');

  // filters: one value per facet, all of them must match
  const state = { group: '', stage: '', where: '' };
  const apply = () => {
    let n = 0;
    for (const r of rows) {
      const on = Object.entries(state).every(([k, v]) => !v || r.dataset[k] === v);
      r.hidden = !on;
      if (on) n += 1;
      sqByNo.get(r.dataset.no)?.classList.toggle('is-out', !on);
    }
    const all = Object.values(state).every((v) => !v);
    shown.textContent = all ? '' : es ? `${n} de ${rows.length} proyectos` : `${n} of ${rows.length} projects`;
    if (table.tFoot) table.tFoot.hidden = !all; // the totals are for the whole list
  };
  for (const b of document.querySelectorAll('[data-idx-facets] .idx__pill')) {
    b.addEventListener('click', () => {
      state[b.dataset.f] = b.dataset.v;
      for (const x of document.querySelectorAll(`.idx__pill[data-f="${b.dataset.f}"]`)) x.setAttribute('aria-pressed', String(x === b));
      apply();
    });
  }

  // sorting: number, area or year; a second click turns the order round
  const heads = [...table.tHead.rows[0].cells];
  for (const b of table.querySelectorAll('.idx__sort')) {
    b.addEventListener('click', () => {
      const th = b.closest('th');
      const dir = th.getAttribute('aria-sort') === 'descending' ? 'ascending' : 'descending';
      for (const c of heads) c.removeAttribute('aria-sort');
      th.setAttribute('aria-sort', dir);
      const key = b.dataset.sort;
      const s = dir === 'ascending' ? 1 : -1;
      rows.sort((x, y) => (Number(x.dataset[key]) - Number(y.dataset[key])) * s || (Number(x.dataset.no) - Number(y.dataset.no)) * s);
      body.append(...rows);
    });
  }

  // a square and its row light together; the square says what it is
  const tip = document.querySelector('[data-idx-tip]');
  const hot = (no, on) => {
    rowByNo.get(no)?.classList.toggle('is-hot', on);
    sqByNo.get(no)?.classList.toggle('is-hot', on);
  };
  for (const s of sqs) {
    const show = () => {
      hot(s.dataset.no, true);
      tip.textContent = s.dataset.tip;
      tip.hidden = false;
      const r = s.getBoundingClientRect();
      const t = tip.getBoundingClientRect();
      const x = Math.max(8, Math.min(r.left + r.width / 2 - t.width / 2, innerWidth - t.width - 8));
      const y = r.top - t.height - 8 < 8 ? r.bottom + 8 : r.top - t.height - 8;
      tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    };
    const hide = () => {
      hot(s.dataset.no, false);
      tip.hidden = true;
    };
    s.addEventListener('pointerenter', show);
    s.addEventListener('pointerleave', hide);
    s.addEventListener('focus', show);
    s.addEventListener('blur', hide);
  }
  addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

  // rows with a page: the whole row opens it, and a mouse sees the project's image beside the cursor
  const peek = document.querySelector('[data-idx-peek]');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  for (const r of rows) {
    r.addEventListener('pointerenter', () => hot(r.dataset.no, true));
    r.addEventListener('pointerleave', () => hot(r.dataset.no, false));
    const link = r.querySelector('.idx__go');
    if (!link) continue;
    r.classList.add('has-page');
    r.addEventListener('click', (e) => {
      if (e.target.closest('a') || String(getSelection())) return;
      location.href = link.href;
    });
    if (!fine || !r.dataset.img) continue;
    r.addEventListener('pointerenter', () => {
      if (peek.getAttribute('src') !== r.dataset.img) peek.src = r.dataset.img;
      peek.hidden = false;
    });
    r.addEventListener('pointermove', (e) => {
      const w = peek.offsetWidth || 288;
      const h = peek.offsetHeight || 192;
      const x = e.clientX + 28 + w > innerWidth - 16 ? e.clientX - 28 - w : e.clientX + 28;
      const y = Math.max(16, Math.min(e.clientY - h / 2, innerHeight - h - 16));
      peek.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    });
    r.addEventListener('pointerleave', () => { peek.hidden = true; });
  }
})();
