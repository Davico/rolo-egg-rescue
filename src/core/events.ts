// The simulation never touches the screen or the speakers: it only emits events.
// The renderer turns them into particles, the audio module into sounds, and the bot ignores them.
export type Listener = (name: string, x: number, y: number, a?: string | number, b?: number) => void;

const subs: Listener[] = [];
let quiet = false;

export function on(f: Listener): void { subs.push(f); }
export function setQuiet(q: boolean): void { quiet = q; }
export function ev(name: string, x = 0, y = 0, a?: string | number, b?: number): void {
  if (quiet) return;
  for (const f of subs) f(name, x, y, a, b);
}
