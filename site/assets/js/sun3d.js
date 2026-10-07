/* Studio CAVA, town pages: the sun path in 3D, in the manner of Ladybug's sun path.
   A dome over the lot with the sun's daily track on the 21st of every month, and for every whole hour
   its figure-eight across the year (the analemma), each dot coloured by the typical temperature at that
   hour, measured at the nearest weather station. A small house with a deep roof takes the sun's shadow.
   Loaded by project.js when the figure comes near the viewport; the SVG diagram stays as the fallback. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.min.js';
import { position, times } from './sun.mjs';

const T = {
  en: {
    date: 'Date', hour: 'Hour', play: 'Play the day', stop: 'Stop',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    read: (d, h, alt, az, dir, temp) => alt > 0 ? `${d}, ${h}. Sun ${alt}° high, from the ${dir} (${az}°). Typically ${temp} °C.` : `${d}, ${h}. The sun is down.`,
    compass: ['N', 'E', 'S', 'W'],
    dirs: ['north', 'north-northeast', 'northeast', 'east-northeast', 'east', 'east-southeast', 'southeast', 'south-southeast', 'south', 'south-southwest', 'southwest', 'west-southwest', 'west', 'west-northwest', 'northwest', 'north-northwest'],
    hint: 'Drag to turn the view',
  },
  es: {
    date: 'Fecha', hour: 'Hora', play: 'Recorrer el día', stop: 'Detener',
    months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'],
    read: (d, h, alt, az, dir, temp) => alt > 0 ? `${d}, ${h}. Sol a ${alt}° de altura, desde el ${dir} (${az}°). Típicamente ${temp} °C.` : `${d}, ${h}. El sol está puesto.`,
    compass: ['N', 'E', 'S', 'O'],
    dirs: ['norte', 'nor-noreste', 'noreste', 'este-noreste', 'este', 'este-sureste', 'sureste', 'sur-sureste', 'sur', 'sur-suroeste', 'suroeste', 'oeste-suroeste', 'oeste', 'oeste-noroeste', 'noroeste', 'nor-noroeste'],
    hint: 'Arrastre para girar la vista',
  },
};
// Temperature bands, the same as the legend the page prints: cool, mild, warm, hot, very hot.
export const BANDS = [[-Infinity, 22, 0x8ea3b6], [22, 25, 0xc8c7c1], [25, 28, 0xe2b45c], [28, 31, 0xe07b39], [31, Infinity, 0xc23b22]];
const colorFor = (t) => BANDS.find(([a, b]) => t >= a && t < b)[2];
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const monthOf = (doy) => { let m = 0; while (doy > DAYS[m]) { doy -= DAYS[m]; m++; } return { m, d: doy }; };
const doyOf = (m, d) => DAYS.slice(0, m).reduce((a, b) => a + b, 0) + d;
const clock = (h) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

export function mount(fig) {
  const lang = document.documentElement.lang === 'es' ? 'es' : 'en';
  const L = T[lang];
  const lat = +fig.dataset.lat, lng = +fig.dataset.lng;
  const temps = JSON.parse(fig.dataset.temps); // [month][hour], hour 0 = the hour ending at 01:00
  const tempAt = (m, h) => temps[m][(Math.round(h) + 23) % 24];

  // ---- DOM: stage, labels, controls ----
  const stage = document.createElement('div');
  stage.className = 'sun3d';
  stage.setAttribute('role', 'img');
  stage.setAttribute('aria-label', fig.querySelector('svg')?.getAttribute('aria-label') ?? '');
  const labels = document.createElement('div');
  labels.className = 'sun3d__labels';
  labels.setAttribute('aria-hidden', 'true');
  const hint = document.createElement('span');
  hint.className = 'sun3d__hint label';
  hint.textContent = L.hint;
  stage.append(labels, hint);
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
  let doy = Math.min(365, doyOf(today.getMonth(), today.getDate()));
  let hour = 15;
  const controls = document.createElement('div');
  controls.className = 'sun3d__controls';
  controls.innerHTML = `
    <label class="sun3d__ctl"><span class="label">${L.date}</span><input type="range" min="1" max="365" step="1" value="${doy}" data-date></label>
    <label class="sun3d__ctl"><span class="label">${L.hour}</span><input type="range" min="5" max="19" step="0.25" value="${hour}" data-hour></label>
    <button class="btn btn--light sun3d__play" type="button" data-play>${L.play} <span class="btn__dot" aria-hidden="true"></span></button>
    <p class="label sun3d__read" aria-live="polite" data-read></p>`;
  const svg = fig.querySelector('svg');
  svg.after(stage, controls);
  fig.classList.add('is-3d');

  // ---- three.js scene ----
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  const R = 10;
  // azimuth from north, clockwise; altitude above the horizon. North is -z, east is +x.
  const vec = (alt, az, r = R) => {
    const a = (alt * Math.PI) / 180, z = (az * Math.PI) / 180;
    return new THREE.Vector3(r * Math.cos(a) * Math.sin(z), r * Math.sin(a), -r * Math.cos(a) * Math.cos(z));
  };

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d6cf, 1.6));
  const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.4);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 });
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight, sunLight.target);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(R, 96), new THREE.MeshStandardMaterial({ color: 0xf1f0ee, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const lineMat = (color, opacity = 1) => new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 128 }, (_, i) => vec(0, (i / 128) * 360))), lineMat(0x080807));
  scene.add(ring);
  const axes = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([vec(0, 0), vec(0, 180), vec(0, 90), vec(0, 270)]), lineMat(0x8b8b88, 0.5));
  scene.add(axes);

  // the house: walls, and a roof that overhangs them on every side
  const white = new THREE.MeshStandardMaterial({ color: 0xfcfcfc, roughness: 0.9 });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.3, 2.2), white);
  walls.position.y = 0.65;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.14, 3.6), new THREE.MeshStandardMaterial({ color: 0x545454, roughness: 0.8 }));
  roof.position.y = 1.42;
  for (const m of [walls, roof]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }

  // the 21st of every month: the sun's daily track
  const tracks = [];
  for (let m = 0; m < 12; m++) {
    const day = doyOf(m, 21);
    const { rise, set } = times(lat, lng, day);
    const pts = [];
    for (let t = rise; t <= set; t += 6) { const p = position(lat, lng, day, t / 60); pts.push(vec(Math.max(0, p.alt), p.az)); }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(0x8b8b88, 0.55));
    scene.add(line);
    tracks.push({ m, line });
  }
  // the current day's track, drawn over the others
  const todayLine = new THREE.Line(new THREE.BufferGeometry(), lineMat(0x080807));
  scene.add(todayLine);

  // analemmas: every whole hour, a dot every three days, coloured by the typical temperature
  const dots = [];
  for (let h = 5; h <= 19; h++) {
    for (let day = 1; day <= 365; day += 3) {
      const p = position(lat, lng, day, h);
      if (p.alt <= 0.5) continue;
      const { m } = monthOf(day);
      dots.push({ v: vec(p.alt, p.az), c: colorFor(tempAt(m, h)), h, day, alt: p.alt });
    }
  }
  const dotGeo = new THREE.SphereGeometry(0.075, 10, 8);
  const inst = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial(), dots.length);
  const mtx = new THREE.Matrix4(), col = new THREE.Color();
  dots.forEach((d, i) => { mtx.setPosition(d.v); inst.setMatrixAt(i, mtx); inst.setColorAt(i, col.setHex(d.c)); });
  scene.add(inst);

  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), new THREE.MeshBasicMaterial({ color: 0xf2b134 }));
  const ray = new THREE.Line(new THREE.BufferGeometry(), lineMat(0xf2b134, 0.8));
  scene.add(sun, ray);

  // ---- labels in HTML, placed where their 3D point lands on screen ----
  const mk = (text, cls) => { const s = document.createElement('span'); s.className = cls; s.textContent = text; labels.append(s); return s; };
  const cards = L.compass.map((c, i) => ({ el: mk(c, 'sun3d__card'), v: vec(0, i * 90, R * 1.08) }));
  // hour labels at the March equinox position of each hour, a little outside the dome
  const hourLabels = [];
  for (let h = 6; h <= 18; h += 1) {
    const p = position(lat, lng, 79, h);
    if (p.alt > 2) hourLabels.push({ el: mk(String(h), 'sun3d__hour'), v: vec(p.alt, p.az, R * 1.06) });
  }

  // ---- camera: drag to turn, from the southwest by default ----
  let camAz = 215, camEl = 24;
  const target = new THREE.Vector3(0, 3.4, 0);
  // far enough that the whole dome fits: further back on narrow (phone) stages
  const dist = () => (camera.aspect < 1.2 ? 44 : 37);
  const place = () => { const v = vec(camEl, camAz, dist()); camera.position.copy(v); camera.lookAt(target); };

  const size = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  };
  const v3 = new THREE.Vector3();
  function render() {
    place();
    renderer.render(scene, camera);
    const w = stage.clientWidth, h = stage.clientHeight;
    for (const l of [...cards, ...hourLabels]) {
      v3.copy(l.v).project(camera);
      l.el.style.transform = `translate(${((v3.x + 1) / 2) * w}px, ${((1 - v3.y) / 2) * h}px) translate(-50%, -50%)`;
    }
  }

  // ---- state: date and hour ----
  const read = controls.querySelector('[data-read]');
  function update() {
    const { m, d } = monthOf(doy);
    const p = position(lat, lng, doy, hour);
    const up = p.alt > 0;
    const sv = vec(Math.max(-2, p.alt), p.az);
    sun.position.copy(sv);
    sun.visible = up;
    ray.visible = up;
    ray.geometry.setFromPoints([new THREE.Vector3(0, 1.5, 0), sv]);
    sunLight.position.copy(vec(Math.max(1, p.alt), p.az, 20));
    sunLight.intensity = up ? 2.4 : 0;
    const { rise, set } = times(lat, lng, doy);
    const pts = [];
    for (let t = rise; t <= set; t += 4) { const q = position(lat, lng, doy, t / 60); pts.push(vec(Math.max(0, q.alt), q.az)); }
    todayLine.geometry.setFromPoints(pts);
    const dir = L.dirs[Math.round(p.az / 22.5) % 16];
    read.textContent = L.read(lang === 'en' ? `${L.months[m]} ${d}` : `${d} de ${L.months[m]}`, clock(hour), Math.round(p.alt), Math.round(p.az), dir, Math.round(tempAt(m, hour)));
    render();
  }

  controls.querySelector('[data-date]').addEventListener('input', (e) => { doy = +e.target.value; update(); });
  const hourInput = controls.querySelector('[data-hour]');
  hourInput.addEventListener('input', (e) => { hour = +e.target.value; update(); });

  // play: the sun crosses the sky in about eight seconds
  const playBtn = controls.querySelector('[data-play]');
  let playing = null;
  const stop = () => { cancelAnimationFrame(playing); playing = null; playBtn.firstChild.textContent = `${L.play} `; };
  playBtn.addEventListener('click', () => {
    if (playing) return stop();
    const { rise, set } = times(lat, lng, doy);
    let t0 = null;
    playBtn.firstChild.textContent = `${L.stop} `;
    const step = (ts) => {
      t0 ??= ts;
      const k = Math.min(1, (ts - t0) / 8000);
      hour = (rise + (set - rise) * k) / 60;
      hourInput.value = hour;
      update();
      if (k < 1) playing = requestAnimationFrame(step); else stop();
    };
    playing = requestAnimationFrame(step);
  });

  let drag = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, az: camAz, el: camEl }; renderer.domElement.setPointerCapture(e.pointerId); hint.classList.add('is-off'); });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!drag) return;
    camAz = drag.az - (e.clientX - drag.x) * 0.4;
    if (e.pointerType === 'mouse') camEl = Math.max(4, Math.min(85, drag.el + (e.clientY - drag.y) * 0.3));
    render();
  });
  const end = () => { drag = null; };
  renderer.domElement.addEventListener('pointerup', end);
  renderer.domElement.addEventListener('pointercancel', end);

  new ResizeObserver(size).observe(stage);
  size();
  update();
}
