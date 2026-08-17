import { useState } from 'react';
import type { ComponentType } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Megaphone, PartyPopper, Pencil, Plus, Rocket, Sparkles, Star, X } from 'lucide-react';
import { getGetActiveAnnouncementQueryKey, getGetAdminStatsQueryKey, getListAdminAnnouncementsQueryKey, useCreateAnnouncement, useListAdminAnnouncements, useToggleAnnouncement, useUpdateAnnouncement, type Announcement, type AnnouncementCreate } from '@workspace/api-client-react';
import { AdminGate, AdminPageHeader, timeAgo } from '@/pages/admin/admin-shell';
import { Card, EmptyState, ErrorState, LoadingBlock } from '@/components/ui-elements';

const ICON_OPTIONS = [
  { value: 'megaphone', label: 'Megaphone', icon: Megaphone },
  { value: 'party', label: 'Party', icon: PartyPopper },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'bell', label: 'Bell', icon: Bell },
  { value: 'rocket', label: 'Rocket', icon: Rocket },
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
];

const ICON_MAP: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  megaphone: Megaphone,
  party: PartyPopper,
  star: Star,
  bell: Bell,
  rocket: Rocket,
  sparkles: Sparkles,
};

function toBody(data: AnnouncementCreate): AnnouncementCreate {
  return {
    ...data,
    icon: data.icon ?? 'megaphone',
    link: data.link?.trim() ? data.link.trim() : null,
    startsAt: data.startsAt ?? null,
    expiresAt: data.expiresAt ?? null,
  };
}

function toLocalInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 16) : '';
}

function toIso(input: string): string | null {
  const value = input.trim();
  return value ? new Date(value).toISOString() : null;
}

function announcementStatus(announcement: Announcement): { label: string; className: string } {
  const now = Date.now();
  if (!announcement.isEnabled) return { label: 'Draft', className: 'bg-pill-warm text-pill-warm-fg' };
  if (announcement.startsAt && new Date(announcement.startsAt).getTime() > now) return { label: 'Scheduled', className: 'bg-pill-warm text-pill-warm-fg' };
  if (announcement.expiresAt && new Date(announcement.expiresAt).getTime() <= now) return { label: 'Expired', className: 'bg-pill-warm text-pill-warm-fg' };
  return { label: 'Live', className: 'bg-pill-success text-pill-success-fg' };
}

function AnnouncementForm({ initial, onDone, busy }: { initial?: Announcement; onDone: (data: AnnouncementCreate) => void; busy: boolean }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [link, setLink] = useState(initial?.link ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? 'megaphone');
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt));
  const [expiresAt, setExpiresAt] = useState(toLocalInput(initial?.expiresAt));
  const startsIso = toIso(startsAt);
  const expiresIso = toIso(expiresAt);
  const valid = title.trim().length > 0 && body.trim().length > 0 && (!startsIso || !expiresIso || expiresIso > startsIso);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Title (short, shows in the pill)</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} data-testid="input-announcement-title" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" placeholder="e.g. Mock test week is here" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Icon</label>
          <div className="flex flex-wrap items-center gap-1.5">
            {ICON_OPTIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => setIcon(option.value)} data-testid={`icon-option-${option.value}`} title={option.label} className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${icon === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-border/80 text-muted-foreground hover:bg-secondary'}`}>
                <option.icon size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Body</label>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={280} rows={2} data-testid="textarea-announcement-body" className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" placeholder="The full message. Shows on hover of the pill." />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Link (optional)</label>
        <input value={link} onChange={(event) => setLink(event.target.value)} data-testid="input-announcement-link" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" placeholder="https://…" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Show from (optional, local time)</label>
          <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} data-testid="input-announcement-starts" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Hide after (optional, local time)</label>
          <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} data-testid="input-announcement-expires" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => onDone({ title, body, link, icon, startsAt: startsIso, expiresAt: expiresIso })} disabled={!valid || busy} data-testid="button-save-announcement" className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Create announcement'}
        </button>
      </div>
    </div>
  );
}

export function AdminAnnouncements() {
  const queryClient = useQueryClient();
  const { data: announcements, isPending, isError, refetch } = useListAdminAnnouncements();
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();
  const toggle = useToggleAnnouncement();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListAdminAnnouncementsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetActiveAnnouncementQueryKey() });
  };

  const handleCreate = (data: AnnouncementCreate) => {
    setFormError(null);
    create.mutate(
      { data: toBody(data) },
      {
        onSuccess: () => { refresh(); setShowCreate(false); },
        onError: (error: Error) => setFormError(error.message || 'Could not create the announcement.'),
      },
    );
  };

  const handleUpdate = (announcement: Announcement) => (data: AnnouncementCreate) => {
    setFormError(null);
    update.mutate(
      { announcementId: announcement.id, data: toBody(data) },
      {
        onSuccess: () => { refresh(); setEditingId(null); },
        onError: (error: Error) => setFormError(error.message || 'Could not save changes.'),
      },
    );
  };

  const handleToggle = (announcement: Announcement) => {
    setFormError(null);
    toggle.mutate(
      { announcementId: announcement.id, data: { enabled: !announcement.isEnabled } },
      {
        onSuccess: refresh,
        onError: (error: Error) => setFormError(error.message || 'Could not change the announcement state.'),
      },
    );
  };

  if (isPending) return <LoadingBlock className="h-64" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <AdminGate>
      <AdminPageHeader
        title="Announcements"
        subtitle="Pills shown in every user's header. Only one can be live at a time; schedule start/end times to auto-show and auto-hide."
        action={
          <button type="button" onClick={() => { setShowCreate((open) => !open); setEditingId(null); }} data-testid="button-new-announcement" className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90">
            {showCreate ? <X size={14} /> : <Plus size={14} />}{showCreate ? 'Cancel' : 'New announcement'}
          </button>
        }
      />

      {showCreate && (
        <Card className="mb-6 p-5">
          <h2 className="mb-4 font-display text-lg font-bold tracking-tight">New announcement</h2>
          <AnnouncementForm onDone={handleCreate} busy={create.isPending} />
        </Card>
      )}

      {formError && <p className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-semibold text-destructive" data-testid="announcement-error">{formError}</p>}

      {announcements.length === 0 ? (
        <Card className="p-6"><EmptyState title="No announcements yet" detail="Create one and toggle it on to put a pill in everyone's header." /></Card>
      ) : (
        <ul className="space-y-3">
          {announcements.map((announcement) => {
            const Icon = ICON_MAP[announcement.icon] ?? Megaphone;
            const busy = toggle.isPending || update.isPending;
            return (
              <Card key={announcement.id} className="p-5">
                <div className="flex items-start gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${announcement.isEnabled ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-bold tracking-tight">{announcement.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase tracking-[.12em] ${announcementStatus(announcement).className}`}>{announcementStatus(announcement).label}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{announcement.body}</p>
                    {announcement.link && <p className="mt-1 truncate font-mono-custom text-[10px] text-primary">{announcement.link}</p>}
                    {announcement.startsAt && (
                      <p className="mt-1 font-mono-custom text-[9px] uppercase tracking-[.12em] text-muted-foreground/70">Shows {new Date(announcement.startsAt).toLocaleString()}{announcement.expiresAt ? ` · hides ${new Date(announcement.expiresAt).toLocaleString()}` : ''}</p>
                    )}
                    {!announcement.startsAt && announcement.expiresAt && (
                      <p className="mt-1 font-mono-custom text-[9px] uppercase tracking-[.12em] text-muted-foreground/70">Hides {new Date(announcement.expiresAt).toLocaleString()}</p>
                    )}
                    <p className="mt-2 font-mono-custom text-[9px] uppercase tracking-[.12em] text-muted-foreground/70">Created {timeAgo(announcement.createdAt)}</p>
                    {editingId === announcement.id && (
                      <div className="mt-4 border-t border-border/70 pt-4">
                        <AnnouncementForm initial={announcement} onDone={handleUpdate(announcement)} busy={busy} />
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => { setEditingId((id) => (id === announcement.id ? null : announcement.id)); setShowCreate(false); }} data-testid={`button-edit-announcement-${announcement.id}`} className="rounded-lg border border-border/80 p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => handleToggle(announcement)} disabled={busy} data-testid={`button-toggle-announcement-${announcement.id}`} className={`rounded-lg px-3 py-2 text-xs font-bold transition-opacity disabled:opacity-50 ${announcement.isEnabled ? 'border border-border/80 text-muted-foreground hover:bg-secondary' : 'bg-primary text-primary-foreground'}`}>
                      {announcement.isEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </ul>
      )}
    </AdminGate>
  );
}

export default AdminAnnouncements;