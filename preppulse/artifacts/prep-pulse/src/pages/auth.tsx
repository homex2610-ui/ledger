import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetAuthDiscordAuthorizeQueryKey, getGetMeQueryKey, useGetAuthDiscordAuthorize, useGetAuthOauthProviders, useGoogleAuth, useLogIn, useSignUp, type AuthResponse } from '@workspace/api-client-react';
import { GoogleSignInButton, DiscordOAuthButton } from '@/components/oauth-buttons';
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
    if (oauth === 'conflict') setNotice(`An account with this email already exists. Sign in with email and password, then connect ${providerLabel ?? 'the provider'} in Settings.`);
    if (oauth === 'success') setNotice('Signed in.');
    window.history.replaceState({}, '', window.location.pathname);
  }, []);
  return notice;
}

export default function AuthPage({ onAuthed }: { onAuthed: (auth: AuthResponse) => void }) {
  const queryClient = useQueryClient();
  const signUp = useSignUp();
  const logIn = useLogIn();
  const providers = useGetAuthOauthProviders();
  const googleAuth = useGoogleAuth();
  const discordAuthorize = useGetAuthDiscordAuthorize({ link: false }, { query: { queryKey: getGetAuthDiscordAuthorizeQueryKey({ link: false }), enabled: false } });
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notice = useOauthQueryNotice();
  const pending = signUp.isPending || logIn.isPending || googleAuth.isPending;

  const complete = (auth: AuthResponse) => {
    queryClient.setQueryData(getGetMeQueryKey(), auth);
    onAuthed(auth);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const onSuccess = (auth: AuthResponse) => complete(auth);
    if (mode === 'signup') {
      signUp.mutate({ data: { email, password, handle: handle || undefined } }, { onSuccess, onError: (err) => setError(err instanceof Error ? err.message : 'Sign up failed') });
    } else {
      logIn.mutate({ data: { email, password } }, { onSuccess, onError: (err) => setError(err instanceof Error ? err.message : 'Sign in failed') });
    }
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
            setError('An account with this email already exists. Sign in with email and password, then connect Google in Settings.');
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

  const googleEnabled = providers.data?.google.enabled ?? false;
  const discordEnabled = providers.data?.discord.enabled ?? false;
  const showProviders = googleEnabled || discordEnabled;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-5">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent font-display text-2xl font-bold text-accent-foreground shadow-sm">P</span>
          <p className="mt-6 font-mono-custom text-[10px] uppercase tracking-[.2em] text-primary">PrepPulse · keep moving</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.04em]">{mode === 'signup' ? 'Make your account' : 'Welcome back'}</h1>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">{mode === 'signup' ? 'A private study companion that tracks your pulse, tests, and recall — no socials required.' : 'Pick up exactly where you left off.'}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-border/80 bg-card p-6 shadow-[0_18px_50px_hsl(186_32%_16%/.08)]">
          {showProviders && (
            <div className="space-y-2.5">
              {googleEnabled && <GoogleSignInButton clientId={providers.data!.google.clientId!} onCredential={handleGoogleCredential} disabled={pending} />}
              {discordEnabled && <DiscordOAuthButton label="Continue with Discord" onStart={handleDiscord} disabled={pending} />}
              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-border" />
                <span className="font-mono-custom text-[9px] uppercase tracking-[.18em] text-muted-foreground">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          <form onSubmit={submit} className="mt-4 space-y-4">
            {error && <div className="rounded-xl border border-accent/25 bg-accent/10 px-4 py-3 text-xs font-semibold text-accent" data-testid="auth-error">{error}</div>}
            {notice && <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs font-semibold text-primary" data-testid="auth-notice">{notice}</div>}
            {mode === 'signup' && (
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold"><UserRound size={13} /> Handle</span>
                <input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="e.g. aarav" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-primary/20" data-testid="input-auth-handle" />
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold"><Mail size={13} /> Email</span>
              <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-primary/20" data-testid="input-auth-email" />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold"><ShieldCheck size={13} /> Password</span>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required minLength={mode === 'signup' ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="h-11 w-full rounded-xl border border-border bg-background px-3 pr-11 text-sm outline-none focus:ring-3 focus:ring-primary/20" data-testid="input-auth-password" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </label>
            <button type="submit" disabled={pending} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60" data-testid="button-auth-submit">
              {pending ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
            <button type="button" onClick={() => { setMode((current) => current === 'signup' ? 'login' : 'signup'); setError(null); }} className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground" data-testid="button-auth-toggle">
              {mode === 'signup' ? 'Already have an account? Sign in' : "New here? Create an account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
