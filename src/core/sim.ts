import { ACC, GRAV, H, JUMP, MAXV, R, T, W, type Buddy, type Crate, type Input, type LevelData, type Sim } from './types';
import { ev } from './events';

const CR = 36; // crate size
let S: Sim;
let NX = 0, NY = 0;

export interface Powers { spd: number; jmp: number; dash: boolean; buddy?: Buddy | null }

export function createSim(lv: LevelData, pw: Powers): Sim {
  const rows = lv.tiles.length, cols = Math.max(...lv.tiles.map((r) => r.length));
  const g: string[][] = lv.tiles.map((r) => r.padEnd(cols, '.').split(''));
  const s = {
    id: lv.id, theme: lv.theme, lv, cols, rows, g, px: 0, py: 0, vx: 0, vy: 0, rot: 0, face: 1, dir: 0, ground: false, coyote: 0, jbuf: 0, canCut: false, airJ: 0,
    hasEgg: false, egg: lv.egg, phase: 'go', home: { x: 3 * T, y: (rows - 2) * T }, ex: 0, ey: 0, erow: 0, gx: 0, gy: 0, wake: 0, stun: 0, caught: 0,
    stars: [], nStars: 0, time: 0, tries: 0, shake: 0, cam: 0, camY: 0, msgT: 0, homeT: 0, beetles: [], plats: [], portals: [], fans: [], rollers: [], flags: [],
    crates: [], plates: [], plate: false, cp: null, tpLock: false, crumb: [], onPlat: -1, onR: -1, turboT: 0, fly: 0, inFan: false, pushing: false,
    dashT: 0, dashCd: 0, dashDir: 1, sprT: 0, powT: 0, powMsg: '', dash: pw.dash || !!lv.dash, spd: pw.spd, jmp: pw.jmp, wheelsHit: [],
    logs: [], spawners: [], moles: [], cat: null, catAnim: 0, flyDir: 1, flyV: 0, buddy: pw.buddy ?? null, hearts: 0, inv: 0, dashLen: 0.28, dashCdMax: 1.8, bossHp: lv.boss ? 3 : 0,
  } as Sim;
  S = s;
  if (s.buddy?.kind === 'heart') s.hearts = s.buddy.shiny ? 2 : 1;
  if (s.buddy?.kind === 'dash') { s.dash = true; s.dashLen = 0.4; s.dashCdMax = s.buddy.shiny ? 0.9 : 1.2; }
  let egg: [number, number] | null = null;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const c = g[y][x], cx = x * T + 20;
    if (c >= '1' && c <= '9') s.portals.push({ id: c, x: cx, y: y * T + T - R });
    else if (c === 'F') s.fans.push({ x: x * T, y: y * T });
    else if (c === '_') s.plates.push({ tx: x, ty: y });
    else if (c === '*') { s.stars.push({ x: cx, y: y * T + 20, got: false }); g[y][x] = '.'; }
    else if (c === 'P') { s.flags.push({ x: cx, y: (y + 1) * T, on: false }); g[y][x] = '.'; }
    else if (c === 'X') { s.crates.push({ x: x * T + 2, y: y * T + 4, vy: 0, push: 0, sx: x * T + 2, sy: y * T + 4 }); g[y][x] = '.'; }
    else if (c === 'L' || c === 'J') { s.spawners.push({ x: cx, y: y * T + 22, dir: c === 'L' ? -1 : 1, t: 1 }); g[y][x] = '.'; }
    else if (c === 'm') { s.moles.push({ x: cx, y: (y + 1) * T, st: 0, t: 0 }); g[y][x] = '.'; }
    else if (c === 'H') { s.home = { x: cx, y: (y + 1) * T }; g[y][x] = '.'; }
    else if (c === 'E') { egg = [x, y]; g[y][x] = '.'; }
    else if (c === '=') { s.plats.push({ x0: x * T, y0: y * T, w: 3 * T, ax: 5 * T, ay: 0, per: 4.5, cx: x * T, cy: y * T }); g[y][x] = '.'; }
    else if (c === '|') { s.plats.push({ x0: x * T, y0: y * T, w: 2 * T, ax: 0, ay: -5 * T, per: 5.5, cx: x * T, cy: y * T }); g[y][x] = '.'; }
  }
  // beetles patrol their own stretch of floor
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (g[y][x] === 'b') {
    g[y][x] = '.';
    const ok = (tx: number) => tx >= 0 && tx < cols && g[y][tx] === '.' && y + 1 < rows && '#RFck'.includes(g[y + 1][tx]);
    let a = x, b = x;
    while (x - a < 3 && ok(a - 1)) a--;
    while (b - x < 3 && ok(b + 1)) b++;
    s.beetles.push({ x: x * T + 20, y: (y + 1) * T, a: a * T + 14, b: b * T + T - 14, dir: 1, alive: true });
  }
  // training wheels: a run of R tiles, opening the first gate column to their right
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (g[y][x] === 'R' && (x === 0 || g[y][x - 1] !== 'R')) {
    let x1 = x; while (x1 + 1 < cols && g[y][x1 + 1] === 'R') x1++;
    let gate = -1;
    for (let gx = x1 + 1; gx <= x1 + 4 && gx < cols && gate < 0; gx++) for (let gy = 0; gy < rows; gy++) if (g[gy][gx] === 'g') { gate = gx; break; }
    s.rollers.push({ x0: x * T, x1: (x1 + 1) * T, y: y * T, gate, charge: 0, k: s.rollers.length });
  }
  if (!egg) egg = [cols - 4, rows - 3];
  s.ex = egg[0] * T + 20; s.erow = egg[1] + 1; s.ey = s.erow * T - 14;
  s.gx = Math.min(cols * T - 50, s.ex + 2.2 * T); s.gy = s.erow * T - 26;
  s.px = cell(Math.floor(s.home.x / T) - 1, Math.floor(s.home.y / T) - 1) === '.' ? s.home.x - T : s.home.x; s.py = s.home.y - R;
  if (lv.mode === 'escape') { s.hasEgg = true; s.phase = 'run'; s.px = s.ex - 30; s.py = s.erow * T - R; s.wake = 1.8; s.msgT = 4; s.cp = { x: s.px, y: s.erow * T }; }
  s.cam = Math.max(0, Math.min(cols * T - W, s.px - W / 2)); s.camY = camYFor(s.py);
  return s;
}

function camYFor(py: number): number { return Math.max(0, Math.min(S.rows * T - H, py - H * 0.58)); }
function cell(tx: number, ty: number): string { if (tx < 0 || tx >= S.cols) return '#'; if (ty < 0 || ty >= S.rows) return '.'; return S.g[ty][tx]; }
export function gateOpen(s: Sim, tx: number): boolean { if (s.hasEgg) return true; for (const r of s.rollers) if (r.gate === tx && r.charge >= 1) return true; return false; }
/** Is this tile solid right now? (bridges, doors and gates change during play) */
export function solidAt(s: Sim, tx: number, ty: number): boolean {
  if (tx < 0 || tx >= s.cols) return true; if (ty < 0 || ty >= s.rows) return false;
  const c = s.g[ty][tx];
  return c === '#' || c === 'R' || c === 'F' || c === 'c' || c === 'd' || c === 'k' || (c === 'o' && !s.hasEgg) || (c === '+' && s.hasEgg) || (c === 'D' && !s.plate && !s.hasEgg) || (c === 'g' && !gateOpen(s, tx));
}
function smash(): boolean { return S.dashT > 0 || S.turboT > 0 || (S.hasEgg && S.egg === 'stone'); }
function rectSolid(x: number, y: number): boolean {
  for (let ty = Math.floor(y / T); ty <= Math.floor((y + CR - 0.01) / T); ty++) for (let tx = Math.floor(x / T); tx <= Math.floor((x + CR - 0.01) / T); tx++) if (solidAt(S, tx, ty)) return true;
  return false;
}

function respawn(): void {
  S.tries++; S.vx = 0; S.vy = 0; S.shake = 0.25; S.turboT = 0; S.fly = 0; S.dashT = 0; S.onPlat = -1; S.onR = -1; S.tpLock = true;
  ev('sfx', 0, 0, 'die');
  for (const r of S.rollers) r.charge = 0;
  for (const c of S.crates) { c.x = c.sx; c.y = c.sy; c.vy = 0; }
  if (S.cp) { S.px = S.cp.x; S.py = S.cp.y - R; } else { S.px = S.home.x - T; S.py = S.home.y - R; }
  S.logs.length = 0; S.cat = null; S.flyV = 0; for (const m of S.moles) { m.st = 0; m.t = 0.8; }
  if (S.hasEgg) { S.caught++; S.gx = Math.min(S.cols * T - 60, S.px + 9 * T); S.gy = S.py - 150; S.wake = 1.1; S.stun = 0; }
}

/** Something hit Rolo. A heart buddy soaks it up; otherwise back to the last flag. Returns true when Rolo was sent back. */
function hurt(): boolean {
  if (S.inv > 0) return false;
  if (S.hearts > 0) { S.hearts--; S.inv = 1.6; S.vy = -460; S.canCut = false; S.shake = 0.2; ev('puff', S.px, S.py, '#ff6b8a', 14); ev('sfx', 0, 0, 'bonk'); return false; }
  respawn(); return true;
}

function hitRect(x0: number, y0: number, x1: number, y1: number): number { // 0 none, 1 touching (1px tolerance), 2 pushed out
  const cx = Math.max(x0, Math.min(S.px, x1)), cy = Math.max(y0, Math.min(S.py, y1)), dx = S.px - cx, dy = S.py - cy, d2 = dx * dx + dy * dy;
  if (d2 >= (R + 1) * (R + 1)) return 0;
  let d = Math.sqrt(d2);
  if (d > 0.0001) { NX = dx / d; NY = dy / d; } else { NX = 0; NY = -1; d = 0; }
  if (d >= R) return 1;
  S.px += NX * (R - d); S.py += NY * (R - d);
  const vn = S.vx * NX + S.vy * NY; if (vn < 0) { S.vx -= vn * NX; S.vy -= vn * NY; }
  return 2;
}
function near2(x0: number, y0: number, x1: number, y1: number): number { const cx = Math.max(x0, Math.min(S.px, x1)), cy = Math.max(y0, Math.min(S.py, y1)); return (S.px - cx) ** 2 + (S.py - cy) ** 2; }

function collide(): 'ok' | 'dead' {
  S.ground = false; S.onPlat = -1; S.onR = -1; S.pushing = false;
  const tx0 = Math.floor((S.px - R - 1) / T), tx1 = Math.floor((S.px + R + 1) / T), ty0 = Math.floor((S.py - R - 1) / T), ty1 = Math.floor((S.py + R + 1) / T);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const c = cell(tx, ty);
    if (c === '^') { if (S.inv <= 0 && near2(tx * T + 7, ty * T + 18, tx * T + T - 7, ty * T + T) < (R - 3) * (R - 3)) return 'dead'; continue; }
    if (c === 'M') {
      if (S.vy >= -50 && near2(tx * T + 5, ty * T + 20, tx * T + 35, ty * T + T) < R * R) { S.vy = -900; S.canCut = false; S.sprT = 0.25; S.airJ = S.hasEgg && S.egg === 'feather' ? 1 : 0; ev('puff', tx * T + 20, ty * T + 20, '#ffffff', 6); ev('sfx', 0, 0, 'bounce'); }
      continue;
    }
    if (c === 'g') { if (!gateOpen(S, tx)) hitRect(tx * T + 12, ty * T, tx * T + 28, ty * T + T); continue; }
    if (!solidAt(S, tx, ty)) continue;
    if (c === 'k' && smash() && near2(tx * T, ty * T, tx * T + T, ty * T + T) < (R + 2) * (R + 2)) { S.g[ty][tx] = '.'; S.shake = 0.15; ev('puff', tx * T + 20, ty * T + 20, '#b9bec4', 10); ev('sfx', 0, 0, 'smash'); continue; }
    if (hitRect(tx * T, ty * T, tx * T + T, ty * T + T)) {
      if (NY < -0.6 && S.vy >= 0) { S.ground = true; if (c === 'R') S.rollers.forEach((r, i) => { if (S.px >= r.x0 - 6 && S.px <= r.x1 + 6) S.onR = i; }); }
      if (c === 'c') { S.g[ty][tx] = 'd'; S.crumb.push({ x: tx, y: ty, t: 0.45, st: 0 }); }
    }
  }
  S.plats.forEach((p, i) => { if (hitRect(p.cx, p.cy, p.cx + p.w, p.cy + 14) && NY < -0.6 && S.vy >= 0) { S.ground = true; S.onPlat = i; } });
  for (const c of S.crates) {
    if (!hitRect(c.x, c.y, c.x + CR, c.y + CR)) continue;
    if (NY < -0.6 && S.vy >= 0) S.ground = true;
    else if (Math.abs(NX) > 0.7 && S.dir !== 0 && Math.sign(-NX) === S.dir) { c.push = S.dir; S.pushing = true; }
  }
  return 'ok';
}

function stepCrates(dt: number): void {
  for (const c of S.crates) {
    c.vy = Math.min(900, c.vy + GRAV * dt);
    const ny = c.y + c.vy * dt;
    if (rectSolid(c.x, ny)) { if (c.vy > 0) c.y = Math.floor((ny + CR) / T) * T - CR; c.vy = 0; } else c.y = ny;
    if (c.push) { const nx = c.x + c.push * 95 * dt; if (!rectSolid(nx, c.y) && !crateBlocked(c, nx)) c.x = nx; c.push = 0; }
    if (c.y > S.rows * T + 80) { c.x = c.sx; c.y = c.sy; c.vy = 0; }
  }
  let on = false;
  for (const p of S.plates) {
    const x0 = p.tx * T, yb = (p.ty + 1) * T;
    if (S.px > x0 - 6 && S.px < x0 + T + 6 && S.py + R > yb - 8 && S.py < yb) on = true;
    for (const c of S.crates) if (c.x + CR > x0 + 4 && c.x < x0 + T - 4 && c.y + CR > yb - 8 && c.y < yb) on = true;
  }
  if (on !== S.plate) { S.plate = on; ev('sfx', 0, 0, on ? 'plate' : 'plateOff'); }
}
function stepLogs(dt: number): void {
  const on = S.lv.boss ? S.hasEgg && S.bossHp === 1 : true;
  for (const sp of S.spawners) {
    sp.t -= dt;
    if (on && sp.t <= 0 && Math.abs(S.px - sp.x) < 17 * T && Math.abs(S.py - sp.y) < 7 * T && S.logs.length < 6) { sp.t = 3.2; S.logs.push({ x: sp.x, y: sp.y, vx: sp.dir * 150, vy: 0, t: 7 }); ev('sfx', 0, 0, 'crumble'); }
  }
  for (let i = S.logs.length - 1; i >= 0; i--) {
    const l = S.logs[i]; l.t -= dt; l.vy = Math.min(900, l.vy + GRAV * dt); l.x += l.vx * dt;
    const ny = l.y + l.vy * dt, tx = Math.floor(l.x / T);
    if (l.vy > 0 && solidAt(S, tx, Math.floor((ny + 15) / T))) { l.y = Math.floor((ny + 15) / T) * T - 15; l.vy = 0; } else l.y = ny;
    const wall = solidAt(S, Math.floor((l.x + Math.sign(l.vx) * 16) / T), Math.floor(l.y / T));
    if (wall || l.t <= 0 || l.y > S.rows * T + 60) { if (wall) ev('puff', l.x, l.y, '#b07a45', 8); S.logs.splice(i, 1); }
  }
}
function crateBlocked(c: Crate, nx: number): boolean { for (const o of S.crates) if (o !== c && nx < o.x + CR && nx + CR > o.x && c.y < o.y + CR && c.y + CR > o.y) return true; return false; }

export function step(s: Sim, input: Input, dt: number): void {
  S = s;
  if (S.phase === 'win') return;
  S.time += dt;
  for (const k of ['shake', 'msgT', 'dashCd', 'stun', 'sprT', 'powT', 'turboT', 'inv', 'catAnim'] as const) if (S[k] > 0) S[k] -= dt;
  if (S.phase === 'home') { S.homeT -= dt; S.rot += dt * 2; if (Math.random() < 0.5) ev('confetti', S.home.x + (Math.random() - 0.5) * 120, S.home.y - 90); if (S.homeT <= 0) S.phase = 'win'; return; }
  for (let i = S.crumb.length - 1; i >= 0; i--) {
    const c = S.crumb[i]; c.t -= dt;
    if (c.t <= 0) { if (c.st === 0) { S.g[c.y][c.x] = 'e'; c.st = 1; c.t = 3; ev('puff', c.x * T + 20, c.y * T + 10, '#d8b77a', 5); ev('sfx', 0, 0, 'crumble'); } else { S.g[c.y][c.x] = 'c'; S.crumb.splice(i, 1); } }
  }
  S.plats.forEach((p, i) => {
    const ph = 0.5 - 0.5 * Math.cos((S.time * 2 * Math.PI) / p.per), nx = p.x0 + p.ax * ph, ny = p.y0 + p.ay * ph;
    if (S.onPlat === i) { S.px += nx - p.cx; S.py += ny - p.cy; }
    p.cx = nx; p.cy = ny;
  });
  for (const b of S.beetles) { if (!b.alive) continue; b.x += b.dir * 55 * dt; if (b.x > b.b) { b.x = b.b; b.dir = -1; } if (b.x < b.a) { b.x = b.a; b.dir = 1; } }
  stepCrates(dt);
  stepLogs(dt);

  const eggF = S.hasEgg ? (S.egg === 'spark' ? 1.12 : 0.9) : 1;
  let mv = MAXV * (1 + 0.07 * S.spd) * eggF, dir = (input.r ? 1 : 0) - (input.l ? 1 : 0);
  if (S.turboT > 0) mv = 600;
  if (S.fly > 0) { // shot from a training wheel: no steering until landing
    if (S.fly < 1) { S.fly -= dt; if (S.fly <= 0) S.fly = 1; }
    if (S.fly === 1 && S.ground) { S.fly = 0; S.flyV = 0; S.flyDir = 1; } else { dir = S.flyDir; if (S.flyV) mv = S.flyV; input.jPressed = false; input.dPressed = false; }
  }
  S.dir = dir;
  // training wheel: run in place to charge it, then it launches you
  let hold = false;
  if (S.onR >= 0 && !S.hasEgg) {
    const rl = S.rollers[S.onR];
    if (rl.charge < 1 && dir > 0) {
      hold = true; rl.charge += dt / 1.6; S.rot += dt * 26; S.face = 1; if (Math.random() < 0.3) ev('puff', S.px - 14, S.py + R - 2, '#ffe9a8', 1); if (Math.random() < 0.12) ev('sfx', 0, 0, 'run', rl.charge);
      if (rl.charge >= 1) {
        rl.charge = 1; hold = false; S.turboT = 1.5; S.fly = 0.15; S.flyDir = 1; S.flyV = 0; S.vx = 600; S.vy = -900; S.ground = false; S.coyote = 0; S.canCut = false; mv = 600; S.shake = 0.2;
        ev('puff', S.px, S.py, '#ffe066', 16); ev('sfx', 0, 0, 'launch'); S.wheelsHit.push(S.id + ':' + rl.k);
      }
    }
  }
  // catapult seesaw: stand on the low end, the rock drops on the other end and throws you
  if (S.cat) {
    const c = S.cat, onIt = S.ground && Math.abs(S.px - c.x) < 26 && Math.abs(S.py + R - c.y) < 14;
    if (!onIt) S.cat = null;
    else if ((c.t -= dt) <= 0) {
      S.cat = null; S.catAnim = 0.5; S.fly = 0.15; S.flyDir = c.dir; S.flyV = 280; S.vx = c.dir * 280; S.vy = -1040; S.ground = false; S.coyote = 0; S.canCut = false; S.shake = 0.2; dir = c.dir; mv = 280; S.dir = dir;
      ev('puff', c.x + c.dir * 60, c.y - 6, '#c9b08a', 14); ev('sfx', 0, 0, 'launch');
    } else { hold = true; S.px += (c.x - S.px) * Math.min(1, 10 * dt); } // the seesaw holds you until the rock lands; jump to get off
  } else if (S.ground && S.fly === 0) {
    const tx = Math.floor(S.px / T), ty = Math.floor((S.py + R - 4) / T), c = cell(tx, ty);
    if ((c === 'S' && dir >= 0) || (c === 'Z' && dir <= 0)) { if (Math.abs(S.px - (tx * T + 20)) < 15) { S.cat = { x: tx * T + 20, y: (ty + 1) * T, dir: c === 'S' ? 1 : -1, t: 0.45 }; ev('sfx', 0, 0, 'plate'); } }
  }
  if (hold) S.vx = 0;
  else if (dir) { S.vx += dir * ACC * dt; S.face = dir; } else S.vx -= S.vx * Math.min(1, 6 * dt);
  if (S.pushing) mv = Math.min(mv, 95);
  if (S.vx > mv) S.vx = mv; if (S.vx < -mv) S.vx = -mv;
  if (input.dPressed) { input.dPressed = false; if (S.dash && S.dashCd <= 0) { S.dashT = S.dashLen; S.dashCd = S.dashCdMax; S.dashDir = S.face; ev('puff', S.px, S.py, '#ffe066', 8); ev('sfx', 0, 0, 'dash'); } }
  S.inFan = false;
  for (const f of S.fans) if (S.px > f.x - 2 && S.px < f.x + T + 2 && S.py < f.y && S.py > f.y - 6.4 * T) S.inFan = true;
  if (S.dashT > 0) { S.dashT -= dt; S.vx = S.dashDir * 560; S.vy = 0; }
  else { S.vy += GRAV * dt; if (S.inFan) { S.vy -= 3600 * dt; if (S.vy < -360) S.vy = -360; S.canCut = false; } if (S.vy > 1100) S.vy = 1100; }
  S.coyote = S.ground ? 0.1 : S.coyote - dt;
  if (S.ground) S.airJ = S.hasEgg && S.egg === 'feather' ? 1 : 0;
  if (input.jPressed) { S.jbuf = 0.12; input.jPressed = false; } else S.jbuf -= dt;
  const jv = JUMP * (1 + 0.05 * S.jmp) * (S.hasEgg ? (S.egg === 'stone' ? 0.86 : 0.94) : 1);
  if (S.jbuf > 0) {
    if (S.coyote > 0) { S.vy = -jv; S.jbuf = 0; S.coyote = 0; S.canCut = true; S.dashT = 0; ev('puff', S.px, S.py + R, '#ffffff', 3); ev('sfx', 0, 0, 'jump'); }
    else if (S.airJ > 0) { S.vy = -jv; S.airJ--; S.jbuf = 0; S.canCut = true; ev('puff', S.px, S.py + R, '#bfe6ff', 10); ev('sfx', 0, 0, 'jump2'); }
  }
  if (S.canCut && !input.j && S.vy < -220) S.vy = -220;
  if (S.vy >= 0) S.canCut = false;
  let res: 'ok' | 'dead' = 'ok';
  for (let i = 0; i < 4 && res === 'ok'; i++) { S.px += (S.vx * dt) / 4; S.py += (S.vy * dt) / 4; res = collide(); }
  if (!hold) S.rot += (S.vx * dt) / R;
  if (S.py > S.rows * T + 120) { respawn(); return; }
  if (res === 'dead' && hurt()) return;

  for (const b of S.beetles) {
    if (!b.alive) continue; const dx = S.px - b.x, dy = S.py - (b.y - 12);
    if (dx * dx + dy * dy < (R + 12) * (R + 12)) {
      if (S.vy > 100 && S.py < b.y - 20) { b.alive = false; S.vy = -460; S.canCut = false; S.airJ = S.hasEgg && S.egg === 'feather' ? 1 : 0; ev('puff', b.x, b.y - 10, '#7b4fa3', 10); ev('sfx', 0, 0, 'stomp'); }
      else if (smash()) { b.alive = false; ev('puff', b.x, b.y - 10, '#7b4fa3', 10); ev('sfx', 0, 0, 'stomp'); }
      else if (hurt()) return;
    }
  }
  // rolling logs: jump over them, or land on top to break them
  for (let i = S.logs.length - 1; i >= 0; i--) {
    const l = S.logs[i], dx = S.px - l.x, dy = S.py - l.y;
    if (dx * dx + dy * dy >= (R + 14) * (R + 14)) continue;
    const stomp = S.vy > 100 && S.py < l.y - 12;
    if (stomp || smash()) { S.logs.splice(i, 1); if (stomp) { S.vy = -460; S.canCut = false; S.airJ = S.hasEgg && S.egg === 'feather' ? 1 : 0; } ev('puff', l.x, l.y, '#b07a45', 12); ev('sfx', 0, 0, 'smash'); }
    else if (hurt()) return;
  }
  // moles sleep until the egg is gone (in the boss fight: until Mama Owl is angry), then pop up in front of you
  const molesOn = S.lv.boss ? S.hasEgg && S.bossHp <= 2 && S.bossHp > 0 : S.hasEgg;
  for (const m of S.moles) {
    m.t -= dt;
    if (m.st === 0) { if (molesOn && m.t <= 0 && Math.abs(S.px - m.x) < 5.5 * T && Math.abs(S.py - m.y) < 4 * T) { m.st = 1; m.t = 0.65; ev('sfx', 0, 0, 'crumble'); } }
    else if (m.st === 1) { if (Math.random() < 0.3) ev('puff', m.x + (Math.random() - 0.5) * 20, m.y - 2, '#8b5a36', 1); if (m.t <= 0) { m.st = 2; m.t = 1.1; ev('sfx', 0, 0, 'burrow'); } }
    else {
      if (m.t <= 0) { m.st = 0; m.t = 1.5; continue; }
      const dx = S.px - m.x, dy = S.py - (m.y - 14);
      if (dx * dx + dy * dy < (R + 13) * (R + 13)) {
        if ((S.vy > 100 && S.py < m.y - 24) || smash()) { m.st = 0; m.t = 2.5; if (S.vy > 100) { S.vy = -460; S.canCut = false; } ev('puff', m.x, m.y - 10, '#8b5a36', 10); ev('sfx', 0, 0, 'stomp'); }
        else if (hurt()) return;
      }
    }
  }
  const magnet = S.buddy?.kind === 'magnet' ? (S.buddy.shiny ? 170 : 115) : 0;
  if (magnet) for (const st of S.stars) { if (st.got) continue; const dx = S.px - st.x, dy = S.py - st.y, d = Math.hypot(dx, dy); if (d < magnet && d > 1) { st.x += (dx / d) * 420 * dt; st.y += (dy / d) * 420 * dt; } }
  for (const st of S.stars) if (!st.got && Math.abs(st.x - S.px) < 30 && Math.abs(st.y - S.py) < 30) { st.got = true; S.nStars++; ev('puff', st.x, st.y, '#ffd23f', 10); ev('sfx', 0, 0, 'star', S.nStars); }
  for (const fl of S.flags) if (!fl.on && Math.abs(fl.x - S.px) < 24 && Math.abs(fl.y - R - S.py) < 60) { fl.on = true; S.cp = { x: fl.x, y: fl.y }; ev('puff', fl.x, fl.y - 50, '#7dff8a', 10); ev('sfx', 0, 0, 'flag'); }

  let nearP = false;
  for (let i = 0; i < S.portals.length; i++) {
    const p = S.portals[i];
    if ((S.px - p.x) ** 2 + (S.py - p.y) ** 2 < 22 * 22) {
      nearP = true;
      if (!S.tpLock) { const q = S.portals.find((o, k) => k !== i && o.id === p.id); if (q) { ev('puff', S.px, S.py + 8, '#a9713f', 12); S.px = q.x; S.py = q.y; S.vy = -260; S.tpLock = true; ev('puff', S.px, S.py + 8, '#a9713f', 12); ev('sfx', 0, 0, 'burrow'); } }
      break;
    }
  }
  if (!nearP) S.tpLock = false;

  if (!S.hasEgg && Math.abs(S.px - S.ex) < 26 && Math.abs(S.py - S.ey) < 34) {
    S.hasEgg = true; S.phase = 'run'; S.wake = S.lv.guard.wake; S.shake = 0.3; S.msgT = 4; S.cp = { x: S.ex - 30, y: S.erow * T };
    for (const fl of S.flags) fl.on = false;
    ev('sfx', 0, 0, 'egg');
  }
  if (S.hasEgg) {
    const G = S.lv.guard, mercy = Math.max(0.7, 1 - 0.06 * S.caught);
    if (S.wake > 0) { S.wake -= dt; if (S.wake <= 0) ev('sfx', 0, 0, 'owl'); }
    else if (S.stun <= 0) {
      const dx = S.px - S.gx, dy = S.py - 10 - S.gy, d = Math.sqrt(dx * dx + dy * dy) || 1, sp = Math.min(G.max, G.base + d * G.gain) * mercy * (S.lv.boss ? 1 + 0.07 * (3 - S.bossHp) : 1);
      S.gx += (dx / d) * sp * dt; S.gy += (dy / d) * sp * dt;
      const big = S.lv.boss ? 44 : 30;
      if (d < big) {
        const bonk = () => {
          ev('puff', S.gx, S.gy - 20, '#ffffff', 16); ev('sfx', 0, 0, 'bonk'); S.shake = 0.25;
          if (S.lv.boss) { S.bossHp--; S.stun = S.bossHp > 0 ? 2.4 : 1e6; S.powT = 2.5; S.powMsg = S.bossHp > 0 ? `BONK!  ${S.bossHp} more!` : 'Mama Owl is dizzy.  Go home!'; } else S.stun = 1.6;
        };
        if (S.vy > 120 && S.py + 6 < S.gy) { S.vy = -560; S.canCut = false; bonk(); } // landed on her head
        else if (S.dashT > 0) { S.gx -= (dx / d) * 50; S.gy -= 30; bonk(); }
        else if (S.inv <= 0) { if (S.hearts > 0) { S.stun = 1.5; S.gx -= (dx / d) * 60; S.gy -= 40; } if (hurt()) return; }
      }
    }
    const atHome = S.ground && Math.abs(S.px - S.home.x) < 36 && Math.abs(S.py - (S.home.y - R)) < 44;
    if (atHome && S.lv.boss && S.bossHp > 0) { if (S.powT <= 0) { S.powT = 2.5; S.powMsg = 'Bonk Mama Owl first!  Jump on her or dash ⚡'; } }
    else if (atHome) { S.phase = 'home'; S.homeT = 1.7; S.vx = 0; S.px = S.home.x; ev('sfx', 0, 0, 'win'); }
  }
  const k = Math.min(1, 6 * dt);
  S.cam += (Math.max(0, Math.min(S.cols * T - W, S.px - W / 2 + (S.hasEgg ? -90 : 90) * (S.lv.mode === 'escape' ? 1 : 1))) - S.cam) * k;
  S.camY += (camYFor(S.py) - S.camY) * k;
}
