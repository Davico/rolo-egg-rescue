// All sound is synthesized with WebAudio: no files to download, a few hundred bytes of code.
import { on } from './core/events';
import { SV } from './core/save';

let ac: AudioContext | null = null, master: GainNode | null = null, musicTimer = 0, musicStep = 0, mood: 'calm' | 'chase' | 'off' = 'off', theme = 0;

export function unlock(): void {
  if (ac) { if (ac.state === 'suspended') void ac.resume(); return; }
  try { ac = new AudioContext(); master = ac.createGain(); master.gain.value = SV.mute ? 0 : 0.5; master.connect(ac.destination); } catch { ac = null; }
}
export function setMute(m: boolean): void { if (master) master.gain.value = m ? 0 : 0.5; }

function tone(f0: number, f1: number, dur: number, type: OscillatorType = 'square', vol = 0.2, delay = 0): void {
  if (!ac || !master) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur: number, vol = 0.25, hp = 800): void {
  if (!ac || !master) return;
  const n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol; s.buffer = buf; s.connect(f); f.connect(g); g.connect(master); s.start();
}
const N = (semi: number) => 261.63 * Math.pow(2, semi / 12);

const SFX: Record<string, (a?: number) => void> = {
  jump: () => tone(300, 620, 0.13, 'square', 0.12),
  jump2: () => { tone(500, 900, 0.12, 'square', 0.12); tone(700, 1200, 0.12, 'triangle', 0.1, 0.05); },
  bounce: () => tone(180, 760, 0.22, 'sine', 0.3),
  star: (n = 1) => { tone(N(12 + (n % 5) * 2), N(12 + (n % 5) * 2), 0.09, 'triangle', 0.22); tone(N(19 + (n % 5) * 2), N(19 + (n % 5) * 2), 0.16, 'triangle', 0.22, 0.08); },
  die: () => tone(420, 70, 0.35, 'sawtooth', 0.16),
  egg: () => [0, 4, 7, 12].forEach((s, i) => tone(N(s + 12), N(s + 12), 0.14, 'square', 0.14, i * 0.08)),
  owl: () => { tone(520, 380, 0.22, 'sine', 0.3); tone(520, 330, 0.3, 'sine', 0.3, 0.26); },
  dash: () => noise(0.18, 0.25, 1500),
  smash: () => { noise(0.22, 0.35, 300); tone(140, 50, 0.2, 'square', 0.15); },
  stomp: () => tone(260, 90, 0.14, 'square', 0.18),
  flag: () => { tone(N(7), N(7), 0.1, 'triangle', 0.2); tone(N(12), N(12), 0.2, 'triangle', 0.2, 0.1); },
  burrow: () => tone(200, 600, 0.18, 'sine', 0.25),
  crumble: () => noise(0.25, 0.18, 500),
  plate: () => tone(700, 900, 0.07, 'square', 0.12),
  plateOff: () => tone(600, 400, 0.07, 'square', 0.1),
  run: (c = 0) => tone(200 + c * 500, 240 + c * 500, 0.05, 'square', 0.07),
  launch: () => { tone(200, 1400, 0.5, 'sawtooth', 0.16); noise(0.4, 0.2, 1000); },
  bonk: () => { tone(900, 200, 0.25, 'square', 0.18); tone(1200, 1200, 0.08, 'triangle', 0.2, 0.25); },
  win: () => [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(N(s), N(s), 0.2, 'triangle', 0.2, i * 0.09)),
  power: () => [0, 7, 12, 19].forEach((s, i) => tone(N(s + 12), N(s + 12), 0.22, 'square', 0.13, i * 0.1)),
  hatch: () => { noise(0.1, 0.3, 2000); [12, 16, 19, 24].forEach((s, i) => tone(N(s), N(s), 0.25, 'triangle', 0.22, 0.15 + i * 0.1)); },
  click: () => tone(600, 800, 0.05, 'square', 0.1),
};
export function sfx(name: string, a?: number): void { SFX[name]?.(a); }
on((name, _x, _y, a, b) => { if (name === 'sfx' && typeof a === 'string') sfx(a, b); });

// Tiny step sequencer: a bass line and a pentatonic lead per theme. "chase" is the same tune, faster and tenser.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const LEAD = [[0, 2, 4, 2, 5, 4, 2, -1, 0, 2, 4, 5, 7, 5, 4, -1], [4, -1, 2, 0, 2, -1, 4, 5, 4, -1, 2, 0, -1, 2, 0, -1], [0, -1, 0, 3, -1, 2, 0, -1, 5, -1, 4, 2, -1, 0, 2, -1], [7, 5, 4, -1, 5, 4, 2, -1, 4, 2, 0, -1, 2, 4, 5, -1], [0, 0, 3, 0, 5, 0, 3, -1, 0, 0, 3, 0, 6, 5, 3, -1]];
const BASS = [0, 0, 5, 5, 3, 3, 4, 4];
const ROOT = [0, -3, -5, 2, -7];
export function music(m: 'calm' | 'chase' | 'off', th = 0): void {
  if (m === mood && th === theme) return; mood = m; theme = th; musicStep = 0;
  window.clearInterval(musicTimer); if (m === 'off') return;
  musicTimer = window.setInterval(() => {
    if (!ac || ac.state !== 'running') return;
    const i = musicStep++ % 16, root = ROOT[theme % 5], l = LEAD[theme % 5][i];
    if (i % 2 === 0) tone(N(root + SCALE[BASS[(i / 2) | 0] % 8] - 24), N(root + SCALE[BASS[(i / 2) | 0] % 8] - 24), 0.22, 'triangle', 0.16);
    if (l >= 0) tone(N(root + SCALE[l]), N(root + SCALE[l]), 0.14, mood === 'chase' ? 'square' : 'triangle', mood === 'chase' ? 0.05 : 0.07);
    if (mood === 'chase' && i % 2 === 1) noise(0.03, 0.05, 4000);
  }, m === 'chase' ? 135 : 210);
}
