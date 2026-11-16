export const T = 40, W = 960, H = 540, R = 16;
export const GRAV = 1800, JUMP = 620, ACC = 1500, MAXV = 270;

export type EggType = 'plain' | 'feather' | 'spark' | 'stone';

/**
 * A level is a grid of characters, so the editor is just a tile painter.
 *   #  ground          ^  thorns            o  gone after the egg     +  appears after the egg
 *   M  bounce mushroom R  training wheel    g  wheel gate             F  wind fan
 *   c  crumbling plank k  cracked rock      1-9 burrow pairs          P  checkpoint flag
 *   *  star            b  beetle            X  crate                  _  pressure plate   D  door
 *   =  moving platform |  lift              H  home nest              E  egg (owl sits next to it)
 *   L  log spawner (logs roll left)  J  log spawner (logs roll right)   m  mole hole (wakes up on the way back)
 *   S  catapult seesaw (throws you right)   Z  catapult seesaw (throws you left)
 */
export interface LevelData {
  id: string;
  name: string;
  theme: number;
  egg: EggType;
  pet: number;
  hint: string;
  mode?: 'heist' | 'escape';
  dash?: boolean;
  boss?: boolean;
  guard: { base: number; max: number; gain: number; wake: number };
  tiles: string[];
}

export interface Input { l: boolean; r: boolean; j: boolean; jPressed: boolean; dPressed: boolean }
export interface Star { x: number; y: number; got: boolean }
export interface Beetle { x: number; y: number; a: number; b: number; dir: number; alive: boolean }
export interface Plat { x0: number; y0: number; w: number; ax: number; ay: number; per: number; cx: number; cy: number }
export interface Roller { x0: number; x1: number; y: number; gate: number; charge: number; k: number }
export interface Flag { x: number; y: number; on: boolean }
export interface Crate { x: number; y: number; vy: number; push: number; sx: number; sy: number }
export interface Log { x: number; y: number; vx: number; vy: number; t: number }
export interface Mole { x: number; y: number; st: number; t: number }
export type PetKind = 'magnet' | 'heart' | 'dash';
export interface Buddy { kind: PetKind; shiny: boolean; idx: number }
export interface Portal { id: string; x: number; y: number }

export interface Sim {
  id: string; theme: number; lv: LevelData; cols: number; rows: number; g: string[][];
  px: number; py: number; vx: number; vy: number; rot: number; face: number; dir: number;
  ground: boolean; coyote: number; jbuf: number; canCut: boolean; airJ: number;
  hasEgg: boolean; egg: EggType; phase: 'go' | 'run' | 'home' | 'win';
  home: { x: number; y: number }; ex: number; ey: number; erow: number;
  gx: number; gy: number; wake: number; stun: number; caught: number;
  stars: Star[]; nStars: number; time: number; tries: number; shake: number; cam: number; camY: number; msgT: number; homeT: number;
  beetles: Beetle[]; plats: Plat[]; portals: Portal[]; fans: { x: number; y: number }[]; rollers: Roller[]; flags: Flag[];
  crates: Crate[]; plates: { tx: number; ty: number }[]; plate: boolean;
  cp: { x: number; y: number } | null; tpLock: boolean; crumb: { x: number; y: number; t: number; st: number }[];
  onPlat: number; onR: number; turboT: number; fly: number; inFan: boolean; pushing: boolean;
  dashT: number; dashCd: number; dashDir: number; sprT: number; powT: number; powMsg: string;
  dash: boolean; spd: number; jmp: number; wheelsHit: string[];
  logs: Log[]; spawners: { x: number; y: number; dir: number; t: number }[]; moles: Mole[];
  cat: { x: number; y: number; dir: number; t: number } | null; catAnim: number; flyDir: number; flyV: number;
  buddy: Buddy | null; hearts: number; inv: number; dashLen: number; dashCdMax: number; bossHp: number;
}
