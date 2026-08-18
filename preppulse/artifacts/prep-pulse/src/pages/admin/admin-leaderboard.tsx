import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Ban, Plus, Undo2, Zap } from 'lucide-react';
import { getListLeaderboardExclusionsQueryKey, getListPulseAdjustmentsQueryKey, useCreateLeaderboardExclusion, useCreatePulseAdjustment, useListLeaderboardExclusions, useListPulseAdjustments, useRemoveLeaderboardExclusion } from '@workspace/api-client-react';
import { AdminGate, AdminPageHeader, timeAgo } from '@/pages/admin/admin-shell';
import { Card, EmptyState, ErrorState, LoadingBlock } from '@/components/ui-elements';

export function AdminLeaderboard() {
  const queryClient = useQueryClient();
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [exclusionError, setExclusionError] = useState<string | null>(null);
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [excludeUserId, setExcludeUserId] = useState('');
  const [excludeReason, setExcludeReason] = useState('');

  const adjustments = useListPulseAdjustments();
  const exclusions = useListLeaderboardExclusions();
  const createAdjustment = useCreatePulseAdjustment();
  const createExclusion = useCreateLeaderboardExclusion();
  const removeExclusion = useRemoveLeaderboardExclusion();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListPulseAdjustmentsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListLeaderboardExclusionsQueryKey() });
  };

  const submitAdjustment = () => {
    const amount = Number(adjustAmount);
    if (!adjustUserId.trim() || !Number.isFinite(amount) || amount === 0 || !adjustReason.trim()) return;
    setAdjustmentError(null);
    createAdjustment.mutate(
      { data: { userId: adjustUserId.trim(), amount, reason: adjustReason.trim() } },
      {
        onSuccess: () => {
          setAdjustUserId('');
          setAdjustAmount('');
          setAdjustReason('');
          refresh();
        },
        onError: (error: Error) => setAdjustmentError(error.message || 'Could not add the adjustment.'),
      },
    );
  };

  const submitExclusion = () => {
    if (!excludeUserId.trim() || !excludeReason.trim()) return;
    setExclusionError(null);
    createExclusion.mutate(
      { data: { userId: excludeUserId.trim(), reason: excludeReason.trim() } },
      {
        onSuccess: () => {
          setExcludeUserId('');
          setExcludeReason('');
          refresh();
        },
        onError: (error: Error) => setExclusionError(error.message || 'Could not exclude the user.'),
      },
    );
  };

  const admit = (userId: string) => {
    removeExclusion.mutate(
      { userId },
      {
        onSuccess: () => refresh(),
        onError: () => setExclusionError('Could not re-admit the user.'),
      },
    );
  };

  if (adjustments.isPending || exclusions.isPending) return <LoadingBlock className="h-64" />;
  if (adjustments.isError || exclusions.isError) return <ErrorState onRetry={() => { adjustments.refetch(); exclusions.refetch(); }} />;

  return (
    <AdminGate>
      <AdminPageHeader title="Leaderboard moderation" subtitle="Adjust a member's weekly pulse or remove them from all leaderboards. Both are audited; adjustments apply to live rankings and weekly snapshots." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              <h2 className="font-display text-lg font-bold tracking-tight">Pulse adjustment</h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">Add or remove pulse from a user. Positive amounts help, negative amounts reduce. Give the user's id (not handle).</p>
            {adjustmentError && <p className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-semibold text-destructive" data-testid="adjustment-error">{adjustmentError}</p>}
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">User id</span>
                <input value={adjustUserId} onChange={(event) => setAdjustUserId(event.target.value)} placeholder="00000000-0000-0000-0000-000000000000" data-testid="input-adjust-user" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">Amount (pulse)</span>
                <input value={adjustAmount} onChange={(event) => setAdjustAmount(event.target.value)} type="number" placeholder="e.g. 30 or -15" data-testid="input-adjust-amount" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">Reason (required)</span>
                <input value={adjustReason} onChange={(event) => setAdjustReason(event.target.value)} placeholder="Why is this being adjusted?" data-testid="input-adjust-reason" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" />
              </label>
              <button
                type="button"
                onClick={submitAdjustment}
                disabled={createAdjustment.isPending || !adjustUserId.trim() || !adjustReason.trim() || !Number.isFinite(Number(adjustAmount)) || Number(adjustAmount) === 0}
                data-testid="button-add-adjustment"
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Plus size={12} /> Add adjustment
              </button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Ban size={16} className="text-primary" />
              <h2 className="font-display text-lg font-bold tracking-tight">Exclude from leaderboards</h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">Removes the user from every leaderboard — live, snapshots, and future weeks — until re-admitted.</p>
            {exclusionError && <p className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-semibold text-destructive" data-testid="exclusion-error">{exclusionError}</p>}
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">User id</span>
                <input value={excludeUserId} onChange={(event) => setExcludeUserId(event.target.value)} placeholder="00000000-0000-0000-0000-000000000000" data-testid="input-exclude-user" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">Reason (required)</span>
                <input value={excludeReason} onChange={(event) => setExcludeReason(event.target.value)} placeholder="Why is this user excluded?" data-testid="input-exclude-reason" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" />
              </label>
              <button
                type="button"
                onClick={submitExclusion}
                disabled={createExclusion.isPending || !excludeUserId.trim() || !excludeReason.trim()}
                data-testid="button-add-exclusion"
                className="flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Ban size={12} /> Exclude user
              </button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <p className="mb-1 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Excluded</p>
            <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Excluded members ({exclusions.data.length})</h2>
            {exclusions.data.length === 0 ? (
              <EmptyState title="Nobody excluded" detail="Excluded members appear here." />
            ) : (
              <ul className="divide-y divide-border/70">
                {exclusions.data.map((entry) => (
                  <li key={entry.userId} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"><Ban size={14} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{entry.handle}</p>
                      <p className="truncate font-mono-custom text-[9px] uppercase tracking-[.12em] text-muted-foreground/70">{entry.userId}</p>
                    </div>
                    <div className="hidden min-w-0 max-w-[180px] lg:block">
                      <p className="truncate text-xs text-muted-foreground">{entry.reason ?? 'No reason'}</p>
                      <p className="text-[10px] text-muted-foreground/60">{timeAgo(entry.createdAt)}</p>
                    </div>
                    <button type="button" onClick={() => admit(entry.userId)} disabled={removeExclusion.isPending} data-testid={`button-admit-${entry.userId}`} className="flex items-center gap-1.5 rounded-lg border border-border/80 px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50">
                      <Undo2 size={12} /> Re-admit
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <p className="mb-1 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Recent</p>
            <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Pulse adjustments ({adjustments.data.length})</h2>
            {adjustments.data.length === 0 ? (
              <EmptyState title="No adjustments yet" detail="Every pulse adjustment shows up here." />
            ) : (
              <ul className="divide-y divide-border/70">
                {adjustments.data.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 py-3 text-sm">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono-custom text-xs font-bold ${entry.amount >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                      {entry.amount >= 0 ? `+${entry.amount}` : entry.amount}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{entry.handle}</p>
                      <p className="truncate text-xs text-muted-foreground">{entry.reason ?? 'No reason'}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AdminGate>
  );
}

export default AdminLeaderboard;