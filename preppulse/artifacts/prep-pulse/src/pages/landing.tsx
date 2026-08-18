import { useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  BrainCircuit,
  ChartArea,
  Flame,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { DashboardBackdrop } from '@/components/dashboard-backdrop';
import { useOauthQueryNotice } from '@/lib/oauth-notice';

const FEATURES = [
  {
    icon: Flame,
    title: 'Daily Pulse & Rhythm',
    detail: 'A crystal-clear target for today, streak protection, and realistic pacing that prevents burnout.',
  },
  {
    icon: ChartArea,
    title: 'Precision Syllabus Tracker',
    detail: 'Topic-by-topic mastery for JEE Main, Advanced & NEET (UG) with high-yield weightage flags.',
  },
  {
    icon: BrainCircuit,
    title: 'Adaptive Spaced Recall',
    detail: 'Formula and concept cards resurface algorithmically right before you forget them.',
  },
  {
    icon: Trophy,
    title: 'Private Study Circles',
    detail: 'Peer accountability without anxiety. Share study minutes and weekly ranks with trusted friends.',
  },
];

const EXAM_PRESETS = {
  jee_main: {
    label: 'JEE Main',
    tagline: 'Physics, Chemistry & Mathematics',
    stats: '90 Qs · 300 Marks · 180 Min',
    topics: '280+ Core Topics',
    focusAdvice: 'High numerical accuracy & speed drills',
  },
  jee_adv: {
    label: 'JEE Advanced',
    tagline: 'Deep Multi-Concept Mastery',
    stats: 'Paper 1 & 2 · Negative Marking',
    topics: 'Deep Conceptual Units',
    focusAdvice: 'Multi-chapter linkage & rigorous derivation practice',
  },
  neet: {
    label: 'NEET (UG)',
    tagline: 'Physics, Chemistry & Biology (Botany/Zoology)',
    stats: '180 Qs · 720 Marks · 200 Min',
    topics: '249 NMC Topics',
    focusAdvice: 'NCERT line-by-line active recall & rapid bio-drills',
  },
};

export default function LandingPage() {
  const notice = useOauthQueryNotice();
  const [selectedExam, setSelectedExam] = useState<keyof typeof EXAM_PRESETS>('jee_main');
  const [simulatedMinutes, setSimulatedMinutes] = useState(150);

  const exam = EXAM_PRESETS[selectedExam];
  const simulatedGoal = 240;
  const pulsePercent = Math.min(100, Math.round((simulatedMinutes / simulatedGoal) * 100));

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground selection:bg-accent/20">
      {/* Dynamic blurred ambient background backdrop */}
      <div className="pointer-events-none absolute inset-0 scale-105 blur-[16px] saturate-[.85] opacity-70">
        <div className="pt-10">
          <DashboardBackdrop />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-background/60 backdrop-blur-[2px]" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-5 py-8 md:px-8">
        {/* Header navigation */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark size={40} />
            <div>
              <span className="font-display text-xl font-bold tracking-tight">PrepPulse</span>
              <span className="hidden font-mono-custom text-[9px] uppercase tracking-[.2em] text-muted-foreground sm:inline-block sm:ml-2">
                · JEE & NEET
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              data-testid="link-landing-signin"
              className="rounded-xl border border-border bg-card/80 px-4 py-2 text-sm font-bold text-foreground transition-all hover:bg-secondary hover:shadow-sm"
            >
              Sign in
            </Link>
            <Link
              href="/signin"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </header>

        {notice && (
          <div
            className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs font-semibold text-primary"
            data-testid="auth-notice"
          >
            {notice}
          </div>
        )}

        {/* Hero Section */}
        <main className="flex flex-1 flex-col justify-center py-12 md:py-16">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 font-mono-custom text-[11px] font-bold uppercase tracking-[.18em] text-primary">
            <Sparkles size={13} className="text-primary animate-pulse" />
            Every session accounted. Every chapter closer.
          </div>

          <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.04] tracking-[-.04em] sm:text-5xl md:text-6xl">
            The private study companion for serious JEE & NEET aspirants.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Turn daily study blocks into an undeniable pulse. Track your official NMC/NTA syllabus, space out active recall flashcards, and compete peacefully with your inner circle.
          </p>

          {/* Action buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/signin"
              data-testid="link-landing-cta"
              className="group inline-flex items-center gap-2.5 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-accent-foreground shadow-[0_12px_28px_hsl(14_75%_58%/.3)] transition-all hover:-translate-y-0.5"
            >
              Start Tracking Free
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/signin"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 px-6 py-3.5 text-sm font-bold text-foreground transition-all hover:bg-secondary"
            >
              Continue with Google / Discord
            </Link>
          </div>

          {/* Interactive Exam Track & Pulse Simulator Section */}
          <div className="mt-14 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
            {/* Exam Track Switcher */}
            <div className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-xl backdrop-blur-md md:p-8">
              <div className="flex items-center justify-between">
                <span className="font-mono-custom text-[10px] uppercase tracking-[.2em] text-primary font-bold">
                  Curriculum Engine
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                  Interactive Preview
                </span>
              </div>

              <div className="mt-4 flex gap-1 rounded-xl border border-border/70 bg-secondary/50 p-1">
                {(['jee_main', 'jee_adv', 'neet'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedExam(key)}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                      selectedExam === key
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {EXAM_PRESETS[key].label}
                  </button>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">{exam.tagline}</p>
                  <p className="mt-1 text-sm font-bold text-foreground">{exam.topics}</p>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{exam.focusAdvice}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Test Format</p>
                    <p className="mt-1 text-xs font-bold text-foreground">{exam.stats}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Recall</p>
                    <p className="mt-1 text-xs font-bold text-foreground">Formula & Trick Cards</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Pulse Simulator Card */}
            <div className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-xl backdrop-blur-md md:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono-custom text-[10px] uppercase tracking-[.2em] text-accent font-bold">
                    Daily Pulse Calculator
                  </span>
                  <Flame size={18} className="text-accent" />
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-extrabold tracking-tight">
                      {Math.floor(simulatedMinutes / 60)}h {simulatedMinutes % 60}m
                    </p>
                    <p className="text-xs text-muted-foreground">of {Math.floor(simulatedGoal / 60)}h daily target</p>
                  </div>
                  <span className="font-mono-custom text-2xl font-bold text-primary">{pulsePercent}%</span>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                    style={{ width: `${pulsePercent}%` }}
                  />
                </div>

                {/* Interactive Slider */}
                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>Simulate study session length</span>
                    <span className="text-foreground font-bold">{simulatedMinutes} minutes</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={15}
                    value={simulatedMinutes}
                    onChange={(e) => setSimulatedMinutes(Number(e.target.value))}
                    className="mt-2 h-2 w-full cursor-pointer accent-[hsl(var(--accent))]"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between rounded-xl bg-primary/5 p-3.5 border border-primary/15">
                <span className="text-xs font-semibold text-foreground">
                  {pulsePercent >= 100
                    ? '🎉 Target reached! Full day mastery recorded.'
                    : `${simulatedGoal - simulatedMinutes} more mins to lock today's streak.`}
                </span>
                <Link href="/signin" className="text-xs font-bold text-primary hover:underline">
                  Try it live →
                </Link>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, detail }) => (
              <div
                key={title}
                className="group rounded-2xl border border-border/70 bg-card/80 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon size={19} />
                </div>
                <p className="mt-4 text-sm font-bold text-foreground">{title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </main>

        {/* Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 py-6 text-muted-foreground">
          <div className="flex items-center gap-2">
            <BrandMark size={20} />
            <p className="font-mono-custom text-[10px] uppercase tracking-[.2em]">PrepPulse · Keep Moving</p>
          </div>
          <p className="font-mono-custom text-[9px] uppercase tracking-[.15em]">
            Study · Recall · Tests · Compete · Syllabus · Circles
          </p>
        </footer>
      </div>
    </div>
  );
}