export const FOCUS_MUSIC_KEY = 'pp-focus-music-url';

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/,
  /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
];

export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function loadFocusMusicUrl(): string {
  try {
    return localStorage.getItem(FOCUS_MUSIC_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveFocusMusicUrl(url: string): void {
  try {
    localStorage.setItem(FOCUS_MUSIC_KEY, url.trim());
  } catch {
    /* storage unavailable */
  }
}