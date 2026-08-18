import { useEffect, useState } from 'react';
import { useGetAdminAudit, type AdminAuditEntry } from '@workspace/api-client-react';
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

function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function AdminAudit() {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [before, setBefore] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);

  const { data, isPending, isError, refetch } = useGetAdminAudit({ limit: 50, before });

  useEffect(() => {
    if (!data) return;
    setEntries(data.entries);
  }, [data]);

  const next = () => {
    if (!data || data.entries.length === 0) return;
    setPage((p) => p + 1);
    setBefore(data.entries[data.entries.length - 1].createdAt);
  };
  const prev = () => {
    setPage((p) => Math.max(0, p - 1));
    setBefore(undefined);
  };

  if (isPending && entries.length === 0) return <LoadingBlock className="h-64" />;
  if (isError && entries.length === 0) return <ErrorState onRetry={() => refetch()} />;

  return (
    <AdminGate>
      <AdminPageHeader
        title="Audit trail"
        subtitle="Every audited admin action, newest first. Change reasons and before/after states are preserved."
        action={
          <div className="flex gap-2">
            <button type="button" onClick={prev} disabled={page === 0} className="rounded-lg border border-border/80 px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40" data-testid="button-audit-prev">Newer</button>
            <button type="button" onClick={next} disabled={entries.length < 50} className="rounded-lg border border-border/80 px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40" data-testid="button-audit-next">Older</button>
          </div>
        }
      />
      <Card className="p-5">
        {entries.length === 0 ? (
          <EmptyState title="Nothing logged yet" detail="Admin actions will show up here as they happen." />
        ) : (
          <ul className="divide-y divide-border/70">
            {entries.map((entry) => (
              <li key={entry.id} className="py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="min-w-0 flex-1 font-semibold">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                  <span className="hidden text-muted-foreground sm:block">{entry.targetType}{entry.targetId ? ` · ${entry.targetId.slice(0, 8)}` : ''}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</span>
                </div>
                {(stringify(entry.afterState) || stringify(entry.beforeState)) && (
                  <pre className="mt-2 ml-5 overflow-x-auto rounded-lg bg-secondary/40 p-3 font-mono-custom text-[10px] leading-relaxed text-muted-foreground">
                    {entry.beforeState ? `before: ${stringify(entry.beforeState)}\n` : ''}{entry.afterState ? `after:  ${stringify(entry.afterState)}` : ''}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AdminGate>
  );
}

export default AdminAudit;