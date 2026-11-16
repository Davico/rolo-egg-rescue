import { H, W, type Buddy, type LevelData } from './core/types';
import { SV, jmpLv, spdLv, wheelCount } from './core/save';
import { ABIL, PETS, TH, backdrop, button, circ, ctx, drawEgg, drawPet, drawRolo, drawStar, petKind, REG, rr, text } from './render';

export interface MenuApi { levels: LevelData[]; wheelsTotal: number; play: (i: number) => void; editor: () => void; pets: () => void; mute: () => void }
export interface Hatch { idx: number; lv: LevelData; shiny: boolean; first: boolean; upgraded: boolean; r3: number; n: number; of: number; t: number; dashNew: boolean }
export interface HatchApi { levels: LevelData[]; menu: () => void; play: (i: number) => void; pets: () => void }
export interface PetsApi { levels: LevelData[]; back: () => void; pick: (id: string | null) => void }

export const done = (lv: LevelData): boolean => SV.best[lv.id] != null;
export const unlocked = (levels: LevelData[], i: number): boolean => i === 0 || done(levels[i - 1]);
/** The pet that comes along, if the player picked one and still owns it. */
export function buddy(levels: LevelData[]): Buddy | null {
  const lv = levels.find((l) => l.id === SV.buddy); if (!lv || !SV.pets[lv.id]) return null;
  return { kind: petKind(lv.pet), shiny: SV.pets[lv.id] === 's', idx: lv.pet };
}
const tag = (l: LevelData): string => (l.boss ? 'BOSS' : l.mode === 'escape' ? 'ESCAPE' : l.tiles.length > 20 ? 'CLIMB' : '');

function pips(x: number, y: number, n: number, col: string): void { for (let i = 0; i < 3; i++) { circ(x + i * 22, y, 9, 'rgba(0,0,0,.35)'); if (i < n) circ(x + i * 22, y, 7, col); } }

export function drawMenu(api: MenuApi): void {
  const t = performance.now() / 1000, L = api.levels;
  backdrop(0, t * 30, t, false);
  ctx.fillStyle = TH[0].grass; ctx.fillRect(0, 520, W, 20); ctx.fillStyle = TH[0].lite; ctx.fillRect(0, 520, W, 4);
  drawRolo(262, 34, t * 3, 1, null, 0); text('ROLO: EGG RESCUE', W / 2 + 26, 48, 36, '#fff', 'center', '#1d4f8a');
  button(884, 12, 56, 40, SV.mute ? '🔇' : '🔊', '#3a5f8a', api.mute, 20);
  for (let i = 0; i < L.length; i++) {
    const D = L[i], P = TH[D.theme % TH.length], w = 178, h = 80, x = 19 + (i % 5) * 186, y = 66 + Math.floor(i / 5) * 87, open = unlocked(L, i);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(x, y + 4, w, h, 14); ctx.fill();
    const cg = ctx.createLinearGradient(0, y, 0, y + h); cg.addColorStop(0, open ? P.sky[0] : '#55616e'); cg.addColorStop(1, open ? P.sky[1] : '#7b8794'); ctx.fillStyle = cg; rr(x, y, w, h, 14); ctx.fill();
    ctx.save(); rr(x, y, w, h, 14); ctx.clip(); ctx.fillStyle = open ? P.mid : '#4a5560'; ctx.beginPath(); ctx.ellipse(x + 40, y + h + 24, 100, 48, 0, 0, 7); ctx.fill(); ctx.fillStyle = open ? P.near : '#3d4650'; ctx.beginPath(); ctx.ellipse(x + 150, y + h + 28, 90, 44, 0, 0, 7); ctx.fill(); ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = D.boss && open ? '#ffd23f' : 'rgba(255,255,255,.7)'; rr(x, y, w, h, 14); ctx.stroke();
    text(String(i + 1), x + 24, y + 36, 28, '#fff', 'center', 'rgba(0,0,0,.4)'); text(D.name, x + 46, y + 25, 14, '#fff', 'left', 'rgba(0,0,0,.45)');
    if (!open) { text('🔒', x + w / 2 + 20, y + 62, 24); continue; }
    if (SV.pets[D.id]) drawPet(x + 150, y + 54, 0.95, D.pet, SV.pets[D.id] === 's', t); else drawEgg(x + 150, y + 54, 1.15, D.egg);
    for (let s = 0; s < 3; s++) drawStar(x + 54 + s * 24, y + 44, 10, done(D) && s < SV.best[D.id] ? '#ffe14a' : 'rgba(0,0,0,.28)');
    if (tag(D)) { ctx.fillStyle = D.boss ? '#c2333f' : 'rgba(0,0,0,.4)'; rr(x + 10, y + 58, 62, 16, 8); ctx.fill(); text(tag(D), x + 41, y + 70, 10); }
    REG.push({ x, y, w, h, fn: () => api.play(i) });
  }
  ctx.fillStyle = 'rgba(8,24,44,.6)'; rr(19, 332, 922, 44, 14); ctx.fill();
  text('ROLO POWER', 96, 360, 16); text(`Wheels ${wheelCount()}/${api.wheelsTotal}`, 216, 360, 13, 'rgba(255,255,255,.85)');
  text('SPEED', 300, 360, 15, '#fff', 'left'); pips(366, 354, spdLv(), '#39d5ff'); text('JUMP', 462, 360, 15, '#fff', 'left'); pips(520, 354, jmpLv(), '#7dff8a');
  text(SV.dash ? 'DASH ⚡ ready  (X key)' : 'DASH ⚡ after level 3', 780, 360, 15, SV.dash ? '#ffe066' : 'rgba(255,255,255,.6)');
  const b = buddy(L), owned = L.filter((l) => SV.pets[l.id]).length;
  button(19, 386, 452, 50, b ? `🐾  BUDDY: ${PETS[b.idx % PETS.length].name}  ${ABIL[b.kind].icon} ${ABIL[b.kind].name}` : owned ? '🐾  PICK A BUDDY' : '🐾  MY PETS', owned && !b ? '#e0621e' : '#2a8fa8', api.pets, 18);
  button(489, 386, 452, 50, '🛠  BUILD YOUR OWN LEVEL', '#8a4fd6', api.editor, 18);
  let n = 0; for (const D of L) if (SV.pets[D.id]) drawPet(60 + n++ * 60, 488, 0.9, D.pet, SV.pets[D.id] === 's', t);
  if (!owned) text('Bring an egg home and it hatches into a pet.  Pets help you!', W / 2, 492, 16, '#fff', 'center', 'rgba(0,0,0,.4)');
}

export function drawPets(api: PetsApi): void {
  const t = performance.now() / 1000, L = api.levels;
  backdrop(1, t * 20, t, false); ctx.fillStyle = 'rgba(8,16,30,.55)'; ctx.fillRect(0, 0, W, H);
  text('PICK A BUDDY', W / 2, 44, 32, '#fff', 'center', 'rgba(0,0,0,.5)'); text('One pet comes with you and helps.  Shiny pets help more!', W / 2, 68, 14, 'rgba(255,255,255,.85)');
  button(19, 12, 100, 40, '◀ BACK', '#5d6b7a', api.back, 16);
  for (let i = 0; i < L.length; i++) {
    const D = L[i], w = 178, h = 132, x = 19 + (i % 5) * 186, y = 84 + Math.floor(i / 5) * 142, own = SV.pets[D.id], sel = SV.buddy === D.id, k = petKind(D.pet);
    ctx.fillStyle = sel ? '#ffd23f' : 'rgba(0,0,0,.35)'; rr(x - 3, y - 3, w + 6, h + 6, 17); ctx.fill();
    ctx.fillStyle = own ? '#1f4468' : '#39424d'; rr(x, y, w, h, 14); ctx.fill();
    if (!own) { circ(x + w / 2, y + 46, 26, 'rgba(255,255,255,.12)'); text('?', x + w / 2, y + 57, 30, 'rgba(255,255,255,.5)'); text(`Rescue the egg in level ${i + 1}`, x + w / 2, y + 100, 12, 'rgba(255,255,255,.6)'); text(`${ABIL[k].icon} ${ABIL[k].name}`, x + w / 2, y + 120, 12, 'rgba(255,255,255,.45)'); continue; }
    drawPet(x + w / 2, y + 46, 1.7, D.pet, own === 's', t);
    text((own === 's' ? '★ ' : '') + PETS[D.pet % PETS.length].name, x + w / 2, y + 92, 16, own === 's' ? '#ffe14a' : '#fff');
    text(`${ABIL[k].icon} ${ABIL[k].name}`, x + w / 2, y + 110, 13, '#9fe8ff'); text(ABIL[k].tip, x + w / 2, y + 125, 11, 'rgba(255,255,255,.7)');
    if (sel) { ctx.fillStyle = '#27a84c'; rr(x + w - 62, y + 6, 56, 18, 9); ctx.fill(); text('WITH ME', x + w - 34, y + 19, 10); }
    REG.push({ x, y, w, h, fn: () => api.pick(sel ? null : D.id) });
  }
}

export function drawHatch(h: Hatch, api: HatchApi): void {
  const D = h.lv, t = h.t, k = petKind(D.pet);
  backdrop(D.theme, 300, t, false); ctx.fillStyle = 'rgba(8,16,30,.72)'; ctx.fillRect(0, 0, W, H);
  if (t < 1.4) { ctx.save(); ctx.translate(W / 2, 250); ctx.rotate(Math.sin(t * 22) * 0.18 * Math.min(1, t)); drawEgg(0, 0, 5, D.egg); ctx.restore(); text('Something is hatching...', W / 2, 400, 28); return; }
  for (let i = 0; i < 12; i++) { ctx.save(); ctx.translate(W / 2, 190); ctx.rotate((i * Math.PI) / 6 + t * 0.6); ctx.fillStyle = h.shiny ? 'rgba(255,220,90,.25)' : 'rgba(255,255,255,.1)'; ctx.fillRect(0, -11, 340, 22); ctx.restore(); }
  drawPet(W / 2, 190, 4.6 * Math.min(1, (t - 1.4) * 4), D.pet, h.shiny, t);
  const name = PETS[D.pet % PETS.length].name;
  text((h.shiny ? 'SHINY ' : '') + name + (h.first ? ' joined you!' : h.upgraded ? ' is shiny now!' : ' says hi again!'), W / 2, 330, 32, h.shiny ? '#ffe14a' : '#fff', 'center', 'rgba(0,0,0,.5)');
  text(`${ABIL[k].icon}  ${ABIL[k].name}:  ${ABIL[k].tip}`, W / 2, 362, 18, '#9fe8ff');
  for (let i = 0; i < 3; i++) drawStar(W / 2 - 46 + i * 46, 398, 17, i < h.r3 ? '#ffe14a' : 'rgba(255,255,255,.2)');
  text(h.dashNew ? 'NEW POWER:  DASH ⚡   (X key or the ⚡ button)' : `Stars: ${h.n} / ${h.of}` + (h.shiny ? '' : '     More stars = better chance for a SHINY pet'), W / 2, 442, h.dashNew ? 20 : 15, h.dashNew ? '#ffe066' : 'rgba(255,255,255,.8)');
  if (t > 2) {
    const next = h.idx + 1 < api.levels.length;
    button(40, 468, 150, 54, 'MENU', '#5d6b7a', api.menu, 20);
    button(204, 468, 220, 54, '🐾 BUDDIES', '#2a8fa8', api.pets, 20);
    button(438, 468, 200, 54, '↻ AGAIN', '#e08a1e', () => api.play(h.idx), 20);
    if (next) button(652, 468, 268, 54, 'NEXT ▶', '#27a84c', () => api.play(h.idx + 1), 22);
  }
}
