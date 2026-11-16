// Level maker: a tile painter over the same JSON grid the built-in levels use. Levels autosave to localStorage and travel as a share code.
import { H, T, W, type EggType, type LevelData, type Sim } from './core/types';
import { createSim } from './core/sim';
import { loadCustom, saveCustom } from './core/save';
import { EGGS, REG, TH, button, circ, ctx, drawEgg, drawStar, drawWorld, rr, text } from './render';

export interface EditorApi { test: (lv: LevelData) => void; menu: () => void }

const TOP = 44, BOT = 64, SLOTS = 6, ALLOWED = '.#^o+McRgFk123456789P*bX_D=|HELJmSZ';
const TOOLS: { ch: string; tip: string }[] = [
  { ch: 'pan', tip: 'Move the view: drag the level (or use the arrow keys)' },
  { ch: '.', tip: 'Eraser' },
  { ch: '#', tip: 'Ground' },
  { ch: '^', tip: 'Thorns: ouch!' },
  { ch: 'o', tip: 'Old bridge: falls away when the egg is taken' },
  { ch: '+', tip: 'Magic bridge: appears when the egg is taken' },
  { ch: 'M', tip: 'Bounce mushroom' },
  { ch: 'c', tip: 'Crumbling plank: it breaks after you step on it' },
  { ch: 'k', tip: 'Cracked rock: a dash or the Stone Egg smashes it' },
  { ch: 'b', tip: 'Beetle: jump ON it' },
  { ch: '*', tip: 'Star' },
  { ch: 'X', tip: 'Crate: push it, stand on it' },
  { ch: '_', tip: 'Plate: doors stay open while something stands on it' },
  { ch: 'D', tip: 'Door: needs a plate (it opens for good once you have the egg)' },
  { ch: '=', tip: 'Moving platform: goes 5 tiles to the right and back' },
  { ch: '|', tip: 'Lift: goes 5 tiles up and back' },
  { ch: 'F', tip: 'Wind fan: blows you up' },
  { ch: 'R', tip: 'Training wheel: put 3 in a row, then a gate right after it' },
  { ch: 'g', tip: 'Wheel gate: draw a tall line right after the wheel' },
  { ch: 'L', tip: 'Log stump: logs roll out to the left. Jump over them or land on top!' },
  { ch: 'm', tip: 'Mole hole: the mole wakes up when the egg is taken' },
  { ch: 'S', tip: 'Catapult: stand on it and it throws you to the right' },
  { ch: 'Z', tip: 'Catapult: throws you to the left (for the way home)' },
  { ch: 'P', tip: 'Checkpoint flag' },
  { ch: '1', tip: 'Burrow: place two and they connect' },
  { ch: 'H', tip: 'Home nest: Rolo starts here' },
  { ch: 'E', tip: 'The egg: the owl sleeps next to it' },
];
const ONCE = 'HEbX=|P1*LmSZ';
const OWL = [{ n: 'Owl: slow', g: { base: 125, max: 210, gain: 0.2, wake: 1.2 } }, { n: 'Owl: normal', g: { base: 138, max: 230, gain: 0.22, wake: 1.0 } }, { n: 'Owl: fast', g: { base: 150, max: 250, gain: 0.24, wake: 0.9 } }];
const EGG_ORDER: EggType[] = ['plain', 'feather', 'spark', 'stone'];

let list: LevelData[] = [], slot = 0, lv: LevelData, S: Sim, tool = 2, cam = 0, vy = 0, toast = '', toastT = 0, hover: [number, number] | null = null;
let drag: { x: number; y: number; cam: number; vy: number } | null = null, painting = false, dlg: HTMLDivElement | null = null;

function blank(i: number): LevelData {
  const cols = 60, rows = 13, tiles: string[] = [];
  for (let y = 0; y < rows; y++) tiles.push((y >= rows - 2 ? '#' : '.').repeat(cols));
  const put = (x: number, y: number, c: string) => { tiles[y] = tiles[y].slice(0, x) + c + tiles[y].slice(x + 1); };
  put(3, rows - 3, 'H'); put(cols - 5, rows - 3, 'E');
  return { id: 'my-' + (i + 1), name: 'My level ' + (i + 1), theme: i % TH.length, egg: 'plain', pet: i, hint: '', guard: { ...OWL[1].g }, tiles };
}

/** Anything that comes from a share code is untrusted: keep only what a level may contain. */
export function sanitize(o: unknown, i: number): LevelData | null {
  if (!o || typeof o !== 'object') return null;
  const r = o as Record<string, unknown>;
  if (!Array.isArray(r.tiles) || r.tiles.length < 8 || r.tiles.length > 60) return null;
  const cols = Math.min(220, Math.max(20, ...r.tiles.map((t) => (typeof t === 'string' ? t.length : 0))));
  const tiles = r.tiles.map((t) => String(t).slice(0, cols).split('').map((c) => (ALLOWED.includes(c) ? c : '.')).join('').padEnd(cols, '.'));
  const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
  const g = (r.guard ?? {}) as Record<string, unknown>;
  return {
    id: 'my-' + (i + 1), name: String(r.name ?? 'My level').replace(/[^\w !?'-]/g, '').slice(0, 20) || 'My level', theme: Math.floor(num(r.theme, 0, TH.length - 1, 0)),
    egg: EGG_ORDER.includes(r.egg as EggType) ? (r.egg as EggType) : 'plain', pet: i, hint: '', mode: r.mode === 'escape' ? 'escape' : 'heist', dash: true,
    guard: { base: num(g.base, 100, 170, 138), max: num(g.max, 180, 280, 230), gain: num(g.gain, 0.1, 0.4, 0.22), wake: num(g.wake, 0.5, 2, 1) }, tiles,
  };
}
export function encode(l: LevelData): string { return 'ROLO1.' + btoa(JSON.stringify({ name: l.name, theme: l.theme, egg: l.egg, mode: l.mode, guard: l.guard, tiles: l.tiles })); }
export function decode(code: string, i: number): LevelData | null { try { const m = code.trim().match(/^ROLO1\.([A-Za-z0-9+/=]+)$/); return m ? sanitize(JSON.parse(atob(m[1])), i) : null; } catch { return null; } }

function say(m: string): void { toast = m; toastT = 2.5; }
export function editorToast(m: string): void { say(m); }
function vRange(): [number, number] { const offY = Math.max(0, H - S.rows * T); return [-TOP - offY, Math.max(0, S.rows * T - H) + BOT]; }
function rebuild(keepView = true): void {
  S = createSim(lv, { spd: 0, jmp: 0, dash: true });
  if (!keepView) { cam = 0; vy = vRange()[1]; }
  cam = Math.max(0, Math.min(Math.max(0, S.cols * T - W), cam)); const [a, b] = vRange(); vy = Math.max(a, Math.min(b, vy));
}
function commit(): void { list[slot] = lv; saveCustom(list); rebuild(); }
function pick(i: number): void { slot = (i + SLOTS) % SLOTS; if (!list[slot]) list[slot] = blank(slot); lv = list[slot]; rebuild(false); }

export function openEditor(): void {
  if (!list.length) list = loadCustom().map((l, i) => sanitize(l, i)).filter((l): l is LevelData => !!l);
  pick(slot);
}
export function currentLevel(): LevelData { return lv; }

function setTile(tx: number, ty: number, ch: string): boolean {
  if (tx < 0 || ty < 0 || ty >= lv.tiles.length || tx >= lv.tiles[0].length) return false;
  const rows = lv.tiles.map((r) => r.split(''));
  if (ch === 'H' || ch === 'E') for (const r of rows) for (let x = 0; x < r.length; x++) if (r[x] === ch) r[x] = '.';
  if (ch === '1') {
    const n: Record<string, number> = {}; for (const r of rows) for (const c of r) if (c >= '1' && c <= '9') n[c] = (n[c] ?? 0) + 1;
    let id = ''; for (let k = 1; k <= 9 && !id; k++) if ((n[String(k)] ?? 0) < 2) id = String(k);
    if (!id) { say('That is a lot of burrows already!'); return false; }
    ch = id;
  }
  if (rows[ty][tx] === ch) return false;
  rows[ty][tx] = ch; lv.tiles = rows.map((r) => r.join('')); commit(); return true;
}
function resize(dw: number, dh: number): void {
  const cols = Math.max(30, Math.min(220, lv.tiles[0].length + dw)), rows = Math.max(13, Math.min(40, lv.tiles.length + dh));
  let t = lv.tiles.map((r) => r.slice(0, cols).padEnd(cols, '.'));
  if (cols > lv.tiles[0].length) t = t.map((r, y) => (y >= t.length - 2 ? r.slice(0, lv.tiles[0].length) + '#'.repeat(cols - lv.tiles[0].length) : r));
  while (t.length < rows) t.unshift('.'.repeat(cols));
  while (t.length > rows) t.shift();
  lv.tiles = t; commit(); vy = vRange()[1]; say(`${cols} wide, ${rows} tall`);
}

function toWorld(x: number, y: number): [number, number] {
  const offY = Math.max(0, H - S.rows * T), camY = Math.max(0, Math.min(Math.max(0, S.rows * T - H), vy));
  return [Math.floor((x + cam) / T), Math.floor((y + (vy - camY) - offY + camY) / T)];
}
function paint(x: number, y: number, first: boolean): void {
  const ch = TOOLS[tool].ch; if (ch === 'pan' || (!first && ONCE.includes(ch))) return;
  const [tx, ty] = toWorld(x, y); setTile(tx, ty, ch);
}

/** Returns true when the editor used the event (so the canvas buttons are not also pressed). */
export function editorPointer(type: 'down' | 'move' | 'up', x: number, y: number): boolean {
  if (dlg) return true;
  if (type === 'up') { drag = null; painting = false; return false; }
  const inMap = y > TOP && y < H - BOT;
  if (type === 'move') {
    hover = inMap ? toWorld(x, y) : null;
    if (drag) { cam = drag.cam - (x - drag.x); vy = drag.vy - (y - drag.y); rebuild(); } else if (painting && inMap) paint(x, y, false);
    return false;
  }
  if (!inMap) return false;
  if (TOOLS[tool].ch === 'pan') drag = { x, y, cam, vy }; else { painting = true; paint(x, y, true); }
  return true;
}
export function editorKey(k: string): void {
  if (dlg) return;
  if (k === 'ArrowLeft' || k === 'a') cam -= 4 * T; else if (k === 'ArrowRight' || k === 'd') cam += 4 * T; else if (k === 'ArrowUp' || k === 'w') vy -= 2 * T; else if (k === 'ArrowDown' || k === 's') vy += 2 * T; else return;
  rebuild();
}
export function editorWheel(dx: number, dy: number): void { if (dlg) return; cam += dx + (Math.abs(dx) < 1 ? dy : 0); rebuild(); }

function closeDlg(): void { dlg?.remove(); dlg = null; }
function shareDialog(): void {
  closeDlg();
  dlg = document.createElement('div'); dlg.className = 'dlg';
  const box = document.createElement('div'), h = document.createElement('h3'), p = document.createElement('p'), ta = document.createElement('textarea'), row = document.createElement('div');
  h.textContent = 'Share your level'; p.textContent = 'Copy this code and send it to a friend. To play a friend\'s level, paste their code here and press Load.';
  ta.value = encode(lv); ta.spellcheck = false;
  const mk = (label: string, fn: () => void) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; row.appendChild(b); };
  mk('Copy', () => { ta.select(); navigator.clipboard?.writeText(ta.value).then(() => say('Code copied!'), () => { document.execCommand('copy'); }); });
  mk('Load', () => { const l = decode(ta.value, slot); if (!l) { p.textContent = 'That code does not look right. Copy the whole thing, starting with ROLO1.'; return; } lv = l; commit(); rebuild(false); closeDlg(); say('Level loaded!'); });
  mk('Close', closeDlg);
  box.append(h, p, ta, row); dlg.appendChild(box); document.body.appendChild(dlg);
}

function icon(ch: string, x: number, y: number): void {
  const c = ctx;
  switch (ch) {
    case 'pan': text('✋', x, y + 8, 22); break;
    case '.': c.save(); c.translate(x, y); c.rotate(-0.5); c.fillStyle = '#ff8fb0'; rr(-11, -6, 14, 12, 3); c.fill(); c.fillStyle = '#e8eef5'; rr(3, -6, 8, 12, 3); c.fill(); c.restore(); break;
    case '#': c.fillStyle = '#8b5a36'; rr(x - 12, y - 12, 24, 24, 3); c.fill(); c.fillStyle = '#4ccb4f'; c.fillRect(x - 12, y - 12, 24, 7); break;
    case '^': c.fillStyle = '#e11d48'; c.beginPath(); c.moveTo(x - 12, y + 11); c.lineTo(x - 6, y - 9); c.lineTo(x, y + 11); c.lineTo(x + 6, y - 9); c.lineTo(x + 12, y + 11); c.fill(); break;
    case 'o': c.fillStyle = '#c9975a'; rr(x - 13, y - 5, 26, 10, 3); c.fill(); break;
    case '+': c.fillStyle = '#ffd23f'; rr(x - 13, y - 5, 26, 10, 3); c.fill(); text('+', x, y - 8, 13); break;
    case 'M': c.fillStyle = '#f6ead2'; c.fillRect(x - 4, y, 8, 11); c.fillStyle = '#ff4d6d'; c.beginPath(); c.ellipse(x, y + 1, 13, 10, 0, Math.PI, 0); c.fill(); circ(x - 4, y - 4, 2, '#fff'); circ(x + 5, y - 3, 1.6, '#fff'); break;
    case 'c': c.fillStyle = '#e3c58a'; rr(x - 13, y - 6, 26, 12, 3); c.fill(); c.strokeStyle = '#8a6a36'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 3, y - 6); c.lineTo(x + 1, y); c.lineTo(x - 3, y + 6); c.stroke(); break;
    case 'k': c.fillStyle = '#a9b0b8'; rr(x - 12, y - 12, 24, 24, 4); c.fill(); c.strokeStyle = '#4e555c'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 6, y - 10); c.lineTo(x, y); c.lineTo(x - 4, y + 10); c.moveTo(x, y); c.lineTo(x + 9, y + 4); c.stroke(); break;
    case 'b': c.fillStyle = '#8e5cc2'; c.beginPath(); c.ellipse(x, y + 2, 12, 9, 0, 0, 7); c.fill(); circ(x + 3, y, 3, '#fff'); circ(x + 9, y, 3, '#fff'); circ(x + 4, y, 1.3, '#111'); circ(x + 10, y, 1.3, '#111'); break;
    case '*': drawStar(x, y, 12, '#ffe14a'); break;
    case 'X': c.fillStyle = '#c98a4f'; rr(x - 12, y - 12, 24, 24, 3); c.fill(); c.strokeStyle = '#7a4a26'; c.lineWidth = 2; c.strokeRect(x - 11, y - 11, 22, 22); c.beginPath(); c.moveTo(x - 9, y - 9); c.lineTo(x + 9, y + 9); c.moveTo(x + 9, y - 9); c.lineTo(x - 9, y + 9); c.stroke(); break;
    case '_': c.fillStyle = '#3a4656'; rr(x - 13, y + 5, 26, 6, 2); c.fill(); c.fillStyle = '#ff4d6d'; rr(x - 9, y - 1, 18, 7, 3); c.fill(); break;
    case 'D': c.fillStyle = '#7a4a26'; c.fillRect(x - 7, y - 13, 14, 26); c.fillStyle = '#c9c9d1'; c.fillRect(x - 7, y - 8, 14, 3); c.fillRect(x - 7, y + 5, 14, 3); break;
    case '=': c.fillStyle = '#4b5a70'; rr(x - 13, y - 4, 26, 8, 4); c.fill(); text('↔', x, y - 6, 13); break;
    case '|': c.fillStyle = '#4b5a70'; rr(x - 13, y + 4, 26, 8, 4); c.fill(); text('↕', x, y + 2, 14); break;
    case 'F': c.fillStyle = '#3a4656'; rr(x - 12, y - 2, 24, 14, 3); c.fill(); c.strokeStyle = '#9fe8ff'; c.lineWidth = 2; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * 7, y - 4); c.lineTo(x + i * 7, y - 12); c.stroke(); } break;
    case 'R': c.fillStyle = '#2b3442'; rr(x - 13, y - 8, 26, 16, 3); c.fill(); c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(x + 6, y - 5); c.lineTo(x - 4, y); c.lineTo(x + 6, y + 5); c.fill(); break;
    case 'g': c.fillStyle = '#ff4d6d'; c.fillRect(x - 3, y - 13, 6, 26); c.fillStyle = '#fff'; c.fillRect(x - 1, y - 13, 2, 26); break;
    case 'L': circ(x, y, 13, '#5a3418'); circ(x, y, 10, '#b07a45'); circ(x, y, 4, '#7a4a26'); text('◀', x - 1, y - 9, 10, '#ffd23f'); break;
    case 'm': c.fillStyle = '#5a3418'; c.beginPath(); c.ellipse(x, y + 10, 13, 7, 0, Math.PI, 0); c.fill(); c.fillStyle = '#4a3728'; c.beginPath(); c.ellipse(x, y + 4, 8, 11, 0, Math.PI, 0); c.fill(); c.fillStyle = '#e8b04a'; c.fillRect(x - 9, y - 6, 18, 4); break;
    case 'S': case 'Z': { const d = ch === 'S' ? 1 : -1; c.strokeStyle = '#d9a15c'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - d * 12, y + 8); c.lineTo(x + d * 12, y - 6); c.stroke(); c.fillStyle = '#6e4426'; c.beginPath(); c.moveTo(x - 5, y + 12); c.lineTo(x, y + 2); c.lineTo(x + 5, y + 12); c.fill(); circ(x + d * 10, y - 11, 4, '#8d959e'); break; }
    case 'P': c.fillStyle = '#f6ead2'; c.fillRect(x - 7, y - 12, 3, 24); c.fillStyle = '#3ddc68'; c.beginPath(); c.moveTo(x - 4, y - 12); c.lineTo(x + 11, y - 6); c.lineTo(x - 4, y); c.fill(); break;
    case '1': c.fillStyle = '#5a3418'; c.beginPath(); c.ellipse(x, y + 10, 14, 16, 0, Math.PI, 0); c.fill(); c.fillStyle = '#160c05'; c.beginPath(); c.ellipse(x, y + 10, 8, 10, 0, Math.PI, 0); c.fill(); break;
    case 'H': c.fillStyle = '#3ddc68'; rr(x - 13, y - 9, 26, 18, 4); c.fill(); text('⌂', x, y + 6, 16); break;
    case 'E': drawEgg(x, y, 0.85, lv.egg); break;
  }
}

export function drawEditor(api: EditorApi, dt: number): void {
  const offY = Math.max(0, H - S.rows * T), camY = Math.max(0, Math.min(Math.max(0, S.rows * T - H), vy)), extra = vy - camY;
  S.time = performance.now() / 1000; S.cam = cam; S.camY = camY;
  ctx.fillStyle = TH[S.theme].near; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(0, -extra);
  drawWorld(S, { editor: true });
  ctx.save(); ctx.translate(-cam, offY - camY);
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = Math.floor(cam / T); x <= Math.min(S.cols, Math.floor((cam + W) / T) + 1); x++) { ctx.moveTo(x * T + 0.5, 0); ctx.lineTo(x * T + 0.5, S.rows * T); }
  for (let y = 0; y <= S.rows; y++) { ctx.moveTo(cam, y * T + 0.5); ctx.lineTo(Math.min(S.cols * T, cam + W), y * T + 0.5); }
  ctx.stroke();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, S.cols * T, S.rows * T);
  if (hover && TOOLS[tool].ch !== 'pan' && hover[0] >= 0 && hover[0] < S.cols && hover[1] >= 0 && hover[1] < S.rows) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; rr(hover[0] * T + 2, hover[1] * T + 2, T - 4, T - 4, 6); ctx.stroke(); }
  ctx.restore(); ctx.restore();

  // top bar
  ctx.fillStyle = 'rgba(10,20,36,.92)'; ctx.fillRect(0, 0, W, TOP);
  const b = (x: number, w: number, label: string, col: string, fn: () => void) => button(x, 5, w, 30, label, col, fn, 13);
  b(6, 60, '☰ MENU', '#5d6b7a', api.menu);
  b(72, 28, '◀', '#3a5f8a', () => pick(slot - 1)); text(`Level ${slot + 1}/${SLOTS}`, 142, 26, 14); b(184, 28, '▶', '#3a5f8a', () => pick(slot + 1));
  b(220, 74, '🎨 Look ' + (lv.theme + 1), '#3a5f8a', () => { lv.theme = (lv.theme + 1) % TH.length; commit(); });
  b(300, 104, EGGS[lv.egg].name, '#3a5f8a', () => { lv.egg = EGG_ORDER[(EGG_ORDER.indexOf(lv.egg) + 1) % 4]; commit(); say(EGGS[lv.egg].tip); });
  const oi = Math.max(0, OWL.findIndex((o) => o.g.max === lv.guard.max));
  b(410, 92, OWL[oi].n, '#3a5f8a', () => { lv.guard = { ...OWL[(oi + 1) % 3].g }; commit(); });
  b(508, 84, lv.mode === 'escape' ? 'Mode: escape' : 'Mode: heist', '#3a5f8a', () => { lv.mode = lv.mode === 'escape' ? 'heist' : 'escape'; commit(); say(lv.mode === 'escape' ? 'Escape: you start AT the egg and the owl is awake!' : 'Heist: roll to the egg, then run home'); });
  b(598, 34, '↔−', '#3a5f8a', () => resize(-5, 0)); b(636, 34, '↔+', '#3a5f8a', () => resize(5, 0)); b(674, 34, '↕−', '#3a5f8a', () => resize(0, -5)); b(712, 34, '↕+', '#3a5f8a', () => resize(0, 5));
  b(752, 72, '⇪ SHARE', '#8a4fd6', shareDialog);
  b(830, 124, '▶  TEST IT', '#27a84c', () => api.test(lv));

  // palette
  ctx.fillStyle = 'rgba(10,20,36,.94)'; ctx.fillRect(0, H - BOT, W, BOT);
  for (let i = 0; i < TOOLS.length; i++) {
    const x = 7 + i * 35, y = H - BOT + 8;
    ctx.fillStyle = i === tool ? '#ffd23f' : 'rgba(255,255,255,.1)'; rr(x + 1, y, 33, 38, 8); ctx.fill();
    if (i === tool) { ctx.fillStyle = '#16314f'; rr(x + 3, y + 3, 29, 32, 6); ctx.fill(); }
    ctx.save(); ctx.translate(x + 17, y + 19); ctx.scale(0.88, 0.88); icon(TOOLS[i].ch, 0, 0); ctx.restore();
    REG.push({ x, y: H - BOT, w: 35, h: BOT, fn: () => { tool = i; } });
  }
  text(TOOLS[tool].tip, W / 2, H - 5, 12, 'rgba(255,255,255,.85)');
  if (toastT > 0) { toastT -= dt; ctx.globalAlpha = Math.min(1, toastT * 2); ctx.fillStyle = 'rgba(0,0,0,.7)'; rr(W / 2 - 300, TOP + 12, 600, 40, 12); ctx.fill(); text(toast, W / 2, TOP + 39, 19, '#fff36b'); ctx.globalAlpha = 1; }
}

