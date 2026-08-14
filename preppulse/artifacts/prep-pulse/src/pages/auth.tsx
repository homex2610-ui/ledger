import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetAuthDiscordAuthorizeQueryKey, getGetMeQueryKey, useGetAuthDiscordAuthorize, useGetAuthOauthProviders, useGoogleAuth, type AuthResponse } from '@workspace/api-client-react';
import { GoogleSignInButton, GoogleOAuthButton, DiscordOAuthButton } from '@/components/oauth-buttons';
import { DashboardBackdrop } from '@/components/dashboard-backdrop';
import { getGisCsrfToken } from '@/lib/utils';

function useOauthQueryNotice(): string | null {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    const provider = params.get('provider');
    if (!oauth) return;
    const providerLabel = provider === 'google' ? 'Google' : provider === 'discord' ? 'Discord' : null;
    if (oauth === 'error') setNotice(`${providerLabel ? providerLabel + ' ' : ''}sign-in failed. Try again.`);
    if (oauth === 'conflict') setNotice(`This email already belongs to an account. If it\u2019s your account, sign in with the provider that created it, then connect ${providerLabel ?? 'the provider'} in Settings.`);
    if (oauth === 'success') setNotice('Signed in.');
    window.history.replaceState({}, '', window.location.pathname);
  }, []);
  return notice;
}

export default function AuthPage({ onAuthed }: { onAuthed: (auth: AuthResponse) => void }) {
  const queryClient = useQueryClient();
  const providers = useGetAuthOauthProviders();
  const googleAuth = useGoogleAuth();
  const discordAuthorize = useGetAuthDiscordAuthorize({ link: false }, { query: { queryKey: getGetAuthDiscordAuthorizeQueryKey({ link: false }), enabled: false } });
  const [error, setError] = useState<string | null>(null);
  const notice = useOauthQueryNotice();

  const googleEnabled = providers.data?.google.enabled ?? false;
  const discordEnabled = providers.data?.discord.enabled ?? false;
  const pending = googleAuth.isPending;

  const complete = (auth: AuthResponse) => {
    queryClient.setQueryData(getGetMeQueryKey(), auth);
    onAuthed(auth);
  };

  const handleGoogleCredential = (credential: string) => {
    setError(null);
    const csrfToken = getGisCsrfToken();
    if (!csrfToken) {
      setError('Google sign-in state expired. Reload the page and try again.');
      return;
    }
    googleAuth.mutate(
      { data: { credential, csrfToken } },
      {
        onSuccess: (auth) => complete(auth),
        onError: (err) => {
          const message = err instanceof Error ? err.message : '';
          const parsed = /"code":"([a-z_]+)"/.exec(message);
          if (parsed?.[1] === 'account_linking_required') {
            setError('This email already belongs to an account. If it\u2019s yours, sign in with the provider that created it, then connect Google in Settings.');
          } else if (parsed?.[1] === 'invalid_credential' || parsed?.[1] === 'csrf_mismatch') {
            setError('Google sign-in failed — the credential was invalid or expired. Try again.');
          } else {
            setError('Google sign-in is unavailable right now. Try again in a moment.');
          }
        },
      },
    );
  };

  const handleDiscord = async () => {
    setError(null);
    try {
      const result = await discordAuthorize.refetch();
      if (result.data?.url) {
        window.location.href = result.data.url;
      } else {
        setError('Discord sign-in is unavailable right now.');
      }
    } catch {
      setError('Discord sign-in is unavailable right now.');
    }
  };

  const handleGoogleUnavailable = () => {
    setError('Google sign-in isn\u2019t configured yet — use Discord or your email for now.');
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 scale-105 blur-[14px] saturate-[.85]">
        <div className="pt-10"><DashboardBackdrop /></div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-background/55" />
      <div className="absolute inset-0 flex items-center justify-center px-5 py-10">
        <div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-[0_24px_80px_hsl(186_32%_16%/.25)] backdrop-blur-xl md:grid-cols-[1.1fr_1fr]">
          <div className="hidden flex-col justify-between border-r border-border/70 p-10 md:flex">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent font-display text-xl font-bold text-accent-foreground shadow-sm">P</span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-display text-lg font-bold leading-none tracking-[-.02em]">PrepPulse</span>
                  <span className="font-mono-custom text-[9px] uppercase tracking-[.2em] text-muted-foreground">keep moving</span>
                </span>
              </div>
              <p className="mt-10 font-mono-custom text-[9px] uppercase tracking-[.28em] text-primary">A study companion for JEE / NEET prep</p>
              <p className="mt-4 max-w-md font-display text-[2.1rem] font-bold leading-[1.08] tracking-[-.03em]">Every session accounted.<br />Every chapter a step closer.</p>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">A daily pulse, syllabus coverage, spaced recall and a mistake ledger — one instrument, day by day, until the exam.</p>
            </div>
            <p className="font-mono-custom text-[8.5px] uppercase tracking-[.2em] text-muted-foreground/60">Study · Recall · Tests · Compete · Circles</p>
          </div>

          <div className="p-7 md:p-10">
            <div className="mb-6 flex items-center gap-3 md:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-accent-foreground shadow-sm">P</span>
              <span className="font-display text-lg font-bold tracking-[-.02em]">PrepPulse</span>
            </div>
            <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Continue as you</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-[-.04em]">Sign in to keep your pulse</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">One account for your sessions, recall and circles. Pick a provider to continue.</p>

            <div className="mt-6 space-y-2.5">
              {googleEnabled
                ? <GoogleSignInButton clientId={providers.data!.google.clientId ?? null} onCredential={handleGoogleCredential} disabled={pending} />
                : <GoogleOAuthButton label="Continue with Google" onStart={handleGoogleUnavailable} disabled={pending} />}
              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-border" />
                <span className="font-mono-custom text-[9px] uppercase tracking-[.18em] text-muted-foreground">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <DiscordOAuthButton label="Continue with Discord" onStart={discordEnabled ? handleDiscord : () => setError('Discord sign-in isn\u2019t configured yet.')} disabled={pending} />
            </div>

            {pending && <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground"><LoaderCircle size={14} className="animate-spin" /> Signing you in…</div>}
            {error && <div className="mt-4 rounded-xl border border-accent/25 bg-accent/10 px-4 py-3 text-xs font-semibold text-accent" data-testid="auth-error">{error}</div>}
            {notice && <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs font-semibold text-primary" data-testid="auth-notice">{notice}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}