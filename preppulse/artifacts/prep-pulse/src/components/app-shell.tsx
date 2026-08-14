import { useLocation, Link } from 'wouter';
import { BarChart3, BookOpen, BrainCircuit, Home, LogOut, MoreHorizontal, Settings, Timer, Trophy, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetDashboard, useGetMe, useLogOut } from '@workspace/api-client-react';
import { getExamConfig } from '@workspace/exam-config';
import { Avatar } from '@/components/avatar';
import { OnboardingModal } from '@/components/onboarding';
import { browserTimeZone, initialsFor } from '@/lib/utils';

const navigation = [
  { href: '/', label: 'Overview', icon: Home },
  { href: '/syllabus', label: 'Syllabus', icon: BookOpen },
  { href: '/tests', label: 'Tests', icon: BarChart3 },
  { href: '/study', label: 'Study', icon: Timer },
  { href: '/recall', label: 'Recall', icon: BrainCircuit },
  { href: '/compete', label: 'Compete', icon: Trophy },
];

const SIGNALS = [
  'Consistency beats the heroic all-nighter.',
  'A small session today is still a session.',
  'The syllabus moves one topic at a time.',
  'Rest is part of the routine, not a reward.',
  'Show up before you feel ready.',
  'Yesterday is data. Today is practice.',
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const me = useGetMe().data;
  const dashboard = useGetDashboard({ tz: browserTimeZone() }).data;
  const logOut = useLogOut();
  const activeLabel = navigation.find((item) => item.href === location)?.label ?? 'PrepPulse';
  const handle = me?.profile.handle ?? 'Learner';
  const initials = initialsFor(handle);
  const examLabel = getExamConfig(me?.profile.examTrack).label;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const signal = SIGNALS[new Date().getDate() % SIGNALS.length];
  const signalProgress = dashboard
    ? Math.min(100, Math.round(((dashboard.weeklyMinutes ?? 0) / Math.max(1, dashboard.weeklyGoalMinutes ?? 1)) * 100))
    : 35;

  const signOut = () => {
    logOut.mutate(undefined, { onSuccess: () => queryClient.clear() });
  };

  return (
    <div className="min-h-[100dvh] bg-background md:h-[100dvh] md:overflow-hidden">
      <div className="main-grid mx-auto grid min-h-[100dvh] max-w-[1540px] md:h-full md:overflow-hidden">
        <aside className="hidden border-r border-sidebar/30 bg-sidebar px-5 py-7 text-sidebar-foreground md:flex md:flex-col md:overflow-y-auto">
          <Link href="/" className="mb-12 flex items-center gap-3" data-testid="link-brand">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent font-display text-lg font-bold text-white shadow-sm">P</span>
            <span>
              <span className="block font-display text-[1.2rem] font-bold tracking-tight">PrepPulse</span>
              <span className="font-mono-custom text-[9px] uppercase tracking-[.2em] text-sidebar-foreground/55">keep moving</span>
            </span>
          </Link>
          <p className="mb-3 px-3 font-mono-custom text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/45">Your workspace</p>
          <nav className="space-y-1" aria-label="Primary navigation">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`} className={`nav-link flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active ? 'bg-accent/20 text-accent' : 'text-sidebar-foreground/65 hover:bg-sidebar-foreground/7 hover:text-sidebar-foreground'}`}>
                  <Icon size={17} strokeWidth={active ? 2.5 : 1.8} />
                  {label}
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-2xl border border-sidebar-foreground/10 bg-sidebar-foreground/5 p-4">
            <p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-accent">Small signal</p>
            <p className="mt-2 text-sm leading-relaxed text-sidebar-foreground/75" key={signal} data-testid="small-signal-quote">{signal}</p>
            <div className="mt-4 h-1 rounded-full bg-sidebar-foreground/10"><div className="h-1 rounded-full bg-accent progress-fill" style={{ width: `${signalProgress}%` }} /></div>
            <p className="mt-2 font-mono-custom text-[9px] uppercase tracking-[.14em] text-sidebar-foreground/40">Week progress</p>
          </div>
          <Link href="/settings" data-testid="link-nav-settings" className="nav-link mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-sidebar-foreground/65 hover:bg-sidebar-foreground/7 hover:text-sidebar-foreground">
            <Settings size={17} /> Settings
          </Link>
          <button type="button" onClick={signOut} disabled={logOut.isPending} className="nav-link mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-sidebar-foreground/65 hover:bg-sidebar-foreground/7 hover:text-sidebar-foreground" data-testid="button-sign-out">
            <LogOut size={17} /> {logOut.isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </aside>

        <div className="min-w-0 md:flex md:h-full md:min-h-0 md:flex-col md:overflow-hidden">
          <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md md:px-10">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setMobileMenuOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary md:hidden" aria-label="Open navigation" data-testid="button-open-menu">
                <MoreHorizontal size={18} />
              </button>
              <div>
                <p className="font-mono-custom text-[10px] uppercase tracking-[.19em] text-muted-foreground">{dateLabel}</p>
                <p className="font-display text-lg font-bold md:hidden">{activeLabel}</p>
              </div>
            </div>
            <Link href="/settings" data-testid="link-header-profile" className="flex items-center gap-3 rounded-full pl-2 transition-transform hover:scale-[1.02]">
              <span className="hidden text-right sm:block"><span className="block text-xs font-bold">{handle}</span><span className="font-mono-custom text-[10px] text-muted-foreground">{examLabel} · {me?.profile.targetYear ?? ''}</span></span>
              <Avatar src={me?.profile.avatarUrl} initials={initials} className="h-10 w-10 bg-primary text-xs text-white" title={handle} />
            </Link>
          </header>
          <main className="page-enter px-5 pb-28 pt-7 md:min-h-0 md:flex-1 md:overflow-y-auto md:px-10 md:pb-12 md:pt-10">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-around rounded-2xl border border-border/80 bg-card/95 p-2 shadow-[0_14px_40px_hsl(186_32%_16%/.12)] backdrop-blur-md md:hidden" aria-label="Mobile navigation">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = location === href;
          return <Link key={href} href={href} data-testid={`link-mobile-${label.toLowerCase()}`} className={`flex min-w-[48px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}><Icon size={17} /><span>{label}</span></Link>;
        })}
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-sidebar/40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="h-full w-[82%] max-w-[300px] bg-sidebar p-6 text-sidebar-foreground shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-10 flex items-center justify-between">
              <span className="font-display text-xl font-bold">PrepPulse</span>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 text-sidebar-foreground/70" aria-label="Close navigation" data-testid="button-close-menu"><X size={19} /></button>
            </div>
            <nav className="space-y-2">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)} data-testid={`link-drawer-${label.toLowerCase()}`} className={`flex items-center gap-3 rounded-xl px-3 py-3 font-semibold ${location === href ? 'bg-accent/20 text-accent' : 'text-sidebar-foreground/70'}`}><Icon size={18} />{label}</Link>)}</nav>
            <Link href="/settings" onClick={() => setMobileMenuOpen(false)} data-testid="link-drawer-settings" className="mt-3 flex items-center gap-3 rounded-xl px-3 py-3 font-semibold text-sidebar-foreground/70"><Settings size={18} />Settings</Link>
            <button type="button" onClick={() => { setMobileMenuOpen(false); signOut(); }} data-testid="button-drawer-sign-out" className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 font-semibold text-sidebar-foreground/70"><LogOut size={18} />Sign out</button>
          </div>
        </div>
      )}
      <OnboardingModal />
    </div>
  );
}