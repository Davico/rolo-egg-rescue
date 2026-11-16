// Seeds the built-in levels from reusable pieces. Output is plain JSON that the in-game editor can open and change.
// Run: npm run levels
import { mkdirSync, writeFileSync } from 'node:fs';

class Grid {
  constructor(rows) { this.rows = rows; this.g = Array.from({ length: rows }, () => []); this.x = 0; this.gy = rows - 2; this.nb = 0; }
  put(x, y, ch) { for (const r of this.g) while (r.length <= x) r.push('.'); this.g[y][x] = ch; }
  f(x0, x1, y0, y1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.put(x, y, ch); }
  G(x0, x1) { this.f(x0, x1, this.gy, this.rows - 1, '#'); }
  add(name, o) { this.x += P[name](this, this.x, this.gy, o || {}); return this; }
  out() { const w = Math.max(...this.g.map((r) => r.length)); return this.g.map((r) => r.join('').padEnd(w, '.')); }
}

const P = {
  home: (B, x, g) => { B.G(x, x + 7); B.put(x + 3, g - 1, 'H'); return 8; },
  flat: (B, x, g, o) => { B.G(x, x + (o.w || 4) - 1); return o.w || 4; },
  hop: (B, x, g) => { B.G(x, x + 6); B.f(x + 3, x + 4, g - 1, g - 1, '^'); B.put(x + 3, g - 4, '*'); return 7; },
  bridge: (B, x, g, o) => { const n = o.n || 3; B.G(x, x + 1); B.f(x + 2, x + 1 + n, g, g + 1, 'o'); B.G(x + 2 + n, x + 3 + n); if (o.high) B.put(x + 2 + (n >> 1), g - 5, '*'); return n + 4; },
  steps: (B, x, g) => { B.G(x, x + 1); B.f(x + 3, x + 5, g - 1, g - 1, '#'); B.f(x + 8, x + 10, g - 2, g - 2, '#'); B.G(x + 11, x + 13); B.put(x + 11, g - 1, '+'); B.put(x + 9, g - 4, '*'); return 14; },
  beetles: (B, x, g, o) => { const w = o.w || 8; B.G(x, x + w - 1); B.put(x + 3, g - 1, 'b'); if (w >= 10) B.put(x + 7, g - 1, 'b'); return w; },
  wallSpring: (B, x, g) => { B.G(x, x + 10); B.put(x + 2, g - 1, 'M'); B.f(x + 4, x + 5, g - 4, g - 1, '#'); B.put(x + 7, g - 1, 'M'); B.put(x + 4, g - 6, '*'); return 11; },
  crumble: (B, x, g, o) => { const n = o.n || 5; B.G(x, x + 1); B.f(x + 2, x + 1 + n, g, g, 'c'); B.G(x + 2 + n, x + 3 + n); B.put(x + 2 + (n >> 1), g - 3, '*'); return n + 4; },
  burrow: (B, x, g) => { const id = String(++B.nb); B.G(x, x + 10); B.put(x + 2, g - 1, id); B.f(x + 4, x + 6, 0, g - 1, '#'); B.put(x + 8, g - 1, id); return 11; },
  // burrow that pops out on top of a hill; the fan on the far side is the way back up
  burrowUp: (B, x, g) => { const id = String(++B.nb); B.G(x, x + 3); B.put(x + 2, g - 1, id); B.f(x + 4, x + 11, g - 6, B.rows - 1, '#'); B.put(x + 5, g - 7, id); B.put(x + 8, g - 7, '^'); B.put(x + 8, g - 10, '*'); B.put(x + 12, g, 'F'); B.put(x + 12, g + 1, '#'); B.G(x + 13, x + 14); return 15; },
  roller: (B, x, g) => { B.G(x, x + 6); B.f(x + 2, x + 4, g, g, 'R'); B.f(x + 5, x + 5, 0, g - 1, 'g'); B.f(x + 7, x + 14, g, g, '+'); B.G(x + 15, x + 27); B.put(x + 6, g - 5, '*'); B.put(x + 10, g - 7, '*'); B.put(x + 13, g - 5, '*'); return 28; },
  mover: (B, x, g) => { B.G(x, x + 1); B.put(x + 2, g, '='); B.G(x + 10, x + 11); B.put(x + 6, g - 3, '*'); return 12; },
  tower: (B, x, g) => { B.G(x, x + 1); B.put(x + 2, g, '|'); B.f(x + 4, x + 11, g - 5, B.rows - 1, '#'); B.f(x + 7, x + 8, g - 6, g - 6, '^'); B.put(x + 7, g - 8, '*'); B.put(x + 12, g, 'F'); B.put(x + 12, g + 1, '#'); B.G(x + 13, x + 14); return 15; },
  // push the crate onto the plate: the door opens while the plate is held down
  cratePlate: (B, x, g) => { B.G(x, x + 11); B.put(x + 2, g - 1, 'X'); B.put(x + 6, g - 1, '_'); B.put(x + 7, g - 1, '#'); B.f(x + 9, x + 9, g - 4, g - 1, 'D'); B.f(x + 9, x + 9, 0, g - 5, '#'); B.put(x + 5, g - 3, '*'); return 12; },
  // push the crate to the wall and use it as a step
  crateStep: (B, x, g) => { B.G(x, x + 12); B.put(x + 2, g - 1, 'X'); B.f(x + 6, x + 9, g - 3, g - 1, '#'); B.f(x + 10, x + 10, g - 2, g - 1, '#'); B.put(x + 11, g - 1, '#'); B.put(x + 8, g - 6, '*'); return 13; },
  // way in: over the top. Way back with the Stone Egg: smash straight through the tunnel (stars inside)
  altRoute: (B, x, g) => { B.G(x, x + 19); B.put(x + 2, g - 1, 'M'); B.f(x + 4, x + 15, g - 4, g - 4, '#'); B.f(x + 6, x + 6, g - 3, g - 1, 'k'); B.f(x + 13, x + 13, g - 3, g - 1, 'k'); B.f(x + 9, x + 10, g - 5, g - 5, '^'); B.put(x + 9, g - 8, '*'); B.put(x + 9, g - 2, '*'); B.put(x + 11, g - 2, '*'); B.put(x + 17, g - 1, 'M'); return 20; },
  // logs roll out of the stump and break on the bump at the left end
  logRun: (B, x, g, o) => { const w = o.w || 14; B.G(x, x + w - 1); B.put(x, g - 1, '#'); B.f(x + w - 3, x + w - 2, g - 3, g - 3, '#'); B.put(x + w - 3, g - 4, 'L'); B.put(x + 5, g - 4, '*'); if (o.hard) B.f(x + 7, x + 8, g - 1, g - 1, '^'); return w; },
  // catapult over a thorn field; the second catapult throws you back on the way home
  catapult: (B, x, g) => { B.G(x, x + 13); B.put(x + 2, g - 1, 'S'); B.f(x + 4, x + 8, g - 1, g - 1, '^'); B.put(x + 11, g - 1, 'Z'); B.put(x + 6, g - 8, '*'); return 14; },
  // catapult up a cliff; on the way home magic steps lead back up
  catapultUp: (B, x, g) => { B.G(x, x + 18); B.put(x + 2, g - 1, 'S'); B.f(x + 7, x + 12, g - 5, g - 1, '#'); B.put(x + 5, g - 7, '*'); B.put(x + 10, g - 7, '*'); B.put(x + 16, g - 2, '+'); B.put(x + 14, g - 4, '+'); return 19; },
  moleRun: (B, x, g, o) => { const w = o.w || 11; B.G(x, x + w - 1); B.put(x + 3, g - 1, 'm'); B.put(x + 7, g - 1, 'm'); if (w >= 13) B.put(x + 10, g - 1, 'm'); B.put(x + 5, g - 3, '*'); return w; },
  // the high road home: appears when the egg is taken, runs above everything between skyStart and skyEnd
  skyStart: (B, x) => { B.sky = x; return 0; },
  skyEnd: (B, x, g) => { B.G(x, x + 5); B.put(x + 4, g - 2, '+'); B.put(x + 2, g - 4, '+'); B.f(B.sky, x, g - 6, g - 6, '+'); for (let sx = B.sky + 2; sx < x - 1; sx += 5) B.put(sx, g - 8, '*'); return 6; },
  bossField: (B, x, g) => { B.G(x, x + 15); B.put(x + 4, g - 1, 'M'); B.put(x + 11, g - 1, 'M'); B.put(x + 7, g - 1, 'm'); B.put(x + 13, g - 1, 'm'); B.put(x + 4, g - 6, '*'); B.put(x + 11, g - 6, '*'); return 16; },
  bossLogs: (B, x, g) => { B.G(x, x + 15); B.f(x + 1, x + 2, g - 3, g - 3, '#'); B.put(x + 2, g - 4, 'J'); B.put(x + 14, g - 1, '#'); B.put(x + 8, g - 1, 'M'); B.put(x + 8, g - 6, '*'); return 16; },
  flag: (B, x, g) => { B.G(x, x + 2); B.put(x + 1, g - 1, 'P'); return 3; },
  nest: (B, x, g) => { B.G(x, x + 9); B.put(x + 5, g - 1, 'E'); B.f(x + 9, x + 9, 0, g - 1, '#'); return 10; },
};

function plan(names) { const B = new Grid(13); for (const n of names) Array.isArray(n) ? B.add(n[0], n[1]) : B.add(n); return B.out(); }

function oak() { // vertical level: climb the tree, then fall all the way home with the owl behind you
  const B = new Grid(34), g = 32;
  B.f(0, 25, g, 33, '#'); B.put(3, g - 1, 'H');
  const plat = (x0, x1, y) => B.f(x0, x1, y, y, '#');
  plat(8, 12, 30); plat(14, 18, 28); plat(20, 25, 26); B.put(24, 25, 'M');
  plat(15, 21, 21); B.put(16, 20, 'P'); plat(9, 13, 19); plat(3, 7, 17); plat(9, 13, 15);
  B.f(15, 19, 13, 13, 'c'); plat(20, 25, 11); B.put(24, 10, 'M');
  plat(11, 22, 6); B.put(13, 5, 'E');
  for (const [x, y] of [[10, 28], [16, 26], [22, 23], [11, 17], [5, 15], [17, 11], [21, 4]]) B.put(x, y, '*');
  B.f(17, 18, g - 1, g - 1, '^'); B.put(10, 18, 'b');
  return B.out();
}

function pine() { // second climb: a mushroom, a mole ledge, crumbling planks and a fan near the top
  const B = new Grid(38), g = 36;
  B.f(0, 27, g, 37, '#'); B.put(3, g - 1, 'H');
  const plat = (x0, x1, y) => B.f(x0, x1, y, y, '#');
  plat(8, 12, 34); plat(14, 18, 32); plat(20, 26, 30); B.put(25, 29, 'M');
  plat(15, 21, 25); B.put(16, 24, 'P'); plat(9, 13, 23); plat(3, 7, 21); B.put(5, 20, 'm'); plat(9, 13, 19);
  B.f(15, 19, 17, 17, 'c'); plat(21, 25, 15); B.put(26, 15, 'F'); B.put(26, 16, '#'); B.put(27, 15, '#');
  plat(19, 25, 10); B.put(21, 9, 'P'); plat(12, 17, 8); plat(3, 10, 6); B.put(5, 5, 'E');
  for (const [x, y] of [[10, 32], [16, 30], [23, 27], [11, 21], [5, 18], [17, 15], [26, 11], [14, 6]]) B.put(x, y, '*');
  B.f(17, 18, g - 1, g - 1, '^'); B.put(10, 22, 'b');
  return B.out();
}

const G = (base, max, gain, wake) => ({ base, max, gain, wake });
const LEVELS = [
  { id: 'w1-01', name: 'First Roll', theme: 0, egg: 'plain', pet: 0, hint: 'Roll to the egg at the end  →', guard: G(130, 220, 0.22, 1.1),
    tiles: plan(['home', 'hop', 'bridge', 'steps', 'flag', 'skyStart', 'hop', ['crumble', { n: 4 }], 'skyEnd', 'steps', 'nest']) },
  { id: 'w1-02', name: 'Bug Garden', theme: 1, egg: 'feather', pet: 1, hint: 'Mushrooms bounce you high.  Jump ON the bugs!', guard: G(138, 230, 0.22, 1.0),
    tiles: plan(['home', 'beetles', 'wallSpring', 'flag', 'skyStart', ['beetles', { w: 10 }], ['bridge', { high: 1 }], 'skyEnd', 'wallSpring', 'crumble', 'hop', 'nest']) },
  { id: 'w1-03', name: 'Training Day', theme: 0, egg: 'plain', pet: 2, hint: 'Find the training wheel and RUN on it!', guard: G(138, 228, 0.22, 1.0),
    tiles: plan(['home', 'beetles', 'hop', 'roller', 'flag', 'steps', 'crumble', 'hop', 'nest']) },
  { id: 'w1-04', name: 'Crate Mates', theme: 1, egg: 'plain', pet: 3, hint: 'Push the crate!  It can be a step or a key.', guard: G(138, 228, 0.22, 1.0),
    tiles: plan(['home', 'crateStep', 'hop', 'cratePlate', 'flag', 'mover', 'crateStep', 'cratePlate', 'nest']) },
  { id: 'w1-05', name: 'Up the Old Oak', theme: 1, egg: 'feather', pet: 4, hint: 'Climb to the very top  ↑', guard: G(140, 235, 0.22, 1.0), tiles: oak() },
  { id: 'w1-06', name: 'Burrow Hill', theme: 0, egg: 'plain', pet: 5, hint: 'Dive into a burrow to pop out of its twin!', guard: G(142, 236, 0.23, 1.0),
    tiles: plan(['home', 'burrow', 'crumble', 'burrowUp', 'flag', ['beetles', { w: 10 }], 'burrow', 'roller', 'flag', 'burrowUp', 'nest']) },
  { id: 'w1-07', name: 'Wake Up!', theme: 1, egg: 'plain', pet: 6, mode: 'escape', hint: '', guard: G(150, 238, 0.23, 1.8),
    tiles: plan(['home', 'hop', 'bridge', 'wallSpring', 'flag', 'crumble', ['beetles', { w: 10 }], 'steps', 'flag', 'bridge', 'hop', 'wallSpring', 'nest']) },
  { id: 'w1-08', name: 'Rock and Roll', theme: 3, egg: 'stone', pet: 7, hint: 'Cracked rocks block the tunnel... for now.', guard: G(148, 246, 0.24, 1.0),
    tiles: plan(['home', 'hop', 'altRoute', 'flag', ['beetles', { w: 10 }], 'crateStep', 'altRoute', 'mover', 'flag', 'cratePlate', 'nest']) },
  { id: 'w1-09', name: 'Timber!', theme: 1, egg: 'plain', pet: 8, hint: 'Logs!  Jump over them, or land right on top.', guard: G(142, 236, 0.23, 1.0),
    tiles: plan(['home', 'logRun', 'hop', 'flag', ['logRun', { hard: 1 }], 'flag', 'skyStart', ['beetles', { w: 8 }], 'crumble', 'skyEnd', ['logRun', { w: 16, hard: 1 }], 'nest']) },
  { id: 'w1-10', name: 'Fling!', theme: 0, egg: 'plain', pet: 9, hint: 'Stand on the low end of the seesaw and wait...', guard: G(142, 236, 0.23, 1.0),
    tiles: plan(['home', 'catapult', 'flag', 'catapultUp', ['beetles', { w: 8 }], 'flag', 'catapult', 'wallSpring', 'catapultUp', 'nest']) },
  { id: 'w1-11', name: 'Mole Hills', theme: 3, egg: 'spark', pet: 10, hint: 'Shh... the moles are asleep.  For now.', guard: G(146, 240, 0.23, 1.0),
    tiles: plan(['home', 'moleRun', 'hop', 'flag', ['moleRun', { w: 13 }], 'bridge', 'flag', 'skyStart', 'moleRun', 'crumble', 'skyEnd', 'logRun', 'nest']) },
  { id: 'w1-12', name: 'Double Trouble', theme: 1, egg: 'plain', pet: 11, mode: 'escape', hint: '', guard: G(150, 238, 0.23, 1.8),
    tiles: plan(['home', 'hop', 'catapult', 'flag', 'moleRun', 'logRun', 'flag', 'catapultUp', 'bridge', 'moleRun', 'nest']) },
  { id: 'w1-13', name: 'The Tall Pine', theme: 1, egg: 'feather', pet: 12, hint: 'Higher than the old oak!  ↑', guard: G(142, 238, 0.22, 1.0), tiles: pine() },
  { id: 'w1-14', name: 'Almost There', theme: 2, egg: 'spark', pet: 13, hint: 'Everything you learned, in one run.', guard: G(148, 244, 0.24, 1.0),
    tiles: plan(['home', 'wallSpring', ['logRun', { hard: 1 }], 'flag', 'cratePlate', 'catapultUp', 'flag', 'burrow', ['moleRun', { w: 13 }], 'mover', 'flag', 'catapult', 'nest']) },
  { id: 'w1-15', name: 'Mama Owl', theme: 4, egg: 'plain', pet: 14, boss: true, dash: true, hint: 'She is BIG.  Jump on her head or dash ⚡ into her, 3 times!', guard: G(150, 236, 0.25, 1.4),
    tiles: plan(['home', ['flat', { w: 4 }], 'bossField', 'flag', 'bossLogs', 'bossField', 'nest']) },
];

mkdirSync('src/levels/w1', { recursive: true });
for (const L of LEVELS) writeFileSync(`src/levels/w1/${L.id}.json`, JSON.stringify(L, null, 1) + '\n');
writeFileSync('src/levels/index.ts', `// Generated by tools/gen-levels.mjs (the list only; the JSON files are the levels).
import type { LevelData } from '../core/types';
${LEVELS.map((L, i) => `import l${i} from './w1/${L.id}.json';`).join('\n')}

export const WORLD1 = [${LEVELS.map((_, i) => `l${i}`).join(', ')}] as LevelData[];
`);
console.log('levels:', LEVELS.map((L) => `${L.id} ${L.tiles[0].length}x${L.tiles.length}`).join(', '));
