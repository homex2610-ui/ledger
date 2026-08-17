import { useEffect, useState } from 'react';

export type ReminderPrefs = {
  enabled: boolean;
  intervalMinutes: number;
  startHour: number;
  endHour: number;
  nextAt: number | null;
};

export const REMINDER_INTERVALS = [30, 60, 90, 120];

export const REMINDER_PREFS_KEY = 'pp-reminder-prefs';

const DEFAULTS: ReminderPrefs = { enabled: false, intervalMinutes: 60, startHour: 8, endHour: 22, nextAt: null };

export function loadReminderPrefs(): ReminderPrefs {
  try {
    const raw = localStorage.getItem(REMINDER_PREFS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<ReminderPrefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveReminderPrefs(prefs: ReminderPrefs): void {
  localStorage.setItem(REMINDER_PREFS_KEY, JSON.stringify(prefs));
}

export function hourLabel(hour: number): string {
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function useFocusReminder(): { show: boolean; dismiss: () => void } {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const tick = () => {
      const prefs = loadReminderPrefs();
      if (!prefs.enabled) {
        setShow(false);
        return;
      }
      const now = Date.now();
      if (now < (prefs.nextAt ?? 0)) {
        setShow(false);
        return;
      }
      const hour = new Date(now).getHours();
      if (hour < prefs.startHour || hour >= prefs.endHour) {
        setShow(false);
        return;
      }
      setShow(true);
    };
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const dismiss = () => {
    setShow(false);
    const prefs = loadReminderPrefs();
    saveReminderPrefs({ ...prefs, nextAt: Date.now() + prefs.intervalMinutes * 60_000 });
  };
  return { show, dismiss };
}