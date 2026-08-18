import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, UsersRound } from 'lucide-react';
import { getGetAdminCohortQueryKey, getListAdminCohortsQueryKey, useGetAdminCohort, useListAdminCohorts, useMoveCohortMember, useUpdateAdminCohort } from '@workspace/api-client-react';
import { AdminGate, AdminPageHeader } from '@/pages/admin/admin-shell';
import { Card, EmptyState, ErrorState, LoadingBlock } from '@/components/ui-elements';
import { formatMinutes } from '@/lib/format-duration';

function shortId(id: string): string {
  return id.slice(0, 8);
}

function cohortLabel(cohort: { id: string; createdAt: string }): string {
  return `Cohort ${shortId(cohort.id).toUpperCase()} · ${new Date(cohort.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
}

export function AdminCohorts() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCapacity, setEditCapacity] = useState('');
  const [editTopN, setEditTopN] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const { data: cohorts, isPending, isError, refetch } = useListAdminCohorts();
  const cohortDetail = useGetAdminCohort(selectedId ?? '', { query: { queryKey: getGetAdminCohortQueryKey(selectedId ?? ''), enabled: selectedId !== null } });
  const move = useMoveCohortMember();
  const update = useUpdateAdminCohort();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListAdminCohortsQueryKey() });
    if (selectedId) queryClient.invalidateQueries({ queryKey: getGetAdminCohortQueryKey(selectedId) });
  };

  const handleMove = (userId: string, toCohortId: string) => {
    if (!toCohortId) return;
    setMoveError(null);
    move.mutate(
      { userId, data: { toCohortId } },
      {
        onSuccess: () => { refresh(); queryClient.invalidateQueries({ queryKey: getGetAdminCohortQueryKey(toCohortId) }); },
        onError: (error: Error) => setMoveError(error.message || 'Could not move this member.'),
      },
    );
  };

  const openEdit = () => {
    if (!cohortDetail.data) return;
    setEditing(true);
    setEditError(null);
    setEditName(cohortDetail.data.name ?? '');
    setEditCapacity(String(cohortDetail.data.capacity));
    setEditTopN(String(cohortDetail.data.leaderboardTopN));
    setEditReason('');
  };

  const submitEdit = () => {
    if (!cohortDetail.data) return;
    setEditError(null);
    update.mutate(
      {
        cohortId: cohortDetail.data.id,
        data: {
          ...(editName.trim() ? { name: editName.trim() } : { name: null }),
          capacity: Number(editCapacity),
          leaderboardTopN: Number(editTopN),
          ...(editReason.trim() ? { reason: editReason.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          setEditing(false);
          refresh();
        },
        onError: (error: Error) => setEditError(error.message || 'Could not update this cohort.'),
      },
    );
  };

  if (isPending) return <LoadingBlock className="h-64" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <AdminGate>
      <AdminPageHeader title="Cohorts" subtitle="Study groups and their members. Move people around as space allows. Weekly minutes are this week's total across each cohort." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h2 className="mb-3 font-display text-lg font-bold tracking-tight">All cohorts</h2>
          {cohorts.length === 0 ? (
            <Card className="p-6"><EmptyState title="No cohorts yet" detail="Cohorts appear here as they're created." /></Card>
          ) : (
            <ul className="space-y-2">
              {cohorts.map((cohort) => {
                const active = cohort.id === selectedId;
                const nearCapacity = cohort.memberCount / Math.max(1, cohort.capacity) >= 0.8;
                return (
                  <li key={cohort.id}>
                    <button
                      type="button"
                      onClick={() => { setSelectedId(cohort.id); setMoveError(null); }}
                      data-testid={`button-cohort-${cohort.id}`}
                      className={`w-full rounded-2xl border p-4 text-left transition-colors ${active ? 'border-primary bg-primary/5' : 'border-border/80 bg-card hover:bg-secondary/40'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display text-sm font-bold tracking-tight">{cohortLabel(cohort)}</p>
                        {nearCapacity && <span className="rounded-full bg-pill-warm px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase tracking-[.12em] text-pill-warm-fg">Near full</span>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{cohort.memberCount} / {cohort.capacity} members · {formatMinutes(cohort.weeklyMinutes)} studied this week</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2">
          {!selectedId ? (
            <Card className="p-6"><EmptyState title="Pick a cohort" detail="Select a cohort on the left to see its members and manage moves." /></Card>
          ) : cohortDetail.isPending ? (
            <LoadingBlock className="h-64" />
          ) : cohortDetail.isError ? (
            <ErrorState onRetry={() => cohortDetail.refetch()} />
          ) : (
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="mb-1 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Cohort detail</p>
                  <h2 className="font-display text-lg font-bold tracking-tight">{cohortLabel(cohortDetail.data)}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-border/80 bg-secondary/50 px-2.5 py-1 font-mono-custom text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">{cohortDetail.data.memberCount} / {cohortDetail.data.capacity}</span>
                  <button type="button" onClick={openEdit} data-testid="button-edit-cohort" className="flex items-center gap-1.5 rounded-lg border border-border/80 px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    <Pencil size={12} /> Edit
                  </button>
                </div>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                {cohortDetail.data.name ? `${cohortDetail.data.name} · ` : ''}Leaderboard top {cohortDetail.data.leaderboardTopN} · capacity {cohortDetail.data.capacity}
              </p>

              {moveError && <p className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-semibold text-destructive" data-testid="move-error">{moveError}</p>}

              {cohortDetail.data.members.length === 0 ? (
                <EmptyState title="No members yet" detail="People join cohorts through the Compete page." />
              ) : (
                <ul className="divide-y divide-border/70">
                  {cohortDetail.data.members.map((member) => (
                    <li key={member.userId} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground"><UsersRound size={14} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{member.handle}</p>
                        <p className="truncate font-mono-custom text-[10px] text-muted-foreground">{member.email}</p>
                      </div>
                      <span className="hidden font-mono-custom text-[9px] uppercase tracking-[.12em] text-muted-foreground/70 sm:block">Joined {new Date(member.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      <select
                        value=""
                        onChange={(event) => handleMove(member.userId, event.target.value)}
                        disabled={move.isPending}
                        data-testid={`select-move-${member.userId}`}
                        className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-semibold text-muted-foreground outline-none transition-colors focus:border-primary disabled:opacity-50"
                      >
                        <option value="">Move to…</option>
                        {cohorts.filter((cohort) => cohort.id !== cohortDetail.data.id).map((cohort) => (
                          <option key={cohort.id} value={cohort.id} disabled={cohort.memberCount >= cohort.capacity}>
                            {cohortLabel(cohort)}{cohort.memberCount >= cohort.capacity ? ' (full)' : ''}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>

      {editing && cohortDetail.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-md p-5">
            <p className="mb-1 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Edit cohort</p>
            <h2 className="font-display text-lg font-bold tracking-tight">{cohortLabel(cohortDetail.data)}</h2>
            <p className="mt-2 text-xs text-muted-foreground">Capacity caps membership; top-N defines how many ranks count for the weekly streak. All changes are audited.</p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">Name (optional)</span>
                <input value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="e.g. NEET 2027 · Batch 4" data-testid="input-cohort-name" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">Capacity</span>
                <input value={editCapacity} onChange={(event) => setEditCapacity(event.target.value)} type="number" min={1} data-testid="input-cohort-capacity" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">Leaderboard top-N</span>
                <input value={editTopN} onChange={(event) => setEditTopN(event.target.value)} type="number" min={1} data-testid="input-cohort-topn" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">Reason (optional)</span>
                <input value={editReason} onChange={(event) => setEditReason(event.target.value)} placeholder="Why is this changing?" data-testid="input-cohort-reason" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" />
              </label>
            </div>
            {editError && <p className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-semibold text-destructive">{editError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-border/80 px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary" data-testid="button-cancel-cohort-edit">Cancel</button>
              <button type="button" onClick={submitEdit} disabled={update.isPending || !Number.isFinite(Number(editCapacity)) || Number(editCapacity) < 1 || !Number.isFinite(Number(editTopN)) || Number(editTopN) < 1} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50" data-testid="button-save-cohort">
                {update.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </AdminGate>
  );
}

export default AdminCohorts;