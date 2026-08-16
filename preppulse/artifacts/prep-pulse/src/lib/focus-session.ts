export type FocusMode = 'pomodoro' | 'flow';
export type FocusPhase = 'focus' | 'short_break' | 'long_break';

export interface FocusSession {
  epoch: number;
  base: number;
  running: boolean;
  mode: FocusMode;
  phase: FocusPhase;
  cycle: number;
  subject: string;
  savedAt?: number;
}

const STORAGE_KEY = 'pp-focus-session';
const MAX_SESSION_AGE_MS = 12 * 60 * 60 * 1000;

export function loadFocusSession(): FocusSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FocusSession;
    if (typeof parsed.epoch !== 'number' || typeof parsed.base !== 'number' || typeof parsed.running !== 'boolean') return null;
    if (typeof parsed.mode !== 'string' || typeof parsed.phase !== 'string' || typeof parsed.cycle !== 'number') return null;
    if (typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > MAX_SESSION_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveFocusSession(session: FocusSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, savedAt: Date.now() }));
  } catch {
    return;
  }
}

export function clearFocusSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function focusSessionSeconds(session: FocusSession): number {
  if (!session.running) return session.base;
  const elapsed = Math.floor((Date.now() - session.epoch) / 1000);
  if (session.mode === 'flow') return session.base + elapsed;
  return Math.max(0, session.base - elapsed);
}
