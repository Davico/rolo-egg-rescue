import './style.css';
import { H, W, type Input, type LevelData, type Sim } from './core/types';
import { createSim, step } from './core/sim';
import { SV, jmpLv, save, spdLv } from './core/save';
import { WORLD1 } from './levels/index';
import { music, setMute, sfx, unlock } from './audio';
import { REG, button, clearFx, drawWorld, initRender } from './render';
import { buddy, drawHatch, drawMenu, drawPets, unlocked, type Hatch } from './ui';
import { drawEditor, editorKey, editorPointer, editorToast, editorWheel, openEditor } from './editor';

type Mode = 'menu' | 'play' | 'hatch' | 'editor' | 'pets';
const LEVELS = WORLD1, DT = 1 / 120;
const cv = document.getElementById('c') as HTMLCanvasElement;
initRender(cv);

let mode: Mode = 'menu', S: Sim | null = null, cur = 0, testing: LevelData | null = null, hatch: Hatch | null = null;
const input: Input = { l: false, r: false, j: false, jPressed: false, dPressed: false };
const wheelsTotal = LEVELS.reduce((n, lv) => n + createSim(lv, { spd: 0, jmp: 0, dash: false }).rollers.length, 0);

function setMode(m: Mode): void {
  mode = m; input.l = input.r = input.j = input.jPressed = input.dPressed = false;
  document.body.classList.toggle('play', m === 'play');
  document.body.classList.toggle('dash', m === 'play' && !!S?.dash);
  if (m === 'menu' || m === 'pets') music('calm', 0); else if (m === 'editor') music('off');
}
function begin(lv: LevelData): void { clearFx(); S = createSim(lv, { spd: spdLv(), jmp: jmpLv(), dash: SV.dash, buddy: buddy(LEVELS) }); setMode('play'); }
function startLevel(i: number): void { if (!unlocked(LEVELS, i)) return; cur = i; testing = null; sfx('click'); begin(LEVELS[i]); }
function testLevel(lv: LevelData): void { testing = lv; sfx('click'); begin(lv); }
function toMenu(): void { sfx('click'); setMode('menu'); }
function toPets(): void { sfx('click'); setMode('pets'); }
function toEditor(): void { sfx('click'); openEditor(); setMode('editor'); }
function leavePlay(): void { if (testing) { openEditor(); setMode('editor'); } else setMode('menu'); }

function finish(s: Sim): void {
  if (testing) { openEditor(); setMode('editor'); editorToast('It works!  Now share it with a friend  ⇪'); sfx('win'); return; }
  const lv = LEVELS[cur], prev = SV.pets[lv.id], rate = s.stars.length ? s.nStars / s.stars.length : 0, shiny = Math.random() < 0.08 + 0.3 * rate;
  const r3 = rate >= 0.99 ? 3 : rate >= 0.6 ? 2 : rate >= 0.25 ? 1 : 0;
  if (SV.best[lv.id] == null || r3 > SV.best[lv.id]) SV.best[lv.id] = r3;
  SV.pets[lv.id] = prev === 's' || shiny ? 's' : 'n';
  if (!SV.buddy) SV.buddy = lv.id; // the first pet comes along right away, so its help is felt without a trip to the menu
  const dashNew = !SV.dash && cur >= 2; if (dashNew) SV.dash = true;
  hatch = { idx: cur, lv, shiny, first: !prev, upgraded: shiny && prev === 'n', r3, n: s.nStars, of: s.stars.length, t: 0, dashNew };
  save(); setMode('hatch'); music('off'); sfx('hatch');
}

/** The first run on each training wheel makes Rolo stronger for good: speed and jump take turns. */
function wheelPowers(s: Sim): void {
  if (!s.wheelsHit.length) return;
  for (const k of s.wheelsHit.splice(0)) {
    if (testing || SV.wheels[k]) continue;
    const sp = spdLv(), jp = jmpLv(); SV.wheels[k] = 1; save();
    if (spdLv() > sp) { s.spd = spdLv(); s.powMsg = 'SPEED UP!  (forever)'; s.powT = 3; sfx('power'); }
    else if (jmpLv() > jp) { s.jmp = jmpLv(); s.powMsg = 'JUMP UP!  (forever)'; s.powT = 3; sfx('power'); }
  }
}

function draw(dt: number): void {
  REG.length = 0;
  if (mode === 'play' && S) {
    drawWorld(S, { title: S.lv.name });
    button(900, 12, 48, 36, testing ? '✎' : '☰', 'rgba(20,30,50,.75)', () => { sfx('click'); leavePlay(); }, 18);
  } else if (mode === 'hatch' && hatch) { hatch.t += dt; drawHatch(hatch, { levels: LEVELS, menu: toMenu, play: startLevel, pets: toPets }); }
  else if (mode === 'pets') drawPets({ levels: LEVELS, back: toMenu, pick: (id) => { SV.buddy = id; save(); sfx(id ? 'star' : 'click'); } });
  else if (mode === 'editor') drawEditor({ test: testLevel, menu: toMenu }, dt);
  else drawMenu({ levels: LEVELS, wheelsTotal, play: startLevel, editor: toEditor, pets: toPets, mute: () => { SV.mute = !SV.mute; setMute(SV.mute); save(); } });
}

// ---------- input ----------
function key(e: KeyboardEvent, down: boolean): void {
  if ((e.target as HTMLElement | null)?.tagName === 'TEXTAREA') return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (down) unlock();
  if (mode === 'editor') { if (down) { if (k === 'Escape') toMenu(); else editorKey(k); } return; }
  if (k === 'ArrowLeft' || k === 'a') input.l = down;
  else if (k === 'ArrowRight' || k === 'd') input.r = down;
  else if (k === 'ArrowUp' || k === 'w' || k === ' ') { if (down && !input.j && mode === 'play') input.jPressed = true; input.j = down; }
  else if (k === 'x' || k === 'Shift') { if (down && !e.repeat) input.dPressed = mode === 'play'; }
  else if (k === 'Escape') { if (down && mode === 'play') leavePlay(); else if (down && (mode === 'hatch' || mode === 'pets')) setMode('menu'); }
  else return;
  e.preventDefault();
}
window.addEventListener('keydown', (e) => key(e, true));
window.addEventListener('keyup', (e) => key(e, false));
window.addEventListener('blur', () => { input.l = input.r = input.j = false; });
function bind(id: string, on: () => void, off: () => void): void {
  const el = document.getElementById(id); if (!el) return;
  const d = (e: Event) => { e.preventDefault(); unlock(); el.classList.add('on'); on(); }, u = (e: Event) => { e.preventDefault(); el.classList.remove('on'); off(); };
  el.addEventListener('pointerdown', d); el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u); el.addEventListener('pointerleave', u);
}
bind('left', () => { input.l = true; }, () => { input.l = false; });
bind('right', () => { input.r = true; }, () => { input.r = false; });
bind('jump', () => { input.j = true; if (mode === 'play') input.jPressed = true; }, () => { input.j = false; });
bind('dash', () => { input.dPressed = mode === 'play'; }, () => {});
const pos = (e: PointerEvent | WheelEvent): [number, number] => { const b = cv.getBoundingClientRect(); return [((e.clientX - b.left) * W) / b.width, ((e.clientY - b.top) * H) / b.height]; };
cv.addEventListener('pointerdown', (e) => {
  unlock(); const [x, y] = pos(e);
  if (mode === 'editor' && editorPointer('down', x, y)) { cv.setPointerCapture(e.pointerId); return; }
  for (let i = REG.length - 1; i >= 0; i--) { const r = REG[i]; if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { r.fn(); return; } }
});
cv.addEventListener('pointermove', (e) => { if (mode === 'editor') editorPointer('move', ...pos(e)); });
window.addEventListener('pointerup', () => { if (mode === 'editor') editorPointer('up', 0, 0); });
cv.addEventListener('wheel', (e) => { if (mode === 'editor') { e.preventDefault(); editorWheel(e.deltaX, e.deltaY); } }, { passive: false });
cv.addEventListener('contextmenu', (e) => e.preventDefault());
function fit(): void { const s = Math.min(window.innerWidth / W, window.innerHeight / H); cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px'; }
window.addEventListener('resize', fit); fit();

let last = 0, acc = 0;
function frame(t: number): void {
  const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
  if (mode === 'play' && S) {
    acc += dt;
    while (acc >= DT && mode === 'play') {
      step(S, input, DT); acc -= DT; wheelPowers(S);
      if (S.phase === 'win') finish(S);
    }
    if (mode === 'play') music(S.phase === 'run' ? 'chase' : S.phase === 'go' ? 'calm' : 'off', S.theme);
  } else acc = 0;
  draw(dt); requestAnimationFrame(frame);
}
setMode('menu'); requestAnimationFrame(frame);

// Hooks for automated screenshots and playtests.
(window as unknown as Record<string, unknown>).__game = {
  S: () => S, mode: () => mode, pets: toPets, start: startLevel, editor: toEditor, SV, LEVELS, input,
  unlockAll: () => { for (const l of LEVELS) SV.best[l.id] ??= 0; }, tick: (n: number) => { if (S) for (let i = 0; i < n; i++) step(S, input, DT); }, hatchSkip: () => { if (hatch) hatch.t = 3; },
};
