import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Megaphone, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';
import { getGetAdminStatsQueryKey, getGetActiveAnnouncementQueryKey, useGetAdminStats, useRunWeeklyReset } from '@workspace/api-client-react';
import { AdminGate, AdminPageHeader, timeAgo } from '@/pages/admin/admin-shell';
import { Card, EmptyState, ErrorState, LoadingBlock } from '@/components/ui-elements';

const ACTION_LABELS: Record<string, string> = {
  announcement_create: 'Announcement created',
  announcement_update: 'Announcement updated',
  announcement_enable: 'Announcement enabled',
  announcement_disable: 'Announcement disabled',
  admin_set: 'Admin role changed',
  cohort_member_move: 'Member moved',
  cohort_update: 'Cohort updated',
  user_remove: 'User removed',
  feature_flag_update: 'Feature flag changed',
  pulse_adjustment_create: 'Pulse adjusted',
  leaderboard_exclusion_add: 'Excluded from leaderboards',
  leaderboard_exclusion_remove: 'Re-admitted to leaderboards',
  weekly_reset_run: 'Weekly reset run',
};

function StatTile({ icon, label, value, detail, accent = false }: { icon: ReactNode; label: string; value: string; detail: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-warm/40 bg-warm/10' : 'border-border/80 bg-card'}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-xs font-medium ${accent ? 'text-warm/90' : 'text-muted-foreground'}`}>{label}</p>
        <span className={accent ? 'text-warm' : 'text-secondary'}>{icon}</span>
      </div>
      <p className="mt-3 truncate text-2xl font-medium tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const { data: stats, isPending, isError, refetch } = useGetAdminStats();
  const reset = useRunWeeklyReset();

  if (isPending) return <LoadingBlock className="h-64" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetActiveAnnouncementQueryKey() });
  };

  const runReset = () => {
    setResetError(null);
    setResetResult(null);
    reset.mutate(undefined, {
      onSuccess: (result) => {
        setResetResult(`Closed ${result.closed} of ${result.results.length} due period(s) across ${result.scopesChecked} scope(s).`);
        refresh();
      },
      onError: (error: Error) => setResetError(error.message || 'Could not run the weekly reset.'),
    });
  };

  return (
    <AdminGate>
      <AdminPageHeader
        title="Overview"
        subtitle="The pulse of the platform."
        action={
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={runReset}
              disabled={reset.isPending}
              data-testid="button-weekly-reset"
              className="flex items-center gap-2 rounded-lg border border-warm/40 bg-warm/10 px-3 py-2 text-xs font-bold text-warm transition-colors hover:bg-warm/20 disabled:opacity-50"
            >
              <RefreshCw size={13} className={reset.isPending ? 'animate-spin' : ''} />
              {reset.isPending ? 'Running…' : 'Run weekly reset'}
            </button>
            <span className="text-[10px] text-muted-foreground">Same pipeline as the Monday cron</span>
          </div>
        }
      />
      {resetError && <p className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-semibold text-destructive">{resetError}</p>}
      {resetResult && <p className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs font-semibold text-emerald-600">{resetResult}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={<ShieldCheck size={20} />} label="Total users" value={String(stats.totalUsers)} detail="registered accounts" />
        <StatTile icon={<UsersRound size={20} />} label="Cohorts" value={String(stats.totalCohorts)} detail="active study groups" />
        <StatTile accent={stats.nearCapacityCohorts > 0} icon={<UsersRound size={20} />} label="Near capacity" value={String(stats.nearCapacityCohorts)} detail="cohorts at 80% or more" />
        <StatTile icon={<Megaphone size={20} />} label="Active announcement" value={stats.activeAnnouncement?.title ?? 'None'} detail={stats.activeAnnouncement ? 'live to all users' : 'nothing live right now'} />
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="mb-1 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Audit trail</p>
            <h2 className="font-display text-lg font-bold tracking-tight">Recent actions</h2>
          </div>
          <button type="button" onClick={refresh} className="rounded-lg border border-border/80 px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" data-testid="button-refresh-admin">Refresh</button>
        </div>
        {stats.recentAudit.length === 0 ? (
          <EmptyState title="Nothing logged yet" detail="Admin actions will show up here as they happen." />
        ) : (
          <ul className="divide-y divide-border/70">
            {stats.recentAudit.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                <span className="min-w-0 flex-1 font-semibold">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                <span className="hidden text-muted-foreground sm:block">{entry.targetType === 'announcement' ? 'announcement' : entry.targetType} · {entry.targetId?.slice(0, 8)}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AdminGate>
  );
}

export default AdminDashboard;