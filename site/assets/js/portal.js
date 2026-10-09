/* Studio CAVA: the client portal sign-in, before the portal is connected.
   Nothing is sent or stored: the fields have no names, the submit is stopped, the password is cleared,
   and the page says the portal is not open yet and where to write instead. */
(() => {
  'use strict';

  const form = document.querySelector('[data-portal]');
  if (!form) return;
  const email = form.querySelector('#portal-email');
  const pw = form.querySelector('#portal-pw');
  const status = form.querySelector('[data-portal-status]');
  const msg = (key) => form.querySelector(`template[data-msg="${key}"]`).innerHTML;

  const say = (key) => {
    status.innerHTML = msg(key);
    status.hidden = false;
    status.classList.remove('is-in');
    requestAnimationFrame(() => status.classList.add('is-in'));
  };
  const emailOk = () => {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    email.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (!ok) email.focus();
    return ok;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!emailOk()) return say('email');
    pw.value = '';
    say('closed');
  });
  for (const b of form.querySelectorAll('[data-portal-link]')) {
    b.addEventListener('click', () => say(emailOk() ? 'closed' : 'email'));
  }
  email.addEventListener('input', () => email.removeAttribute('aria-invalid'));

  const show = form.querySelector('[data-portal-show]');
  show.addEventListener('click', () => {
    const on = pw.type === 'password';
    pw.type = on ? 'text' : 'password';
    show.textContent = on ? show.dataset.hide : show.dataset.show;
    show.setAttribute('aria-pressed', String(on));
    pw.focus();
  });
})();
