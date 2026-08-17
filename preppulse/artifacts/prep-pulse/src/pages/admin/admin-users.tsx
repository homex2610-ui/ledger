import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { getGetAdminUserQueryKey, getListAdminUsersQueryKey, listAdminUsersExport, useGetAdminUser, useListAdminUsers, useRemoveAdminUser, useSetAdmin, type AdminUserExportRow } from '@workspace/api-client-react';
import { AdminGate, AdminPageHeader, timeAgo } from '@/pages/admin/admin-shell';
import { Card, EmptyState, ErrorState, LoadingBlock } from '@/components/ui-elements';

const EXPORT_COLUMNS: { key: keyof AdminUserExportRow; label: string }[] = [
  { key: 'handle', label: 'handle' },
  { key: 'email', label: 'email' },
  { key: 'isAdmin', label: 'is_admin' },
  { key: 'createdAt', label: 'created_at' },
  { key: 'cohortId', label: 'cohort_id' },
  { key: 'sessionCount', label: 'study_sessions' },
  { key: 'totalMinutes', label: 'total_minutes' },
  { key: 'focusSessionsCompleted', label: 'focus_sessions' },
];

function toCsv(rows: AdminUserExportRow[]): string {
  const escape = (value: string | number | boolean | null) => {
    const text = value === null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = EXPORT_COLUMNS.map((column) => column.label).join(',');
  const lines = rows.map((row) => EXPORT_COLUMNS.map((column) => escape(row[column.key])).join(','));
  return [header, ...lines].join('\n');
}

export function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { data: users, isPending, isError, refetch } = useListAdminUsers({ q: query || undefined });
  const userDetail = useGetAdminUser(expandedId ?? '', { query: { queryKey: getGetAdminUserQueryKey(expandedId ?? ''), enabled: expandedId !== null } });
  const setAdmin = useSetAdmin();
  const removeUser = useRemoveAdminUser();

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey({ q: query || undefined }) });
    if (expandedId) {
      queryClient.invalidateQueries({ queryKey: getGetAdminUserQueryKey(expandedId) });
    }
  };

  const handleSetAdmin = (userId: string, isAdmin: boolean) => {
    setRoleError(null);
    setAdmin.mutate(
      { userId, data: { isAdmin: !isAdmin } },
      {
        onSuccess: () => { refresh(); setExpandedId(null); },
        onError: (error: Error) => setRoleError(error.message || 'Could not change the admin role.'),
      },
    );
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const rows = await listAdminUsersExport();
      const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ledger-users.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch { /* export failed silently */ } finally { setExporting(false); }
  };

  const handleRemove = (userId: string, handle: string) => {
    if (!window.confirm(`Remove ${handle} and ALL their data? This can't be undone.`)) return;
    setRoleError(null);
    removeUser.mutate(
      { userId },
      {
        onSuccess: () => { refresh(); setExpandedId(null); },
        onError: (error: Error) => setRoleError(error.message || 'Could not remove this user.'),
      },
    );
  };

  return (
    <AdminGate>
      <AdminPageHeader
        title="Users"
        subtitle="Every account, plus the power to grant admin and remove accounts."
        action={
          <button type="button" onClick={handleExport} disabled={exporting} data-testid="button-export-users" className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
            <Download size={14} />{exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3 py-2">
        <Search size={15} className="shrink-0 text-muted-foreground" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by handle or email…" data-testid="input-user-search" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70" />
      </div>

      {roleError && <p className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-semibold text-destructive" data-testid="role-error">{roleError}</p>}

      {isPending ? (
        <LoadingBlock className="h-64" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : users.length === 0 ? (
        <Card className="p-6"><EmptyState title="No users found" detail={query ? `Nothing matches “${query}”.` : 'Users will show up here as they sign up.'} /></Card>
      ) : (
        <Card className="divide-y divide-border/70 overflow-hidden">
          {users.map((user) => {
            const expanded = user.id === expandedId;
            const detail = expanded ? userDetail.data : null;
            return (
              <div key={user.id} className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold">{user.handle}</p>
                      {user.isAdmin && <span className="rounded-full bg-pill-success px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase tracking-[.12em] text-pill-success-fg">Admin</span>}
                    </div>
                    <p className="truncate font-mono-custom text-[10px] text-muted-foreground">{user.email}</p>
                  </div>
                  <span className="hidden font-mono-custom text-[9px] uppercase tracking-[.12em] text-muted-foreground/70 sm:block">Joined {timeAgo(user.createdAt)}</span>
                  <button type="button" onClick={() => { setExpandedId(expanded ? null : user.id); setRoleError(null); }} data-testid={`button-expand-user-${user.id}`} className="rounded-lg border border-border/80 px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    {expanded ? 'Hide' : 'Details'}
                  </button>
                  <button type="button" onClick={() => handleSetAdmin(user.id, user.isAdmin)} disabled={setAdmin.isPending} data-testid={`button-set-admin-${user.id}`} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-opacity disabled:opacity-50 ${user.isAdmin ? 'border border-border/80 text-muted-foreground hover:bg-secondary' : 'bg-primary text-primary-foreground'}`}>
                    <ShieldCheck size={13} />{user.isAdmin ? 'Remove admin' : 'Make admin'}
                  </button>
                </div>
                {expanded && (
                  <div className="mt-4 rounded-xl border border-border/70 bg-secondary/30 p-4">
                    {userDetail.isPending ? (
                      <LoadingBlock className="h-16" />
                    ) : detail ? (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                        <div><p className="font-mono-custom text-[9px] uppercase tracking-[.14em] text-muted-foreground/70">Study sessions</p><p className="mt-0.5 font-semibold">{detail.sessionCount}</p></div>
                        <div><p className="font-mono-custom text-[9px] uppercase tracking-[.14em] text-muted-foreground/70">Minutes focused</p><p className="mt-0.5 font-semibold">{detail.totalMinutes}</p></div>
                        <div><p className="font-mono-custom text-[9px] uppercase tracking-[.14em] text-muted-foreground/70">Focus sessions</p><p className="mt-0.5 font-semibold">{detail.focusSessionsCompleted}</p></div>
                        <div><p className="font-mono-custom text-[9px] uppercase tracking-[.14em] text-muted-foreground/70">Cohort</p><p className="mt-0.5 truncate font-semibold">{detail.cohortId ? `${detail.cohortId.slice(0, 8).toUpperCase()}${detail.cohortJoinedAt ? ` · ${new Date(detail.cohortJoinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}` : 'None'}</p></div>
                      </div>
                    ) : (
                      <ErrorState onRetry={() => userDetail.refetch()} />
                    )}
                    <div className="mt-4 border-t border-border/70 pt-3">
                      <button type="button" onClick={() => handleRemove(user.id, user.handle)} disabled={removeUser.isPending} data-testid={`button-remove-user-${user.id}`} className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50">
                        <Trash2 size={13} />{removeUser.isPending ? 'Removing…' : 'Remove account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </AdminGate>
  );
}

export default AdminUsers;