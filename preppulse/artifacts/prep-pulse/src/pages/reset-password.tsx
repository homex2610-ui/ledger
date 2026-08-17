import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, KeyRound, LoaderCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { getGetMeQueryKey, useResetPassword, type AuthResponse } from '@workspace/api-client-react';
import { DashboardBackdrop } from '@/components/dashboard-backdrop';
import { apiErrorMessage } from '@/pages/auth';

export default function ResetPasswordPage({ onAuthed }: { onAuthed: (auth: AuthResponse) => void }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const resetPassword = useResetPassword();
  const [accessToken] = useState<string | null>(() => {
    const fromHash = new URLSearchParams(window.location.hash.slice(1)).get("access_token");
    const fromQuery = new URLSearchParams(window.location.search).get("access_token");
    return fromHash ?? fromQuery;
  });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
    }
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Choose a password of at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    resetPassword.mutate(
      { data: { accessToken: accessToken ?? '', newPassword: password } },
      {
        onSuccess: (auth) => {
          queryClient.setQueryData(getGetMeQueryKey(), auth);
          onAuthed(auth);
          navigate('/');
        },
        onError: (err) =>
          setError(apiErrorMessage(err) ?? 'This reset link is invalid or has expired. Request a new one from the sign-in page.'),
      },
    );
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 scale-105 blur-[14px] saturate-[.85]">
        <div className="pt-10"><DashboardBackdrop /></div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-background/55" />
      <div className="absolute inset-0 flex items-center justify-center px-5 py-10">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-card/95 p-7 shadow-[0_24px_80px_hsl(186_32%_16%/.25)] backdrop-blur-xl md:p-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-accent-foreground shadow-sm">P</span>
            <span className="font-display text-lg font-bold tracking-[-.02em]">Ledger</span>
          </div>

          {!accessToken ? (
            <>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <KeyRound size={22} />
              </div>
              <h1 className="mt-4 font-display text-2xl font-bold tracking-[-.03em]">Invalid reset link</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                This link is missing its token. Request a fresh one from the sign-in page.
              </p>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft size={15} /> Get a new link
              </button>
            </>
          ) : (
            <>
              <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">New password</p>
              <h1 className="mt-1 font-display text-3xl font-bold tracking-[-.04em]">Set a new password</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Pick a strong password for your account. You&rsquo;ll be signed in right away.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-3">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="New password (8+ characters)"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/50"
                />
                <input
                  type="password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/50"
                />
                <button
                  type="submit"
                  disabled={resetPassword.isPending}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-opacity disabled:opacity-60"
                >
                  {resetPassword.isPending ? <span className="inline-flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" /> Setting…</span> : 'Set password'}
                </button>
              </form>

              {error && <div className="mt-4 rounded-xl border border-accent/25 bg-accent/10 px-4 py-3 text-xs font-semibold text-accent">{error}</div>}

              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft size={15} /> Request a new link
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}