import { twMerge } from 'tailwind-merge';

import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Two-letter avatar initials from a handle, e.g. "demo-user" → "DU". */
export function initialsFor(handle: string): string {
  return (
    handle
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || 'PP'
  );
}

export const browserTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Reads the g_csrf_token cookie set by Google Identity Services (GIS). */
export function getGisCsrfToken(): string | null {
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('g_csrf_token='));
  if (!match) return null;
  return decodeURIComponent(match.slice('g_csrf_token='.length));
}
