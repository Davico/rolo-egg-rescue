import type { LevelData } from './types';

export interface Save { best: Record<string, number>; pets: Record<string, 'n' | 's'>; wheels: Record<string, 1>; dash: boolean; mute: boolean }

const KEY = 'rolo_v4', KEY_LEVELS = 'rolo_levels';
const blank = (): Save => ({ best: {}, pets: {}, wheels: {}, dash: false, mute: false });

function read<T>(key: string): T | null { try { const t = localStorage.getItem(key); return t ? (JSON.parse(t) as T) : null; } catch { return null; } }
function write(key: string, v: unknown): void { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage can be unavailable: play on without saving */ } }

export const SV: Save = { ...blank(), ...(read<Save>(KEY) ?? {}) };
export function save(): void { write(KEY, SV); }
export function wheelCount(): number { return Object.keys(SV.wheels).length; }
export function spdLv(): number { return Math.min(3, Math.ceil(wheelCount() / 2)); }
export function jmpLv(): number { return Math.min(3, Math.floor(wheelCount() / 2)); }

export function loadCustom(): LevelData[] { return read<LevelData[]>(KEY_LEVELS) ?? []; }
export function saveCustom(list: LevelData[]): void { write(KEY_LEVELS, list); }
