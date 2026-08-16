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

/**
 * Ensures a g_csrf_token cookie exists before a Google sign-in flow starts.
 *
 * The GIS library only writes this cookie in its redirect flows; the default
 * popup and FedCM flows return the credential to the callback without ever
 * setting it, which left the double-submit check with nothing to read. We
 * set it ourselves (same name, random value, per page load) so the callback
 * always has a token to send and the server's cookie == body check passes.
 */
export function ensureGisCsrfToken(): void {
  if (getGisCsrfToken()) return;
  const value = Array.from(crypto.getRandomValues(new Uint32Array(4))).map((n) => n.toString(16)).join('');
  const parts = [`g_csrf_token=${encodeURIComponent(value)}`, 'path=/', 'SameSite=Lax'];
  const isLocalHttp = location.protocol === 'http:' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  if (!isLocalHttp) parts.push('Secure');
  document.cookie = parts.join('; ');
}
