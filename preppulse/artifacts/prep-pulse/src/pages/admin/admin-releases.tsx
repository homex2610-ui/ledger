import { Check, Wrench } from 'lucide-react';
import { AdminGate, AdminPageHeader } from '@/pages/admin/admin-shell';
import { Card } from '@/components/ui-elements';
import { APP_RELEASES, CURRENT_RELEASE } from '@/lib/version';

const TYPE_STYLE: Record<string, string> = {
  Feature: 'bg-success/12 text-success',
  Fix: 'bg-warm/12 text-warm',
  UI: 'bg-primary/12 text-primary',
};

export function AdminReleases() {
  return (
    <AdminGate>
      <AdminPageHeader title="Releases" subtitle="What shipped, when, and why it matters." />
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <Wrench size={16} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          This screen documents release history. Deploying or rolling back a version happens through the deployment
          pipeline — the app version and the database schema version are tracked independently, and a rollback here
          would only be cosmetic.
        </p>
      </div>
      <div className="space-y-4">
        {APP_RELEASES.map((release) => {
          const isCurrent = release.version === CURRENT_RELEASE.version;
          return (
            <Card key={release.version} className="p-5" data-testid={`admin-release-${release.version}`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono-custom text-lg font-bold">v{release.version}</p>
                <span className={`rounded-full px-2.5 py-1 font-mono-custom text-[9px] font-bold uppercase tracking-[.12em] ${TYPE_STYLE[release.type] ?? 'bg-secondary text-muted-foreground'}`}>{release.type}</span>
                {isCurrent && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 font-mono-custom text-[9px] font-bold uppercase tracking-[.12em] text-accent-foreground" data-testid="admin-release-current"><Check size={10} /> Current</span>}
                <span className="ml-auto font-mono-custom text-xs text-muted-foreground">{release.date}</span>
              </div>
              <p className="mt-2 text-sm font-bold">{release.heading}</p>
              <div className="mt-3 grid gap-4 text-xs sm:grid-cols-3">
                <div>
                  <p className="mb-1.5 font-mono-custom text-[9px] uppercase tracking-[.15em] text-muted-foreground">Added</p>
                  {release.added.length ? <ul className="list-inside list-disc space-y-1 text-muted-foreground">{release.added.map((note) => <li key={note}>{note}</li>)}</ul> : <p className="text-muted-foreground/50">—</p>}
                </div>
                <div>
                  <p className="mb-1.5 font-mono-custom text-[9px] uppercase tracking-[.15em] text-muted-foreground">Improved</p>
                  {release.improved.length ? <ul className="list-inside list-disc space-y-1 text-muted-foreground">{release.improved.map((note) => <li key={note}>{note}</li>)}</ul> : <p className="text-muted-foreground/50">—</p>}
                </div>
                <div>
                  <p className="mb-1.5 font-mono-custom text-[9px] uppercase tracking-[.15em] text-muted-foreground">Fixed</p>
                  {release.fixed.length ? <ul className="list-inside list-disc space-y-1 text-muted-foreground">{release.fixed.map((note) => <li key={note}>{note}</li>)}</ul> : <p className="text-muted-foreground/50">—</p>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </AdminGate>
  );
}

export default AdminReleases;
