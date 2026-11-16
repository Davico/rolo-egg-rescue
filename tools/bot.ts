// Headless playtest: a look-ahead bot must finish every built-in level, with starting powers and with maxed powers.
// It needs no hints from the level: a flood-fill distance map (through burrows too) tells it which way is "forward".
// Run: npm test            (all levels)      npm test -- w1-05     (one level)
import { createSim, solidAt, step, type Powers } from '../src/core/sim';
import { setQuiet } from '../src/core/events';
import { T, type Input, type LevelData, type Sim } from '../src/core/types';
import { WORLD1 } from '../src/levels/index';

setQuiet(true);
const DT = 1 / 120;
type Field = Float32Array;

function field(S: Sim, withEgg: boolean, gx: number, gy: number): Field {
  const { cols, rows, g } = S, d = new Float32Array(cols * rows).fill(1e6);
  const wall = (x: number, y: number) => { const c = g[y][x]; return c === '#' || c === 'R' || c === 'F' || c === 'c' || (c === 'k' && !(withEgg && S.egg === 'stone')) || (c === 'o' && !withEgg) || (c === '+' && withEgg); };
  const q: number[] = [gx + gy * cols]; d[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % cols, y = (i / cols) | 0, nd = d[i] + 1;
    const push = (nx: number, ny: number) => { if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || wall(nx, ny)) return; const j = nx + ny * cols; if (d[j] > nd) { d[j] = nd; q.push(j); } };
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    const c = g[y][x];
    if (c >= '1' && c <= '9') for (let yy = 0; yy < rows; yy++) for (let xx = 0; xx < cols; xx++) if (g[yy][xx] === c && (xx !== x || yy !== y)) push(xx, yy);
  }
  return d;
}

/**
 * Platformer nav graph: nodes are cells you can stand in, edges are walk / jump / drop / bounce / burrow / lift / fan / wheel flight.
 * Returns the distance of every cell to the goal (reverse Dijkstra), or 1e6 where there is no route.
 */
function nav(S: Sim, withEgg: boolean, gx: number, gy: number): Field {
  const { cols, rows, g } = S, N = cols * rows;
  const wall = (x: number, y: number) => { if (x < 0 || x >= cols) return true; if (y < 0 || y >= rows) return false; const c = g[y][x]; return c === '#' || c === 'R' || c === 'F' || c === 'c' || (c === 'k' && !(withEgg && S.egg === 'stone')) || (c === 'o' && !withEgg) || (c === '+' && withEgg); };
  const stand = new Uint8Array(N), ride: [number, number][] = [];
  for (let y = 0; y < rows - 1; y++) for (let x = 0; x < cols; x++) if (!wall(x, y) && wall(x, y + 1)) stand[x + y * cols] = 1;
  for (const p of S.plats) {
    const x0 = Math.round(p.x0 / T), y0 = Math.round(p.y0 / T) - 1, w = Math.round(p.w / T), ax = Math.round(p.ax / T), ay = Math.round(p.ay / T);
    for (let k = 0; k <= Math.abs(ax) + Math.abs(ay); k++) for (let i = 0; i < w; i++) {
      const x = x0 + i + (ax ? k : 0), y = y0 + (ay ? -k : 0); if (x >= cols || y < 0) continue; stand[x + y * cols] = 1;
      if (ay && k > 0) ride.push([x + (y + 1) * cols, x + y * cols], [x + y * cols, x + (y + 1) * cols]);
    }
  }
  for (const f of S.fans) { const x = f.x / T, y0 = f.y / T - 1; for (let k = 0; k <= 5; k++) { const y = y0 - k; if (y < 0 || wall(x, y)) break; stand[x + y * cols] = 1; if (k > 0) ride.push([x + (y + 1) * cols, x + y * cols], [x + y * cols, x + (y + 1) * cols]); } }
  const rev: [number, number][][] = Array.from({ length: N }, () => []);
  const edge = (a: number, b: number, c: number) => { rev[b].push([a, c]); };
  for (const [a, b] of ride) edge(a, b, 1);
  const clearCol = (x: number, ya: number, yb: number) => { for (let y = Math.min(ya, yb); y <= Math.max(ya, yb); y++) if (wall(x, y)) return false; return true; };
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const a = x + y * cols; if (!stand[a]) continue;
    const c = g[y][x], up = c === 'M' ? 6 : 2;
    for (let dx = -4; dx <= 4; dx++) for (let y2 = Math.max(0, y - up); y2 < rows; y2++) {
      const x2 = x + dx; if (x2 < 0 || x2 >= cols || (dx === 0 && y2 === y)) continue; const b = x2 + y2 * cols; if (!stand[b]) continue;
      if (y2 === y && Math.abs(dx) === 1) { edge(a, b, 1); continue; }
      if (y2 > y && !clearCol(x2, y, y2)) continue;                 // drops need a free fall line
      if (y2 < y && !clearCol(x, y2, y)) continue;                  // jumps need head room
      let blocked = false; for (let xi = Math.min(x, x2) + 1; xi < Math.max(x, x2); xi++) if (wall(xi, Math.min(y, y2) - 1)) blocked = true;
      if (blocked) continue;                                          // no jumping through walls
      edge(a, b, Math.abs(dx) + Math.abs(y2 - y) * (y2 < y ? 1.5 : 0.4) + 1);
    }
    if (c >= '1' && c <= '9') for (let yy = 0; yy < rows; yy++) for (let xx = 0; xx < cols; xx++) if (g[yy][xx] === c && (xx !== x || yy !== y)) edge(a, xx + yy * cols, 1);
    if (!withEgg && y + 1 < rows && g[y + 1][x] === 'R') for (let dx = 11; dx <= 17; dx++) if (x + dx < cols && stand[x + dx + y * cols]) edge(a, x + dx + y * cols, 8);
  }
  const d = new Float32Array(N).fill(1e6), done = new Uint8Array(N), goal = gx + gy * cols;
  d[goal] = 0; const open = [goal];
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (d[open[i]] < d[open[bi]]) bi = i;
    const u = open.splice(bi, 1)[0]; if (done[u]) continue; done[u] = 1;
    for (const [v, c] of rev[u]) if (d[u] + c < d[v]) { d[v] = d[u] + c; open.push(v); }
  }
  return d;
}

interface Ctx { toEgg: Field; toHome: Field; navEgg: Field; navHome: Field }
function score(S: Sim, C: Ctx): number {
  const n = S.hasEgg ? C.navHome : C.navEgg, tx = Math.floor(S.px / T), ty = Math.floor(S.py / T);
  let nb = 1e6, npen = 0;
  for (let dx = -1; dx <= 1; dx++) { const x = tx + dx; if (x < 0 || x >= S.cols) continue; for (let y = Math.max(0, ty); y < S.rows; y++) { const v = n[x + y * S.cols]; if (v < 1e6) { const sc = v * T + Math.abs(S.px - (x * T + 20)) + (y * T + 24 - S.py) * 0.35; if (sc < nb + npen) { nb = sc; npen = 0; } break; } } }
  if (nb < 1e6) return (S.hasEgg ? 1e6 : 0) - nb;
  const f = S.hasEgg ? C.toHome : C.toEgg, cx = Math.max(0, Math.min(S.cols - 1, Math.floor(S.px / T))), cy = Math.max(0, Math.min(S.rows - 1, Math.floor(S.py / T)));
  let best = f[cx + cy * S.cols], bx = cx, by = cy;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= S.cols || y >= S.rows) continue; const v = f[x + y * S.cols]; if (v < best) { best = v; bx = x; by = y; } }
  return (S.hasEgg ? 1e6 : 0) - 1e5 - (best * T + Math.hypot(S.px - (bx * T + 20), S.py - (by * T + 20)));  // off the nav graph: always worse than on it
}

// actions: [direction, jump, dash]
const ACTS: [number, number, number][] = [[1, 0, 0], [1, 1, 0], [0, 0, 0], [-1, 0, 0], [1, 0, 1], [0, 1, 0], [-1, 1, 0], [-1, 0, 1]];
function apply(inp: Input, a: [number, number, number], first: boolean): void { inp.r = a[0] > 0; inp.l = a[0] < 0; inp.j = !!a[1]; if (first && a[1]) inp.jPressed = true; if (first && a[2]) inp.dPressed = true; }
function rollout(base: Sim, C: Ctx, a: [number, number, number], b: [number, number, number], n1: number, n2: number, n3: number): number {
  const S = structuredClone(base), inp: Input = { l: false, r: false, j: false, jPressed: false, dPressed: false }, tries = S.tries;
  let t = 0, sc = -1e9, ph = 0;
  for (const [act, n] of [[a, n1], [b, n2], [b[2] ? ACTS[0] : ([b[0], 0, 0] as [number, number, number]), n3]] as const) { for (let i = 0; i < n; i++) {
    apply(inp, act as [number, number, number], i === 0); step(S, inp, DT); t++;
    if (S.tries !== tries || S.py > (S.rows - 1.4) * T) return -1e8 + t;  // died or fell into a pit: later is better
    if (S.phase === 'home' || S.phase === 'win') return 1e9 - t;
    // the tail only has to prove the move lands somewhere good: keep the best place we stood on
    if (ph < 2) sc = score(S, C); else if (S.ground && i % 5 === 4) sc = Math.max(sc, score(S, C));
  } ph++; }
  return sc;
}

/** Crate-and-plate doors: get behind the nearest crate and push it onto the plate. */
function puzzle(S: Sim): [number, number, number] | null {
  if (S.hasEgg) return null;
  // training wheel: stay on it and keep running until it launches; if we slipped past it to the locked gate, go back
  for (const r of S.rollers) {
    if (r.charge >= 1 || r.gate < 0 || Math.abs(S.py + 16 - r.y) > 60) continue;
    if (S.px >= r.x0 - 4 && S.px <= r.x1 + 4) return [S.px > r.x1 - 10 ? 0 : 1, 0, 0];
    if (S.px > r.x1 && S.px < r.gate * T + 20) return [-1, 0, 0];
  }
  // crate as a step: a wall 3 tiles high with a crate left behind -> go back and push it to the wall
  for (const c of S.crates) {
    if (Math.abs(c.x - S.px) > 7 * T || Math.abs(c.y + 36 - (S.py + 16)) > 50) continue;
    const row = Math.floor((c.y + 18) / T); let wx = -1;
    for (let x = Math.floor((c.x + 36) / T); x <= Math.floor(c.x / T) + 7 && x < S.cols; x++) if (solidAt(S, x, row)) { wx = x; break; }
    if (wx < 0 || !solidAt(S, wx, row - 1) || !solidAt(S, wx, row - 2) || solidAt(S, wx, row - 3)) continue;
    if (c.x + 36 < wx * T - 4 && S.px < wx * T + 20) return S.px > c.x - 6 ? [-1, S.ground && S.px < c.x + 76 ? 1 : 0, 0] : [1, 0, 0];
  }
  if (S.plate) return null;
  const tx = S.px / T, p = S.plates.find((q) => tx > q.tx - 6 && tx < q.tx + 3.2 && Math.abs(q.ty * T - S.py) < 3 * T);
  if (!p) return null;
  const c = S.crates.filter((k) => k.x < p.tx * T + 6).sort((a, b) => b.x - a.x)[0];
  if (!c) return null;
  if (S.px > c.x - 6) return [-1, S.ground && S.px < c.x + 36 + 40 ? 1 : 0, 0];
  return [1, 0, 0];
}

function play(lv: LevelData, pw: Powers) {
  const S = createSim(lv, pw), inp: Input = { l: false, r: false, j: false, jPressed: false, dPressed: false };
  const ex = Math.floor(S.ex / T), ey = S.erow - 1, hx = Math.floor(S.home.x / T), hy = Math.floor(S.home.y / T) - 1;
  const C: Ctx = { toEgg: field(S, false, ex, ey), toHome: field(S, true, hx, hy), navEgg: nav(S, false, ex, ey), navHome: nav(S, true, hx, hy) };
  let t = 0, deaths = 0, lastT = 0, lastX = -999, lastY = -999, unstick = 0;
  const N1 = 10;
  while (t < 120 * 300) {
    let best = -Infinity, pick = ACTS[0];
    for (const a of ACTS) { if (a[2] && !S.dash) continue; for (const b of ACTS) { if (b[2]) continue; const sc = rollout(S, C, a, b, N1, 40, 55) + (a[0] === 1 ? 20 : 0); if (sc > best) { best = sc; pick = a; } } }
    if (t - lastT > 480) { if (Math.hypot(S.px - lastX, S.py - lastY) < 20) unstick = 8; lastT = t; lastX = S.px; lastY = S.py; }
    if (unstick > 0 && S.onR < 0) { unstick--; pick = [-1, unstick % 3 === 0 ? 1 : 0, 0]; }
    const pz = puzzle(S); if (pz) pick = pz;
    if (process.env.DEBUG && t % 120 < N1) console.error((t * DT).toFixed(1), (S.px / T).toFixed(1), (S.py / T).toFixed(1), pick.join(), pz ? "PZ" : "", best.toFixed(0));
    const tries = S.tries;
    for (let i = 0; i < N1; i++) { apply(inp, pick, i === 0); step(S, inp, DT); t++; if (S.phase === 'home' || S.phase === 'win') break; }
    if (S.tries !== tries) deaths++;
    if (S.phase === 'home' || S.phase === 'win') return { ok: true, time: +(t * DT).toFixed(1), deaths, stars: `${S.nStars}/${S.stars.length}` };
    if (!isFinite(S.px + S.py + S.gx + S.gy)) return { ok: false, nan: true };
  }
  return { ok: false, time: +(t * DT).toFixed(1), deaths, hasEgg: S.hasEgg, tile: [+(S.px / T).toFixed(1), +(S.py / T).toFixed(1)] };
}

const only = process.argv[2];
let allOk = true;
for (const lv of WORLD1) {
  if (only && lv.id !== only) continue;
  for (const [label, pw] of [['start', { spd: 0, jmp: 0, dash: false }], ['maxed', { spd: 3, jmp: 3, dash: true }]] as const) {
    if (process.env.MODE && process.env.MODE !== label) continue;
    const r = play(lv, pw); if (!r.ok) allOk = false;
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${lv.id}  ${lv.name.padEnd(16)} ${label}  ${JSON.stringify(r)}`);
  }
}
console.log(allOk ? 'ALL LEVELS PASS' : 'SOME LEVELS FAIL');
process.exit(allOk ? 0 : 1);
