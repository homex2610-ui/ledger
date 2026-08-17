import { Link } from 'wouter';
import { ArrowRight, BrainCircuit, ChartArea, Flame, Trophy } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { DashboardBackdrop } from '@/components/dashboard-backdrop';
import { useOauthQueryNotice } from '@/lib/oauth-notice';

const FEATURES = [
  { icon: Flame, title: 'Daily pulse', detail: 'A clear number for today, a streak to protect, and weekly targets that stay human.' },
  { icon: ChartArea, title: 'Syllabus coverage', detail: 'Topic-by-topic progress toward JEE Main, Advanced or NEET, with weak spots flagged early.' },
  { icon: BrainCircuit, title: 'Spaced recall', detail: 'Cards resurface right when you are about to forget them — review on your own schedule.' },
  { icon: Trophy, title: 'Compete with your circle', detail: 'Weekly minutes, ranks and a leaderboard with the people who keep you honest.' },
];

export default function LandingPage() {
  const notice = useOauthQueryNotice();
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 scale-105 blur-[14px] saturate-[.85]">
        <div className="pt-10"><DashboardBackdrop /></div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-background/55" />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-5xl flex-col px-5 py-8 md:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark size={40} />
            <span className="font-display text-lg font-bold tracking-[-.02em]">Ledger</span>
          </div>
          <Link href="/signin" data-testid="link-landing-signin" className="rounded-xl border border-border bg-card/80 px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary">Sign in</Link>
        </header>

        {notice && <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs font-semibold text-primary" data-testid="auth-notice">{notice}</div>}

        <main className="flex flex-1 flex-col justify-center py-16">
          <p className="font-mono-custom text-[10px] uppercase tracking-[.28em] text-primary">A study companion for JEE / NEET prep</p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-[1.02] tracking-[-.04em] md:text-6xl">Every session accounted.<br />Every chapter a step closer.</h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">Ledger turns study hours into a daily pulse, tracks syllabus coverage and spaced recall, and puts you on a weekly leaderboard with your circle.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signin" data-testid="link-landing-cta" className="group inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground shadow-sm transition-transform hover:-translate-y-0.5">Start free <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></Link>
            <Link href="/signin" className="rounded-xl border border-border bg-card/80 px-5 py-3 text-sm font-bold text-foreground transition-colors hover:bg-secondary">Continue with Google</Link>
          </div>

          <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="rounded-2xl border border-border/70 bg-card/80 p-4 backdrop-blur-sm">
                <Icon size={18} className="text-primary" />
                <p className="mt-3 text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 py-5">
          <p className="font-mono-custom text-[9px] uppercase tracking-[.2em] text-muted-foreground/70">Ledger · keep moving</p>
          <p className="font-mono-custom text-[9px] uppercase tracking-[.2em] text-muted-foreground/70">Study · Recall · Tests · Compete · Circles</p>
        </footer>
      </div>
    </div>
  );
}