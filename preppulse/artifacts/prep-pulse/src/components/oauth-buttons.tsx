import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { ensureGisCsrfToken } from '@/lib/utils';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string; select_by?: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let gisScriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;
  gisScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google sign-in'));
    document.head.appendChild(script);
  });
  return gisScriptPromise;
}

export function GoogleOAuthButton({ label, onStart, disabled }: { label: string; onStart: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={disabled}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-bold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
      data-testid="button-google-oauth"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12.04 12.04 0 0 0 0 10.76l3.98-3.09Z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
      </svg>
      {label}
    </button>
  );
}

export function GoogleSignInButton({ clientId, onCredential, disabled }: { clientId: string | null; onCredential: (response: { credential: string; select_by?: string }) => void; disabled?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!clientId) return;
    ensureGisCsrfToken();
    let cancelled = false;
    loadGisScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google!.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => onCredentialRef.current(response),
        });
        window.google!.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          width: 300,
          text: 'continue_with',
        });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (disabled) {
    return <div className="flex h-11 w-full items-center justify-center rounded-xl bg-secondary/60" aria-busy="true"><LoaderCircle size={16} className="animate-spin text-muted-foreground" /></div>;
  }
  if (!clientId) {
    return <GoogleOAuthButton label="Continue with Google" onStart={() => undefined} />;
  }
  if (status === 'error') {
    return <div className="flex h-11 w-full items-center justify-center rounded-xl border border-border/70 bg-secondary/30 text-xs font-semibold text-muted-foreground">Google sign-in could not load.</div>;
  }
  return <div className="flex justify-center" ref={containerRef} data-testid="google-signin-button" />;
}

export function DiscordOAuthButton({ label, onStart, disabled }: { label: string; onStart: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={disabled}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-bold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
      data-testid="button-discord-oauth"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
      </svg>
      {label}
    </button>
  );
}