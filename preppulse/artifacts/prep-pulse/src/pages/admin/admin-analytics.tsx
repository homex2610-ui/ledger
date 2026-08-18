import { Activity, Flame, History, Users } from 'lucide-react';
import { useGetAdminAnalytics } from '@workspace/api-client-react';
import { AdminGate, AdminPageHeader } from '@/pages/admin/admin-shell';
import { Card, EmptyState, ErrorState, LoadingBlock } from '@/components/ui-elements';
import { formatMinutes } from '@/lib/format-duration';

function intensity(minutes: number, max: number): string {
  if (max <= 0 || minutes <= 0) return 'bg-secondary/40';
  const ratio = minutes / max;
  if (ratio >= 0.75) return 'bg-primary';
  if (ratio >= 0.45) return 'bg-primary/70';
  if (ratio >= 0.2) return 'bg-primary/40';
  return 'bg-primary/20';
}

export function AdminAnalytics() {
  const { data: analytics, isPending, isError, refetch } = useGetAdminAnalytics();

  if (isPending) return <LoadingBlock className="h-64" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const heatmapMax = Math.max(...analytics.cohortHeatmap.map((cell) => cell.minutes), 0);
  const days = [...new Set(analytics.cohortHeatmap.map((cell) => cell.date))].sort();
  const cohorts = [...new Set(analytics.cohortHeatmap.map((cell) => cell.cohortId))].sort();
  const minutesByKey = new Map(analytics.cohortHeatmap.map((cell) => [`${cell.cohortId}|${cell.date}`, cell.minutes]));
  const maxRetention = Math.max(...analytics.retention.map((week) => week.activeUsers), 0);
  const retentionRate = analytics.retention.filter((week) => week.retainedFromPrevious !== null);
  const latestRate = retentionRate.length > 0 && retentionRate[retentionRate.length - 1].retainedFromPrevious !== null
    ? Math.round((retentionRate[retentionRate.length - 1].retainedFromPrevious! / Math.max(1, retentionRate[retentionRate.length - 1].activeUsers)) * 100)
    : null;

  return (
    <AdminGate>
      <AdminPageHeader title="Analytics" subtitle="Engagement aggregates computed on read — no stored counters." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">Active users · D1</p>
            <Activity size={18} className="text-secondary" />
          </div>
          <p className="mt-3 truncate text-2xl font-medium tracking-tight">{analytics.activeUsers.d1}</p>
          <p className="mt-1 text-xs text-muted-foreground">sessions + topic moves, last 24h</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">Active users · D7</p>
            <Flame size={18} className="text-secondary" />
          </div>
          <p className="mt-3 truncate text-2xl font-medium tracking-tight">{analytics.activeUsers.d7}</p>
          <p className="mt-1 text-xs text-muted-foreground">last 7 days</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">Active users · D30</p>
            <Users size={18} className="text-secondary" />
          </div>
          <p className="mt-3 truncate text-2xl font-medium tracking-tight">{analytics.activeUsers.d30}</p>
          <p className="mt-1 text-xs text-muted-foreground">last 30 days</p>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <p className="mb-1 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Cohort heatmap</p>
        <h2 className="mb-4 font-display text-lg font-bold tracking-tight">Study minutes by cohort · last 14 days</h2>
        {analytics.cohortHeatmap.length === 0 ? (
          <EmptyState title="No activity yet" detail="Heatmap cells fill in as members log sessions." />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-max">
              <div className="mb-1 grid items-center gap-1" style={{ gridTemplateColumns: `minmax(120px, 1fr) repeat(${days.length}, minmax(20px, 1fr))` }}>
                <span />
                {days.map((day) => (
                  <span key={day} className="text-center font-mono-custom text-[8px] uppercase text-muted-foreground/70">{day.slice(8)}</span>
                ))}
              </div>
              {cohorts.map((cohortId) => (
                <div key={cohortId} className="grid items-center gap-1" style={{ gridTemplateColumns: `minmax(120px, 1fr) repeat(${days.length}, minmax(20px, 1fr))` }}>
                  <span className="truncate pr-2 font-mono-custom text-[9px] text-muted-foreground">{cohortId.slice(0, 8)}</span>
                  {days.map((day) => {
                    const minutes = minutesByKey.get(`${cohortId}|${day}`) ?? 0;
                    return (
                      <span key={day} title={`${formatMinutes(minutes)} on ${day}`} className={`h-5 w-5 rounded ${intensity(minutes, heatmapMax)}`} />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="mt-6 p-5">
        <p className="mb-1 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Retention trend</p>
        <h2 className="mb-4 font-display text-lg font-bold tracking-tight">Weekly actives · retained from prior week{latestRate !== null ? ` · latest ${latestRate}%` : ''}</h2>
        {analytics.retention.length === 0 ? (
          <EmptyState title="Not enough history yet" detail="Retention weeks appear once there's activity." />
        ) : (
          <div className="flex items-end gap-2 overflow-x-auto pb-2">
            {analytics.retention.map((week, index) => (
              <div key={week.weekStart} className="flex min-w-[64px] flex-col items-center gap-1">
                <span className="font-mono-custom text-[9px] text-muted-foreground">{week.activeUsers}</span>
                <div className="flex w-9 flex-col items-center justify-end rounded-t bg-primary/20" style={{ height: 72 }}>
                  <div className="w-full rounded-t bg-primary" style={{ height: `${maxRetention > 0 ? Math.max(4, (week.activeUsers / maxRetention) * 68) : 4}px` }} />
                </div>
                <span className="font-mono-custom text-[8px] uppercase text-muted-foreground/70">{week.weekStart.slice(5)}</span>
                <span className={`flex items-center gap-0.5 font-mono-custom text-[8px] ${week.retainedFromPrevious !== null ? 'text-primary' : 'text-muted-foreground/50'}`}>
                  <History size={8} />{week.retainedFromPrevious !== null ? week.retainedFromPrevious : '—'}
                </span>
                {index === analytics.retention.length - 1 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-mono-custom text-[7px] uppercase text-primary">now</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </AdminGate>
  );
}

export default AdminAnalytics;