/* Studio CAVA: measurement. Loaded only when data/tracking.json names an ID (the build adds it to every
   page, with the IDs in data- attributes), and described on the privacy page from the same file.
   Google Analytics counts visits; the three ways a visitor becomes a client are sent as events:
   generate_lead (the enquiry form sent), book_call (a free call booked, or asked for on WhatsApp when the
   calendar is off) and whatsapp_click. Email and phone clicks go too. Nothing personal is sent: no name,
   email or answer from the forms. */
(() => {
  'use strict';
  const me = document.currentScript;
  if (!me) return;
  const { ga4, ads } = me.dataset;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  const gtag = window.gtag;
  gtag('js', new Date());
  if (ga4) gtag('config', ga4);
  if (ads) gtag('config', ads);

  const lang = document.documentElement.lang === 'es' ? 'es' : 'en';
  const send = (name, params = {}) => gtag('event', name, { page_language: lang, ...params });

  window.addEventListener('cava:enquiry', () => send('generate_lead', { lead_source: 'enquiry_form' }));
  window.addEventListener('cava:booked', (e) => send('book_call', { method: e.detail && e.detail.live ? 'calendar' : 'whatsapp_request' }));
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (/^https:\/\/wa\.me\//.test(href)) send('whatsapp_click', { link_location: a.dataset.wa !== undefined ? 'floating_button' : 'page' });
    else if (/^mailto:/.test(href)) send('email_click');
    else if (/^tel:/.test(href)) send('phone_click');
  }, true);
})();
