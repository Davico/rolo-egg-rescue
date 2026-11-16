import { H, W, type LevelData } from './core/types';
import { SV, jmpLv, spdLv, wheelCount } from './core/save';
import { PETS, TH, backdrop, button, circ, ctx, drawEgg, drawPet, drawRolo, drawStar, REG, rr, text } from './render';

export interface MenuApi { levels: LevelData[]; wheelsTotal: number; play: (i: number) => void; editor: () => void; mute: () => void }
export interface Hatch { idx: number; lv: LevelData; shiny: boolean; first: boolean; upgraded: boolean; r3: number; n: number; of: number; t: number; dashNew: boolean }
export interface HatchApi { levels: LevelData[]; menu: () => void; play: (i: number) => void }

export const done = (lv: LevelData): boolean => SV.best[lv.id] != null;
export const unlocked = (levels: LevelData[], i: number): boolean => i === 0 || done(levels[i - 1]);

function pips(x: number, y: number, n: number, col: string): void { for (let i = 0; i < 3; i++) { circ(x + i * 22, y, 9, 'rgba(0,0,0,.35)'); if (i < n) circ(x + i * 22, y, 7, col); } }

export function drawMenu(api: MenuApi): void {
  const t = performance.now() / 1000, L = api.levels;
  backdrop(0, t * 30, t, false);
  ctx.fillStyle = TH[0].grass; ctx.fillRect(0, 520, W, 20); ctx.fillStyle = TH[0].lite; ctx.fillRect(0, 520, W, 4);
  drawRolo(250, 40, t * 3, 1, null, 0); text('ROLO: EGG RESCUE', W / 2 + 26, 54, 40, '#fff', 'center', '#1d4f8a');
  button(880, 16, 56, 44, SV.mute ? '🔇' : '🔊', '#3a5f8a', api.mute, 22);
  for (let i = 0; i < L.length; i++) {
    const D = L[i], P = TH[D.theme % TH.length], x = 28 + (i % 4) * 228, y = 78 + Math.floor(i / 4) * 124, w = 220, h = 114, open = unlocked(L, i);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(x, y + 5, w, h, 16); ctx.fill();
    const cg = ctx.createLinearGradient(0, y, 0, y + h); cg.addColorStop(0, open ? P.sky[0] : '#55616e'); cg.addColorStop(1, open ? P.sky[1] : '#7b8794'); ctx.fillStyle = cg; rr(x, y, w, h, 16); ctx.fill();
    ctx.save(); rr(x, y, w, h, 16); ctx.clip(); ctx.fillStyle = open ? P.mid : '#4a5560'; ctx.beginPath(); ctx.ellipse(x + 50, y + h + 30, 120, 60, 0, 0, 7); ctx.fill(); ctx.fillStyle = open ? P.near : '#3d4650'; ctx.beginPath(); ctx.ellipse(x + 180, y + h + 34, 110, 56, 0, 0, 7); ctx.fill(); ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.7)'; rr(x, y, w, h, 16); ctx.stroke();
    text(String(i + 1), x + 30, y + 44, 36, '#fff', 'center', 'rgba(0,0,0,.4)'); text(D.name, x + 56, y + 38, 16, '#fff', 'left', 'rgba(0,0,0,.45)');
    if (!open) { text('🔒', x + w / 2, y + 90, 32); continue; }
    if (SV.pets[D.id]) drawPet(x + 184, y + 78, 1.25, D.pet, SV.pets[D.id] === 's', t); else drawEgg(x + 184, y + 78, 1.5, D.egg);
    for (let s = 0; s < 3; s++) drawStar(x + 28 + s * 30, y + 66, 12, done(D) && s < SV.best[D.id] ? '#ffe14a' : 'rgba(0,0,0,.28)');
    ctx.fillStyle = done(D) ? '#e08a1e' : '#27a84c'; rr(x + 14, y + 84, 110, 22, 11); ctx.fill(); text(done(D) ? '↻ AGAIN' : '▶ PLAY', x + 69, y + 100, 14);
    REG.push({ x, y, w, h, fn: () => api.play(i) });
  }
  ctx.fillStyle = 'rgba(8,24,44,.6)'; rr(28, 330, 904, 56, 16); ctx.fill();
  text('ROLO POWER', 120, 356, 18); text(`Training wheels: ${wheelCount()} / ${api.wheelsTotal}`, 120, 376, 13, 'rgba(255,255,255,.85)');
  text('SPEED', 300, 365, 17, '#fff', 'left'); pips(376, 359, spdLv(), '#39d5ff'); text('JUMP', 470, 365, 17, '#fff', 'left'); pips(536, 359, jmpLv(), '#7dff8a');
  text(SV.dash ? 'DASH ⚡ ready  (X key)' : 'DASH ⚡ after level 3', 760, 365, 16, SV.dash ? '#ffe066' : 'rgba(255,255,255,.6)');
  ctx.fillStyle = 'rgba(8,24,44,.6)'; rr(28, 394, 904, 64, 16); ctx.fill(); text('MY PETS', 86, 432, 17);
  for (let i = 0; i < L.length; i++) {
    const D = L[i], px = 176 + i * 96;
    if (SV.pets[D.id]) { drawPet(px, 420, 1.2, D.pet, SV.pets[D.id] === 's', t); text(PETS[D.pet % PETS.length].name, px, 452, 12); }
    else { circ(px, 424, 19, 'rgba(255,255,255,.16)'); text('?', px, 432, 22, 'rgba(255,255,255,.6)'); }
  }
  button(W / 2 - 150, 466, 300, 46, '🛠  BUILD YOUR OWN LEVEL', '#8a4fd6', api.editor, 19);
}

export function drawHatch(h: Hatch, api: HatchApi): void {
  const D = h.lv, t = h.t;
  backdrop(D.theme, 300, t, false); ctx.fillStyle = 'rgba(8,16,30,.72)'; ctx.fillRect(0, 0, W, H);
  if (t < 1.4) { ctx.save(); ctx.translate(W / 2, 250); ctx.rotate(Math.sin(t * 22) * 0.18 * Math.min(1, t)); drawEgg(0, 0, 5, D.egg); ctx.restore(); text('Something is hatching...', W / 2, 400, 28); return; }
  for (let i = 0; i < 12; i++) { ctx.save(); ctx.translate(W / 2, 210); ctx.rotate((i * Math.PI) / 6 + t * 0.6); ctx.fillStyle = h.shiny ? 'rgba(255,220,90,.25)' : 'rgba(255,255,255,.1)'; ctx.fillRect(0, -11, 340, 22); ctx.restore(); }
  drawPet(W / 2, 210, 5 * Math.min(1, (t - 1.4) * 4), D.pet, h.shiny, t);
  const name = PETS[D.pet % PETS.length].name;
  text((h.shiny ? 'SHINY ' : '') + name + (h.first ? ' joined you!' : h.upgraded ? ' is shiny now!' : ' says hi again!'), W / 2, 356, 34, h.shiny ? '#ffe14a' : '#fff', 'center', 'rgba(0,0,0,.5)');
  for (let i = 0; i < 3; i++) drawStar(W / 2 - 46 + i * 46, 394, 18, i < h.r3 ? '#ffe14a' : 'rgba(255,255,255,.2)');
  text(h.dashNew ? 'NEW POWER:  DASH ⚡   (X key or the ⚡ button)' : `Stars: ${h.n} / ${h.of}` + (h.shiny ? '' : '     More stars = better chance for a SHINY pet'), W / 2, 440, h.dashNew ? 20 : 16, h.dashNew ? '#ffe066' : 'rgba(255,255,255,.8)');
  if (t > 2) {
    const next = h.idx + 1 < api.levels.length;
    button(W / 2 - 310, 468, 190, 54, 'MENU', '#5d6b7a', api.menu);
    button(W / 2 - 95, 468, 190, 54, '↻ AGAIN', '#e08a1e', () => api.play(h.idx));
    if (next) button(W / 2 + 120, 468, 190, 54, 'NEXT ▶', '#27a84c', () => api.play(h.idx + 1));
  }
}
