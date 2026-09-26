// Critter Tank Battle (坦克大战) — an NES Battle City tribute for Chuyu.
// Mikey (P1) and JJ (P2) protect Critter Home from Poppy Playtime villains; Smiling Critters friends are the power-ups.
'use strict';
(() => {
const $ = (id) => document.getElementById(id);
const TILE = 32, SUB = 8, N = 52, FIELD = 416;
const EMPTY = 0, BRICK = 1, STEEL = 2, WATER = 3, TREE = 4, ICE = 5;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const BASE = { x: 192, y: 384 };
const RING = { c0: 22, c1: 29, r0: 46, r1: 51 };
const ENEMY_SPAWNS = [[0, 0], [192, 0], [384, 0]];
const PLAYER_SPAWNS = [[128, 384], [256, 384]];
const rnd = (a, b) => a + Math.random() * (b - a);
const overlap = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

const canvas = $('field'), ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const terrCv = document.createElement('canvas'), treeCv = document.createElement('canvas');
terrCv.width = treeCv.width = terrCv.height = treeCv.height = FIELD;
const tctx = terrCv.getContext('2d'), trctx = treeCv.getContext('2d');

/* ============================== Speed profiles (🐌 default for a 5-year-old) ============================== */
const PROFILES = {
  super:   { player: 70, enemy: { huggy: 30, mommy: 48, bunzo: 34, pj: 28 }, ebullet: { huggy: 105, mommy: 105, bunzo: 150, pj: 110 },
             fire: [2.8, 5], spawn: 4.2, max: [2, 3], lives: 4, baseHp: 3, pjHp: 3, shield: 5, lifeEvery: 5000 },
  gentle:  { player: 80, enemy: { huggy: 40, mommy: 66, bunzo: 46, pj: 36 }, ebullet: { huggy: 135, mommy: 135, bunzo: 200, pj: 145 },
             fire: [2, 4], spawn: 3.2, max: [3, 4], lives: 3, baseHp: 3, pjHp: 3, shield: 4, lifeEvery: 10000 },
  classic: { player: 90, enemy: { huggy: 60, mommy: 100, bunzo: 68, pj: 54 }, ebullet: { huggy: 185, mommy: 185, bunzo: 290, pj: 200 },
             fire: [1, 2.5], spawn: 2.2, max: [4, 6], lives: 2, baseHp: 1, pjHp: 4, shield: 3, lifeEvery: 20000 }
};

/* ============================== Characters ============================== */
const PAL = {
  mikey: ['#43b047', '#1f6a24', '#9be68f'], jj: ['#2f7de1', '#16468a', '#94c4ff'],
  sunnyfox: ['#f39a2b', '#9c5a10', '#ffd79a'], poppydash: ['#50505e', '#1b1b22', '#b7b7c6'],
  huggy: ['#3761d6', '#172f78', '#86a8ff'], mommy: ['#ec5fa8', '#8c2860', '#ffb9dc'], bunzo: ['#c6d23a', '#697410', '#eef58f'],
  pj4: ['#35a2d9', '#155a80', '#9fdcff'], pj3: ['#35a2d9', '#155a80', '#9fdcff'], pj2: ['#a5aeb8', '#555c66', '#e2e7ec'], pj1: ['#e7b43a', '#86600f', '#ffe39a']
};
const KIND = {
  huggy: { name: 'Huggy Wuggy', pts: 100 }, mommy: { name: 'Mommy Long Legs', pts: 200 },
  bunzo: { name: 'Bunzo Bunny', pts: 300 }, pj: { name: 'PJ Pug-a-Pillar', pts: 400 }
};
const KINDS = ['huggy', 'mommy', 'bunzo', 'pj'];
const POWER = {
  dogday: { name: 'DogDay', say: 'Super shots!', w: 20 },
  bobby: { name: 'Bobby BearHug', say: 'Big hug shield!', w: 14 },
  hoppy: { name: 'Hoppy Hopscotch', say: 'Freeze! Villains stop!', w: 12 },
  craftycorn: { name: 'CraftyCorn', say: 'Rainbow walls for Critter Home!', w: 12 },
  kickin: { name: 'KickinChicken', say: 'Pop! Confetti time!', w: 9 },
  bubba: { name: 'Bubba Bubbaphant', say: 'One more tank!', w: 8 },
  sunnyfox: { name: 'SunnyFox (Mom)', say: 'Mom came to help!', w: 13 },
  poppydash: { name: 'PoppyDash (Dad)', say: 'Dad came to help!', w: 12 }
};
const ICON_KEYS = ['mikey', 'jj', 'huggy', 'mommy', 'bunzo', 'pj', 'dogday', 'bobby', 'hoppy', 'craftycorn', 'kickin', 'bubba', 'sunnyfox', 'poppydash', 'lunabat'];
const FACE = {}, BADGE = {};
function pixelate(im, n) {
  const S0 = 64, big = document.createElement('canvas'); big.width = big.height = S0;
  const b = big.getContext('2d'), m = im.width * .1;
  b.drawImage(im, m, m, im.width - 2 * m, im.height - 2 * m, 0, 0, S0, S0);
  const d = b.getImageData(0, 0, S0, S0), p = d.data;
  // Flood-fill the cream background from the border so eyes/highlights stay opaque.
  const bg = [p[0], p[1], p[2]], seen = new Uint8Array(S0 * S0), st = [];
  for (let i = 0; i < S0; i++) st.push(i, (S0 - 1) * S0 + i, i * S0, i * S0 + S0 - 1);
  while (st.length) {
    const k = st.pop(); if (seen[k]) continue; seen[k] = 1;
    const o = k * 4; if (Math.abs(p[o] - bg[0]) + Math.abs(p[o + 1] - bg[1]) + Math.abs(p[o + 2] - bg[2]) > 70) continue;
    p[o + 3] = 0; const x = k % S0, y = (k / S0) | 0;
    if (x > 0) st.push(k - 1); if (x < S0 - 1) st.push(k + 1); if (y > 0) st.push(k - S0); if (y < S0 - 1) st.push(k + S0);
  }
  b.putImageData(d, 0, 0);
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(big, 0, 0, n, n);
  const e = x.getImageData(0, 0, n, n), q = e.data;
  for (let i = 3; i < q.length; i += 4) q[i] = q[i] < 110 ? 0 : 255;
  x.putImageData(e, 0, 0);
  return c;
}
const iconsReady = Promise.all(ICON_KEYS.map((k) => new Promise((res) => {
  const im = new Image();
  im.onload = () => { FACE[k] = pixelate(im, 12); BADGE[k] = pixelate(im, 15); res(); };
  im.onerror = res; im.src = `icons/${k}.jpg`;
})));

/* ============================== Stages (13x13 tiles) ============================== */
// . empty  B brick  S steel  W water  T trees  I ice   l/r/u/d = left/right/top/bottom half brick
const STAGES = [
  { name: 'Playground', map: [
    '.............', '.B.B.B.B.B.B.', '.B.B.B.B.B.B.', '.B.B.BSB.B.B.', '.B.B.B.B.B.B.', '.B.B.u.u.B.B.', '.....d.d.....',
    'S.BB.....BB.S', '.....B.B.....', '.B.B.BBB.B.B.', '.B.B.B.B.B.B.', '.B.B.....B.B.', '.............'] },
  { name: 'Heart Garden', map: [
    '.............', '..TT.....TT..', '.T.........T.', '...BB...BB...', '..BBBB.BBBB..', '..BBBBBBBBB..', '...BBBBBBB...',
    '....BBSBB....', '.....BBB.....', 'WW....B....WW', '..T.......T..', '.TT.B...B.TT.', '.............'] },
  { name: 'River Crossing', map: [
    '.............', '.B..T...T..B.', '.B.BBB.BBB.B.', '.............', 'WWW.WWWWW.WWW', 'TTT.T...T.TTT', '.B...S.S...B.',
    '.BB.B...B.BB.', '.............', 'WWW.WW.WW.WWW', '.T.........T.', '.B.BB...BB.B.', '.............'] },
  { name: 'Forest Maze', map: [
    '......T......', '.TTT.BBB.TTT.', '.T.T.....T.T.', '.TTT.S.S.TTT.', '.....B.B.....', 'BB.TTTTTTT.BB', '...T.....T...',
    '.B.T.BBB.T.B.', '.B.........B.', '.BBB.T.T.BBB.', '.....T.T.....', '.TT.......TT.', '.............'] },
  { name: 'Steel Fortress', map: [
    '.............', '.SS.BBBBB.SS.', '.S.........S.', '...B.S.S.B...', '.B.B.....B.B.', '.B...BBB...B.', 'SS.B.....B.SS',
    '...B.S.S.B...', '.BBB.....BBB.', '.....B.B.....', '.S.BB...BB.S.', '.S.........S.', '.............'] },
  { name: 'Ice Rink', map: [
    '.............', '..BB.....BB..', '.BIIB...BIIB.', '.BIIB.S.BIIB.', '..BB.....BB..', 'IIIIIIIIIIIII', 'IIBIIBIBIIBII',
    'IIIIIIIIIIIII', '.T..BB.BB..T.', '.T.........T.', '.BB.I...I.BB.', '.............', '.............'] }
];
function buildGrid(map) {
  const g = new Uint8Array(N * N);
  const set = (c, r, v) => { if (c >= 0 && r >= 0 && c < N && r < N) g[r * N + c] = v; };
  for (let ty = 0; ty < 13; ty++) for (let tx = 0; tx < 13; tx++) {
    const ch = (map[ty] || '')[tx] || '.';
    const full = { B: BRICK, S: STEEL, W: WATER, T: TREE, I: ICE }[ch];
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
      let v = full || EMPTY;
      if (ch === 'l' && sx < 2) v = BRICK; if (ch === 'r' && sx >= 2) v = BRICK;
      if (ch === 'u' && sy < 2) v = BRICK; if (ch === 'd' && sy >= 2) v = BRICK;
      if (v) set(tx * 4 + sx, ty * 4 + sy, v);
    }
  }
  return g;
}
function protectZones(g) {
  const clearTile = (tx, ty) => { for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) g[(ty * 4 + sy) * N + tx * 4 + sx] = EMPTY; };
  ENEMY_SPAWNS.forEach(([x, y]) => clearTile(x / TILE, y / TILE));
  PLAYER_SPAWNS.forEach(([x, y]) => clearTile(x / TILE, y / TILE));
  for (let r = 44; r < N; r++) for (let c = 20; c < 32; c++) g[r * N + c] = EMPTY;
  for (let r = RING.r0; r <= RING.r1; r++) for (let c = RING.c0; c <= RING.c1; c++) if (!(c >= 24 && c <= 27 && r >= 48)) g[r * N + c] = BRICK;
}
function gridToMap(g) {
  const rows = [];
  for (let ty = 0; ty < 13; ty++) {
    let s = '';
    for (let tx = 0; tx < 13; tx++) { const v = g[(ty * 4 + 1) * N + tx * 4 + 1]; s += ['.', 'B', 'S', 'W', 'T', 'I'][v] || '.'; }
    rows.push(s);
  }
  return rows;
}

/* ============================== Audio (original NES-style chiptunes via WebAudio) ============================== */
const Sound = (() => {
  let ac = null, master, musicBus, sfxBus, noiseBuf, waves = {}, cur = null, timer = null;
  const st = { sound: true, music: true };
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = .55; master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = st.music ? .2 : 0; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = st.sound ? .45 : 0; sfxBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    [.125, .25, .5].forEach((duty) => {
      const n = 40, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      waves[duty] = ac.createPeriodicWave(re, im);
    });
  }
  function note(f, t, dur, o = {}) {
    if (!ac) return;
    const osc = ac.createOscillator();
    if (o.tri) osc.type = 'triangle'; else osc.setPeriodicWave(waves[o.duty || .5]);
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    const g = ac.createGain(), v = o.vol ?? .3;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .006);
    g.gain.setValueAtTime(v, t + Math.max(.01, dur * .7)); g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(g); g.connect(o.bus || sfxBus); osc.start(t); osc.stop(t + dur + .03);
  }
  function noise(t, dur, o = {}) {
    if (!ac) return;
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = o.type || 'highpass'; f.frequency.value = o.freq || 1000;
    const g = ac.createGain(), v = o.vol ?? .3;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus); src.start(t); src.stop(t + dur + .02);
  }
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const freq = (s) => { const m = /^([A-G])(#?)(\d)$/.exec(s); if (!m) return 0; const midi = 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] ? 1 : 0); return 440 * Math.pow(2, (midi - 69) / 12); };
  function parse(str) {
    const tok = str.trim().split(/\s+/), ev = [];
    tok.forEach((x, i) => { if (x === '-') { if (ev.length) ev[ev.length - 1].len++; } else if (x !== '.') ev.push({ step: i, len: 1, n: x }); });
    return { ev, len: tok.length };
  }
  const SONGS = {
    intro: { bpm: 150, loop: false, tracks: [
      { v: { duty: .25, vol: .28 }, s: 'C5 E5 G5 C6 A5 F5 G5 A5 B5 G5 B5 D6 C6 - - .' },
      { v: { tri: true, vol: .4 }, s: 'C3 - G2 - F2 - C3 - G2 - G2 - C3 - - .' }] },
    march: { bpm: 112, loop: true, tracks: [
      { v: { duty: .25, vol: .14 }, s: 'E5 - G5 E5 C5 - D5 E5 C5 - A4 - C5 E5 A5 - A5 - G5 F5 E5 - F5 A5 G5 - - D5 G5 - B5 - ' +
        'C6 - B5 C6 G5 - E5 G5 A5 - G5 E5 C5 - E5 A5 F5 A5 G5 F5 D5 - B4 D5 C5 - E5 G5 C6 - - .' },
      { v: { tri: true, vol: .3 }, s: 'C3 . G2 . C3 . G2 . A2 . E3 . A2 . E3 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . ' +
        'C3 . G2 . C3 . G2 . A2 . E3 . A2 . E3 . F2 . C3 . G2 . D3 . C3 . G2 . C3 - - .' },
      { v: { drum: true }, s: 'k . h . s . h . k . h . s . h . k . h . s . h . k . h . s . h h ' +
        'k . h . s . h . k . h . s . h . k . h . s . h . k . h . s . s s' }] },
    clear: { bpm: 140, loop: false, tracks: [
      { v: { duty: .25, vol: .28 }, s: 'G5 C6 E6 G6 - E6 G6 - - - . .' },
      { v: { tri: true, vol: .38 }, s: 'C3 - - - G2 - C3 - - - . .' }] },
    over: { bpm: 96, loop: false, tracks: [
      { v: { duty: .5, vol: .2 }, s: 'E5 - D5 - C5 - A4 - B4 - - - C5 - - - . .' },
      { v: { tri: true, vol: .32 }, s: 'A2 - - - F2 - - - G2 - - - C3 - - - . .' }] }
  };
  function drum(kind, t, bus) {
    if (kind === 'k') { note(150, t, .12, { tri: true, slide: 50, vol: .45, bus }); }
    else if (kind === 's') noise(t, .12, { type: 'bandpass', freq: 1800, vol: .12, bus });
    else if (kind === 'h') noise(t, .04, { type: 'highpass', freq: 7000, vol: .05, bus });
  }
  function play(name) {
    stop();
    if (!ac) return;
    const song = SONGS[name]; if (!song) return;
    const bus = ac.createGain(); bus.gain.value = 1; bus.connect(musicBus);
    const tracks = song.tracks.map((tr) => ({ v: tr.v, ...parse(tr.s) }));
    const loopLen = Math.max(...tracks.map((t) => t.len));
    const stepDur = 60 / song.bpm / 2;
    const me = { name, bus, next: ac.currentTime + .08, step: 0 };
    cur = me;
    const tick = () => {
      if (cur !== me) return;
      while (me.next < ac.currentTime + .5) {
        const s = me.step % loopLen;
        if (!song.loop && me.step >= loopLen) { clearInterval(timer); timer = null; return; }
        tracks.forEach((tr) => tr.ev.forEach((e) => {
          if (e.step !== s) return;
          if (tr.v.drum) drum(e.n, me.next, bus);
          else note(freq(e.n), me.next, e.len * stepDur * .92, { ...tr.v, bus });
        }));
        me.step++; me.next += stepDur;
      }
    };
    tick(); timer = setInterval(tick, 90);
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (cur && ac) { const b = cur.bus; b.gain.setTargetAtTime(0, ac.currentTime, .05); setTimeout(() => b.disconnect(), 400); }
    cur = null;
  }
  function sfx(name) {
    if (!ac || !st.sound) return;
    const t = ac.currentTime;
    switch (name) {
      case 'shoot': note(880, t, .07, { duty: .25, slide: 420, vol: .16 }); break;
      case 'brick': noise(t, .14, { type: 'bandpass', freq: 700, vol: .32 }); break;
      case 'steel': note(1500, t, .05, { duty: .125, vol: .1 }); note(2250, t + .03, .05, { duty: .125, vol: .07 }); break;
      case 'armor': note(1200, t, .05, { duty: .125, vol: .14 }); note(900, t + .06, .06, { duty: .125, vol: .12 }); break;
      case 'pop': noise(t, .32, { type: 'lowpass', freq: 1400, vol: .34 }); note(700, t, .25, { tri: true, slide: 180, vol: .3 });
        [1047, 1319, 1568].forEach((f, i) => note(f, t + .08 + i * .05, .06, { duty: .125, vol: .06 })); break;
      case 'hit': noise(t, .5, { type: 'lowpass', freq: 800, vol: .35 }); note(400, t, .4, { tri: true, slide: 90, vol: .3 }); break;
      case 'base': [392, 330, 262].forEach((f, i) => note(f, t + i * .12, .12, { tri: true, vol: .35 })); break;
      case 'appear': [1047, 1319, 1568, 2093].forEach((f, i) => note(f, t + i * .06, .06, { duty: .125, vol: .09 })); break;
      case 'get': [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => note(f, t + i * .05, .07, { duty: .25, vol: .16 })); break;
      case 'life': [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => note(f, t + i * .08, .08, { duty: .25, vol: .16 })); break;
      case 'select': note(988, t, .05, { duty: .25, vol: .12 }); break;
      case 'pause': note(660, t, .08, { duty: .5, vol: .12 }); note(880, t + .1, .1, { duty: .5, vol: .12 }); break;
      case 'tick': note(1319, t, .03, { duty: .125, vol: .08 }); break;
    }
  }
  function setMusic(on) { st.music = on; if (musicBus) musicBus.gain.value = on ? .2 : 0; }
  function setSound(on) { st.sound = on; if (sfxBus) sfxBus.gain.value = on ? .45 : 0; }
  return { init, play, stop, sfx, setMusic, setSound, st, get song() { return cur && cur.name; } };
})();

/* ============================== Input ============================== */
const keysHeld = new Set(), dirStack = [[], []], touchDir = [-1, -1], touchFire = [false, false];
const KEYDIR = { KeyW: [0, 0], KeyD: [0, 1], KeyS: [0, 2], KeyA: [0, 3], ArrowUp: [1, 0], ArrowRight: [1, 1], ArrowDown: [1, 2], ArrowLeft: [1, 3] };
const FIRE = { Space: 0, KeyF: 0, Enter: 1, Slash: 1, ShiftRight: 1, Numpad0: 1 };
const input = [0, 1].map((i) => ({
  dir() { if (touchDir[i] >= 0) return touchDir[i]; const s = dirStack[i]; return s.length ? s[s.length - 1] : -1; },
  get fire() { return touchFire[i] || Object.entries(FIRE).some(([k, p]) => mapPlayer(p) === i && keysHeld.has(k)); }
}));
function mapPlayer(p) { return S.players === 1 ? 0 : p; }
addEventListener('keydown', (e) => {
  Sound.init();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (S.mode === 'title') { titleKey(e); return; }
  if (e.code === 'KeyP' || e.code === 'Escape') { if (S.mode === 'play') setPaused(!S.paused); return; }
  if (e.repeat) return;
  keysHeld.add(e.code);
  const kd = KEYDIR[e.code];
  if (kd) { const p = mapPlayer(kd[0]); const s = dirStack[p]; const i = s.indexOf(kd[1]); if (i >= 0) s.splice(i, 1); s.push(kd[1]); }
  if ((S.mode === 'tally' || S.mode === 'over') && (e.code === 'Enter' || e.code === 'Space')) { const b = document.querySelector(`#${S.mode} .pill`); b && b.click(); }
});
addEventListener('keyup', (e) => {
  keysHeld.delete(e.code);
  const kd = KEYDIR[e.code];
  if (kd) [0, 1].forEach((p) => { const s = dirStack[p]; const i = s.indexOf(kd[1]); if (i >= 0 && (mapPlayer(kd[0]) === p)) s.splice(i, 1); });
});
addEventListener('blur', () => { keysHeld.clear(); dirStack[0].length = dirStack[1].length = 0; });
document.querySelectorAll('.pad').forEach((el) => {
  let pid = null;
  const idx = () => (S.players === 1 ? 0 : +el.dataset.p);
  const upd = (e) => {
    const r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) < r.width * .12 ? -1 : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
    touchDir[idx()] = d; el.dataset.dir = d;
  };
  el.addEventListener('pointerdown', (e) => { Sound.init(); pid = e.pointerId; try { el.setPointerCapture(pid); } catch (_) {} upd(e); e.preventDefault(); });
  el.addEventListener('pointermove', (e) => { if (e.pointerId === pid) upd(e); });
  const end = (e) => { if (e.pointerId !== pid) return; pid = null; touchDir[idx()] = -1; el.dataset.dir = ''; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
});
document.querySelectorAll('.fire').forEach((el) => {
  const idx = () => (S.players === 1 ? 0 : +el.dataset.p);
  el.addEventListener('pointerdown', (e) => { Sound.init(); touchFire[idx()] = true; el.classList.add('on'); e.preventDefault(); });
  const up = () => { touchFire[idx()] = false; el.classList.remove('on'); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
});

/* ============================== Game state ============================== */
const saved = JSON.parse(localStorage.getItem('critterTank_v1') || '{}');
const S = {
  mode: 'title', players: 1, speed: saved.speed || 'super', stage: 1, custom: saved.custom || null, playingCustom: false,
  paused: false, grid: new Uint8Array(N * N), tanks: [], bullets: [], parts: [], popups: [], power: null,
  queue: [], total: 0, spawned: 0, spawnT: 0, spawnIdx: 0, freeze: 0, ringSteel: 0, base: { hp: 3, max: 3, alive: true },
  clearT: 0, overT: 0, lost: false, kills: [{}, {}], score: [0, 0], lives: [0, 0], nextLife: [0, 0], hi: saved.hi || 0,
  frame: 0, time: 0, dirty: true, p: [null, null], menu: 0, brush: BRICK, touchUI: matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
};
const P = () => PROFILES[S.speed];
function persist() { localStorage.setItem('critterTank_v1', JSON.stringify({ hi: S.hi, speed: S.speed, custom: S.custom })); }

function makePlayer(i) {
  return { isPlayer: true, idx: i, team: 0, face: i ? 'jj' : 'mikey', pal: PAL[i ? 'jj' : 'mikey'], x: 0, y: 0, dir: 0,
    level: 0, shield: 0, spawnT: 0, dead: false, out: false, respawnT: 0, cool: 0, slide: 0, tread: 0 };
}
function placePlayer(t) {
  const [x, y] = PLAYER_SPAWNS[t.idx]; t.x = x; t.y = y; t.dir = 0; t.spawnT = .9; t.dead = false; t.shield = 0; t.slide = 0;
}

function lineup(stage) {
  const mixes = [[8, 2, 0, 0], [6, 3, 2, 1], [5, 4, 2, 1], [4, 4, 3, 2], [3, 5, 3, 3], [3, 4, 4, 4]];
  let mix = mixes[Math.min(stage - 1, 5)].slice();
  if (S.speed === 'super') mix = mix.map((n, i) => Math.max(i === 0 ? 3 : 0, Math.round(n * .75)));
  const arr = []; mix.forEach((n, i) => { for (let k = 0; k < n; k++) arr.push(KINDS[i]); });
  if (S.speed === 'classic') while (arr.length < 20) arr.push(KINDS[Math.min(3, (Math.random() * 4) | 0)]);
  if (stage > 6) arr.forEach((k, i) => { if (k === 'huggy' && Math.random() < .4) arr[i] = 'mommy'; });
  for (let i = arr.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; }
  // Start each stage gently: the first two villains are always the slow ones.
  arr.sort((a, b) => 0); const firstSlow = arr.findIndex((k) => k === 'huggy'); if (firstSlow > 0) [arr[0], arr[firstSlow]] = [arr[firstSlow], arr[0]];
  return arr;
}

function newGame(players) {
  S.players = players; S.stage = 1; S.score = [0, 0]; S.kills = [{}, {}];
  S.lives = [P().lives, players === 2 ? P().lives : 0]; S.nextLife = [P().lifeEvery, P().lifeEvery];
  S.p = [makePlayer(0), players === 2 ? makePlayer(1) : null];
  document.body.classList.toggle('solo', players === 1);
  $('p2card').classList.toggle('hidden', players === 1);
  startStage();
}
function startStage() {
  const custom = S.playingCustom && S.custom;
  const st = custom ? { name: 'My Map', map: S.custom } : STAGES[(S.stage - 1) % STAGES.length];
  S.grid = buildGrid(st.map); protectZones(S.grid);
  S.tanks = []; S.bullets = []; S.parts = []; S.popups = []; S.power = null;
  S.freeze = 0; S.ringSteel = 0; S.clearT = 0; S.overT = 0; S.lost = false; S.kills = [{}, {}];
  S.base = { hp: P().baseHp, max: P().baseHp, alive: true };
  S.queue = lineup(S.stage); S.total = S.queue.length; S.spawned = 0; S.spawnT = 1.5; S.spawnIdx = 0; S.dirty = true;
  S.p.forEach((pl) => { if (pl && !pl.out) { placePlayer(pl); S.tanks.push(pl); } });
  hideOverlays();
  $('introNum').textContent = custom ? '★' : S.stage; $('introName').textContent = st.name;
  $('intro').classList.remove('hidden');
  S.mode = 'intro'; S.paused = false;
  Sound.play('intro');
  layout(); renderHud();
  clearTimeout(S.introTimer);
  S.introTimer = setTimeout(() => {
    if (S.mode !== 'intro') return;
    $('intro').classList.add('hidden'); S.mode = 'play';
    Sound.play('march'); layout();
  }, 2400);
}
function hideOverlays() { ['title', 'intro', 'tally', 'over', 'pauseVeil', 'toast', 'palette'].forEach((id) => $(id).classList.add('hidden')); document.body.classList.remove('building'); }

/* ============================== Movement & collision ============================== */
function solidAt(c, r) { const v = S.grid[r * N + c]; return v === BRICK || v === STEEL || v === WATER; }
function free(t, x, y) {
  if (x < 0 || y < 0 || x > FIELD - 32 || y > FIELD - 32) return false;
  const c0 = Math.floor((x + .01) / SUB), c1 = Math.floor((x + 31.99) / SUB), r0 = Math.floor((y + .01) / SUB), r1 = Math.floor((y + 31.99) / SUB);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solidAt(c, r)) return false;
  if (overlap(x, y, 32, 32, BASE.x, BASE.y, 32, 32)) return false;
  for (const o of S.tanks) {
    if (o === t || o.gone || o.dead) continue;
    if (overlap(x + 1, y + 1, 30, 30, o.x + 1, o.y + 1, 30, 30) && !overlap(t.x + 1, t.y + 1, 30, 30, o.x + 1, o.y + 1, 30, 30)) return false;
  }
  return true;
}
function turn(t, d) {
  if (d === t.dir) return;
  if ((d % 2) !== (t.dir % 2)) {
    if (d % 2 === 0) { const nx = Math.round(t.x / 16) * 16; if (free(t, nx, t.y)) t.x = nx; }
    else { const ny = Math.round(t.y / 16) * 16; if (free(t, t.x, ny)) t.y = ny; }
  }
  t.dir = d;
}
function move(t, dist, assist) {
  t.tread = (t.tread + dist) % 8;
  const nx = t.x + DX[t.dir] * dist, ny = t.y + DY[t.dir] * dist;
  if (free(t, nx, ny)) { t.x = nx; t.y = ny; return true; }
  let moved = false;
  for (let s = 0; s < dist; s += 1) {
    const x2 = t.x + DX[t.dir], y2 = t.y + DY[t.dir];
    if (free(t, x2, y2)) { t.x = x2; t.y = y2; moved = true; } else break;
  }
  if (!moved && assist) {
    // Corner assist: gently slide toward a lane that lets the tank through (kids rarely line up exactly).
    const vert = t.dir % 2 === 0, cur = vert ? t.x : t.y;
    const base = Math.round(cur / 16) * 16;
    for (const cand of [base, base - 16, base + 16]) {
      if (Math.abs(cand - cur) > 16) continue;
      const cx = vert ? cand : t.x, cy = vert ? t.y : cand;
      if (free(t, cx, cy) && free(t, cx + DX[t.dir] * 2, cy + DY[t.dir] * 2)) {
        const step = Math.sign(cand - cur) * Math.min(dist, Math.abs(cand - cur));
        if (step && free(t, vert ? t.x + step : t.x, vert ? t.y : t.y + step)) { if (vert) t.x += step; else t.y += step; return true; }
      }
    }
  }
  return moved;
}
function onIce(t) {
  const c = Math.floor((t.x + 16) / SUB), r = Math.floor((t.y + 16) / SUB);
  return S.grid[r * N + c] === ICE;
}

/* ============================== Tanks ============================== */
function tryFire(t) {
  if (t.cool > 0) return false;
  const mine = S.bullets.reduce((n, b) => n + (b.owner === t && !b.dead ? 1 : 0), 0);
  const max = t.isPlayer && t.level >= 2 ? 2 : 1;
  if (mine >= max) return false;
  const friendly = t.team === 0;
  const speed = friendly ? (t.level >= 1 ? 330 : 230) : t.bulletSpeed;
  S.bullets.push({ x: t.x + 16 + DX[t.dir] * 14, y: t.y + 16 + DY[t.dir] * 14, dir: t.dir, speed, owner: t, team: t.team, power: t.level || 0, dead: false });
  t.cool = friendly ? .2 : .15;
  if (friendly) Sound.sfx('shoot');
  return true;
}
function playerControl(t, dt) {
  if (S.lost) return;
  const want = input[t.idx].dir();
  if (want >= 0) { turn(t, want); t.slide = onIce(t) ? .35 : 0; move(t, P().player * dt, true); }
  else if (t.slide > 0) { t.slide -= dt; move(t, P().player * dt, false); }
  if (input[t.idx].fire) tryFire(t);
}
function enemyControl(t, dt) {
  if (S.freeze > 0) return;
  t.turnT -= dt; t.fireT -= dt;
  const aligned = Math.abs(t.x % 16) < .5 && Math.abs(t.y % 16) < .5;
  const blocked = !move(t, t.speed * dt, false);
  if (blocked || (t.turnT <= 0 && aligned)) {
    const r = Math.random(); let d;
    if (r < .4) d = 2; else if (r < .6) d = BASE.x > t.x ? 1 : 3; else d = (Math.random() * 4) | 0;
    if (blocked && d === t.dir) d = (t.dir + 1 + ((Math.random() * 3) | 0)) % 4;
    turn(t, d); t.turnT = rnd(.8, 2.6);
    if (blocked && Math.random() < .25) tryFire(t);
  }
  if (t.fireT <= 0) { tryFire(t); t.fireT = rnd(...P().fire); }
}
function allyControl(t, dt) {
  t.life -= dt;
  if (t.life <= 0) { burst(t.x + 16, t.y + 16, t.pal, 10); t.gone = true; return; }
  t.think -= dt; if (t.wander > 0) t.wander -= dt;
  if (t.think <= 0) {
    t.think = .3;
    let tgt = null, bd = 1e9;
    S.tanks.forEach((o) => { if (o.team === 1 && !o.gone && o.spawnT <= 0) { const d = Math.hypot(o.x - t.x, o.y - t.y); if (d < bd) { bd = d; tgt = o; } } });
    t.aim = false;
    if (tgt && t.wander <= 0) {
      const dx = tgt.x - t.x, dy = tgt.y - t.y;
      if (Math.abs(dx) < 12) { turn(t, dy < 0 ? 0 : 2); t.aim = true; }
      else if (Math.abs(dy) < 12) { turn(t, dx < 0 ? 3 : 1); t.aim = true; }
      else turn(t, Math.abs(dx) < Math.abs(dy) ? (dx < 0 ? 3 : 1) : (dy < 0 ? 0 : 2));
    }
  }
  if (t.aim) tryFire(t);
  else if (!move(t, 76 * dt, true)) { tryFire(t); if (t.wander <= 0) { t.wander = .7; turn(t, (Math.random() * 4) | 0); } }
}
function updateTank(t, dt) {
  if (t.spawnT > 0) { t.spawnT -= dt; if (t.spawnT <= 0 && t.isPlayer) t.shield = Math.max(t.shield, P().shield); return; }
  if (t.shield > 0) t.shield -= dt;
  if (t.cool > 0) t.cool -= dt;
  if (t.flash > 0) t.flash -= dt;
  if (t.isPlayer) playerControl(t, dt); else if (t.ally) allyControl(t, dt); else enemyControl(t, dt);
}
function spotFree(x, y) { return !S.tanks.some((o) => !o.gone && !o.dead && overlap(x, y, 32, 32, o.x, o.y, 32, 32)); }
function spawnEnemies(dt) {
  if (!S.queue.length || S.lost) return;
  S.spawnT -= dt;
  const onField = S.tanks.filter((t) => t.team === 1 && !t.gone).length;
  if (S.spawnT > 0 || onField >= P().max[S.players - 1]) return;
  for (let k = 0; k < 3; k++) {
    const i = (S.spawnIdx + k) % 3, [sx, sy] = ENEMY_SPAWNS[i];
    if (!spotFree(sx, sy)) continue;
    S.spawnIdx = (i + 1) % 3;
    const kind = S.queue.shift(), n = S.spawned++;
    const scale = Math.min(1.3, 1 + .05 * (S.stage - 1));
    S.tanks.push({ team: 1, kind, face: kind, x: sx, y: sy, dir: 2, speed: P().enemy[kind] * scale, bulletSpeed: P().ebullet[kind] * scale,
      hp: kind === 'pj' ? P().pjHp : 1, spawnT: .9, turnT: rnd(1, 2), fireT: rnd(1.5, 3), bonus: [3, 10, 17].includes(n), cool: 0, tread: 0, flash: 0 });
    S.spawnT = P().spawn; renderHud();
    return;
  }
  S.spawnT = .5;
}

/* ============================== Bullets ============================== */
function updateBullet(b, dt) {
  let dist = b.speed * dt;
  while (dist > 0 && !b.dead) { const s = Math.min(3, dist); dist -= s; b.x += DX[b.dir] * s; b.y += DY[b.dir] * s; bulletCollide(b); }
}
function bulletCollide(b) {
  if (b.x < 2 || b.y < 2 || b.x > FIELD - 2 || b.y > FIELD - 2) { b.dead = true; if (b.team === 0) Sound.sfx('steel'); spark(b.x, b.y); return; }
  const c0 = Math.floor((b.x - 3) / SUB), c1 = Math.floor((b.x + 2.99) / SUB), r0 = Math.floor((b.y - 3) / SUB), r1 = Math.floor((b.y + 2.99) / SUB);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const v = S.grid[r * N + c];
    if (v === BRICK || v === STEEL) { b.dead = true; destroyTerrain(b); return; }
  }
  if (S.base.alive && overlap(b.x - 3, b.y - 3, 6, 6, BASE.x, BASE.y, 32, 32)) { b.dead = true; hitBase(); return; }
  for (const o of S.bullets) {
    if (o !== b && !o.dead && o.team !== b.team && overlap(b.x - 3, b.y - 3, 6, 6, o.x - 3, o.y - 3, 6, 6)) { o.dead = b.dead = true; spark(b.x, b.y); return; }
  }
  for (const t of S.tanks) {
    if (t.gone || t.dead || t.spawnT > 0 || t.team === b.team) continue;
    if (overlap(b.x - 3, b.y - 3, 6, 6, t.x + 2, t.y + 2, 28, 28)) { b.dead = true; hitTank(t, b); return; }
  }
}
function destroyTerrain(b) {
  const vert = b.dir % 2 === 0, deep = b.power >= 3 ? 2 : 1;
  let brick = false, steel = false;
  const hitCell = (c, r) => {
    if (c < 0 || r < 0 || c >= N || r >= N) return;
    const i = r * N + c, v = S.grid[i];
    if (v === BRICK) { S.grid[i] = EMPTY; brick = true; }
    else if (v === STEEL) { if (b.power >= 3) { S.grid[i] = EMPTY; brick = true; } else steel = true; }
  };
  if (vert) {
    const c0 = Math.floor((b.x - 16) / SUB), c1 = Math.floor((b.x + 15.99) / SUB);
    const rf = b.dir === 0 ? Math.floor((b.y - 3) / SUB) : Math.floor((b.y + 2.99) / SUB);
    for (let k = 0; k < deep; k++) for (let c = c0; c <= c1; c++) hitCell(c, rf + (b.dir === 0 ? -k : k));
  } else {
    const r0 = Math.floor((b.y - 16) / SUB), r1 = Math.floor((b.y + 15.99) / SUB);
    const cf = b.dir === 3 ? Math.floor((b.x - 3) / SUB) : Math.floor((b.x + 2.99) / SUB);
    for (let k = 0; k < deep; k++) for (let r = r0; r <= r1; r++) hitCell(cf + (b.dir === 3 ? -k : k), r);
  }
  if (brick) { S.dirty = true; if (b.team === 0 || Math.random() < .5) Sound.sfx('brick'); }
  else if (steel && b.team === 0) Sound.sfx('steel');
  spark(b.x, b.y);
}
function hitTank(t, b) {
  if (t.team === 0) {
    if (t.ally || t.shield > 0) { Sound.sfx('steel'); spark(b.x, b.y); return; }
    playerHit(t); return;
  }
  if (t.bonus) { t.bonus = false; spawnPower(); }
  t.hp--;
  if (t.hp > 0) { t.flash = .25; Sound.sfx('armor'); return; }
  enemyPop(t, b.owner);
}
function enemyPop(t, killer) {
  t.gone = true;
  burst(t.x + 16, t.y + 16, PAL[t.kind === 'pj' ? 'pj3' : t.kind], 18);
  Sound.sfx('pop');
  if (killer && killer.isPlayer) {
    const i = killer.idx, pts = KIND[t.kind].pts;
    S.kills[i][t.kind] = (S.kills[i][t.kind] || 0) + 1;
    addScore(i, pts);
    S.popups.push({ x: t.x + 16, y: t.y + 16, text: String(pts), t: 1.2 });
  }
  renderHud();
}
function playerHit(t) {
  Sound.sfx('hit');
  burst(t.x + 16, t.y + 16, t.pal, 16);
  t.dead = true; t.respawnT = 1.4;
  t.level = S.speed === 'classic' ? 0 : Math.max(0, t.level - 1);
  if (S.lives[t.idx] > 0) S.lives[t.idx]--; else t.out = true;
  if (S.p.every((pl) => !pl || pl.out)) loseGame('tanks');
  renderHud();
}
function hitBase() {
  if (!S.base.alive) return;
  S.base.hp--;
  burst(BASE.x + 16, BASE.y + 16, ['#ff5f93', '#9c2328', '#fff1d0'], 12);
  Sound.sfx('base');
  if (S.base.hp <= 0) { S.base.alive = false; burst(BASE.x + 16, BASE.y + 16, ['#ff5f93', '#e5484d', '#fff1d0'], 30); loseGame('home'); }
  renderHud();
}
function loseGame(why) {
  if (S.lost) return;
  S.lost = true; S.loseWhy = why; S.overT = .001;
  Sound.stop(); setTimeout(() => Sound.play('over'), 600);
}
function addScore(i, pts) {
  S.score[i] += pts;
  if (S.score[i] >= S.nextLife[i]) { S.nextLife[i] += P().lifeEvery; S.lives[i]++; Sound.sfx('life'); }
  if (S.score[i] > S.hi) { S.hi = S.score[i]; persist(); }
}

/* ============================== Power-ups (Smiling Critters friends) ============================== */
function spawnPower() {
  const keys = Object.keys(POWER), tot = keys.reduce((a, k) => a + POWER[k].w, 0);
  let r = Math.random() * tot, kind = keys[0];
  for (const k of keys) { r -= POWER[k].w; if (r <= 0) { kind = k; break; } }
  for (let tries = 0; tries < 80; tries++) {
    const x = ((Math.random() * 13) | 0) * TILE, y = ((Math.random() * 12) | 0) * TILE;
    if (y >= 352 && x >= 160 && x <= 224) continue;
    let solid = 0; for (let r2 = y / SUB; r2 < y / SUB + 4; r2++) for (let c = x / SUB; c < x / SUB + 4; c++) if (solidAt(c, r2)) solid++;
    if (solid > 4) continue;
    S.power = { kind, x, y, t: 18 }; Sound.sfx('appear'); return;
  }
}
function applyPower(kind, pl) {
  switch (kind) {
    case 'dogday': pl.level = Math.min(3, pl.level + 1); break;
    case 'bobby': pl.shield = 12; break;
    case 'hoppy': S.freeze = 10; break;
    case 'craftycorn': setRing(STEEL); S.ringSteel = 18; break;
    case 'kickin': S.tanks.forEach((t) => { if (t.team === 1 && !t.gone && t.spawnT <= 0) enemyPop(t, pl); }); break;
    case 'bubba': S.lives[pl.idx]++; Sound.sfx('life'); break;
    case 'sunnyfox': case 'poppydash': spawnAlly(kind); break;
  }
  addScore(pl.idx, 500);
  S.popups.push({ x: pl.x + 16, y: pl.y, text: '500', t: 1.2 });
  Sound.sfx('get');
  toast(kind, POWER[kind].name, POWER[kind].say);
  renderHud();
}
function setRing(v) {
  for (let r = RING.r0; r <= RING.r1; r++) for (let c = RING.c0; c <= RING.c1; c++) if (!(c >= 24 && c <= 27 && r >= 48)) S.grid[r * N + c] = v;
  S.dirty = true;
}
function spawnAlly(kind) {
  const old = S.tanks.find((t) => t.ally && !t.gone);
  if (old) { old.life = 20; old.face = kind; old.pal = PAL[kind]; return; }
  let spot = PLAYER_SPAWNS.find(([x, y]) => spotFree(x, y)) || [160, 320];
  S.tanks.push({ ally: true, team: 0, face: kind, pal: PAL[kind], x: spot[0], y: spot[1], dir: 0, level: 1, life: 20, spawnT: .9,
    think: 0, wander: 0, cool: 0, tread: 0, shield: 0 });
}
let toastTimer = 0;
function toast(icon, title, text) {
  const el = $('toast');
  el.innerHTML = `<img src="icons/${icon}.jpg" alt=""><div><b>${title}</b><span>${text}</span></div>`;
  el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}

/* ============================== Effects ============================== */
function burst(x, y, pal, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = rnd(20, 70);
    S.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rnd(.6, 1.1), c: [...pal, '#ffffff', '#ffe27a'][(Math.random() * (pal.length + 2)) | 0], sz: Math.random() < .5 ? 3 : 2 });
  }
  S.parts.push({ ring: true, x, y, t: .35, r: 4 });
}
function spark(x, y) { for (let i = 0; i < 4; i++) S.parts.push({ x, y, vx: rnd(-30, 30), vy: rnd(-30, 30), t: .25, c: '#fff6c9', sz: 2 }); }

/* ============================== Update loop ============================== */
function update(dt) {
  S.frame++; S.time += dt;
  if (S.freeze > 0) S.freeze -= dt;
  if (S.ringSteel > 0) { S.ringSteel -= dt; if (S.ringSteel <= 0) setRing(BRICK); else if (S.frame % 10 === 0) S.dirty = true; }
  if (S.frame % 40 === 0) S.dirty = true;  // water shimmer
  spawnEnemies(dt);
  S.p.forEach((pl) => {
    if (pl && pl.dead && !pl.out && !S.lost) { pl.respawnT -= dt; if (pl.respawnT <= 0) placePlayer(pl); }
  });
  S.tanks.forEach((t) => { if (!t.gone && !t.dead) updateTank(t, dt); });
  S.bullets.forEach((b) => { if (!b.dead) updateBullet(b, dt); });
  S.bullets = S.bullets.filter((b) => !b.dead);
  S.tanks = S.tanks.filter((t) => !t.gone);
  if (S.power) {
    S.power.t -= dt;
    if (S.power.t <= 0) S.power = null;
    else for (const pl of S.p) if (pl && !pl.dead && pl.spawnT <= 0 && overlap(pl.x + 4, pl.y + 4, 24, 24, S.power.x, S.power.y, 32, 32)) { const k = S.power.kind; S.power = null; applyPower(k, pl); break; }
  }
  S.parts.forEach((p) => { p.t -= dt; if (p.ring) p.r += dt * 60; else { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; } });
  S.parts = S.parts.filter((p) => p.t > 0);
  S.popups.forEach((p) => { p.t -= dt; p.y -= dt * 10; });
  S.popups = S.popups.filter((p) => p.t > 0);
  if (!S.lost && !S.queue.length && !S.tanks.some((t) => t.team === 1)) { S.clearT += dt; if (S.clearT > 2.2) showTally(); }
  if (S.overT > 0) { S.overT += dt; if (S.overT > 3.2 && S.mode === 'play') showOver(); }
  if (S.frame % 15 === 0) renderHud();
}

/* ============================== Rendering ============================== */
function drawCell(g, v, c, r) {
  const x = c * SUB, y = r * SUB;
  if (v === BRICK) {
    g.fillStyle = '#a8481f'; g.fillRect(x, y, 8, 8);
    g.fillStyle = '#d9794a'; g.fillRect(x, y, 8, 1); g.fillRect(x, y + 4, 8, 1);
    g.fillStyle = '#5a2410'; g.fillRect(x, y + 3, 8, 1); g.fillRect(x, y + 7, 8, 1);
    const o = (r % 2) * 4; g.fillRect(x + ((3 + o) % 8), y, 1, 3); g.fillRect(x + ((7 + o) % 8), y + 4, 1, 3);
  } else if (v === STEEL) {
    const ring = S.ringSteel > 0 && c >= RING.c0 && c <= RING.c1 && r >= RING.r0;
    g.fillStyle = ring ? `hsl(${(c * 40 + r * 25 + S.frame * 3) % 360},75%,62%)` : '#8f96a0'; g.fillRect(x, y, 8, 8);
    g.fillStyle = '#eef1f5'; g.fillRect(x, y, 8, 1); g.fillRect(x, y, 1, 8);
    g.fillStyle = ring ? 'rgba(0,0,0,.35)' : '#4d535c'; g.fillRect(x, y + 7, 8, 1); g.fillRect(x + 7, y, 1, 8);
    if (!ring) { g.fillStyle = '#c7ccd4'; g.fillRect(x + 2, y + 2, 4, 4); }
  } else if (v === WATER) {
    g.fillStyle = '#2451d6'; g.fillRect(x, y, 8, 8);
    g.fillStyle = '#8fc1ff';
    if (((S.frame / 40 | 0) + c + r) % 2) { g.fillRect(x + 1, y + 2, 3, 1); g.fillRect(x + 4, y + 6, 3, 1); }
    else { g.fillRect(x + 4, y + 1, 3, 1); g.fillRect(x + 1, y + 5, 3, 1); }
  } else if (v === ICE) {
    g.fillStyle = '#cfe3ee'; g.fillRect(x, y, 8, 8);
    g.fillStyle = '#ffffff'; g.fillRect(x + 1, y + 6, 2, 1); g.fillRect(x + 3, y + 4, 2, 1); g.fillRect(x + 5, y + 2, 2, 1);
  } else if (v === TREE) {
    g.fillStyle = '#2f9a3a'; g.fillRect(x, y, 8, 8);
    g.fillStyle = '#17601f'; g.fillRect(x + 1, y + 1, 2, 2); g.fillRect(x + 5, y + 4, 2, 2); g.fillRect(x + 2, y + 5, 1, 1);
    g.fillStyle = '#7ed66f'; g.fillRect(x + 4, y + 1, 2, 1); g.fillRect(x + 1, y + 5, 1, 1);
  }
}
function redrawTerrain() {
  tctx.clearRect(0, 0, FIELD, FIELD); trctx.clearRect(0, 0, FIELD, FIELD);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const v = S.grid[r * N + c]; if (v) drawCell(v === TREE ? trctx : tctx, v, c, r); }
  S.dirty = false;
}
const HEART = ['01010', '11111', '11111', '01110', '00100'];
function drawBase() {
  const x = BASE.x, y = BASE.y, alive = S.base.alive;
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = alive ? '#9c2328' : '#444'; ctx.fillRect(x + 15 - i * 2 - 1, y + 2 + i * 2, i * 4 + 4, 2);
    ctx.fillStyle = alive ? '#e5484d' : '#6b6b6b'; ctx.fillRect(x + 15 - i * 2, y + 2 + i * 2, i * 4 + 2, 2);
  }
  ctx.fillStyle = alive ? '#fff1d0' : '#8a8a8a'; ctx.fillRect(x + 5, y + 16, 22, 14);
  ctx.fillStyle = alive ? '#7a4a2a' : '#555'; ctx.fillRect(x + 5, y + 29, 22, 2); ctx.fillRect(x + 13, y + 22, 6, 8);
  ctx.fillStyle = alive ? '#8fd3ff' : '#666'; ctx.fillRect(x + 7, y + 19, 4, 4); ctx.fillRect(x + 21, y + 19, 4, 4);
  ctx.fillStyle = alive ? '#ff5f93' : '#5a5a5a';
  HEART.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') ctx.fillRect(x + 14 + i, y + 8 + j, 1, 1); }));
  if (alive && S.base.hp < S.base.max) { ctx.fillStyle = '#5a2410'; ctx.fillRect(x + 8, y + 24, 1, 4); ctx.fillRect(x + 9, y + 23, 1, 2); if (S.base.hp < S.base.max - 1) { ctx.fillRect(x + 23, y + 17, 1, 4); ctx.fillRect(x + 22, y + 20, 1, 3); } }
}
function tankPal(t) {
  if (t.team === 1) {
    const base = PAL[t.kind === 'pj' ? 'pj' + Math.max(1, Math.min(4, t.hp)) : t.kind];
    if (t.flash > 0) return ['#ffffff', base[1], '#ffffff'];
    return base;
  }
  return t.pal;
}
function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
function drawTank(t) {
  const x = Math.round(t.x), y = Math.round(t.y);
  let [hull, dark, light] = tankPal(t);
  if (t.bonus) { const k = (Math.sin(S.time * 2.4) + 1) / 2; hull = mix(hull, '#e8393f', k * .85); }
  ctx.save(); ctx.translate(x + 16, y + 16); ctx.rotate(t.dir * Math.PI / 2); ctx.translate(-16, -16);
  for (const tx of [0, 26]) {
    ctx.fillStyle = '#262626'; ctx.fillRect(tx, 2, 6, 29);
    ctx.fillStyle = '#7a7a7a'; const ph = Math.floor(t.tread || 0) % 4;
    for (let k = 0; k < 8; k++) { const yy = 3 + ((k * 4 + ph) % 28); ctx.fillRect(tx + 1, yy, 4, 2); }
  }
  ctx.fillStyle = dark; ctx.fillRect(5, 5, 22, 25);
  ctx.fillStyle = hull; ctx.fillRect(6, 6, 20, 23);
  ctx.fillStyle = light; ctx.fillRect(6, 6, 20, 2);
  const long = t.team === 0 && t.level >= 1;
  ctx.fillStyle = dark; ctx.fillRect(13, long ? -6 : -3, 6, 12);
  ctx.fillStyle = light; ctx.fillRect(14, long ? -5 : -2, 2, 10);
  ctx.restore();
  const f = FACE[t.face];
  if (f) ctx.drawImage(f, x + 4, y + 5, 24, 24);
  if (t.shield > 0 && !t.ally) {
    ctx.strokeStyle = `hsl(${(S.time * 90) % 360},85%,70%)`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + 16, y + 16, 20, 0, Math.PI * 2); ctx.stroke();
  }
  if (t.ally) { ctx.fillStyle = '#ffe27a'; ctx.fillRect(x + 1, y - 4, Math.max(0, 30 * t.life / 20), 2); }
  if (t.team === 1 && S.freeze > 0) { ctx.strokeStyle = 'rgba(170,225,255,.85)'; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, 34, 34); }
}
function drawSpawnStar(t) {
  const cx = t.x + 16, cy = t.y + 16, k = (Math.sin(S.time * 7) + 1) / 2, s = 6 + k * 8;
  ctx.fillStyle = '#ffe27a';
  ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * .3, cy); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s * .3, cy); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - s, cy); ctx.lineTo(cx, cy - s * .3); ctx.lineTo(cx + s, cy); ctx.lineTo(cx, cy + s * .3); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(cx - 2, cy - 2, 4, 4);
}
function drawPower() {
  const pw = S.power, bob = Math.sin(S.time * 2) * 1.5, glow = .45 + .35 * Math.sin(S.time * 2.5);
  const x = pw.x, y = pw.y + bob;
  ctx.fillStyle = `rgba(255,226,122,${glow})`; ctx.fillRect(x - 2, y - 2, 36, 36);
  ctx.fillStyle = '#fffdf7'; ctx.fillRect(x, y, 32, 32);
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, 30, 30);
  const b = BADGE[pw.kind]; if (b) ctx.drawImage(b, x + 1, y + 1, 30, 30);
  if (pw.t < 4) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y + 32 - 32 * (4 - pw.t) / 4, 32, 32 * (4 - pw.t) / 4); }
}
function render() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, FIELD, FIELD);
  if (S.dirty) redrawTerrain();
  ctx.drawImage(terrCv, 0, 0);
  drawBase();
  if (S.power) drawPower();
  S.tanks.forEach((t) => { if (t.dead) return; if (t.spawnT > 0) drawSpawnStar(t); else drawTank(t); });
  ctx.fillStyle = '#fff6c9';
  S.bullets.forEach((b) => { ctx.fillStyle = b.team === 0 ? '#ffe27a' : '#f4f4f4'; ctx.fillRect(Math.round(b.x) - 3, Math.round(b.y) - 3, 6, 6); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 2, 2); });
  ctx.drawImage(treeCv, 0, 0);
  S.parts.forEach((p) => {
    if (p.ring) { ctx.strokeStyle = `rgba(255,255,255,${p.t / .35})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke(); }
    else { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.sz, p.sz); }
  });
  ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = 'center';
  S.popups.forEach((p) => { ctx.fillStyle = '#000'; ctx.fillText(p.text, p.x + 1, p.y + 1); ctx.fillStyle = '#fff'; ctx.fillText(p.text, p.x, p.y); });
  if (S.overT > 0) {
    const k = Math.min(1, S.overT / 2.2), yy = FIELD + 20 - k * (FIELD / 2 + 20);
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillStyle = '#000'; ctx.fillText('GAME', FIELD / 2 + 2, yy + 2); ctx.fillText('OVER', FIELD / 2 + 2, yy + 24);
    ctx.fillStyle = '#e8393f'; ctx.fillText('GAME', FIELD / 2, yy); ctx.fillText('OVER', FIELD / 2, yy + 22);
  }
  if (S.mode === 'build') {
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
    for (let i = 1; i < 13; i++) { ctx.beginPath(); ctx.moveTo(i * TILE + .5, 0); ctx.lineTo(i * TILE + .5, FIELD); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * TILE + .5); ctx.lineTo(FIELD, i * TILE + .5); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,226,122,.25)';
    ENEMY_SPAWNS.concat(PLAYER_SPAWNS).forEach(([x, y]) => ctx.fillRect(x, y, 32, 32));
  }
}

let last = performance.now(), acc = 0;
const DT = 1 / 60;
function loop(now) {
  requestAnimationFrame(loop);
  const d = Math.min(.1, (now - last) / 1000); last = now;
  if (S.mode === 'play' && !S.paused) { acc += d; while (acc >= DT) { update(DT); acc -= DT; } }
  else { acc = 0; if (S.mode === 'title' || S.mode === 'intro') { S.time += d; if ((S.frame++ % 40) === 0) S.dirty = true; } }
  render();
}

/* ============================== HUD & screens ============================== */
function renderHud() {
  const left = S.queue.slice(0, 20);
  $('enemyIcons').innerHTML = left.map((k) => `<img src="icons/${k}.jpg" alt="">`).join('');
  [0, 1].forEach((i) => {
    const pl = S.p[i]; if (!pl) return;
    $(`p${i + 1}lives`).textContent = pl.out ? 'OUT' : `♥ ${S.lives[i] + (pl.dead ? 0 : 1)}`;
    $(`p${i + 1}score`).textContent = S.score[i];
    $(`p${i + 1}level`).textContent = '★'.repeat(pl.level) || '·';
    $(`p${i + 1}card`).classList.toggle('out', pl.out);
  });
  $('homeHearts').textContent = '♥'.repeat(Math.max(0, S.base.hp)) + '♡'.repeat(Math.max(0, S.base.max - S.base.hp));
  $('stageNum').textContent = S.playingCustom ? '★' : S.stage;
  $('hiScore').textContent = S.hi;
}
function showTally() {
  S.mode = 'tally'; Sound.play('clear');
  const two = S.players === 2;
  const rows = KINDS.map((k) => `<span class="n">${(S.kills[0][k] || 0)} × ${KIND[k].pts}</span><img src="icons/${k}.jpg" alt=""><span class="n">${two ? `${S.kills[1][k] || 0} × ${KIND[k].pts}` : ''}</span>`).join('');
  const total = (i) => KINDS.reduce((a, k) => a + (S.kills[i][k] || 0), 0);
  const allSix = !S.playingCustom && S.stage % STAGES.length === 0;
  $('tally').innerHTML = `<h2>STAGE ${S.playingCustom ? '★' : S.stage} CLEAR!</h2>
    <div class="tgrid"><div class="who"><img src="icons/mikey.jpg" alt="">${S.score[0]}</div><span></span><div class="who">${two ? `<img src="icons/jj.jpg" alt="">${S.score[1]}` : ''}</div>
    ${rows}<span class="n ttotal">TOTAL ${total(0)}</span><span></span><span class="n ttotal">${two ? `TOTAL ${total(1)}` : ''}</span></div>
    ${allSix ? '<div class="tnote">All 6 stages cleared! Critter Home is safe! 🎉</div>' : ''}
    <button class="pill go" id="nextBtn">▶ ${S.playingCustom ? 'Play again' : 'Next stage'}</button>`;
  $('tally').classList.remove('hidden');
  $('nextBtn').onclick = () => { Sound.sfx('select'); if (!S.playingCustom) S.stage++; startStage(); };
  let n = 0; const tk = setInterval(() => { if (S.mode !== 'tally' || n++ > 6) return clearInterval(tk); Sound.sfx('tick'); }, 120);
}
function showOver() {
  S.mode = 'over';
  const msg = S.loseWhy === 'home' ? 'Oh no! The villains got into Critter Home. Mikey and JJ can try again!' : 'All the tanks are tired. Let\u2019s try again!';
  $('over').innerHTML = `<div class="big">GAME OVER</div><p>${msg}</p><div class="row"><button class="pill go" id="againBtn">↻ Try again</button><button class="pill" id="homeBtn">🏠 Title</button></div>`;
  $('over').classList.remove('hidden');
  $('againBtn').onclick = () => { Sound.sfx('select'); const st = S.stage, cust = S.playingCustom; newGame(S.players); S.stage = st; S.playingCustom = cust; startStage(); };
  $('homeBtn').onclick = goTitle;
}
function goTitle() {
  Sound.stop(); clearTimeout(S.introTimer);
  S.mode = 'title'; S.paused = false; S.playingCustom = false;
  S.tanks = []; S.bullets = []; S.parts = []; S.popups = []; S.power = null; S.overT = 0; S.lost = false;
  S.grid = buildGrid(STAGES[0].map); protectZones(S.grid); S.base = { hp: 3, max: 3, alive: true }; S.dirty = true;
  hideOverlays(); $('title').classList.remove('hidden');
  renderHud(); layout();
}
function setPaused(p) {
  if (S.mode !== 'play') return;
  S.paused = p; $('pauseVeil').classList.toggle('hidden', !p); $('pauseBtn').textContent = p ? '▶' : '⏸';
  Sound.sfx('pause');
  if (p) Sound.stop(); else Sound.play('march');
}

/* ---------- title menu ---------- */
const menuItems = [...document.querySelectorAll('.mi')];
function setMenu(i) { S.menu = (i + menuItems.length) % menuItems.length; menuItems.forEach((m, k) => m.classList.toggle('sel', k === S.menu)); }
function activate(a) {
  Sound.init(); Sound.sfx('select');
  if (a === '1p') { S.playingCustom = false; newGame(1); }
  else if (a === '2p') { S.playingCustom = false; newGame(2); }
  else if (a === 'build') openBuild();
}
menuItems.forEach((m, i) => { m.onmouseenter = () => setMenu(i); m.onclick = () => { setMenu(i); activate(m.dataset.a); }; });
function titleKey(e) {
  if (['ArrowUp', 'KeyW'].includes(e.code)) { setMenu(S.menu - 1); Sound.sfx('select'); }
  else if (['ArrowDown', 'KeyS'].includes(e.code)) { setMenu(S.menu + 1); Sound.sfx('select'); }
  else if (['Enter', 'Space'].includes(e.code)) activate(menuItems[S.menu].dataset.a);
}
document.querySelectorAll('#speedRow .chip').forEach((b) => {
  b.classList.toggle('sel', b.dataset.d === S.speed);
  b.onclick = () => { S.speed = b.dataset.d; persist(); Sound.init(); Sound.sfx('select'); document.querySelectorAll('#speedRow .chip').forEach((x) => x.classList.toggle('sel', x === b)); };
});

/* ---------- construction ---------- */
function openBuild() {
  S.mode = 'build'; hideOverlays();
  S.grid = S.custom ? buildGrid(S.custom) : new Uint8Array(N * N); protectZones(S.grid);
  S.tanks = []; S.bullets = []; S.base = { hp: 3, max: 3, alive: true }; S.dirty = true;
  $('palette').classList.remove('hidden'); document.body.classList.add('building'); layout();
}
function paintAt(e) {
  const r = canvas.getBoundingClientRect(), tx = Math.floor((e.clientX - r.left) / r.width * 13), ty = Math.floor((e.clientY - r.top) / r.height * 13);
  if (tx < 0 || ty < 0 || tx > 12 || ty > 12) return;
  const px = tx * TILE, py = ty * TILE;
  if (ENEMY_SPAWNS.concat(PLAYER_SPAWNS).some(([x, y]) => x === px && y === py)) return;
  if (ty >= 11 && tx >= 5 && tx <= 7) return;
  for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) S.grid[(ty * 4 + sy) * N + tx * 4 + sx] = S.brush;
  S.dirty = true;
}
let painting = false;
canvas.addEventListener('pointerdown', (e) => { if (S.mode !== 'build') return; painting = true; paintAt(e); Sound.sfx('tick'); });
canvas.addEventListener('pointermove', (e) => { if (painting && S.mode === 'build') paintAt(e); });
addEventListener('pointerup', () => { painting = false; });
document.querySelectorAll('.brushes button').forEach((b) => b.onclick = () => { S.brush = +b.dataset.b; document.querySelectorAll('.brushes button').forEach((x) => x.classList.toggle('sel', x === b)); Sound.sfx('select'); });
$('buildClear').onclick = () => { S.grid = new Uint8Array(N * N); protectZones(S.grid); S.dirty = true; };
$('buildPlay').onclick = () => { S.custom = gridToMap(S.grid); persist(); S.playingCustom = true; newGame(1); };

/* ---------- top bar ---------- */
$('startBtn').onclick = () => {
  Sound.init();
  if (S.mode === 'title') activate(menuItems[S.menu].dataset.a);
  else if (S.mode === 'play' && S.paused) setPaused(false);
  else if (S.mode === 'build') $('buildPlay').click();
};
$('pauseBtn').onclick = () => setPaused(!S.paused);
$('resumeBtn').onclick = () => setPaused(false);
$('stopBtn').onclick = () => { Sound.init(); Sound.sfx('select'); goTitle(); };
$('musicBtn').onclick = () => { Sound.init(); Sound.setMusic(!Sound.st.music); $('musicBtn').classList.toggle('off', !Sound.st.music); };
$('soundBtn').onclick = () => { Sound.init(); Sound.setSound(!Sound.st.sound); $('soundBtn').classList.toggle('off', !Sound.st.sound); };
document.addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'play' && !S.paused) setPaused(true); });
addEventListener('pointerdown', () => Sound.init(), { once: true });

/* ---------- layout ---------- */
function layout() {
  const touch = S.touchUI && ['intro', 'play'].includes(S.mode);
  $('touch').classList.toggle('hidden', !touch);
  const W = innerWidth, H = innerHeight - 60 - 20;
  const portrait = H > W * 1.05;
  document.body.classList.toggle('portrait', portrait);
  let availW = W - (portrait ? 0 : 176 + 14) - 28 - 20 - (touch && !portrait ? 2 * 250 : 0);
  let availH = H - 28 - (portrait ? 150 + (touch ? 200 : 0) : 0) - (S.mode === 'build' ? 90 : 0);
  const s = Math.max(260, Math.floor(Math.min(availW, availH)));
  canvas.style.width = canvas.style.height = s + 'px';
}
addEventListener('resize', layout);

/* ---------- test hooks ---------- */
window.__TANK__ = {
  S, update, step: (n) => { for (let i = 0; i < n; i++) update(DT); }, newGame, startStage, goTitle,
  enemies: () => S.tanks.filter((t) => t.team === 1).length,
  pop: (kind) => { const t = S.tanks.find((x) => x.team === 1 && x.spawnT <= 0 && (!kind || x.kind === kind)); if (t) enemyPop(t, S.p[0]); return !!t; },
  forcePower: (kind) => { spawnPower(); if (S.power && kind) S.power.kind = kind; return S.power; },
  grab: () => { if (S.power && S.p[0]) { S.p[0].x = S.power.x; S.p[0].y = S.power.y; } },
  gridCount: (v) => S.grid.reduce((a, x) => a + (x === v ? 1 : 0), 0)
};

goTitle();
iconsReady.then(() => { S.dirty = true; });
requestAnimationFrame(loop);
})();
