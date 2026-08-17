export const SHARE_REF_KEY = 'pp-share-ref';
export const SHARE_PROMPT_PREF_KEY = 'pp-share-prompts';

export function readShareRef(): string | null {
  try {
    return sessionStorage.getItem(SHARE_REF_KEY);
  } catch {
    return null;
  }
}

export function storeShareRef(artifactId: string): void {
  try {
    sessionStorage.setItem(SHARE_REF_KEY, artifactId);
  } catch {
    return;
  }
}

export function clearShareRef(): void {
  try {
    sessionStorage.removeItem(SHARE_REF_KEY);
  } catch {
    return;
  }
}

export function sharePromptsEnabled(): boolean {
  try {
    return localStorage.getItem(SHARE_PROMPT_PREF_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSharePromptsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SHARE_PROMPT_PREF_KEY, enabled ? 'on' : 'off');
  } catch {
    return;
  }
}

export function shareUrlFor(artifactId: string): string {
  return `${window.location.origin}/share/focus/${artifactId}`;
}