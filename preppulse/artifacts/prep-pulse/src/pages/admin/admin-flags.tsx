import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Power } from 'lucide-react';
import { getListFeatureFlagsQueryKey, useListFeatureFlags, useToggleFeatureFlag } from '@workspace/api-client-react';
import { AdminGate, AdminPageHeader, timeAgo } from '@/pages/admin/admin-shell';
import { Card, EmptyState, ErrorState, LoadingBlock } from '@/components/ui-elements';

interface FlagRow {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
}

export function AdminFlags() {
  const queryClient = useQueryClient();
  const [pendingFlag, setPendingFlag] = useState<FlagRow | null>(null);
  const [reason, setReason] = useState('');
  const [toggleError, setToggleError] = useState<string | null>(null);
  const { data: flags, isPending, isError, refetch } = useListFeatureFlags();
  const toggle = useToggleFeatureFlag();

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListFeatureFlagsQueryKey() });

  const confirmToggle = (flag: FlagRow) => {
    setToggleError(null);
    setReason('');
    setPendingFlag(flag);
  };

  const submit = () => {
    if (!pendingFlag || !reason.trim()) return;
    toggle.mutate(
      { key: pendingFlag.key, data: { enabled: !pendingFlag.enabled, reason: reason.trim() } },
      {
        onSuccess: () => {
          setPendingFlag(null);
          setReason('');
          refresh();
        },
        onError: (error: Error) => setToggleError(error.message || 'Could not toggle this flag.'),
      },
    );
  };

  if (isPending) return <LoadingBlock className="h-64" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <AdminGate>
      <AdminPageHeader title="Feature flags" subtitle="Server-enforced kill switches. A disabled flag immediately gates the feature for every user; every change is audited." />

      {flags.length === 0 ? (
        <Card className="p-6"><EmptyState title="No flags yet" detail="Flags are seeded by database migration." /></Card>
      ) : (
        <ul className="space-y-3">
          {flags.map((flag) => (
            <li key={flag.key}>
              <Card className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-bold tracking-tight">{flag.key}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{flag.description ?? 'No description'}</p>
                  <p className="mt-1 font-mono-custom text-[9px] uppercase tracking-[.12em] text-muted-foreground/60">Updated {timeAgo(flag.updatedAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => confirmToggle(flag)}
                  disabled={toggle.isPending}
                  data-testid={`button-toggle-flag-${flag.key}`}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${flag.enabled ? 'bg-emerald-500/15 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}
                >
                  <Power size={12} />
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {pendingFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-md p-5">
            <p className="mb-1 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Confirm flag change</p>
            <h2 className="font-display text-lg font-bold tracking-tight">
              {pendingFlag.enabled ? 'Disable' : 'Enable'} <span className="font-mono-custom text-sm">{pendingFlag.key}</span>?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {pendingFlag.enabled
                ? 'The feature becomes unavailable to every user immediately.'
                : 'The feature becomes available to every user immediately.'}
            </p>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">Reason (required)</span>
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Why are you changing this?"
                data-testid="input-flag-reason"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
              />
            </label>
            {toggleError && <p className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-semibold text-destructive">{toggleError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPendingFlag(null)} className="rounded-lg border border-border/80 px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary" data-testid="button-cancel-flag">Cancel</button>
              <button type="button" onClick={submit} disabled={!reason.trim() || toggle.isPending} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50" data-testid="button-confirm-flag">
                {pendingFlag.enabled ? 'Disable flag' : 'Enable flag'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </AdminGate>
  );
}

export default AdminFlags;