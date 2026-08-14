import { useState, type FormEvent } from 'react';
import { ArrowLeft, LoaderCircle, MailCheck } from 'lucide-react';
import { useLocation } from 'wouter';
import { useForgotPassword } from '@workspace/api-client-react';
import { DashboardBackdrop } from '@/components/dashboard-backdrop';
import { apiErrorMessage } from '@/pages/auth';

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const forgotPassword = useForgotPassword();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const normalized = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('Enter a valid email address');
      return;
    }
    forgotPassword.mutate(
      { data: { email: normalized } },
      {
        onSuccess: () => setSent(true),
        onError: (err) =>
          setError(apiErrorMessage(err) ?? 'Password recovery is unavailable right now. Try again in a moment.'),
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
            <span className="font-display text-lg font-bold tracking-[-.02em]">PrepPulse</span>
          </div>

          {sent ? (
            <>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MailCheck size={22} />
              </div>
              <h1 className="mt-4 font-display text-2xl font-bold tracking-[-.03em]">Check your inbox</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                If an account exists for <span className="font-semibold text-foreground">{email.trim()}</span>, a reset
                link is on its way. It expires after a short while.
              </p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft size={15} /> Back to sign in
              </button>
            </>
          ) : (
            <>
              <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Reset your password</p>
              <h1 className="mt-1 font-display text-3xl font-bold tracking-[-.04em]">Forgot password?</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Enter the email on your account and we&rsquo;ll send you a link to set a new password.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/50"
                />
                <button
                  type="submit"
                  disabled={forgotPassword.isPending}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-opacity disabled:opacity-60"
                >
                  {forgotPassword.isPending ? <span className="inline-flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" /> Sending…</span> : 'Send reset link'}
                </button>
              </form>

              {error && <div className="mt-4 rounded-xl border border-accent/25 bg-accent/10 px-4 py-3 text-xs font-semibold text-accent">{error}</div>}

              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft size={15} /> Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}