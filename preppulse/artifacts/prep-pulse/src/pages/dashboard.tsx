import { ArrowRight, Flame, Play, Sparkles, Target, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';
import { useGetDashboard } from '@workspace/api-client-react';
import { Card, ButtonLink, ErrorState, LoadingBlock, ProgressBar, SectionTitle, StatTile } from '@/components/ui-elements';
import { browserTimeZone } from '@/lib/utils';

export default function Dashboard() {
  const query = useGetDashboard({ tz: browserTimeZone() });
  const dashboard = query.data;

  if (query.isLoading) return <DashboardSkeleton />;
  if (query.isError || !dashboard) return <div className="mx-auto max-w-5xl"><ErrorState onRetry={() => query.refetch()} /></div>;

  const todayPercent = dashboard.todayGoalMinutes ? (dashboard.todayMinutes / dashboard.todayGoalMinutes) * 100 : 0;
  const weekPercent = dashboard.weeklyGoalMinutes ? (dashboard.weeklyMinutes / dashboard.weeklyGoalMinutes) * 100 : 0;
  const maxTrend = Math.max(...dashboard.testTrend, 1);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rise-in flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Your next right step</p><h1 className="mt-2 max-w-2xl font-display text-4xl font-bold leading-[.98] tracking-[-.045em] md:text-6xl">{dashboard.greeting || 'Good morning, Aarav.'}</h1><p className="mt-4 text-sm text-muted-foreground">{dashboard.examLabel} <span className="mx-2 text-border">/</span> target {dashboard.targetYear} <span className="mx-2 text-border">/</span> {dashboard.daysLeft} days in view</p></div>
        <Link href="/study" data-testid="link-start-focus" className="group inline-flex w-fit items-center gap-3 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-foreground shadow-sm transition-transform hover:-translate-y-0.5"><Play size={16} fill="currentColor" /> Start a focus block <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Daily pulse" value={`${dashboard.todayMinutes}m`} detail={`${dashboard.todayGoalMinutes - dashboard.todayMinutes > 0 ? `${dashboard.todayGoalMinutes - dashboard.todayMinutes}m left` : 'target met'} of ${dashboard.todayGoalMinutes}m`} accent />
        <StatTile label="Current streak" value={`${dashboard.streak} days`} detail="one session at a time" />
        <StatTile label="This week" value={`${dashboard.weeklyMinutes}m`} detail={`${dashboard.weeklyGoalMinutes - dashboard.weeklyMinutes > 0 ? `${dashboard.weeklyGoalMinutes - dashboard.weeklyMinutes}m to go` : 'weekly target met'}`} />
        <StatTile label="Syllabus covered" value={`${dashboard.syllabusPercent}%`} detail={`${dashboard.masteredTopics} of ${dashboard.totalTopics} topics mastered`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.85fr]">
        <Card className="overflow-hidden p-5 md:p-7">
          <SectionTitle eyebrow="Today's targets" title="Keep the thread going" action={<span className="font-mono-custom text-xs text-muted-foreground">{dashboard.todayMinutes}/{dashboard.todayGoalMinutes} min</span>} />
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div><div className="mb-3 flex items-center justify-between text-xs"><span className="font-semibold">Today</span><span className="font-mono-custom text-primary">{Math.round(todayPercent)}%</span></div><ProgressBar value={todayPercent} /><p className="mt-3 text-sm text-muted-foreground">{todayPercent >= 100 ? 'You showed up for yourself today.' : 'A focused block gets you closer.'}</p></div>
            <div><div className="mb-3 flex items-center justify-between text-xs"><span className="font-semibold">Week</span><span className="font-mono-custom text-primary">{Math.round(weekPercent)}%</span></div><ProgressBar value={weekPercent} color="warm" /><p className="mt-3 text-sm text-muted-foreground">Your rhythm is more useful than a perfect day.</p></div>
          </div>
          <div className="mt-7 border-t border-border/70 pt-5"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent"><Target size={17} /></div><div><p className="text-sm font-bold">Suggested next moves</p>{dashboard.weakTopics?.length ? <div className="mt-2 flex flex-wrap gap-2">{dashboard.weakTopics.slice(0, 3).map((topic, index) => <Link key={topic} href="/study" data-testid={`link-suggested-${index}`} className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 font-mono-custom text-[10px] font-bold uppercase tracking-[.1em] text-accent transition-colors hover:bg-accent/20">{index + 1}. Revisit {topic}</Link>)}</div> : <p className="mt-1 text-xs text-muted-foreground">Choose one topic and give it your full attention.</p>}</div><Link href="/study" data-testid="link-suggested-study" className="ml-auto rounded-lg p-2 text-primary hover:bg-secondary"><ArrowRight size={17} /></Link></div></div>
        </Card>

        <Card className="p-5 md:p-7">
          <SectionTitle eyebrow="Momentum" title="Your test trend" action={<TrendingUp size={19} className="text-primary" />} />
          <div className="mt-6 flex h-28 items-end gap-2">
            {dashboard.testTrend.length ? dashboard.testTrend.map((value, index) => <div key={`${value}-${index}`} className="group flex h-full flex-1 flex-col items-center justify-end gap-2"><div className={`w-full max-w-7 rounded-t-md ${index === dashboard.testTrend.length - 1 ? 'bg-accent' : 'bg-primary/25'} transition-all group-hover:bg-primary`} style={{ height: `${Math.max(9, (value / maxTrend) * 100)}%` }} title={`${value}% accuracy`} /><span className="font-mono-custom text-[9px] text-muted-foreground">{index + 1}</span></div>) : <p className="text-sm text-muted-foreground">Your first test will give this chart a pulse.</p>}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4"><div><p className="font-display text-2xl font-bold">{dashboard.testTrend.at(-1) ?? 0}%</p><p className="text-xs text-muted-foreground">latest accuracy</p></div><ButtonLink href="/tests">See test log</ButtonLink></div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <Card className="p-5 md:p-7">
          <SectionTitle eyebrow="Gentle nudge" title="Topics asking for a revisit" action={<Sparkles size={18} className="text-accent" />} />
          {dashboard.weakTopics?.length ? <div className="space-y-2">{dashboard.weakTopics.slice(0, 4).map((topic, index) => <Link href="/syllabus" key={`${topic}-${index}`} data-testid={`link-weak-topic-${index}`} className="flex items-center gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-secondary"><span className="font-mono-custom text-xs text-accent">0{index + 1}</span><span className="flex-1 text-sm font-semibold">{topic}</span><ArrowRight size={15} className="text-muted-foreground" /></Link>)}</div> : <p className="text-sm text-muted-foreground">No weak spots flagged yet. Keep collecting evidence.</p>}
        </Card>
        <Card className="p-5 md:p-7">
          <SectionTitle eyebrow="Recent activity" title="Proof you were here" action={<Flame size={18} className="text-accent" />} />
          {dashboard.recentSessions?.length ? <div className="divide-y divide-border/70">{dashboard.recentSessions.slice(0, 4).map((session) => <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={session.id} data-testid={`activity-session-${session.id}`}><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary font-mono-custom text-[10px] text-primary">{session.minutes}m</span><div className="flex-1"><p className="text-sm font-semibold">{session.subject}</p><p className="text-xs text-muted-foreground">{session.source === 'timer' ? 'Focus timer' : 'Manual log'} · {new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p></div><span className="font-mono-custom text-xs text-muted-foreground">done</span></div>)}</div> : <p className="text-sm text-muted-foreground">Your next session will show up here.</p>}
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return <div className="mx-auto max-w-6xl"><div className="skeleton h-32 w-3/4 rounded-2xl" /><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((n) => <LoadingBlock key={n} className="h-32" />)}</div><div className="mt-6 grid gap-6 lg:grid-cols-2"><LoadingBlock className="h-64" /><LoadingBlock className="h-64" /></div></div>;
}