import { H, R, T, W, type EggType, type Sim } from './core/types';
import { gateOpen, solidAt } from './core/sim';
import { on } from './core/events';
import { SV } from './core/save';

export const EGGS: Record<EggType, { name: string; col: string; spot: string; tip: string }> = {
  plain: { name: 'Cream Egg', col: '#fff6d8', spot: '#ff8fa8', tip: 'Run home before the owl catches you!' },
  feather: { name: 'Feather Egg', col: '#dff5ff', spot: '#3d9dff', tip: 'Feather Egg: jump AGAIN in the air!' },
  spark: { name: 'Spark Egg', col: '#fff3a0', spot: '#ff8a1f', tip: 'Spark Egg: you roll FASTER!' },
  stone: { name: 'Stone Egg', col: '#d6d0c4', spot: '#7d776d', tip: 'Stone Egg: smash cracked rocks and bugs!' },
};
export const PETS = [
  { name: 'Pip', col: '#ffd84a' }, { name: 'Flit', col: '#7fd0ff' }, { name: 'Zap', col: '#ffb300' }, { name: 'Rocky', col: '#b5aea3' },
  { name: 'Blaze', col: '#ff6b4a' }, { name: 'Mossy', col: '#7ed957' }, { name: 'Nox', col: '#a78bfa' }, { name: 'Coco', col: '#c98a4f' },
];
export const TH = [
  { sky: ['#3fa9ff', '#c9f1ff'], far: '#8fd6a6', mid: '#5fbf74', near: '#3da35a', dirt: '#8b5a36', dark: '#6e4426', grass: '#4ccb4f', lite: '#8df07a', deco: 'flower', sun: '#fff2a8' },
  { sky: ['#1f8f86', '#c8f6d6'], far: '#58b08f', mid: '#2f8a63', near: '#1f6b4a', dirt: '#6b4a2f', dark: '#523621', grass: '#2fae5d', lite: '#72e08c', deco: 'shroom', sun: '#eaffc9' },
  { sky: ['#1d1442', '#5b3fa6'], far: '#3a2a78', mid: '#2d2060', near: '#22184a', dirt: '#54487e', dark: '#3e3462', grass: '#35d6c3', lite: '#9af7ea', deco: 'crystal', sun: '#b7a6ff' },
  { sky: ['#ff7e5f', '#ffd9a0'], far: '#c98aa8', mid: '#9a6a9a', near: '#73507f', dirt: '#7d5a78', dark: '#5f4360', grass: '#f4f7ff', lite: '#ffffff', deco: 'tuft', sun: '#fff0c2' },
  { sky: ['#2a0a16', '#b93a2a'], far: '#5a1620', mid: '#421019', near: '#2e0b12', dirt: '#3d2b2b', dark: '#2a1c1c', grass: '#ff8a2b', lite: '#ffd23f', deco: 'ember', sun: '#ffb36b' },
];

export interface Region { x: number; y: number; w: number; h: number; fn: () => void }
export const REG: Region[] = [];
interface Fx { x: number; y: number; vx: number; vy: number; t: number; col: string; s: number }
const FX: Fx[] = [];
const CONFETTI = ['#ffd23f', '#ff6b6b', '#5bd6ff', '#7dff8a'];

export let ctx: CanvasRenderingContext2D;
export function initRender(c: HTMLCanvasElement): void { ctx = c.getContext('2d')!; }
export function clearFx(): void { FX.length = 0; }
function puff(x: number, y: number, col: string, n: number, up = 260): void { for (let i = 0; i < n && FX.length < 240; i++) FX.push({ x, y, vx: (Math.random() - 0.5) * 280, vy: -Math.random() * up, t: 0.4 + Math.random() * 0.3, col, s: 3 + Math.random() * 4 }); }
on((name, x, y, a, b) => {
  if (name === 'puff') puff(x, y, String(a), b ?? 6);
  else if (name === 'confetti') puff(x, y, CONFETTI[Math.floor(Math.random() * 4)], 1, 60);
});

export function hs(x: number, y: number): number { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return (n ^ (n >>> 16)) >>> 0; }
export function rr(x: number, y: number, w: number, h: number, r: number): void { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
export function text(s: string, x: number, y: number, size: number, col = '#fff', align: CanvasTextAlign = 'center', stroke?: string): void {
  ctx.font = `800 ${size}px system-ui, sans-serif`; ctx.textAlign = align;
  if (stroke) { ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
export function circ(x: number, y: number, r: number, col: string): void { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
export function drawEgg(x: number, y: number, s: number, type: EggType): void {
  const E = EGGS[type]; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 1, 12.5, 15.5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = E.col; ctx.beginPath(); ctx.ellipse(0, 0, 11, 14, 0, 0, 7); ctx.fill();
  ctx.fillStyle = E.spot; ctx.beginPath(); ctx.arc(-3, -3, 2.6, 0, 7); ctx.arc(4, 3, 2.2, 0, 7); ctx.arc(-1, 8, 1.9, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-4, -7, 2.4, 4, 0.5, 0, 7); ctx.fill(); ctx.restore();
}
export function drawStar(x: number, y: number, r: number, col: string, glow = false): void {
  if (glow) { const g = ctx.createRadialGradient(x, y, 2, x, y, r * 2.4); g.addColorStop(0, 'rgba(255,230,120,.7)'); g.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, 7); ctx.fill(); }
  ctx.beginPath(); for (let a = 0; a < 10; a++) { const rad = a % 2 ? r * 0.48 : r, an = (a * Math.PI) / 5 - Math.PI / 2; ctx.lineTo(x + Math.cos(an) * rad, y + Math.sin(an) * rad); } ctx.closePath();
  if (glow) { ctx.lineWidth = 3; ctx.strokeStyle = '#b36b00'; ctx.lineJoin = 'round'; ctx.stroke(); } ctx.fillStyle = col; ctx.fill();
}
export function drawPet(x: number, y: number, s: number, i: number, shiny: boolean, t = 0): void {
  const P = PETS[i % PETS.length], k = i % 5; ctx.save(); ctx.translate(x, y + Math.sin(t * 5 + i) * 2 * s); ctx.scale(s, s);
  if (shiny) circ(0, 0, 22, 'rgba(255,225,90,.5)');
  ctx.fillStyle = P.col;
  if (k === 1) { ctx.beginPath(); ctx.ellipse(-15, -2, 9, 5, -0.5, 0, 7); ctx.ellipse(15, -2, 9, 5, 0.5, 0, 7); ctx.fill(); }
  if (k === 3) { rr(-15, -14, 30, 29, 7); ctx.fill(); } else { ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill(); }
  if (k === 0) { ctx.beginPath(); ctx.moveTo(-3, -14); ctx.lineTo(0, -22); ctx.lineTo(3, -14); ctx.fill(); }
  if (k === 2) { ctx.fillStyle = '#fff36b'; ctx.beginPath(); ctx.moveTo(-2, -14); ctx.lineTo(5, -26); ctx.lineTo(1, -19); ctx.lineTo(8, -21); ctx.lineTo(0, -12); ctx.fill(); }
  if (k === 4) { ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(-7, -12); ctx.lineTo(-3, -25); ctx.lineTo(0, -15); ctx.lineTo(4, -27); ctx.lineTo(7, -12); ctx.fill(); }
  if (i >= 5) { ctx.fillStyle = P.col; ctx.beginPath(); ctx.ellipse(-10, -13, 4, 7, -0.4, 0, 7); ctx.ellipse(10, -13, 4, 7, 0.4, 0, 7); ctx.fill(); }
  circ(-5, -3, 4.8, '#fff'); circ(5, -3, 4.8, '#fff'); circ(-4, -2.5, 2.2, '#222'); circ(6, -2.5, 2.2, '#222');
  ctx.fillStyle = '#ff8c42'; ctx.beginPath(); ctx.moveTo(-3, 3); ctx.lineTo(3, 3); ctx.lineTo(0, 8); ctx.fill();
  if (shiny) drawStar(13, -14, 6, '#fff7b0');
  ctx.restore();
}
export function drawRolo(x: number, y: number, rot: number, face: number, glow: string | null = null, sq = 0): void {
  ctx.save(); ctx.translate(x, y);
  if (glow) { const g = ctx.createRadialGradient(0, 0, 6, 0, 0, R + 14); g.addColorStop(0, glow); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R + 14, 0, 7); ctx.fill(); }
  ctx.scale(1 + sq, 1 - sq);
  circ(0, 1, R + 1.5, '#5a3a1e');
  ctx.save(); ctx.rotate(rot); circ(0, 0, R, '#e0a568');
  ctx.strokeStyle = '#a9703c'; ctx.lineWidth = 3; for (let b = -1; b <= 1; b++) { const hh = Math.sqrt(R * R - b * b * 49) - 2; ctx.beginPath(); ctx.moveTo(b * 7, -hh); ctx.lineTo(b * 7, hh); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.arc(0, 0, R - 3, -2.4, -1.2); ctx.arc(0, 0, R - 7, -1.2, -2.4, true); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#c98a4f'; ctx.beginPath(); ctx.ellipse(-face * 4 - 5, -R + 1, 4, 6, -0.4, 0, 7); ctx.ellipse(-face * 4 + 6, -R + 1, 4, 6, 0.4, 0, 7); ctx.fill();
  circ(face * 5 - 4, -4, 5.4, '#fff'); circ(face * 5 + 5, -4, 5.4, '#fff'); circ(face * 7 - 4, -4, 2.5, '#1d1d1d'); circ(face * 7 + 5, -4, 2.5, '#1d1d1d');
  circ(face * 8 - 4.6, -5, 0.9, '#fff'); circ(face * 8 + 4.4, -5, 0.9, '#fff');
  ctx.fillStyle = '#7a4a26'; ctx.beginPath(); ctx.ellipse(face * 11, 3, 3, 2.2, 0, 0, 7); ctx.fill();
  ctx.restore();
}
export function button(x: number, y: number, w: number, h: number, label: string, col: string, fn: (() => void) | null, size = 22): void {
  ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(x, y + 5, w, h, 14); ctx.fill(); ctx.fillStyle = col; rr(x, y, w, h, 14); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.22)'; rr(x + 4, y + 3, w - 8, h * 0.4, 10); ctx.fill();
  text(label, x + w / 2, y + h / 2 + size * 0.36, size, '#fff'); if (fn) REG.push({ x, y, w, h, fn });
}

function ridge(col: string, base: number, amp: number, k: number, wx0: number, seed: number, sharp: boolean): void {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 12) { const u = (x + wx0) * k + seed, v = sharp ? Math.abs((((u / Math.PI) % 2) + 2) % 2 - 1) : 0.5 + 0.5 * Math.sin(u); ctx.lineTo(x, base - amp * v - amp * 0.3 * Math.sin(u * 2.7 + seed)); }
  ctx.lineTo(W, H); ctx.fill();
}
export function backdrop(th: number, cam: number, t: number, danger: boolean, lift = 0): void {
  const P = TH[th], g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, P.sky[0]); g.addColorStop(1, P.sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const sx = 760 - cam * 0.02, sy = 110 + lift * 0.3, sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 150); sg.addColorStop(0, P.sun); sg.addColorStop(0.25, P.sun); sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 0.9; ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 150, 0, 7); ctx.fill(); ctx.globalAlpha = 1; circ(sx, sy, th === 2 ? 26 : 38, P.sun);
  if (th === 2) { for (let i = 0; i < 40; i++) circ(((hs(i, 7) % 1100) - cam * 0.05 + 2200) % 1100 - 60, hs(i, 9) % 300, 1 + (hs(i, 3) % 2), `rgba(255,255,255,${0.4 + 0.5 * Math.sin(t * 2 + i)})`); }
  else if (th !== 4) { ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 6; i++) { const x = (((i * 330 - cam * 0.12 + t * 6) % 2000) + 2000) % 2000 - 200, y = 40 + ((i * 61) % 150) + lift * 0.4; rr(x, y, 120, 30, 15); ctx.fill(); rr(x + 26, y - 18, 64, 34, 17); ctx.fill(); rr(x + 70, y - 8, 50, 26, 13); ctx.fill(); } }
  ctx.save(); ctx.translate(0, lift * 0.55);
  ridge(P.far, 400, 150, 0.0042, cam * 0.15, 1.3, th >= 3);
  ctx.translate(0, lift * 0.2);
  ridge(P.mid, 450, 110, 0.0071, cam * 0.3, 4.1, th === 3);
  ctx.translate(0, lift * 0.25);
  if (th === 1) { for (let i = -1; i < 14; i++) { const c0 = Math.floor((cam * 0.45) / 96), bx = i * 96 - ((cam * 0.45) % 96) + (hs(i + c0, 5) % 30), tall = 120 + (hs(i + c0, 2) % 90); ctx.fillStyle = '#17553a'; ctx.fillRect(bx + 16, 470 - tall * 0.3, 10, tall * 0.3 + 300); ctx.fillStyle = P.near; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(bx - 18 + k * 6, 470 - tall * 0.3 - k * tall * 0.22); ctx.lineTo(bx + 21, 470 - tall * 0.62 - k * tall * 0.22); ctx.lineTo(bx + 60 - k * 6, 470 - tall * 0.3 - k * tall * 0.22); ctx.fill(); } } }
  ridge(P.near, 500, 70, 0.011, cam * 0.5, 2.2, false);
  if (lift > 1) { ctx.fillStyle = P.near; ctx.fillRect(0, 520, W, 2000); }
  ctx.restore();
  if (th === 2) { ctx.fillStyle = P.near; for (let i = -1; i < 22; i++) { const c0 = Math.floor((cam * 0.5) / 52), sxp = i * 52 - ((cam * 0.5) % 52), len = 40 + (hs(i + c0, 1) % 110); ctx.beginPath(); ctx.moveTo(sxp, 0); ctx.lineTo(sxp + 46, 0); ctx.lineTo(sxp + 23, len); ctx.fill(); } }
  if (th === 4) { const lg = ctx.createLinearGradient(0, 380, 0, H); lg.addColorStop(0, 'rgba(255,120,40,0)'); lg.addColorStop(1, 'rgba(255,120,40,.45)'); ctx.fillStyle = lg; ctx.fillRect(0, 380, W, 160); for (let i = 0; i < 26; i++) { const ey = H - ((t * (30 + (hs(i, 4) % 50)) + (hs(i, 8) % 540)) % 540); circ(((hs(i, 2) % 1000) - cam * 0.2 + 3000) % 1000 - 20 + Math.sin(t * 2 + i) * 10, ey, 2 + (hs(i, 6) % 3), `rgba(255,${150 + (hs(i, 1) % 90)},60,.8)`); } }
  if (danger) { ctx.fillStyle = `rgba(255,60,30,${0.1 + 0.04 * Math.sin(t * 6)})`; ctx.fillRect(0, 0, W, H); }
}
function tuft(px: number, py: number, col: string, h: number): void { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(px + 14 + i * 6, py); ctx.lineTo(px + 11 + i * 6 + (i - 1) * 3 + (h % 3), py - 8 - (i === 1 ? 4 : 0)); ctx.stroke(); } ctx.lineCap = 'butt'; }
function deco(kind: string, px: number, py: number, h: number, t: number): void {
  const v = h % 7;
  if (kind === 'flower') { if (v < 2) { const sw = Math.sin(t * 2 + h) * 2; ctx.strokeStyle = '#2e9e44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 20, py); ctx.lineTo(px + 20 + sw, py - 14); ctx.stroke(); const fc = ['#ff5d8f', '#ffd23f', '#ffffff', '#b46bff'][h % 4]; for (let a = 0; a < 5; a++) circ(px + 20 + sw + Math.cos(a * 1.257) * 4, py - 15 + Math.sin(a * 1.257) * 4, 3, fc); circ(px + 20 + sw, py - 15, 2.4, '#ff9f1c'); } else if (v < 4) tuft(px, py, '#3fbf4a', h); }
  else if (kind === 'shroom') { if (v < 2) { ctx.fillStyle = '#f3e9d2'; ctx.fillRect(px + 17, py - 9, 6, 9); ctx.fillStyle = h % 2 ? '#e39a2d' : '#d9b03a'; ctx.beginPath(); ctx.arc(px + 20, py - 9, 9, Math.PI, 0); ctx.fill(); circ(px + 17, py - 13, 1.6, '#fff'); circ(px + 23, py - 12, 1.4, '#fff'); } else if (v < 4) tuft(px, py, '#249a52', h); }
  else if (kind === 'crystal') { if (v < 3) { const cc = ['#5bf3e0', '#b48bff', '#ff8bd0'][h % 3]; ctx.fillStyle = cc; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(px + 12, py); ctx.lineTo(px + 17, py - 20 - (h % 8)); ctx.lineTo(px + 22, py); ctx.fill(); ctx.beginPath(); ctx.moveTo(px + 20, py); ctx.lineTo(px + 27, py - 12); ctx.lineTo(px + 31, py); ctx.fill(); ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 3 + h); circ(px + 19, py - 10, 18, cc); ctx.globalAlpha = 1; } }
  else if (kind === 'tuft') { if (v < 2) { ctx.fillStyle = '#5f4360'; ctx.beginPath(); ctx.moveTo(px + 8, py); ctx.lineTo(px + 15, py - 12); ctx.lineTo(px + 22, py - 5); ctx.lineTo(px + 27, py - 10); ctx.lineTo(px + 33, py); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(px + 12, py - 7); ctx.lineTo(px + 15, py - 12); ctx.lineTo(px + 18, py - 8); ctx.fill(); } else if (v < 4) tuft(px, py, '#d9e6ff', h); }
  else if (kind === 'ember') { if (v < 3) { ctx.fillStyle = '#1e1414'; ctx.beginPath(); ctx.moveTo(px + 8, py); ctx.lineTo(px + 14, py - 9); ctx.lineTo(px + 24, py - 12); ctx.lineTo(px + 32, py); ctx.fill(); ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4 + h); ctx.beginPath(); ctx.moveTo(px + 15, py - 2); ctx.lineTo(px + 19, py - 8); ctx.lineTo(px + 24, py - 3); ctx.stroke(); ctx.globalAlpha = 1; } }
}
function groundTile(P: (typeof TH)[number], px: number, py: number, x: number, y: number, top: boolean, left: boolean, right: boolean): void {
  const h = hs(x, y);
  ctx.fillStyle = P.dirt; ctx.fillRect(px, py, T, T);
  ctx.fillStyle = P.dark; rr(px + 5 + (h % 14), py + 14 + ((h >> 4) % 10), 9, 5, 2.5); ctx.fill(); rr(px + 22 + ((h >> 8) % 8), py + 26 + ((h >> 12) % 6), 7, 4, 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.07)'; rr(px + 24 - (h % 9), py + 12 + ((h >> 6) % 5), 6, 3, 1.5); ctx.fill();
  if (left) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(px, py, 3, T); }
  if (right) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(px + T - 3, py, 3, T); }
  if (top) { ctx.fillStyle = P.grass; ctx.fillRect(px, py, T, 9); for (let i = 0; i < 4; i++) circ(px + 5 + i * 10, py + 9, 5, P.grass); ctx.fillStyle = P.lite; ctx.fillRect(px, py, T, 3); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(px, py - 1, T, 1.5); }
}

export interface WorldOpts { editor?: boolean; title?: string }
export function drawWorld(S: Sim, o: WorldOpts = {}): void {
  const P = TH[S.theme], t = S.time, ed = !!o.editor, offY = Math.max(0, H - S.rows * T);
  backdrop(S.theme, S.cam, t, S.phase === 'run' && !ed, Math.max(0, S.rows * T - H - S.camY));
  ctx.save();
  const sh = S.shake > 0 ? (Math.random() - 0.5) * 8 : 0; ctx.translate(-Math.round(S.cam) + sh, offY - Math.round(S.camY) + sh);
  const x0 = Math.max(0, Math.floor(S.cam / T) - 1), x1 = Math.min(S.cols - 1, x0 + 26), y0 = Math.max(0, Math.floor(S.camY / T) - 1), y1 = Math.min(S.rows - 1, y0 + 16);
  const sol = (x: number, y: number) => solidAt(S, x, y);
  for (let x = x0; x <= x1; x++) for (let y = Math.max(1, y0); y <= y1; y++) if (S.g[y][x] === '#' && S.g[y - 1][x] === '.') deco(P.deco, x * T, y * T, hs(x, y), t);
  for (const f of S.fans) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let l = 0; l < 5; l++) { const wy = f.y - ((t * 240 + l * 52) % 250), wx = f.x + 6 + l * 7; ctx.globalAlpha = Math.min(1, (f.y - wy) / 60) * Math.min(1, (wy - (f.y - 6.4 * T)) / 60 + 0.1); ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx, wy - 22); ctx.stroke(); } ctx.globalAlpha = 1; ctx.lineCap = 'butt'; }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const c = S.g[y][x], px = x * T, py = y * T;
    if (c === '.' || c === 'e') continue;
    if ((c === 'o' && S.hasEgg) || (c === '+' && !S.hasEgg)) { if (ed) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffd23f'; rr(px + 2, py + 2, T - 4, 14, 4); ctx.fill(); ctx.globalAlpha = 1; text('+', px + 20, py + 15, 14, '#fff'); } continue; }
    if (c === '^') { for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(px + i * 20 + 1, py + T); ctx.lineTo(px + i * 20 + 10, py + 10); ctx.lineTo(px + i * 20 + 19, py + T); ctx.closePath(); ctx.fillStyle = '#e11d48'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#4a0716'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fillStyle = '#ffe4ea'; ctx.beginPath(); ctx.moveTo(px + i * 20 + 7, py + 19); ctx.lineTo(px + i * 20 + 10, py + 11); ctx.lineTo(px + i * 20 + 13, py + 19); ctx.fill(); } continue; }
    if (c === 'M') { const sq = S.sprT > 0 ? 7 : 0; ctx.fillStyle = '#f6ead2'; rr(px + 13, py + 24 + sq, 14, 16 - sq, 4); ctx.fill(); ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.ellipse(px + 20, py + 26 + sq, 19, 12 - sq * 0.5, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = '#8a1230'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px + 20, py + 26 + sq, 19, 12 - sq * 0.5, 0, Math.PI, 0); ctx.stroke(); circ(px + 12, py + 21 + sq, 3, '#fff'); circ(px + 22, py + 18 + sq, 3.5, '#fff'); circ(px + 30, py + 22 + sq, 2.4, '#fff'); continue; }
    if (c >= '1' && c <= '9') {
      const bc = ['#ff5d8f', '#39d5ff', '#ffd23f', '#9dff6b'][(c.charCodeAt(0) - 49) % 4];
      ctx.fillStyle = '#5a3418'; ctx.beginPath(); ctx.ellipse(px + 20, py + T, 30, 22, 0, Math.PI, 0); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#3d220f'; ctx.stroke();
      ctx.fillStyle = '#160c05'; ctx.beginPath(); ctx.ellipse(px + 20, py + T - 1, 17, 14, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = bc; ctx.lineWidth = 3; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5); ctx.beginPath(); ctx.ellipse(px + 20, py + T - 1, 20, 17, 0, Math.PI, 0); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#f6ead2'; ctx.fillRect(px + 42, py - 2, 3, 42); ctx.fillStyle = bc; ctx.beginPath(); ctx.moveTo(px + 45, py - 2); ctx.lineTo(px + 62, py + 5); ctx.lineTo(px + 45, py + 12); ctx.fill();
      continue;
    }
    if (c === 'g') { const go = gateOpen(S, x); ctx.globalAlpha = go ? 0.15 : 0.55 + 0.25 * Math.sin(t * 8 + y); ctx.fillStyle = go ? '#7dff8a' : '#ff4d6d'; ctx.fillRect(px + 15, py, 10, T); ctx.fillStyle = '#fff'; ctx.fillRect(px + 19, py, 2, T); ctx.globalAlpha = 1; if (y + 1 < S.rows && S.g[y + 1][x] !== 'g') { ctx.fillStyle = '#2b3442'; rr(px + 8, py + 30, 24, 10, 4); ctx.fill(); } if (!go && y % 6 === 5) { circ(px + 20, py + 20, 15, '#2b3442'); text('🔒', px + 20, py + 27, 17); } continue; }
    if (c === '#') { groundTile(P, px, py, x, y, y === 0 || !sol(x, y - 1), x > 0 && !sol(x - 1, y), x < S.cols - 1 && !sol(x + 1, y)); continue; }
    if (c === 'R') {
      ctx.fillStyle = '#2b3442'; rr(px, py, T, T, 4); ctx.fill(); ctx.fillStyle = '#141a22'; ctx.fillRect(px, py, T, 12);
      const rl = S.rollers.find((r) => px >= r.x0 && px < r.x1 && r.y === py), mvv = rl && S.onR >= 0 && rl.charge < 1 && rl.charge > 0 ? t * 240 : t * 30; ctx.fillStyle = rl && rl.charge >= 1 ? '#7dff8a' : '#ffd23f';
      for (let i = 0; i < 3; i++) { const ax = px + T - ((mvv + i * 14) % 42); if (ax < px || ax > px + T - 8) continue; ctx.beginPath(); ctx.moveTo(ax + 8, py + 2); ctx.lineTo(ax, py + 6); ctx.lineTo(ax + 8, py + 10); ctx.fill(); }
      circ(px + 8, py + 26, 6, '#566273'); circ(px + 32, py + 26, 6, '#566273'); circ(px + 8, py + 26, 2, '#141a22'); circ(px + 32, py + 26, 2, '#141a22');
      continue;
    }
    if (c === 'F') { ctx.fillStyle = '#3a4656'; rr(px, py, T, T, 6); ctx.fill(); ctx.fillStyle = '#1b222c'; rr(px + 4, py + 3, 32, 12, 5); ctx.fill(); ctx.save(); ctx.translate(px + 20, py + 9); ctx.fillStyle = '#9fe8ff'; for (let i = 0; i < 3; i++) { ctx.save(); ctx.scale(Math.cos(t * 14 + i * 2.09), 1); ctx.fillRect(-13, -2.5, 26, 5); ctx.restore(); } ctx.restore(); continue; }
    if (c === '_') { const dn = S.plate ? 4 : 0; ctx.fillStyle = '#3a4656'; rr(px + 2, py + 33, 36, 7, 3); ctx.fill(); ctx.fillStyle = S.plate ? '#3ddc68' : '#ff4d6d'; rr(px + 7, py + 26 + dn, 26, 9 - dn, 4); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(px + 10, py + 27 + dn, 20, 2); continue; }
    if (c === 'D') {
      const open = S.plate || S.hasEgg; ctx.globalAlpha = open ? 0.22 : 1;
      ctx.fillStyle = '#7a4a26'; ctx.fillRect(px + 8, py, 24, T); ctx.fillStyle = '#5a3418'; ctx.fillRect(px + 8, py, 4, T); ctx.fillRect(px + 28, py, 4, T); ctx.fillStyle = '#c9c9d1'; ctx.fillRect(px + 8, py + 6, 24, 4); ctx.fillRect(px + 8, py + 30, 24, 4);
      ctx.globalAlpha = 1; if (!open && y + 1 < S.rows && S.g[y + 1][x] !== 'D') { circ(px + 20, py - 20, 9, '#ff4d6d'); text('!', px + 20, py - 14, 15, '#fff'); }
      continue;
    }
    const ox = c === 'd' ? (Math.random() - 0.5) * 4 : 0;
    if (c === 'c' || c === 'd') { ctx.fillStyle = '#e3c58a'; rr(px + ox + 1, py, T - 2, 22, 5); ctx.fill(); ctx.fillStyle = '#b9955a'; ctx.fillRect(px + ox + 3, py + 16, T - 6, 5); ctx.strokeStyle = '#8a6a36'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + ox + 12, py + 2); ctx.lineTo(px + ox + 16, py + 10); ctx.lineTo(px + ox + 11, py + 16); ctx.moveTo(px + ox + 27, py + 3); ctx.lineTo(px + ox + 24, py + 12); ctx.stroke(); continue; }
    if (c === 'k') { ctx.fillStyle = '#a9b0b8'; rr(px + 1, py + 1, T - 2, T - 2, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; rr(px + 4, py + 4, T - 14, 8, 4); ctx.fill(); ctx.strokeStyle = '#4e555c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px + 8, py + 4); ctx.lineTo(px + 18, py + 18); ctx.lineTo(px + 12, py + 34); ctx.moveTo(px + 18, py + 18); ctx.lineTo(px + 33, py + 25); ctx.stroke(); continue; }
    if (c === 'o') { const topO = y === 0 || S.g[y - 1][x] !== 'o'; ctx.fillStyle = '#c9975a'; rr(px, py, T, topO ? 16 : T, 4); if (topO) { ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(px, py + 12, T, 4); ctx.fillRect(px + 19, py, 2, 12); ctx.fillStyle = '#8a6a36'; ctx.fillRect(px + 4, py + 16, 4, 24); ctx.fillRect(px + 32, py + 16, 4, 24); } else { ctx.fillStyle = '#8a6a36'; ctx.fillRect(px + 4, py, 4, T); ctx.fillRect(px + 32, py, 4, T); } continue; }
    if (c === '+') { ctx.fillStyle = '#ffd23f'; rr(px, py, T, 16, 4); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(px, py + 12, T, 4); continue; }
  }
  for (const p of S.plats) { ctx.fillStyle = 'rgba(0,0,0,.25)'; rr(p.cx, p.cy + 4, p.w, 14, 7); ctx.fill(); ctx.fillStyle = '#4b5a70'; rr(p.cx, p.cy, p.w, 14, 7); ctx.fill(); ctx.fillStyle = '#ffd23f'; for (let l = 6; l < p.w - 10; l += 18) { ctx.beginPath(); ctx.moveTo(p.cx + l, p.cy + 3); ctx.lineTo(p.cx + l + 8, p.cy + 3); ctx.lineTo(p.cx + l + 4, p.cy + 11); ctx.lineTo(p.cx + l - 4, p.cy + 11); ctx.fill(); } if (ed) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.strokeRect(p.x0 + Math.min(0, p.ax), p.y0 + Math.min(0, p.ay), p.w + Math.abs(p.ax), 14 + Math.abs(p.ay)); ctx.setLineDash([]); } }
  for (const c of S.crates) { ctx.fillStyle = 'rgba(0,0,0,.25)'; rr(c.x + 2, c.y + 4, 36, 36, 5); ctx.fill(); ctx.fillStyle = '#c98a4f'; rr(c.x, c.y, 36, 36, 5); ctx.fill(); ctx.strokeStyle = '#7a4a26'; ctx.lineWidth = 3; rr(c.x + 1.5, c.y + 1.5, 33, 33, 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(c.x + 5, c.y + 5); ctx.lineTo(c.x + 31, c.y + 31); ctx.moveTo(c.x + 31, c.y + 5); ctx.lineTo(c.x + 5, c.y + 31); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(c.x + 5, c.y + 4, 26, 3); }
  for (const r of S.rollers) {
    const mx = (r.x0 + r.x1) / 2; if (mx < S.cam - 100 || mx > S.cam + W + 100 || S.hasEgg) continue;
    ctx.fillStyle = '#566273'; ctx.fillRect(r.x0 - 6, r.y - 70, 5, 70); ctx.fillRect(r.x1 + 1, r.y - 70, 5, 70);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(mx - 66, r.y - 118, 132, 40, 10); ctx.fill();
    ctx.fillStyle = '#1b222c'; rr(mx - 58, r.y - 92, 116, 9, 4); ctx.fill(); ctx.fillStyle = r.charge >= 1 ? '#7dff8a' : '#ffd23f'; rr(mx - 58, r.y - 92, Math.max(6, 116 * Math.min(1, r.charge)), 9, 4); ctx.fill();
    text(r.charge >= 1 ? 'GO!' : 'RUN!  hold ▶', mx, r.y - 99, 15, '#fff');
    if (!SV.wheels[S.id + ':' + r.k]) drawStar(mx + 52, r.y - 122, 9, '#7dff8a', true);
  }
  S.flags.forEach((fl, i) => { ctx.fillStyle = '#f6ead2'; ctx.fillRect(fl.x - 2, fl.y - 64, 4, 64); circ(fl.x, fl.y - 66, 4, '#ffd23f'); ctx.fillStyle = fl.on ? '#3ddc68' : '#9aa7b5'; ctx.beginPath(); ctx.moveTo(fl.x + 2, fl.y - 62); ctx.lineTo(fl.x + 30 + Math.sin(t * 6 + i) * 3, fl.y - 52); ctx.lineTo(fl.x + 2, fl.y - 40); ctx.fill(); });
  const HM = S.home;
  ctx.fillStyle = '#5a3a1e'; ctx.beginPath(); ctx.ellipse(HM.x, HM.y - 3, 46, 18, 0, 0, Math.PI); ctx.fill(); ctx.strokeStyle = '#c99657'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(HM.x, HM.y - 3, 46, 9, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = '#f6ead2'; ctx.fillRect(HM.x - 62, HM.y - 96, 5, 96); ctx.fillStyle = '#3ddc68'; rr(HM.x - 62, HM.y - 100, 74, 30, 6); ctx.fill(); text('HOME', HM.x - 25, HM.y - 79, 17, '#fff');
  S.stars.forEach((st, i) => { if (!st.got) drawStar(st.x, st.y + Math.sin(t * 4 + i) * 3, 13, '#ffe14a', true); });
  for (const b of S.beetles) {
    if (!b.alive) continue; ctx.save(); ctx.translate(b.x, b.y - 12);
    ctx.strokeStyle = '#2b1b3d'; ctx.lineWidth = 3; for (let l = -1; l <= 1; l++) { ctx.beginPath(); ctx.moveTo(l * 8, 6); ctx.lineTo(l * 8 + Math.sin(t * 14 + l) * 3, 13); ctx.stroke(); }
    ctx.fillStyle = '#2b1b3d'; ctx.beginPath(); ctx.ellipse(0, 0, 17, 14, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#8e5cc2'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 12, 0, 0, 7); ctx.fill();
    circ(-b.dir * 5, -4, 3, '#c9a2f0'); circ(-b.dir * 9, 3, 2, '#c9a2f0'); circ(b.dir * 6 - 3, -3, 4, '#fff'); circ(b.dir * 6 + 5, -3, 4, '#fff'); circ(b.dir * 7 - 3, -3, 1.8, '#111'); circ(b.dir * 7 + 5, -3, 1.8, '#111'); ctx.restore();
    if (ed) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.a, b.y - 3); ctx.lineTo(b.b, b.y - 3); ctx.stroke(); ctx.setLineDash([]); }
  }
  if (!S.hasEgg || ed) { ctx.fillStyle = '#5a3a1e'; ctx.beginPath(); ctx.ellipse(S.ex, S.erow * T - 2, 26, 10, 0, 0, Math.PI, true); ctx.fill(); const eg = ctx.createRadialGradient(S.ex, S.ey, 4, S.ex, S.ey, 50); eg.addColorStop(0, 'rgba(255,255,220,.6)'); eg.addColorStop(1, 'rgba(255,255,220,0)'); ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(S.ex, S.ey, 50, 0, 7); ctx.fill(); drawEgg(S.ex, S.ey + Math.sin(t * 3) * 2, 1.25, S.egg); }
  // the guardian owl: bigger and redder the faster it is
  const awake = S.hasEgg && S.wake <= 0 && !ed, king = S.lv.guard.max >= 270, gs = 1 + Math.max(0, S.lv.guard.max - 220) / 170;
  ctx.save(); ctx.translate(S.gx, S.gy + (awake ? Math.sin(t * 12) * 3 : 0)); ctx.scale(gs, gs);
  if (awake) { const fw = Math.sin(t * 16) * 10; ctx.fillStyle = king ? '#8a1f2a' : '#573bb0'; ctx.beginPath(); ctx.ellipse(-30, -4 + fw * 0.4, 14, 9, -0.5 + fw * 0.03, 0, 7); ctx.ellipse(30, -4 + fw * 0.4, 14, 9, 0.5 - fw * 0.03, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#20143d'; rr(-26, -26, 52, 52, 14); ctx.fill(); ctx.fillStyle = king ? '#c2333f' : '#7a56e0'; rr(-24, -24, 48, 48, 12); ctx.fill();
  ctx.fillStyle = king ? '#f0a0a6' : '#b9a3ff'; ctx.beginPath(); ctx.ellipse(0, 10, 15, 11, 0, 0, 7); ctx.fill();
  ctx.fillStyle = king ? '#8a1f2a' : '#573bb0'; ctx.beginPath(); ctx.moveTo(-24, -14); ctx.lineTo(-16, -36); ctx.lineTo(-6, -22); ctx.moveTo(24, -14); ctx.lineTo(16, -36); ctx.lineTo(6, -22); ctx.fill();
  if (king) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(-12, -24); ctx.lineTo(-9, -36); ctx.lineTo(-4, -28); ctx.lineTo(0, -38); ctx.lineTo(4, -28); ctx.lineTo(9, -36); ctx.lineTo(12, -24); ctx.fill(); }
  if (S.stun > 0) { text('★ ★', 0, -42, 16, '#fff36b'); ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(-4, 0); ctx.moveTo(-4, -8); ctx.lineTo(-14, 0); ctx.moveTo(4, -8); ctx.lineTo(14, 0); ctx.moveTo(14, -8); ctx.lineTo(4, 0); ctx.stroke(); }
  else if (S.hasEgg && !ed) { circ(-9, -4, 7.5, '#fff'); circ(9, -4, 7.5, '#fff'); circ(-9, -3, 3.2, '#222'); circ(9, -3, 3.2, '#222'); ctx.strokeStyle = '#222'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-18, -15); ctx.lineTo(-3, -9); ctx.moveTo(18, -15); ctx.lineTo(3, -9); ctx.stroke(); }
  else { ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-15, -3); ctx.lineTo(-4, -3); ctx.moveTo(4, -3); ctx.lineTo(15, -3); ctx.stroke(); text('z', 24, -30 - ((t * 20) % 14), 15); text('Z', 34, -44 - ((t * 20) % 14), 17); }
  ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(-5, 4); ctx.lineTo(5, 4); ctx.lineTo(0, 12); ctx.fill(); ctx.restore();
  if (awake && S.stun <= 0) { const gd = Math.hypot(S.gx - S.px, S.gy - S.py); if (gd < 170) { ctx.globalAlpha = (170 - gd) / 170; text('!', S.px, S.py - 52, 30, '#ff3b3b', 'center', '#fff'); ctx.globalAlpha = 1; } }
  if (!ed) {
    if (S.ground) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(S.px, S.py + R, 15, 4, 0, 0, 7); ctx.fill(); }
    if (S.phase === 'home' || S.phase === 'win') drawEgg(HM.x, HM.y - 22, 1.3, S.egg); else if (S.hasEgg) drawEgg(S.px, S.py - R - 13, 1, S.egg);
    const party = S.phase === 'home' || S.phase === 'win';
    drawRolo(S.px + (party ? 46 : 0), S.py - (party ? Math.abs(Math.sin(t * 9)) * 22 : 0), S.rot, S.vx < -5 ? -1 : S.vx > 5 ? 1 : S.face,
      S.turboT > 0 ? 'rgba(255,170,40,.9)' : S.dashT > 0 ? 'rgba(255,240,120,.9)' : S.inFan ? 'rgba(160,235,255,.6)' : null, S.ground ? 0 : Math.max(-0.12, Math.min(0.12, -S.vy / 6000)));
  }
  for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i]; f.t -= 1 / 60; if (f.t <= 0) { FX.splice(i, 1); continue; } f.x += f.vx / 60; f.y += f.vy / 60; f.vy += 12; ctx.globalAlpha = Math.min(1, f.t * 3); circ(f.x, f.y, f.s * 0.6, f.col); }
  ctx.globalAlpha = 1; ctx.restore();
  if (ed) return;
  const vg = ctx.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 620); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,20,.32)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // HUD
  ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(12, 12, 104, 36, 12); ctx.fill(); drawStar(34, 30, 12, '#ffe14a'); text(`${S.nStars}/${S.stars.length}`, 54, 37, 19, '#fff', 'left');
  if (S.dash) { ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(126, 12, 74, 36, 12); ctx.fill(); ctx.fillStyle = S.dashCd > 0 ? 'rgba(255,224,102,.35)' : '#ffe066'; rr(132, 19, 62 * (1 - Math.max(0, S.dashCd) / 1.8), 22, 6); ctx.fill(); text('⚡', 163, 37, 17, '#333'); }
  // progress track: home ... egg (straight-line distance, so it also works in vertical levels)
  const tx0 = 250, tw = 440, ty = 30, full = Math.hypot(S.ex - HM.x, S.ey - HM.y) || 1, frac = (x: number, y: number) => tx0 + tw * Math.max(0, Math.min(1, 1 - Math.hypot(S.ex - x, S.ey - y) / full));
  ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(tx0 - 26, 12, tw + 52, 36, 18); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.3)'; rr(tx0, ty - 3, tw, 6, 3); ctx.fill();
  const fp = frac(S.px, S.py);
  ctx.fillStyle = S.hasEgg ? '#ff7a59' : '#7dff8a'; if (S.hasEgg) { rr(fp, ty - 3, Math.max(1, tx0 + tw - fp), 6, 3); ctx.fill(); } else { rr(tx0, ty - 3, Math.max(6, fp - tx0), 6, 3); ctx.fill(); }
  for (const fl of S.flags) { ctx.fillStyle = fl.on ? '#3ddc68' : 'rgba(255,255,255,.6)'; ctx.fillRect(frac(fl.x, fl.y) - 1.5, ty - 8, 3, 16); }
  ctx.fillStyle = '#3ddc68'; rr(tx0 - 20, ty - 9, 18, 18, 5); ctx.fill(); text('⌂', tx0 - 11, ty + 6, 15, '#fff');
  if (!S.hasEgg) drawEgg(tx0 + tw + 10, ty, 0.75, S.egg);
  if (S.hasEgg && S.wake <= 0) { const fg = frac(S.gx, S.gy); circ(fg, ty, 8, '#20143d'); circ(fg, ty, 6.5, king ? '#c2333f' : '#7a56e0'); }
  circ(fp, ty, 8.5, '#5a3a1e'); circ(fp, ty, 7, '#e0a568');
  if (S.time < 2.6 && o.title) { ctx.globalAlpha = Math.min(1, (2.6 - S.time) * 2); text(o.title, W / 2, 150, 44, '#fff', 'center', 'rgba(0,0,0,.55)'); ctx.globalAlpha = 1; }
  if (S.phase === 'go' && S.time > 2.6 && S.time < 10 && S.lv.hint) { ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(W / 2 - 340, 66, 680, 42, 14); ctx.fill(); text(S.lv.hint, W / 2, 95, 20); }
  if (S.phase === 'run') {
    if (S.lv.mode === 'escape' && S.time < 3) text('WAKE UP!  The owl saw you!', W / 2, 210, 40, '#fff36b', 'center', 'rgba(0,0,0,.6)');
    if (S.msgT > 0) { ctx.fillStyle = 'rgba(0,0,0,.55)'; rr(W / 2 - 320, 66, 640, 42, 14); ctx.fill(); text(EGGS[S.egg].tip, W / 2, 95, 21, '#fff36b'); }
    else if (S.time % 1 < 0.65) text('RUN HOME!', W / 2, 98, 28, '#fff', 'center', '#c0392b');
  }
  if (S.phase === 'home' || S.phase === 'win') text('HOME!  The egg is safe!', W / 2, 190, 46, '#fff36b', 'center', 'rgba(0,0,0,.6)');
  if (S.powT > 0) { ctx.globalAlpha = Math.min(1, S.powT); text(S.powMsg, W / 2, 230 - (3 - S.powT) * 12, 40, '#7dff8a', 'center', 'rgba(0,0,0,.6)'); ctx.globalAlpha = 1; }
  if (S.turboT > 0) text('TURBO!', W / 2, 150, 34, '#ffb020', 'center', 'rgba(0,0,0,.6)');
}
