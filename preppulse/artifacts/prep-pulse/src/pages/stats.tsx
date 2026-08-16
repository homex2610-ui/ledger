import { useState } from 'react';
import { Link } from 'wouter';
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, Clock, Flame, Hourglass, MoonStar, Sun, Sunrise, Sunset, Target, Timer, TrendingUp } from 'lucide-react';
import { getStats, getGetStatsQueryKey, type StatsResponse } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import { browserTimeZone } from '@/lib/utils';
import { subjectColor } from '@/lib/subject-colors';
import { Card, EmptyState, ErrorState, LoadingBlock } from '@/components/ui-elements';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function fmtMinutes(minutes: number): string {
  if (minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtHours(minutes: number): string {
  if (minutes <= 0) return '0h';
  const h = (minutes / 60).toFixed(1).replace(/\.0$/, '');
  return `${h}h`;
}

function toLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function isoOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function chronotypeIcon(bucket: string) {
  if (bucket === 'morning') return <Sunrise size={20} />;
  if (bucket === 'afternoon') return <Sun size={20} />;
  if (bucket === 'night') return <MoonStar size={20} />;
  return <Sunset size={20} />;
}

function MetricCard({ icon, label, value, caption, highlighted = false }: { icon: React.ReactNode; label: string; value: string; caption: string; highlighted?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlighted ? 'border-warm/40 bg-warm/10' : 'border-border/80 bg-card'}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-xs font-medium ${highlighted ? 'text-warm/90' : 'text-muted-foreground'}`}>{label}</p>
        <span className={highlighted ? 'text-warm' : 'text-secondary'}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-medium tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

function BarChart({ stats, onPrev, onNext, canNext }: { stats: StatsResponse; onPrev: () => void; onNext: () => void; canNext: boolean }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-2">
      <p className="text-xs font-semibold text-muted-foreground">{stats.week.weekLabel}</p>
      <div className="flex items-center gap-1">
        <button type="button" onClick={onPrev} aria-label="Previous week" data-testid="button-week-prev" className="rounded-lg border border-border/80 p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><ChevronLeft size={15} /></button>
        <button type="button" onClick={onNext} disabled={!canNext} aria-label="Next week" data-testid="button-week-next" className="rounded-lg border border-border/80 p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={15} /></button>
      </div>
    </div>
  );
}

export function Stats() {
  const today = new Date();
  const currentWeek = mondayOf(today);
  const currentMonth = monthKeyOf(today);
  const [weekStart, setWeekStart] = useState(isoOf(currentWeek));
  const [month, setMonth] = useState(currentMonth);
  const [subjectsPeriod, setSubjectsPeriod] = useState<'week' | 'all'>('week');

  const query = useQuery({
    queryKey: [...getGetStatsQueryKey({ tz: browserTimeZone(), weekStart, month, subjectsPeriod }), 'stats-page'],
    queryFn: () => getStats({ tz: browserTimeZone(), weekStart, month, subjectsPeriod }),
    staleTime: 30_000,
  });

  const stats = query.data;

  const canNextWeek = weekStart < isoOf(currentWeek);
  const canNextMonth = month < currentMonth;

  const prevWeek = () => setWeekStart(isoOf(addDays(toLocalDate(weekStart), -7)));
  const nextWeek = () => setWeekStart(isoOf(addDays(toLocalDate(weekStart), 7)));
  const prevMonth = () => {
    const d = toLocalDate(`${month}-01`);
    setMonth(monthKeyOf(new Date(d.getFullYear(), d.getMonth() - 1, 1)));
  };
  const nextMonth = () => {
    const d = toLocalDate(`${month}-01`);
    setMonth(monthKeyOf(new Date(d.getFullYear(), d.getMonth() + 1, 1)));
  };

  const weekMax = stats ? Math.max(1, ...stats.week.days.map((day) => day.minutes)) : 1;
  const momentumMax = stats ? Math.max(1, ...stats.momentum.map((day) => day.minutes)) : 1;
  const heatmapMax = stats ? Math.max(1, ...stats.heatmap.days.map((day) => day.minutes)) : 1;
  const momentumTotal = stats ? stats.momentum.reduce((sum, day) => sum + day.minutes, 0) : 0;
  const hasAnyData = stats ? stats.momentum.some((day) => day.minutes > 0) : false;

  const subjectTotal = stats ? stats.subjects.items.reduce((sum, item) => sum + item.minutes, 0) : 0;
  const donutRadius = 42;
  const donutCircumference = 2 * Math.PI * donutRadius;

  if (query.isPending) return <div className="space-y-4"><LoadingBlock className="h-64" /><LoadingBlock className="h-40" /></div>;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (!stats) return <LoadingBlock className="h-64" />;

  return (
    <div className="page-enter mx-auto max-w-[1100px]">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">The long game</p>
          <h1 className="font-display text-2xl font-bold tracking-tight">Stats</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your study data, last 30 days.</p>
        </div>
      </div>

      {!hasAnyData ? (
        <Card className="p-6">
          <EmptyState title="No study data yet" detail="Log a session on the Study page and your stats will show up here." action={<Link href="/study" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">Open Study</Link>} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard highlighted icon={<Flame size={20} />} label="Study streak" value={`${stats.streak}d`} caption="days in a row" />
            <MetricCard icon={<Timer size={20} />} label="Focused today" value={fmtMinutes(stats.todayMinutes)} caption="logged today" />
            <MetricCard icon={<CalendarDays size={20} />} label="7-day average" value={fmtMinutes(stats.avg7)} caption="min per day, last 7 days" />
            <MetricCard icon={<TrendingUp size={20} />} label="7-day peak" value={fmtMinutes(stats.peak7)} caption="best day, last 7 days" />
            <MetricCard icon={<Target size={20} />} label="Consistency" value={`${stats.consistency30}%`} caption="days with focus, last 30 days" />
            <MetricCard icon={<Hourglass size={20} />} label="Avg session length" value={fmtMinutes(stats.avgSessionMinutes30)} caption="per session, last 30 days" />
            <MetricCard icon={chronotypeIcon(stats.chronotype?.bucket ?? '')} label="Chronotype" value={stats.chronotype?.label ?? '—'} caption="weighted by focus hours, last 30 days" />
            <MetricCard icon={<CalendarDays size={20} />} label="Weekend vs weekday" value={`${fmtHours(stats.weekendMinutes30)} / ${fmtHours(stats.weekdayMinutes30)}`} caption="weekend / weekday, last 30 days" />
          </div>

          <Card className="mt-6 p-5">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-warm"><Clock size={18} /></span>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Peak focus time</p>
                    <p className="mt-0.5 text-lg font-medium tracking-tight">{stats.peakFocus ?? '—'}</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-warm"><CalendarCheck size={18} /></span>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Most productive day</p>
                    <p className="mt-0.5 text-lg font-medium tracking-tight">{stats.mostProductiveDay ?? '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="mt-6 p-5">
            <p className="mb-1 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Study trends</p>
            <h2 className="font-display text-lg font-bold tracking-tight">Weekly rhythm</h2>
            <BarChart stats={stats} onPrev={prevWeek} onNext={nextWeek} canNext={canNextWeek} />
            <div className="mt-4 flex h-40 items-end gap-2">
              {stats.week.days.map((day) => {
                const date = toLocalDate(day.date);
                const isToday = day.date === isoOf(new Date());
                const height = Math.max(4, (day.minutes / weekMax) * 100);
                return (
                  <div key={day.date} className="group flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        title={`${WEEKDAY_LABELS[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)} · ${fmtMinutes(day.minutes)}`}
                        className={`w-full rounded-t-md transition-all ${isToday ? 'bg-warm' : 'bg-primary/70 group-hover:bg-primary'}`}
                        style={{ height: `${height}%` }}
                        data-testid="trend-bar"
                      />
                    </div>
                    <span className={`text-[9px] font-semibold ${isToday ? 'text-warm' : 'text-muted-foreground/60'}`}>{DAY_LABELS[date.getDay() === 0 ? 6 : date.getDay() - 1]}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mb-1 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Subject breakdown</p>
                  <h2 className="font-display text-lg font-bold tracking-tight">Where the minutes went</h2>
                </div>
                <div className="flex rounded-lg border border-border/80 p-0.5">
                  {(['week', 'all'] as const).map((period) => (
                    <button key={period} type="button" onClick={() => setSubjectsPeriod(period)} data-testid={`tab-subjects-${period}`} className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${subjectsPeriod === period ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {period === 'week' ? 'This week' : 'All time'}
                    </button>
                  ))}
                </div>
              </div>
              {stats.subjects.items.length === 0 ? (
                <p className="mt-8 text-center text-sm text-muted-foreground">No sessions in this period yet.</p>
              ) : (
                <div className="mt-6 flex items-center gap-6">
                  <svg viewBox="0 0 100 100" className="h-36 w-36 shrink-0 -rotate-90">
                    <circle cx="50" cy="50" r={donutRadius} fill="none" stroke="var(--secondary)" strokeWidth="13" />
                    {(() => {
                      let offset = 0;
                      return stats.subjects.items.map((item) => {
                        const share = subjectTotal > 0 ? item.minutes / subjectTotal : 0;
                        const dash = share * donutCircumference;
                        const segment = (
                          <circle
                            key={item.subject}
                            cx="50"
                            cy="50"
                            r={donutRadius}
                            fill="none"
                            stroke={subjectColor(item.subject)}
                            strokeWidth="13"
                            strokeDasharray={`${Math.max(dash - 1.5, 0)} ${donutCircumference}`}
                            strokeDashoffset={-offset}
                            strokeLinecap="round"
                          />
                        );
                        offset += dash;
                        return segment;
                      });
                    })()}
                  </svg>
                  <ul className="min-w-0 flex-1 space-y-2.5">
                    {stats.subjects.items.map((item) => {
                      const pct = subjectTotal > 0 ? Math.round((item.minutes / subjectTotal) * 100) : 0;
                      return (
                        <li key={item.subject} className="flex items-center gap-2.5 text-sm">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: subjectColor(item.subject) }} />
                          <span className="min-w-0 flex-1 truncate font-semibold">{item.subject}</span>
                          <span className="text-muted-foreground">{fmtMinutes(item.minutes)}</span>
                          <span className="w-9 text-right font-mono-custom text-[10px] text-muted-foreground">{pct}%</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mb-1 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">30-day momentum</p>
                  <h2 className="font-display text-lg font-bold tracking-tight">Daily volume</h2>
                </div>
                <span className="rounded-full border border-border/80 bg-secondary/50 px-2.5 py-1 font-mono-custom text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">30-day total · {fmtMinutes(momentumTotal)}</span>
              </div>
              <div className="mt-6">
                <svg viewBox="0 0 300 100" className="h-36 w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="momentum-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path d={`M0,100 L${stats.momentum.map((day, i) => {
                    const x = (i / 29) * 300;
                    const y = 100 - (day.minutes / momentumMax) * 92 - 4;
                    return `${i === 0 ? '' : 'L'}${x},${y}`;
                  }).join(' ')} L300,100 Z`} fill="url(#momentum-fill)" />
                  <path d={stats.momentum.map((day, i) => {
                    const x = (i / 29) * 300;
                    const y = 100 - (day.minutes / momentumMax) * 92 - 4;
                    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
                  }).join(' ')} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                  {stats.momentum.map((day, i) => (
                    <circle
                      key={day.date}
                      cx={(i / 29) * 300}
                      cy={100 - (day.minutes / momentumMax) * 92 - 4}
                      r="3"
                      fill="var(--primary)"
                    >
                      <title>{`${toLocalDate(day.date).getDate()} ${MONTH_NAMES[toLocalDate(day.date).getMonth()].slice(0, 3)} · ${fmtMinutes(day.minutes)}`}</title>
                    </circle>
                  ))}
                </svg>
                <div className="mt-1 flex justify-between font-mono-custom text-[9px] uppercase tracking-[.1em] text-muted-foreground/60">
                  <span>{stats.momentum.length > 0 ? `${toLocalDate(stats.momentum[0].date).getDate()} ${MONTH_NAMES[toLocalDate(stats.momentum[0].date).getMonth()].slice(0, 3)}` : ''}</span>
                  <span>{stats.momentum.length > 0 ? `${toLocalDate(stats.momentum[stats.momentum.length - 1].date).getDate()} ${MONTH_NAMES[toLocalDate(stats.momentum[stats.momentum.length - 1].date).getMonth()].slice(0, 3)}` : ''}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="mt-6 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mb-1 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Monthly focus heatmap</p>
                <h2 className="font-display text-lg font-bold tracking-tight">{stats.heatmap.monthLabel}</h2>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={prevMonth} aria-label="Previous month" data-testid="button-month-prev" className="rounded-lg border border-border/80 p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><ChevronLeft size={15} /></button>
                <button type="button" onClick={nextMonth} disabled={!canNextMonth} aria-label="Next month" data-testid="button-month-next" className="rounded-lg border border-border/80 p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={15} /></button>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-1.5">
              {DAY_LABELS.map((label) => <span key={label} className="text-center font-mono-custom text-[9px] uppercase tracking-[.1em] text-muted-foreground/60">{label}</span>)}
              {Array.from({ length: (toLocalDate(`${month}-01`).getDay() + 6) % 7 }, (_, i) => <span key={`pad-${i}`} />)}
              {stats.heatmap.days.map((day) => {
                const date = toLocalDate(day.date);
                const isToday = day.date === isoOf(new Date());
                const intensity = day.minutes > 0 ? 0.18 + (day.minutes / heatmapMax) * 0.82 : 0;
                return (
                  <div
                    key={day.date}
                    title={day.minutes > 0 ? `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)} · ${fmtMinutes(day.minutes)}` : `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`}
                    className={`aspect-square rounded-md ${isToday ? 'ring-1 ring-primary ring-offset-1' : ''}`}
                    style={day.minutes > 0 ? { background: `hsl(var(--warm) / ${intensity})` } : { background: 'hsl(var(--muted) / 0.45)' }}
                    data-testid="heatmap-cell"
                  />
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2 font-mono-custom text-[9px] uppercase tracking-[.1em] text-muted-foreground/60">
              <span>less</span>
              <span className="h-2 w-2 rounded-sm" style={{ background: 'hsl(var(--muted) / 0.45)' }} />
              <span className="h-2 w-2 rounded-sm" style={{ background: 'hsl(var(--warm) / 0.3)' }} />
              <span className="h-2 w-2 rounded-sm" style={{ background: 'hsl(var(--warm) / 0.6)' }} />
              <span className="h-2 w-2 rounded-sm" style={{ background: 'hsl(var(--warm) / 0.95)' }} />
              <span>more</span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}