import { useEffect, useState, type ReactNode } from 'react';
import { Activity, ArrowRight, BarChart3, CalendarRange, Clock3, Compass, Flame, LineChart, Minus, Play, Sparkles, Target, Timer, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { Link } from 'wouter';
import { useGetDashboard, useGetProfile } from '@workspace/api-client-react';
import { getExamConfig } from '@workspace/exam-config';
import { Card, ButtonLink, EmptyState, ErrorState, LoadingBlock, SectionTitle } from '@/components/ui-elements';
import { BarStrip, DotStrip, Ring, Sparkline } from '@/components/mini-charts';
import { browserTimeZone } from '@/lib/utils';
import { formatMinutes } from '@/lib/format-duration';
import { subjectColor } from '@/lib/subject-colors';

function timeAgo(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function useCountdown(examDate?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!examDate) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [examDate]);
  if (!examDate) return null;
  const target = Date.parse(examDate);
  if (!Number.isFinite(target)) return null;
  const diff = Math.max(0, target - now);
  return {
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}

export default function Dashboard() {
  const query = useGetDashboard({ tz: browserTimeZone() });
  const profileQuery = useGetProfile();
  const dashboard = query.data;
  const profile = profileQuery.data;

  if (query.isLoading) return <DashboardSkeleton />;
  if (query.isError || !dashboard) return <div className="mx-auto max-w-5xl"><ErrorState onRetry={() => query.refetch()} /></div>;

  const handle = profile?.handle ?? 'Learner';
  const track = profile?.examTrack ?? 'jee_main';
  const fallbackSubject = getExamConfig(track).subjects[0];

  const todayPercent = dashboard.todayGoalMinutes ? (dashboard.todayMinutes / dashboard.todayGoalMinutes) * 100 : 0;
  const remainingToday = Math.max(0, dashboard.todayGoalMinutes - dashboard.todayMinutes);
  const activity = dashboard.activity7d ?? [];
  const studyDays = activity.filter((day) => day.minutes > 0).length;
  const maxDay = Math.max(...activity.map((day) => day.minutes), 1);
  const weeklyAvg = activity.length ? Math.round(activity.reduce((sum, day) => sum + day.minutes, 0) / 7) : 0;
  const bestDayIndex = activity.reduce((best, day, index, arr) => (day.minutes > arr[best].minutes ? index : best), 0);
  const bestDay = activity.length ? `${new Date(activity[bestDayIndex].day).toLocaleDateString(undefined, { weekday: 'long' })} · ${formatMinutes(activity[bestDayIndex].minutes)}` : '';

  const sessions = dashboard.recentSessions ?? [];
  const lastSession = sessions[0];
  const previousSession = sessions[1];

  const weakestSubject = dashboard.subjectProgress?.length ? [...dashboard.subjectProgress].sort((a, b) => a.percent - b.percent)[0].subject : fallbackSubject;

  const nextMove = todayPercent >= 100
    ? { text: 'Daily target met. Rest is a training tool — your day is done.', label: 'See tomorrow\'s plan' }
    : dashboard.todayMinutes === 0
      ? { text: `Your first block counts double. Start with ${weakestSubject} for 25 minutes.`, label: `Start 25 min · ${weakestSubject}` }
      : remainingToday <= 25
        ? { text: 'One more 25-minute block hits today\'s target.', label: 'Start 25 min · finish it' }
        : { text: `A 25-minute ${weakestSubject} block keeps your rhythm alive.`, label: `Start 25 min · ${weakestSubject}` };

  const testTrend = dashboard.testTrend ?? [];
  const maxTrend = Math.max(...testTrend, 1);
  const avgTrend = testTrend.length ? Math.round(testTrend.reduce((sum, value) => sum + value, 0) / testTrend.length) : 0;
  const latestTrend = testTrend[testTrend.length - 1] ?? 0;
  const trendDelta = testTrend.length > 1 ? latestTrend - testTrend[0] : 0;
  const TrendIcon = trendDelta > 0 ? TrendingUp : trendDelta < 0 ? TrendingDown : Minus;

  const missionBlocks = 8;
  const missionFilled = Math.min(missionBlocks, Math.round((todayPercent / 100) * missionBlocks));

  return (
    <div className="mx-auto max-w-[1400px]">
      <Card className="relative overflow-hidden bg-sidebar p-6 text-sidebar-foreground md:p-8" data-testid="dashboard-hero">
        <div className="absolute right-[-30px] top-[-42px] h-36 w-36 rounded-full border border-dashed border-accent/25" />
        <div className="absolute right-[-8px] top-[-20px] h-24 w-24 rounded-full border border-accent/20" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono-custom text-[10px] uppercase tracking-[.19em] text-accent">Overview · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.04em] md:text-5xl">{dashboard.greeting}, {handle}.</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-sidebar-foreground/65">{dashboard.examLabel} in <span className="font-bold text-sidebar-foreground">{dashboard.daysLeft} days</span>. Today is a data point you get to write.</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sidebar-foreground/15 bg-sidebar-foreground/5 px-3 py-1.5 font-mono-custom text-[10px] font-bold uppercase tracking-[.12em] text-sidebar-foreground/80">{dashboard.examLabel} · {dashboard.targetYear}</span>
              <span className="rounded-full border border-sidebar-foreground/15 bg-sidebar-foreground/5 px-3 py-1.5 font-mono-custom text-[10px] font-bold uppercase tracking-[.12em] text-sidebar-foreground/80" data-testid="days-left-pill">{dashboard.daysLeft} days to go</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sidebar-foreground/15 bg-sidebar-foreground/5 px-3 py-1.5 font-mono-custom text-[10px] font-bold uppercase tracking-[.12em] text-sidebar-foreground/80"><Flame size={11} className="text-warm" />{dashboard.streak} day streak</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sidebar-foreground/15 bg-sidebar-foreground/5 px-3 py-1.5 font-mono-custom text-[10px] font-bold uppercase tracking-[.12em] text-sidebar-foreground/80"><Target size={11} className="text-accent" />{dashboard.syllabusPercent}% syllabus</span>
            </div>
            <Link href="/study" data-testid="link-start-focus" className="group mt-6 inline-flex w-fit items-center gap-3 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground shadow-[0_12px_28px_hsl(14_75%_58%/.28)] transition-transform hover:-translate-y-0.5"><Play size={16} fill="currentColor" /> Start a focus block <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></Link>
          </div>
          <CountdownPanel daysLeft={dashboard.daysLeft} examLabel={dashboard.examLabel} examDate={profile?.examDate} />
        </div>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard testId="metric-daily" icon={<Activity size={15} />} iconClass="bg-primary/12 text-primary" label="Daily pulse" value={formatMinutes(dashboard.todayMinutes)} detail={remainingToday > 0 ? `${formatMinutes(remainingToday)} left of ${formatMinutes(dashboard.todayGoalMinutes)}` : 'target met for today'} visual={<Sparkline values={activity.map((day) => day.minutes)} className="h-9 w-24" strokeClass="stroke-primary" areaClass="fill-primary/10" dotClass="fill-primary" />} />
        <MetricCard testId="metric-streak" icon={<Flame size={15} />} iconClass="bg-warm/15 text-warm" label="Current streak" value={`${dashboard.streak} days`} detail={dashboard.streak > 0 ? `${studyDays} study days this week` : 'one session at a time'} visual={<DotStrip total={7} filled={Math.min(dashboard.streak, 7)} className="w-24" dotClassName="h-2 w-2" />} />
        <MetricCard testId="metric-week" icon={<CalendarRange size={15} />} iconClass="bg-accent/12 text-accent" label="This week" value={formatMinutes(dashboard.weeklyMinutes)} detail={dashboard.weeklyGoalMinutes - dashboard.weeklyMinutes > 0 ? `${formatMinutes(dashboard.weeklyGoalMinutes - dashboard.weeklyMinutes)} to go` : 'weekly target met'} visual={<BarStrip values={activity.map((day) => day.minutes)} className="h-9 w-24" />} />
        <MetricCard testId="metric-syllabus" icon={<Target size={15} />} iconClass="bg-success/12 text-success" label="Syllabus covered" value={`${dashboard.syllabusPercent}%`} detail={`${dashboard.masteredTopics} of ${dashboard.totalTopics} topics mastered`} visual={<Ring value={dashboard.syllabusPercent} size={52} stroke={5} arcClass="stroke-success" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <Card className="p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-7">
          <SectionTitle eyebrow="Today's mission" title={todayPercent >= 100 ? 'Mission complete' : 'Keep the thread going'} action={<span className="font-mono-custom text-xs font-bold text-primary">{Math.round(todayPercent)}%</span>} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="font-display text-4xl font-bold tracking-tight">{formatMinutes(dashboard.todayMinutes)}<span className="text-lg font-semibold text-muted-foreground"> of {formatMinutes(dashboard.todayGoalMinutes)}</span></p>
            <p className="font-mono-custom text-[10px] uppercase tracking-[.15em] text-muted-foreground/60">{remainingToday > 0 ? `${formatMinutes(remainingToday)} remaining` : 'done — go rest'}</p>
          </div>
          <div className="mt-4 grid grid-cols-8 gap-1.5" data-testid="mission-progress" role="img" aria-label={`${Math.round(todayPercent)}% of daily goal`}>
            {Array.from({ length: missionBlocks }, (_, index) => <span key={index} className={`h-2.5 rounded-full transition-colors duration-500 ${index < missionFilled ? 'bg-warm' : 'bg-secondary'}`} />)}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="Remaining" value={todayPercent >= 100 ? 'Met' : formatMinutes(remainingToday)} />
            <MiniStat label="Days this week" value={`${studyDays} of 7`} />
            <MiniStat label="Last subject" value={lastSession?.subject ?? '—'} />
            <MiniStat label="Streak" value={`${dashboard.streak} days`} />
          </div>
          <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><Compass size={16} /></div>
                <div className="min-w-0">
                  <p className="text-xs font-bold">Next best move</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{nextMove.text}</p>
                </div>
              </div>
              <Link href="/study" data-testid="link-next-move" className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-accent-foreground transition-transform hover:-translate-y-0.5">{nextMove.label}<ArrowRight size={13} /></Link>
            </div>
          </div>
          {dashboard.weakTopics?.length ? <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">{dashboard.weakTopics.slice(0, 3).map((topic, index) => <Link key={topic} href="/study" data-testid={`link-suggested-${index}`} className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 font-mono-custom text-[10px] font-bold uppercase tracking-[.1em] text-accent transition-colors hover:bg-accent/20">{index + 1}. Revisit {topic}</Link>)}<Link href="/study" data-testid="link-suggested-study" className="ml-auto rounded-lg p-2 text-primary transition-colors hover:bg-secondary" aria-label="Go to study room"><ArrowRight size={16} /></Link></div> : null}
        </Card>

        <Card className="p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-7">
          <SectionTitle eyebrow="Continue studying" title="Pick up the thread" action={lastSession ? <span className="font-mono-custom text-[10px] text-muted-foreground">{timeAgo(lastSession.createdAt)}</span> : undefined} />
          {lastSession ? (
            <>
              <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-secondary/45 p-4">
                <span className="h-2 w-2 rounded-full" style={{ background: subjectColor(lastSession.subject) }} />
                <p className="mt-3 font-mono-custom text-[10px] uppercase tracking-[.15em] text-muted-foreground">{lastSession.source === 'timer' ? 'Focus session' : 'Logged session'}</p>
                <p className="mt-1 truncate font-display text-2xl font-bold tracking-tight">{lastSession.subject}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatMinutes(lastSession.minutes)} minutes · {dayLabel(lastSession.createdAt)}</p>
                <Link href="/study" data-testid="link-resume" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"><Play size={12} fill="currentColor" /> Resume studying</Link>
              </div>
              {previousSession && <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 size={12} />Previously: <span className="font-semibold text-foreground/80">{previousSession.subject}</span> · {formatMinutes(previousSession.minutes)}m</p>}
            </>
          ) : (
            <EmptyState title="Nothing to resume yet" detail="Your last focus session will appear here, ready to continue." action={<ButtonLink href="/study">Start your first block</ButtonLink>} />
          )}
          <div className="mt-5 border-t border-border/70 pt-4">
            <p className="mb-3 font-mono-custom text-[10px] uppercase tracking-[.15em] text-muted-foreground">Focus mode</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/study" className="flex items-center justify-center gap-2 rounded-xl border border-border/80 py-2.5 text-xs font-bold transition-colors hover:border-primary/40 hover:bg-secondary"><Timer size={13} className="text-accent" /> Focus timer</Link>
              <Link href="/stats" className="flex items-center justify-center gap-2 rounded-xl border border-border/80 py-2.5 text-xs font-bold transition-colors hover:border-primary/40 hover:bg-secondary"><Zap size={13} className="text-warm" /> Your stats</Link>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TrendCard values={testTrend} avg={avgTrend} latest={latestTrend} max={maxTrend} delta={trendDelta} TrendIcon={TrendIcon} />
        <Card className="p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-7">
          <SectionTitle eyebrow="Subject pulse" title="Where your attention is going" action={<BarChart3 size={18} className="text-primary" />} />
          {dashboard.subjectProgress?.length ? <div className="space-y-4">{dashboard.subjectProgress.map((subject) => (<div key={subject.subject} className="group" data-testid={`subject-pulse-${subject.subject.toLowerCase()}`}><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: subjectColor(subject.subject) }} /><p className="truncate text-sm font-semibold">{subject.subject}</p></div><div className="flex shrink-0 items-center gap-2"><span className="font-mono-custom text-xs font-bold text-foreground/85">{subject.percent}%</span><span className="hidden rounded-full bg-secondary px-2 py-0.5 font-mono-custom text-[9px] uppercase tracking-wide text-muted-foreground sm:block">{subject.mastered}/{subject.total} topics</span></div></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, subject.percent)}%`, background: subjectColor(subject.subject) }} /></div><p className="mt-1 text-[10px] text-muted-foreground/70">Weightage {subject.weightagePercent}%</p></div>))}</div> : <EmptyState title="No pulse yet" detail="Syllabus coverage will appear here once you mark topics as mastered." action={<ButtonLink href="/syllabus">Open syllabus</ButtonLink>} />}
          <div className="mt-5 border-t border-border/70 pt-4"><ButtonLink href="/syllabus">See full syllabus</ButtonLink></div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <Card className="p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-7">
          <SectionTitle eyebrow="Gentle nudge" title="Topics asking for a revisit" action={<Sparkles size={18} className="text-accent" />} />
          {dashboard.weakTopics?.length ? <div className="space-y-2">{dashboard.weakTopics.slice(0, 4).map((topic, index) => <Link href="/syllabus" key={`${topic}-${index}`} data-testid={`link-weak-topic-${index}`} className="group flex items-center gap-3 rounded-xl border border-border/70 p-3 transition-[border-color,background-color] hover:border-accent/30 hover:bg-secondary/60"><span className="font-mono-custom text-xs text-accent">0{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{topic}</span><span className="rounded-full bg-warm/12 px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase tracking-[.1em] text-warm">needs revision</span><ArrowRight size={15} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></Link>)}</div> : <EmptyState title="Nothing flagged" detail="No weak spots yet. Keep collecting evidence." />}
        </Card>
        <Card className="p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-7">
          <SectionTitle eyebrow="Recent activity" title="Proof you were here" action={<Flame size={18} className="text-warm" />} />
          {sessions.length ? <div className="relative ml-1 border-l border-border/70 pl-5">{sessions.slice(0, 6).map((session, index) => { const label = dayLabel(session.createdAt); const showLabel = index === 0 || label !== dayLabel(sessions[index - 1].createdAt); return (<div key={session.id}>{showLabel && <div className="mt-2 flex items-center gap-2"><span className="rounded-full bg-secondary px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase tracking-[.1em] text-muted-foreground">{label}</span><span className="h-px flex-1 bg-border/60" /></div>}<div className="relative py-2.5" data-testid={`activity-session-${session.id}`}><span className="absolute -left-[26.5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-card" style={{ background: subjectColor(session.subject) }} /><div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-secondary/50"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{session.subject}</p><p className="text-xs text-muted-foreground">{session.source === 'timer' ? 'Focus timer' : 'Manual log'} · {timeAgo(session.createdAt)}</p></div><span className="font-mono-custom text-xs font-bold text-foreground/85">{formatMinutes(session.minutes)}</span></div></div></div>); })}</div> : <EmptyState title="Quiet room" detail="Your next session will show up here." action={<ButtonLink href="/study">Start a session</ButtonLink>} />}
        </Card>
      </div>

      <Card className="mt-6 p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-7">
        <SectionTitle eyebrow="Weekly rhythm" title="Your week at a glance" action={bestDay ? <span className="rounded-full bg-secondary px-2.5 py-1 font-mono-custom text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Best day · {bestDay}</span> : undefined} />
        {activity.length ? <>
          <div className="mt-5 flex h-36 items-end gap-1.5 sm:gap-2.5" data-testid="weekly-rhythm">
            {activity.map((day, index) => {
              const isToday = index === activity.length - 1;
              const height = Math.max(10, (day.minutes / maxDay) * 100);
              return (
                <div key={String(day.day)} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="pointer-events-none absolute -top-7 z-10 whitespace-nowrap rounded-md border border-border bg-background px-1.5 py-0.5 font-mono-custom text-[9px] text-foreground opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">{formatMinutes(day.minutes)}</span>
                  <div className="flex h-full w-full items-end">
                    <div className={`w-full rounded-t-md transition-colors duration-300 ${isToday ? 'bg-accent' : 'bg-primary/15 group-hover:bg-primary/40'}`} style={{ height: `${height}%` }} />
                  </div>
                  <span className={`font-mono-custom text-[9px] uppercase ${isToday ? 'font-bold text-accent' : 'text-muted-foreground/60'}`}>{new Date(day.day).toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
            <span><span className="font-semibold text-foreground/80">{formatMinutes(weeklyAvg)}</span> avg / day</span>
            <span><span className="font-semibold text-foreground/80">{studyDays} of 7</span> days studied</span>
            <span><span className="font-semibold text-foreground/80">{formatMinutes(dashboard.weeklyMinutes)}</span> this week</span>
            <span className="font-semibold text-primary">{formatMinutes(dashboard.weeklyGoalMinutes)} goal</span>
          </div>
        </> : <EmptyState title="A blank week" detail="No sessions logged yet — the first block is the hardest." action={<ButtonLink href="/study">Start your first block</ButtonLink>} />}
      </Card>
    </div>
  );
}

function CountdownPanel({ daysLeft, examLabel, examDate }: { daysLeft: number; examLabel: string; examDate?: string | null }) {
  const countdown = useCountdown(examDate);
  return (
    <div className="w-full shrink-0 rounded-2xl border border-sidebar-foreground/15 bg-sidebar-foreground/5 px-6 py-5 lg:w-[280px]" data-testid="countdown-module">
      <p className="font-mono-custom text-[10px] uppercase tracking-[.19em] text-sidebar-foreground/55">Exam countdown</p>
      <p className="mt-2 font-display text-6xl font-bold tabular-nums tracking-[-.04em]">{daysLeft}<span className="text-lg font-semibold text-sidebar-foreground/55"> days</span></p>
      <p className="mt-1 text-xs text-sidebar-foreground/60">until {examLabel}</p>
      <p className="mt-4 border-t border-sidebar-foreground/10 pt-3 font-mono-custom text-xs tabular-nums text-accent">{countdown ? `${String(countdown.hours).padStart(2, '0')}h ${String(countdown.minutes).padStart(2, '0')}m ${String(countdown.seconds).padStart(2, '0')}s` : 'Set your exam date in Settings'}</p>
    </div>
  );
}

function MetricCard({ icon, iconClass, label, value, detail, visual, testId }: { icon: ReactNode; iconClass: string; label: string; value: string; detail: string; visual: ReactNode; testId: string }) {
  return (
    <Card className="p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)]" data-testid={testId}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono-custom text-[10px] uppercase tracking-[.15em] text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">{visual}<span className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconClass}`}>{icon}</span></div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border/70 bg-secondary/40 px-3 py-2"><p className="font-mono-custom text-[9px] uppercase tracking-[.12em] text-muted-foreground">{label}</p><p className="mt-1 truncate font-display text-sm font-bold">{value}</p></div>;
}

function TrendCard({ values, avg, latest, max, delta, TrendIcon }: { values: number[]; avg: number; latest: number; max: number; delta: number; TrendIcon: typeof TrendingUp }) {
  if (!values.length) {
    return (
      <Card className="flex flex-col p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-7">
        <SectionTitle eyebrow="Momentum" title="Your test trend" action={<LineChart size={18} className="text-primary" />} />
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <svg viewBox="0 0 300 84" className="h-24 w-full max-w-sm opacity-40" aria-hidden="true"><path d="M10,64 L90,52 L170,56 L250,34 L290,24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 5" strokeLinecap="round" className="text-primary" /><circle cx="10" cy="64" r="3" className="fill-primary" /><circle cx="90" cy="52" r="3" className="fill-primary" /><circle cx="170" cy="56" r="3" className="fill-primary" /><circle cx="250" cy="34" r="3" className="fill-primary" /><circle cx="290" cy="24" r="4" className="fill-accent" /></svg>
          <p className="mt-5 font-display font-bold">Your first test will give this chart a pulse.</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">Accuracy from every test attempt lands here, one point at a time.</p>
          <div className="mt-4"><ButtonLink href="/tests">Take your first test</ButtonLink></div>
        </div>
      </Card>
    );
  }

  const pts = values.map((value, index) => ({ x: values.length === 1 ? 150 : (index / (values.length - 1)) * 300, y: 74 - (value / max) * 60 }));
  const path = pts.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const avgY = 74 - (avg / max) * 60;

  return (
    <Card className="p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-7">
      <SectionTitle eyebrow="Momentum" title="Your test trend" action={<span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono-custom text-[10px] font-bold uppercase tracking-[.1em] ${delta >= 0 ? 'bg-success/12 text-success' : 'bg-warm/12 text-warm'}`}><TrendIcon size={12} />{delta >= 0 ? '+' : ''}{delta} pts</span>} />
      <div className="mt-5">
        <svg viewBox="0 0 300 84" className="h-36 w-full" role="img" aria-label={`Test accuracy trend: latest ${latest}%, average ${avg}%`}>
          <line x1="0" y1="20" x2="300" y2="20" className="stroke-border/70" strokeDasharray="3 5" />
          <line x1="0" y1="47" x2="300" y2="47" className="stroke-border/70" strokeDasharray="3 5" />
          <line x1="0" y1="74" x2="300" y2="74" className="stroke-border/70" strokeDasharray="3 5" />
          <line x1="0" y1={avgY} x2="300" y2={avgY} className="stroke-accent/70" strokeDasharray="6 5" strokeWidth="1" />
          <path d={path} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pp-draw-line stroke-primary" />
          {pts.map((point, index) => (
            <g key={index} className="pp-rise-dot" style={{ animationDelay: `${0.15 + index * 0.08}s` }}>
              <circle cx={point.x} cy={point.y} r="8" fill="transparent" className="cursor-pointer">
                <title>{`Test ${index + 1}: ${values[index]}% accuracy`}</title>
              </circle>
              <circle cx={point.x} cy={point.y} r="3.5" className={index === pts.length - 1 ? 'fill-accent' : 'fill-card stroke-primary'} strokeWidth="2" />
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
        <div className="flex items-baseline gap-2"><p className="font-display text-3xl font-bold tracking-tight">{latest}%</p><p className="text-xs text-muted-foreground">latest accuracy</p></div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" />Avg {avg}%</span>
          <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-accent" />Best {max}%</span>
        </div>
        <ButtonLink href="/tests">See test log</ButtonLink>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <LoadingBlock className="h-[280px]" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((n) => <LoadingBlock key={n} className="h-36" />)}</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><LoadingBlock className="h-96" /><LoadingBlock className="h-96" /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2"><LoadingBlock className="h-80" /><LoadingBlock className="h-80" /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><LoadingBlock className="h-72" /><LoadingBlock className="h-72" /></div>
      <LoadingBlock className="mt-6 h-72" />
    </div>
  );
}
