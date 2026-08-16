import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Megaphone, ShieldCheck, UsersRound } from 'lucide-react';
import { getGetAdminStatsQueryKey, getGetActiveAnnouncementQueryKey, useGetAdminStats } from '@workspace/api-client-react';
import { AdminGate, AdminPageHeader, timeAgo } from '@/pages/admin/admin-shell';
import { Card, EmptyState, ErrorState, LoadingBlock } from '@/components/ui-elements';

const ACTION_LABELS: Record<string, string> = {
  announcement_create: 'Announcement created',
  announcement_update: 'Announcement updated',
  announcement_enable: 'Announcement enabled',
  announcement_disable: 'Announcement disabled',
  admin_set: 'Admin role changed',
  cohort_member_move: 'Member moved',
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
  const { data: stats, isPending, isError, refetch } = useGetAdminStats();

  if (isPending) return <LoadingBlock className="h-64" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetActiveAnnouncementQueryKey() });
  };

  return (
    <AdminGate>
      <AdminPageHeader title="Overview" subtitle="The pulse of the platform." />
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