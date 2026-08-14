const BACKDROP_STATS = [
  { label: 'Daily pulse', value: '36m', detail: '54m left of 90m' },
  { label: 'Current streak', value: '9 days', detail: 'one session at a time' },
  { label: 'This week', value: '290m', detail: '110m to go' },
  { label: 'Syllabus covered', value: '34%', detail: '41 of 121 topics mastered' },
];

const BACKDROP_BARS = [0, 35, 60, 45, 72, 54, 81];
const BACKDROP_SESSIONS = [
  { minutes: 42, subject: 'Physics — Rotational Motion', day: 'Aug 12' },
  { minutes: 27, subject: 'Chemistry — Organic Basics', day: 'Aug 12' },
  { minutes: 55, subject: 'Maths — Probability', day: 'Aug 11' },
  { minutes: 18, subject: 'Physics — WEP', day: 'Aug 11' },
];

export function DashboardBackdrop() {
  return (
    <div className="mx-auto max-w-6xl px-5" aria-hidden="true">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Your next right step</p>
          <p className="mt-2 max-w-2xl font-display text-4xl font-bold leading-[.98] tracking-[-.045em] md:text-6xl">Good morning, Aarav.</p>
          <p className="mt-4 text-sm text-muted-foreground">JEE Main <span className="mx-2 text-border">/</span> target 2027 <span className="mx-2 text-border">/</span> 532 days in view</p>
        </div>
        <span className="inline-flex w-fit items-center gap-3 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-foreground shadow-sm">Start a focus block</span>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BACKDROP_STATS.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border/70 bg-card p-5">
            <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-muted-foreground">{stat.label}</p>
            <p className="mt-2 font-display text-3xl font-bold tracking-[-.03em]">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.85fr]">
        <div className="rounded-2xl border border-border/70 bg-card p-6">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-semibold">Today</span>
            <span className="font-mono-custom text-primary">42%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary"><div className="h-full w-[42%] rounded-full bg-primary" /></div>
          <div className="mb-3 mt-5 flex items-center justify-between text-xs">
            <span className="font-semibold">Week</span>
            <span className="font-mono-custom text-primary">61%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary"><div className="h-full w-[61%] rounded-full bg-amber-500" /></div>
          <p className="mt-4 text-sm text-muted-foreground">Your rhythm is more useful than a perfect day.</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6">
          <div className="flex h-24 items-end gap-2">
            {BACKDROP_BARS.map((value, index) => (
              <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div className={`w-full max-w-7 rounded-t-md ${index === BACKDROP_BARS.length - 1 ? 'bg-accent' : 'bg-primary/25'}`} style={{ height: `${Math.max(9, value)}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4">
            <div><p className="font-display text-2xl font-bold">81%</p><p className="text-xs text-muted-foreground">latest accuracy</p></div>
            <span className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-foreground">See test log</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-2xl border border-border/70 bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent"><span className="text-sm">◎</span></div>
            <p className="text-sm font-bold">Suggested next moves</p>
          </div>
          <div className="mt-4 space-y-2">
            {['Rotational Motion', 'Electrochemistry', 'Coordinate Geometry'].map((topic, index) => (
              <div key={topic} className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
                <span className="font-mono-custom text-xs text-accent">0{index + 1}</span>
                <span className="flex-1 text-sm font-semibold">Revisit {topic}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6">
          <p className="mb-2 text-sm font-bold">Recent activity</p>
          <div className="divide-y divide-border/70">
            {BACKDROP_SESSIONS.map((session) => (
              <div key={session.subject} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary font-mono-custom text-[10px] text-primary">{session.minutes}m</span>
                <div className="flex-1"><p className="text-sm font-semibold">{session.subject}</p><p className="text-xs text-muted-foreground">Focus timer · {session.day}</p></div>
                <span className="font-mono-custom text-xs text-muted-foreground">done</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}