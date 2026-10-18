(() => {
'use strict';
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d'), stage = $('stage');
const CAM = 300, ZMAX = 2600, LANES = [-0.75, -0.25, 0.25, 0.75];
const CAR_COLORS = [['#2563eb', '#1e3a8a'], ['#16a34a', '#14532d'], ['#f59e0b', '#92400e'], ['#e5e7eb', '#6b7280'], ['#8b5cf6', '#4c1d95'], ['#06b6d4', '#164e63']];
let W = 1, H = 1, dpr = 1, HZ = 0, BASE = 0, RW = 1;

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
let best = store.get('hr_best', 0), muted = store.get('hr_muted', false);
let state = 'menu', last = performance.now(), g = null;
const keys = { left: false, right: false }, touch = { left: false, right: false };

/* ---------- sound ---------- */
let ac = null;
function beep(f, d, type, vol, slide) {
  if (muted) return;
  try {
    if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ac = new AC(); }
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime, o = ac.createOscillator(), gn = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    gn.gain.setValueAtTime(vol || 0.06, t);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(gn); gn.connect(ac.destination); o.start(t); o.stop(t + d);
  } catch (e) {}
}
const sfx = {
  coin() { beep(880, 0.08, 'square', 0.05); setTimeout(() => beep(1320, 0.1, 'square', 0.05), 60); },
  crash() { beep(180, 0.6, 'sawtooth', 0.15, -140); },
  near() { beep(520, 0.12, 'triangle', 0.08, 380); }
};
function renderMute() {
  $('muteBtn').textContent = muted ? '🔇' : '🔊';
  $('muteBtn').setAttribute('aria-pressed', String(muted));
  $('muteBtn2').textContent = 'Sound: ' + (muted ? 'off' : 'on');
}
function toggleMute() { muted = !muted; store.set('hr_muted', muted); renderMute(); }

/* ---------- layout ---------- */
function resize() {
  const r = stage.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = Math.max(1, r.width); H = Math.max(1, r.height);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  HZ = H * 0.36; BASE = H * 0.8; RW = Math.min(W * 0.47, H * 0.8);
}

/* ---------- game state ---------- */
function reset() {
  const lv = LANES.map(() => 180 + Math.random() * 120);
  g = { x: 0, vx: 0, speed: 420, dist: 0, bonus: 0, coins: 0, cars: [], coinsL: [], pops: [],
        shake: 0, tCar: 0.6, tCoin: 1.5, t: 0, laneV: lv, score: 0 };
}
function setState(s) {
  state = s;
  $('menu').classList.toggle('hidden', s !== 'menu');
  $('pause').classList.toggle('hidden', s !== 'paused');
  $('over').classList.toggle('hidden', s !== 'over');
  $('hud').classList.toggle('hidden', s === 'menu');
  $('controls').classList.toggle('hidden', s !== 'playing');
  keys.left = keys.right = touch.left = touch.right = false;
  $('btnL').classList.remove('down'); $('btnR').classList.remove('down');
  const focus = { menu: 'playBtn', paused: 'resumeBtn', over: 'againBtn' }[s];
  if (focus) { try { $(focus).focus({ preventScroll: true }); } catch (e) {} }
  hud(true);
}
function startGame() { reset(); setState('playing'); }
function pauseGame() { if (state === 'playing') setState('paused'); }
function resumeGame() { if (state === 'paused') setState('playing'); }
function toMenu() { reset(); setState('menu'); }
function crash() {
  sfx.crash(); g.shake = 1;
  const sc = score(), isNew = sc > best;
  if (isNew) { best = sc; store.set('hr_best', best); }
  $('oScore').textContent = sc; $('oCoins').textContent = g.coins; $('oBest').textContent = best;
  $('oNew').classList.toggle('hidden', !isNew);
  setState('over');
}
const score = () => Math.floor(g.dist / 40) + g.bonus + g.coins * 10;

/* ---------- update ---------- */
function update(dt) {
  g.t += dt;
  g.speed = Math.min(1050, g.speed + 14 * dt);
  g.dist += g.speed * dt;

  const dir = (keys.left || touch.left ? -1 : 0) + (keys.right || touch.right ? 1 : 0);
  g.vx += (dir * 1.7 - g.vx) * Math.min(1, dt * 10);
  g.x = Math.max(-0.82, Math.min(0.82, g.x + g.vx * dt));

  g.tCar -= dt;
  if (g.tCar <= 0) {
    g.tCar = Math.max(0.35, 1.1 - (g.speed - 420) / 1000) * (0.8 + Math.random() * 0.5);
    const lane = Math.floor(Math.random() * 4);
    const near = g.cars.filter(c => c.z > ZMAX - 450);
    if (!near.some(c => c.lane === lane) && new Set(near.map(c => c.lane)).size < 2) {
      g.cars.push({ lane, x: LANES[lane], z: ZMAX, v: g.laneV[lane], col: CAR_COLORS[(Math.random() * CAR_COLORS.length) | 0], passed: false });
    }
  }
  g.tCoin -= dt;
  if (g.tCoin <= 0) {
    g.tCoin = 1.2 + Math.random() * 1.2;
    const free = [0, 1, 2, 3].filter(l => !g.cars.some(c => c.lane === l));
    if (free.length) {
      const lane = free[(Math.random() * free.length) | 0];
      for (let i = 0; i < 5; i++) g.coinsL.push({ x: LANES[lane], z: ZMAX + i * 70 });
    }
  }

  for (const c of g.cars) {
    c.z -= (g.speed - c.v) * dt;
    if (c.z > -25 && c.z < 45 && Math.abs(c.x - g.x) < 0.2) { crash(); return; }
    if (!c.passed && c.z < -30) {
      c.passed = true;
      if (Math.abs(c.x - g.x) < 0.55) { g.bonus += 50; g.pops.push({ t: 0, text: 'Near miss +50' }); sfx.near(); }
    }
  }
  g.cars = g.cars.filter(c => c.z > -130);

  for (const k of g.coinsL) {
    k.z -= g.speed * dt;
    if (!k.got && k.z > -25 && k.z < 45 && Math.abs(k.x - g.x) < 0.22) { k.got = true; g.coins++; sfx.coin(); }
  }
  g.coinsL = g.coinsL.filter(k => !k.got && k.z > -130);
  for (const p of g.pops) p.t += dt;
  g.pops = g.pops.filter(p => p.t < 1.1);
  hud(false);
}

/* ---------- HUD ---------- */
const hc = {};
function setTxt(id, v) { if (hc[id] !== v) { hc[id] = v; $(id).textContent = v; } }
function hud(force) {
  if (force) for (const k in hc) delete hc[k];
  setTxt('hScore', g ? score() : 0);
  setTxt('hSpeed', g ? Math.round(g.speed * 0.25) + ' km/h' : '0');
  setTxt('hCoins', g ? g.coins : 0);
  setTxt('hBest', Math.max(best, g ? score() : 0));
  setTxt('mBest', best);
}

/* ---------- drawing ---------- */
function rr(x, y, w, h, r, fill) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
}
function proj(z) { const s = CAM / (z + CAM); return { s, y: HZ + (BASE - HZ) * s }; }

function drawSky() {
  const sg = ctx.createLinearGradient(0, 0, 0, HZ);
  sg.addColorStop(0, '#2b1055'); sg.addColorStop(0.55, '#8e2f8f'); sg.addColorStop(1, '#ff8a4c');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, HZ + 2);
  ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(W * 0.72, HZ - H * 0.05, H * 0.09, 0, 7); ctx.fill();
  ctx.fillStyle = '#4a1d63'; ctx.beginPath(); ctx.moveTo(0, HZ);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, HZ - H * 0.05 - Math.sin(x * 0.011 + 1) * H * 0.025 - Math.sin(x * 0.027) * H * 0.012);
  ctx.lineTo(W, HZ); ctx.fill();
  ctx.fillStyle = '#2a1141';
  for (let x = 0, i = 0; x < W; x += H * 0.035, i++) {
    const h = H * (0.015 + ((i * 7919) % 13) / 13 * 0.05);
    ctx.fillRect(x, HZ - h, H * 0.03, h);
  }
}
function drawRoad() {
  const cx = W / 2, d = g.dist;
  ctx.fillStyle = '#1b6e34'; ctx.fillRect(0, HZ, W, H - HZ);
  for (let y = Math.ceil(HZ); y < H; y += 3) {
    const s = (y - HZ) / (BASE - HZ), z = CAM / s - CAM, half = RW * s;
    const far = z > 4000, b = far ? 0 : Math.floor((z + d) / 120) & 1;
    ctx.fillStyle = b ? '#1f7a3a' : '#1b6e34'; ctx.fillRect(0, y, W, 3);
    ctx.fillStyle = b ? '#f2f2f2' : '#d33a3a'; ctx.fillRect(cx - half * 1.08, y, half * 2.16, 3);
    ctx.fillStyle = b ? '#3a3d4a' : '#353845'; ctx.fillRect(cx - half, y, half * 2, 3);
    if (!far && (Math.floor((z + d) / 170) & 1)) {
      const w = Math.max(1, half * 0.02);
      ctx.fillStyle = '#f5f5f5';
      for (const l of [-0.5, 0, 0.5]) ctx.fillRect(cx + l * half - w / 2, y, w, 3);
    }
  }
}
function drawTree(x, y, u) {
  ctx.fillStyle = '#5b3a1e'; ctx.fillRect(x - u * 0.05, y - u * 0.5, u * 0.1, u * 0.5);
  ctx.fillStyle = '#145c2b'; ctx.beginPath(); ctx.arc(x, y - u * 0.75, u * 0.38, 0, 7); ctx.fill();
  ctx.fillStyle = '#1c7a39'; ctx.beginPath(); ctx.arc(x - u * 0.08, y - u * 0.82, u * 0.26, 0, 7); ctx.fill();
}
function drawLamp(x, y, u, side) {
  ctx.fillStyle = '#9aa0b4'; ctx.fillRect(x - u * 0.03, y - u * 1.3, u * 0.06, u * 1.3);
  ctx.fillRect(x - (side > 0 ? 0.35 : -0.05) * u, y - u * 1.3, u * 0.4, u * 0.05);
  ctx.fillStyle = '#ffe9a8'; ctx.fillRect(x - (side > 0 ? 0.35 : -0.25) * u, y - u * 1.27, u * 0.12, u * 0.06);
}
function drawCar(cx, y, w, col, tilt) {
  const h = w * 0.78, x = -w / 2, top = -h;
  ctx.save(); ctx.translate(cx, y); ctx.rotate(tilt || 0);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.6, h * 0.12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#0c0c10';
  ctx.fillRect(x - w * 0.04, top + h * 0.55, w * 0.14, h * 0.45); ctx.fillRect(x + w * 0.9, top + h * 0.55, w * 0.14, h * 0.45);
  rr(x, top + h * 0.25, w, h * 0.65, w * 0.12, col[0]);
  rr(x + w * 0.14, top, w * 0.72, h * 0.5, w * 0.14, col[1]);
  rr(x + w * 0.22, top + h * 0.08, w * 0.56, h * 0.28, w * 0.08, '#9fd8ff');
  ctx.fillStyle = '#ff2d2d'; ctx.fillRect(x + w * 0.06, top + h * 0.5, w * 0.2, h * 0.12); ctx.fillRect(x + w * 0.74, top + h * 0.5, w * 0.2, h * 0.12);
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x + w * 0.38, top + h * 0.7, w * 0.24, h * 0.1);
  ctx.restore();
}
function drawCoin(cx, y, r, t) {
  const rx = Math.max(r * 0.12, Math.abs(Math.cos(t * 6)) * r);
  ctx.fillStyle = '#ffb020'; ctx.beginPath(); ctx.ellipse(cx, y, rx, r, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.ellipse(cx, y, rx * 0.6, r * 0.6, 0, 0, 7); ctx.fill();
}
function render() {
  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * g.shake * 14, (Math.random() - 0.5) * g.shake * 14);
  drawSky(); drawRoad();
  const items = [], cx = W / 2, SP = 180, base = Math.floor(g.dist / SP);
  for (let k = 0; k < 16; k++) {
    const z = k * SP - (g.dist % SP);
    items.push({ z, kind: 's', idx: base + k });
  }
  for (const c of g.cars) items.push({ z: c.z, kind: 'c', o: c });
  for (const k of g.coinsL) items.push({ z: k.z, kind: 'k', o: k });
  items.sort((a, b) => b.z - a.z);
  for (const it of items) {
    if (it.z < -120 || it.z > ZMAX * 1.5) continue;
    const p = proj(it.z), u = RW * p.s;
    if (it.kind === 's') {
      for (const side of [-1, 1]) {
        const px = cx + side * u * (1.35 + ((it.idx * 3 + side) % 2 ? 0.3 : 0));
        if ((it.idx + (side > 0 ? 1 : 0)) % 3 === 0) drawLamp(cx + side * u * 1.2, p.y, u * 0.5, side);
        else drawTree(px, p.y, u * 0.6);
      }
    } else if (it.kind === 'c') {
      drawCar(cx + it.o.x * u, p.y, u * 0.36, it.o.col, 0);
    } else {
      const r = u * 0.08; drawCoin(cx + it.o.x * u, p.y - r * 1.5, r, g.t + it.z * 0.01);
    }
  }
  drawCar(cx + g.x * RW, BASE, RW * 0.36, ['#e11d48', '#9f1239'], g.vx * 0.05);
  ctx.restore();
  for (const p of g.pops) {
    ctx.globalAlpha = Math.max(0, 1 - p.t); ctx.fillStyle = '#19d3c5';
    ctx.font = '900 ' + Math.round(Math.min(W, H) * 0.06) + 'px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(p.text, W / 2, H * 0.3 - p.t * 40); ctx.globalAlpha = 1;
  }
}

/* ---------- main loop (started once) ---------- */
function tick(ts) {
  const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts;
  if (state === 'playing') update(dt);
  else if (state === 'menu') g.dist += 220 * dt;
  if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 2.5);
  render();
  requestAnimationFrame(tick);
}

/* ---------- input (listeners attached exactly once) ---------- */
window.addEventListener('keydown', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; e.preventDefault(); }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; e.preventDefault(); }
  else if ((k === 'p' || k === 'P' || k === 'Escape') && !e.repeat) { state === 'playing' ? pauseGame() : resumeGame(); }
  else if ((k === 'ArrowUp' || k === 'ArrowDown') && state === 'playing') e.preventDefault();
});
window.addEventListener('keyup', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
  if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
});
function bindHold(btn, side) {
  const on = e => { e.preventDefault(); touch[side] = true; btn.classList.add('down'); try { btn.setPointerCapture(e.pointerId); } catch (x) {} };
  const off = () => { touch[side] = false; btn.classList.remove('down'); };
  btn.addEventListener('pointerdown', on);
  ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'].forEach(n => btn.addEventListener(n, off));
  btn.addEventListener('contextmenu', e => e.preventDefault());
}
bindHold($('btnL'), 'left'); bindHold($('btnR'), 'right');
stage.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

$('playBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', startGame);
$('restartBtn').addEventListener('click', startGame);
$('resumeBtn').addEventListener('click', resumeGame);
$('menuBtn').addEventListener('click', toMenu);
$('menuBtn2').addEventListener('click', toMenu);
$('pauseBtn').addEventListener('click', () => { state === 'playing' ? pauseGame() : resumeGame(); });
$('muteBtn').addEventListener('click', toggleMute);
$('muteBtn2').addEventListener('click', toggleMute);

document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
window.addEventListener('blur', () => { keys.left = keys.right = false; pauseGame(); });
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));
if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);

/* ---------- boot ---------- */
resize(); reset(); renderMute(); setState('menu');
requestAnimationFrame(tick);
})();
