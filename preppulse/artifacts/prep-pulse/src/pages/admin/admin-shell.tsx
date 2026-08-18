import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Flag, Megaphone, Rocket, ScrollText, ShieldCheck, SlidersHorizontal, Users, UsersRound } from 'lucide-react';
import { useGetMe } from '@workspace/api-client-react';
import { LoadingBlock } from '@/components/ui-elements';
import NotFound from '@/pages/not-found';

const TABS = [
  { href: '/admin', label: 'Overview', icon: ShieldCheck },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/cohorts', label: 'Cohorts', icon: UsersRound },
  { href: '/admin/leaderboard', label: 'Leaderboard', icon: SlidersHorizontal },
  { href: '/admin/flags', label: 'Flags', icon: Flag },
  { href: '/admin/audit', label: 'Audit', icon: ScrollText },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/releases', label: 'Releases', icon: Rocket },
];

export function AdminTabs() {
  const [location] = useLocation();
  return (
    <div className="mb-6 flex flex-wrap items-center gap-1 rounded-xl border border-border/80 bg-card p-1">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = location === href;
        return (
          <Link key={href} href={href} data-testid={`tab-admin-${label.toLowerCase()}`} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
            <Icon size={14} />{label}
          </Link>
        );
      })}
    </div>
  );
}

export function AdminPageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-1 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Admin</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function AdminGate({ children }: { children: ReactNode }) {
  const { data: me, isPending } = useGetMe();
  if (isPending) return <LoadingBlock className="h-64" />;
  if (!me?.profile.isAdmin) return <NotFound />;
  return <div className="page-enter mx-auto max-w-[1100px]"><AdminTabs />{children}</div>;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}