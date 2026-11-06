// The project index (/projects/index/, /es/proyectos/indice/): filters with counts, sortable columns, and a row
// with a page that opens it. The table works without any of it: this only adds the handling.
(() => {
  const table = document.querySelector('[data-idx-table]');
  if (!table) return;
  const es = document.documentElement.lang === 'es';
  const body = table.tBodies[0];
  const rows = [...body.rows];
  const shown = document.querySelector('[data-idx-shown]');

  // filters: one value per facet, all of them must match
  const state = { group: '', stage: '', where: '' };
  const apply = () => {
    let n = 0;
    for (const r of rows) {
      const on = Object.entries(state).every(([k, v]) => !v || r.dataset[k] === v);
      r.hidden = !on;
      if (on) n += 1;
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

  // rows with a page: the whole row opens it
  for (const r of rows) {
    const link = r.querySelector('.idx__go');
    if (!link) continue;
    r.classList.add('has-page');
    r.addEventListener('click', (e) => {
      if (e.target.closest('a') || String(getSelection())) return;
      location.href = link.href;
    });
  }
})();
