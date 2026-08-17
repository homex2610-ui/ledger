import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UsersRound } from 'lucide-react';
import { getGetAdminCohortQueryKey, getListAdminCohortsQueryKey, useGetAdminCohort, useListAdminCohorts, useMoveCohortMember } from '@workspace/api-client-react';
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
  const { data: cohorts, isPending, isError, refetch } = useListAdminCohorts();
  const cohortDetail = useGetAdminCohort(selectedId ?? '', { query: { queryKey: getGetAdminCohortQueryKey(selectedId ?? ''), enabled: selectedId !== null } });
  const move = useMoveCohortMember();

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
                <span className="rounded-full border border-border/80 bg-secondary/50 px-2.5 py-1 font-mono-custom text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">{cohortDetail.data.memberCount} / {cohortDetail.data.capacity}</span>
              </div>

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
    </AdminGate>
  );
}

export default AdminCohorts;