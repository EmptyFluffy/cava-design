/* Studio CAVA: book a free call (/book/, /es/agendar/).
   Three panels like a booking page: the call, a month of available days, the times of the day picked;
   then a short form. Live mode reads open times from Cal.com and books there (its public API, no key),
   so the call lands in the studio's calendar with a video link. Until the studio has a Cal.com event
   (data-username empty), it offers the office hours and sends the request by WhatsApp instead. */
(() => {
  'use strict';

  const root = document.querySelector('[data-booking]');
  if (!root) return;
  const ES = document.documentElement.lang === 'es';
  const $ = (s, r = root) => r.querySelector(s);
  const $$ = (s, r = root) => [...r.querySelectorAll(s)];
  const C = root.dataset;
  const LIVE = !!C.username;
  const API = 'https://api.cal.com/v2';
  const STUDIO_TZ = 'America/Costa_Rica';
  const DURATION = +C.duration || 30;

  const T = ES ? {
    dows: ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'], locale: 'es-CR',
    noTimes: 'No quedan horas este día.', noDays: 'No hay horas libres este mes.', loading: 'Buscando horas…',
    failed: 'No pudimos leer la agenda. Escríbanos por WhatsApp y la coordinamos.',
    taken: 'Esa hora se acaba de ocupar. Elija otra.', error: 'No se pudo agendar. Intente de nuevo o escríbanos por WhatsApp.',
    required: 'Escriba su nombre y un correo válido.',
    doneTitle: 'Listo, quedó agendada.', doneLive: (e) => `Le enviamos la invitación con el enlace de la videollamada a ${e}.`,
    doneReqTitle: 'Falta un paso.', doneReq: 'Le abrimos WhatsApp con la hora y sus datos: envíe el mensaje y le confirmamos en un día hábil.',
    wa: (s) => `Hola Studio CAVA, quisiera agendar la llamada gratis: ${s}`,
    again: 'Agendar otra hora',
    labels: { where: 'Lugar', what: 'Proyecto', lot: 'Lote', budget: 'Presupuesto', phone: 'WhatsApp', notes: 'Notas', est: 'Estimación' },
  } : {
    dows: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], locale: 'en-US',
    noTimes: 'No times left on this day.', noDays: 'No open times this month.', loading: 'Looking for times…',
    failed: 'We could not read the calendar. Message us on WhatsApp and we will set it up.',
    taken: 'That time was just taken. Pick another.', error: 'The booking did not go through. Try again, or message us on WhatsApp.',
    required: 'Add your name and a valid email.',
    doneTitle: 'Done, it is booked.', doneLive: (e) => `We sent the invitation with the video call link to ${e}.`,
    doneReqTitle: 'One step left.', doneReq: 'We opened WhatsApp with the time and your details: send the message and we confirm within a working day.',
    wa: (s) => `Hi Studio CAVA, I would like to book the free call: ${s}`,
    again: 'Book another time',
    labels: { where: 'Place', what: 'Project', lot: 'Lot', budget: 'Budget', phone: 'WhatsApp', notes: 'Notes', est: 'Estimate' },
  };

  // ---------- time zones ----------
  const detected = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return STUDIO_TZ; } })();
  const tzSel = $('[data-bk-tz]');
  if (detected && ![...tzSel.options].some((o) => o.value === detected)) tzSel.add(new Option(detected.replace(/_/g, ' '), detected), 0);
  tzSel.value = [...tzSel.options].some((o) => o.value === detected) ? detected : STUDIO_TZ;
  const tz = () => tzSel.value;
  // the calendar date (YYYY-MM-DD) and the clock of an instant, in a zone
  const ymd = (d, zone = tz()) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  let h24 = false;
  const clock = (d) => new Intl.DateTimeFormat(T.locale, { timeZone: tz(), hour: 'numeric', minute: '2-digit', hour12: !h24 }).format(d).replace(/\s?([ap])\.?\s?m\.?/i, (m, x) => `${x.toLowerCase()}m`);
  const longDate = (d) => new Intl.DateTimeFormat(T.locale, { timeZone: tz(), weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  const dayTitle = (key) => { const [y, m, dd] = key.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1, dd, 12)); return `${new Intl.DateTimeFormat(T.locale, { timeZone: 'UTC', weekday: 'short' }).format(d).replace('.', '')} ${dd}`; };

  // ---------- open times ----------
  const cache = new Map(); // `${month}|${tz}` -> { 'YYYY-MM-DD': [Date] }
  async function slots(first) {
    const key = `${first.getUTCFullYear()}-${first.getUTCMonth()}|${tz()}`;
    if (cache.has(key)) return cache.get(key);
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
    const iso = (d) => d.toISOString().slice(0, 10);
    let byDay = {};
    if (LIVE) {
      const q = new URLSearchParams({ username: C.username, eventTypeSlug: C.event, start: iso(first), end: iso(last), timeZone: tz() });
      const r = await fetch(`${API}/slots?${q}`, { headers: { 'cal-api-version': '2024-09-04' } });
      const j = await r.json();
      if (!r.ok || !j.data) throw new Error('slots');
      for (const [day, list] of Object.entries(j.data)) byDay[day] = list.map((s) => new Date(typeof s === 'string' ? s : s.start));
    } else {
      // the studio's hours, Costa Rica time (UTC-6, no daylight saving), from tomorrow on
      const days = C.days.split(',').map(Number);
      const [fh, fm] = C.from.split(':').map(Number), [th, tm] = C.to.split(':').map(Number);
      const earliest = Date.now() + (+C.notice || 24) * 3600e3;
      const horizon = Date.now() + (+C.weeks || 8) * 7 * 864e5;
      for (let d = new Date(first.getTime() - 864e5); d <= new Date(last.getTime() + 864e5); d = new Date(d.getTime() + 864e5)) {
        const y = d.getUTCFullYear(), m = d.getUTCMonth(), dd = d.getUTCDate();
        const dow = new Date(Date.UTC(y, m, dd)).getUTCDay();
        if (!days.includes(dow)) continue;
        for (let t = fh * 60 + fm; t + DURATION <= th * 60 + tm; t += DURATION) {
          const at = new Date(Date.UTC(y, m, dd, 6 + Math.floor(t / 60), t % 60)); // CR is UTC-6
          if (at.getTime() < earliest || at.getTime() > horizon) continue;
          (byDay[ymd(at)] ||= []).push(at);
        }
      }
      // keep the visible month only, in the visitor's zone
      const mm = `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}`;
      byDay = Object.fromEntries(Object.entries(byDay).filter(([k]) => k.startsWith(mm)));
    }
    cache.set(key, byDay);
    return byDay;
  }

  // ---------- state and drawing ----------
  const now = new Date();
  let month = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  let day = null, picked = null, open = {};
  const status = $('[data-bk-status]');

  async function drawMonth(autoPick) {
    const title = $('[data-bk-month]');
    const name = new Intl.DateTimeFormat(T.locale, { timeZone: 'UTC', month: 'long' }).format(month);
    title.innerHTML = `<b>${name}</b> ${month.getUTCFullYear()}`;
    $('[data-bk-prev]').disabled = month.getUTCFullYear() === now.getFullYear() && month.getUTCMonth() === now.getMonth();
    const grid = $('[data-bk-days]');
    grid.setAttribute('aria-busy', 'true');
    status.textContent = T.loading;
    try { open = await slots(month); status.textContent = ''; }
    catch { open = {}; status.textContent = T.failed; }
    grid.removeAttribute('aria-busy');
    const y = month.getUTCFullYear(), m = month.getUTCMonth();
    const lead = new Date(Date.UTC(y, m, 1)).getUTCDay();
    const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const cells = [...T.dows.map((d) => `<span class="bk__dow" aria-hidden="true">${d}</span>`), ...Array(lead).fill('<span></span>')];
    for (let d = 1; d <= count; d++) {
      const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const has = open[key]?.length;
      cells.push(has ? `<button type="button" class="bk__day" data-day="${key}" aria-pressed="${key === day}">${d}</button>` : `<span class="bk__day is-off">${d}</span>`);
    }
    grid.innerHTML = cells.join('');
    const keys = Object.keys(open).filter((k) => open[k].length).sort();
    if (!keys.length && !status.textContent) status.textContent = T.noDays;
    if (autoPick || !open[day]?.length) day = keys[0] ?? null;
    $$('.bk__day[data-day]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.day === day)));
    drawTimes();
  }

  function drawTimes() {
    const list = $('[data-bk-times]');
    $('[data-bk-day]').textContent = day ? dayTitle(day) : '';
    const times = day ? open[day] ?? [] : [];
    list.innerHTML = times.length ? times.map((t) => `<li><button type="button" class="bk__time" data-at="${t.toISOString()}">${clock(t)}</button></li>`).join('') : `<li class="note">${day ? T.noTimes : ''}</li>`;
  }

  root.addEventListener('click', (e) => {
    const d = e.target.closest('[data-day]');
    if (d) { day = d.dataset.day; $$('.bk__day[data-day]').forEach((b) => b.setAttribute('aria-pressed', String(b === d))); drawTimes(); return; }
    const t = e.target.closest('[data-at]');
    if (t) { picked = new Date(t.dataset.at); toForm(); }
  });
  $('[data-bk-prev]').addEventListener('click', () => { month = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1)); drawMonth(true); });
  $('[data-bk-next]').addEventListener('click', () => { month = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)); drawMonth(true); });
  tzSel.addEventListener('change', () => { drawMonth(false); });
  $$('[data-h24]').forEach((b) => b.addEventListener('click', () => {
    h24 = b.dataset.h24 === '1';
    $$('[data-h24]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    drawTimes();
  }));

  // ---------- the form ----------
  const form = $('[data-bk-form]');
  function toForm() {
    root.dataset.step = 'form';
    $('[data-bk-when]').textContent = `${longDate(picked)}, ${clock(picked)} – ${clock(new Date(picked.getTime() + DURATION * 60e3))}`;
    $('[data-bk-when-tz]').textContent = tz().replace(/_/g, ' ');
    form.querySelector('input')?.focus();
  }
  $('[data-bk-back]').addEventListener('click', () => { root.dataset.step = 'pick'; $('[data-bk-error]').textContent = ''; });

  // what the visitor tells us, as text for the studio's calendar
  function notes(f) {
    const L = T.labels;
    // a select left on its first, "not sure" option says nothing worth sending
    const sel = (n) => { const el = form.querySelector(`[name=${n}]:checked`) ?? form.querySelector(`select[name=${n}]`); if (!el) return ''; if (el.tagName === 'SELECT') return el.selectedIndex > 0 ? el.selectedOptions[0].textContent : ''; return el.nextElementSibling?.textContent ?? ''; };
    const rows = [[L.where, sel('where')], [L.what, sel('what')], [L.lot, sel('lot')], [L.budget, sel('budget')], [L.phone, f.get('phone')], [L.est, f.get('est')], [L.notes, f.get('notes')]];
    return rows.filter(([, v]) => v && String(v).trim()).map(([k, v]) => `${k}: ${String(v).trim()}`).join('\n');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('[data-bk-error]');
    const f = new FormData(form);
    const name = String(f.get('name') || '').trim(), email = String(f.get('email') || '').trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = T.required; return; }
    err.textContent = '';
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    const text = notes(f);
    if (LIVE) {
      try {
        const r = await fetch(`${API}/bookings`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'cal-api-version': '2024-08-13' },
          body: JSON.stringify({ start: picked.toISOString(), eventTypeSlug: C.event, username: C.username, attendee: { name, email, timeZone: tz(), language: ES ? 'es' : 'en' }, bookingFieldsResponses: { notes: text }, metadata: { source: 'cava.design' } }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.status === 'error') {
          const msg = JSON.stringify(j.error ?? j).toLowerCase();
          err.textContent = /available|taken|booked|conflict/.test(msg) ? T.taken : T.error;
          if (/available|taken|booked|conflict/.test(msg)) { cache.clear(); root.dataset.step = 'pick'; drawMonth(false); }
          btn.disabled = false;
          return;
        }
        done(T.doneTitle, T.doneLive(email));
        window.dispatchEvent(new CustomEvent('cava:booked', { detail: { live: true } }));
      } catch { err.textContent = T.error; btn.disabled = false; }
    } else {
      const when = `${longDate(picked)}, ${clock(picked)} (${tz().replace(/_/g, ' ')})`;
      const msg = T.wa(`${when}. ${name}, ${email}.${text ? `\n${text}` : ''}`);
      window.open(`https://wa.me/${C.phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
      done(T.doneReqTitle, T.doneReq);
      window.dispatchEvent(new CustomEvent('cava:booked', { detail: { live: false } }));
    }
  });

  function done(title, text) {
    root.dataset.step = 'done';
    $('[data-bk-done-title]').textContent = title;
    $('[data-bk-done-text]').textContent = text;
    $('[data-bk-done-when]').textContent = `${longDate(picked)}, ${clock(picked)} (${tz().replace(/_/g, ' ')})`;
  }
  $('[data-bk-again]').addEventListener('click', () => { form.reset(); form.querySelector('[type=submit]').disabled = false; root.dataset.step = 'pick'; cache.clear(); drawMonth(false); });

  // arriving from a town page or from the estimator: the place and the estimate come along
  const qs = new URLSearchParams(location.search);
  const town = qs.get('town');
  if (town) { const o = form.querySelector(`select[name=where] option[value="${CSS.escape(town)}"]`); if (o) o.selected = true; }
  const est = qs.get('est');
  if (est && /^https?:\/\//.test(est)) form.querySelector('[name=est]').value = est;

  root.dataset.step = 'pick';
  root.classList.add('is-ready');
  drawMonth(true);
})();
