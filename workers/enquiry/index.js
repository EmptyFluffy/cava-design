// Studio CAVA: the project enquiry, from the form on the home page to the studio's inbox.
// POST /api/enquiry with JSON { lang, rows: [[label, value], ...], name, email, subject, hp, ms }.
// Guards: same origin, a honeypot field that people never see (hp), at least 4 s spent on the form (ms),
// a valid reply-to address, and caps on every length. The mail goes out through Cloudflare Email Routing,
// signed for cava.design, with the client's address as Reply-To so a reply goes straight to them.
import { EmailMessage } from 'cloudflare:email';

const TO = 'vinocouralvarez@gmail.com';
const FROM = 'web@cava.design';
const ORIGINS = ['https://cava.design', 'https://www.cava.design'];
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clean = (v, max) => String(v ?? '').replace(/\r/g, '').slice(0, max).trim();
const oneLine = (v, max) => clean(v, max).replace(/[\n\t]+/g, ' ');
// RFC 2047 for headers with accents, base64 for the body
const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const header = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);
const wrap = (s) => s.replace(/.{1,76}/g, '$&\r\n');
// a display name in an address header: quoted if plain, encoded if it has accents (a comma would split it)
const display = (s) => (/^[\x20-\x7e]*$/.test(s) ? `"${s.replace(/["\\]/g, '')}"` : `=?UTF-8?B?${b64(s)}?=`);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/enquiry') return json(404, { ok: false });
    if (request.method !== 'POST') return json(405, { ok: false });
    if (!ORIGINS.includes(request.headers.get('origin') || '')) return json(403, { ok: false });
    let d;
    try { d = await request.json(); } catch { return json(400, { ok: false }); }
    // a bot fills the hidden field or submits instantly: answer as if sent, send nothing
    if (d.hp || !(Number(d.ms) >= 4000)) return json(200, { ok: true });
    const email = oneLine(d.email, 200);
    const name = oneLine(d.name, 120);
    if (!name || !EMAIL.test(email)) return json(422, { ok: false });
    const rows = (Array.isArray(d.rows) ? d.rows : []).slice(0, 20)
      .map(([k, v]) => [oneLine(k, 60), clean(v, 2500)]).filter(([k, v]) => k && v);
    const es = d.lang === 'es';
    const subject = oneLine(d.subject, 160) || (es ? 'Consulta de proyecto' : 'Project enquiry');
    const ip = request.headers.get('cf-connecting-ip') || '';
    const country = request.cf?.country || '';
    const body = [
      ...rows.map(([k, v]) => `${k}: ${v.includes('\n') ? `\n${v}` : v}`),
      '',
      '--',
      es ? 'Enviado desde el formulario de cava.design (español).' : 'Sent from the form on cava.design (English).',
      `${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC${country ? ` · ${country}` : ''}${ip ? ` · ${ip}` : ''}`,
      es ? 'Responda a este correo para escribirle directamente.' : 'Reply to this email to write to them directly.',
    ].join('\n');
    const raw = [
      `From: ${display('Studio CAVA, web')} <${FROM}>`,
      `To: <${TO}>`,
      `Reply-To: ${display(name)} <${email}>`,
      `Subject: ${header(subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@cava.design>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      wrap(b64(body)),
    ].join('\r\n');
    try {
      await env.MAIL.send(new EmailMessage(FROM, TO, raw));
    } catch (e) {
      console.error('send failed', e && e.message);   // read with: npx wrangler tail cava-enquiry
      return json(502, { ok: false });
    }
    return json(200, { ok: true });
  },
};
