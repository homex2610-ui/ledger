import { useLocation, Link } from 'wouter';
import { BarChart3, BookOpen, BrainCircuit, ChartArea, Home, LogOut, Megaphone, MoreHorizontal, Settings, ShieldCheck, Timer, Trophy, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetActiveAnnouncementQueryKey, useDismissAnnouncement, useGetActiveAnnouncement, useGetMe, useLogOut } from '@workspace/api-client-react';
import { getExamConfig } from '@workspace/exam-config';
import { Avatar } from '@/components/avatar';
import { BrandMark } from '@/components/brand-mark';
import { OnboardingModal } from '@/components/onboarding';
import { initialsFor } from '@/lib/utils';
import { useFocusReminder } from '@/lib/reminder-prefs';

const navigation = [
  { href: '/', label: 'Overview', icon: Home },
  { href: '/syllabus', label: 'Syllabus', icon: BookOpen },
  { href: '/tests', label: 'Tests', icon: BarChart3 },
  { href: '/study', label: 'Study', icon: Timer },
  { href: '/recall', label: 'Recall', icon: BrainCircuit },
  { href: '/stats', label: 'Stats', icon: ChartArea },
  { href: '/compete', label: 'Compete', icon: Trophy },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const me = useGetMe().data;
  const logOut = useLogOut();
  const activeLabel = navigation.find((item) => item.href === location)?.label ?? 'Ledger';
  const handle = me?.profile.handle ?? 'Learner';
  const initials = initialsFor(handle);
  const examLabel = getExamConfig(me?.profile.examTrack).label;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const activeAnnouncement = useGetActiveAnnouncement().data?.announcement ?? null;
  const dismissAnnouncement = useDismissAnnouncement();
  const reminder = useFocusReminder();

  const dismissActiveAnnouncement = () => {
    if (!activeAnnouncement) return;
    dismissAnnouncement.mutate(
      { announcementId: activeAnnouncement.id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetActiveAnnouncementQueryKey() }) },
    );
  };

  const signOut = () => {
    logOut.mutate(undefined, { onSuccess: () => queryClient.clear() });
  };

  return (
    <div className="min-h-[100dvh] bg-background md:h-[100dvh] md:overflow-hidden">
      <div className="main-grid mx-auto grid min-h-[100dvh] max-w-[1540px] md:h-full md:overflow-hidden">
        <aside className="hidden border-r border-sidebar/30 bg-sidebar px-4 py-6 text-sidebar-foreground md:flex md:flex-col md:overflow-y-auto">
          <Link href="/" className="mb-8 flex items-center gap-3" data-testid="link-brand">
            <BrandMark size={36} />
            <span>
              <span className="block font-display text-[1.1rem] font-bold tracking-tight">Ledger</span>
              <span className="font-mono-custom text-[9px] uppercase tracking-[.2em] text-sidebar-foreground/55">keep moving</span>
            </span>
          </Link>
          <p className="mb-3 px-3 font-mono-custom text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/45">Your workspace</p>
          <nav className="space-y-1" aria-label="Primary navigation">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`} className={`nav-link relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active ? 'bg-sidebar-foreground/10 text-sidebar-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-foreground/7 hover:text-sidebar-foreground'}`}>
                  {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent" />}
                  <Icon size={17} strokeWidth={active ? 2.5 : 1.8} className={active ? 'text-accent' : ''} />
                  {label}
                </Link>
              );
            })}
          </nav>
          {me?.profile.isAdmin && (
            <Link href="/admin" data-testid="link-nav-admin" className={`nav-link relative mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${location.startsWith('/admin') ? 'bg-sidebar-foreground/10 text-sidebar-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-foreground/7 hover:text-sidebar-foreground'}`}>
              {location.startsWith('/admin') && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent" />}
              <ShieldCheck size={17} strokeWidth={location.startsWith('/admin') ? 2.5 : 1.8} className={location.startsWith('/admin') ? 'text-accent' : ''} />
              Admin
            </Link>
          )}
          <a
            href="https://discord.gg/6nf5BrEfHU"
            target="_blank"
            rel="noreferrer"
            data-testid="link-discord"
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl border border-sidebar-foreground/15 bg-sidebar-foreground/5 px-3 py-2.5 text-xs font-bold text-sidebar-foreground/85 transition-colors hover:border-sidebar-foreground/30 hover:bg-sidebar-foreground/10"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" /></svg>
            Join Discord
          </a>
          <Link href="/settings" data-testid="link-nav-settings" className="nav-link mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-sidebar-foreground/65 hover:bg-sidebar-foreground/7 hover:text-sidebar-foreground">
            <Settings size={17} /> Settings
          </Link>
          <button type="button" onClick={signOut} disabled={logOut.isPending} className="nav-link mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-sidebar-foreground/65 hover:bg-sidebar-foreground/7 hover:text-sidebar-foreground" data-testid="button-sign-out">
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
            {activeAnnouncement && (
              <div className="hidden items-center gap-2 rounded-full border border-border/80 bg-card px-4 py-2 text-xs font-bold sm:flex" data-testid="announcement-pill">
                <Megaphone size={13} className="shrink-0 text-primary" />
                <span className="max-w-[280px] truncate" title={activeAnnouncement.body}>{activeAnnouncement.title}</span>
                <button type="button" onClick={dismissActiveAnnouncement} aria-label="Dismiss announcement" data-testid="button-dismiss-announcement" className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><X size={13} /></button>
              </div>
            )}
            <Link href="/settings" data-testid="link-header-profile" className="flex items-center gap-3 rounded-full pl-2 transition-transform hover:scale-[1.02]">
              <span className="hidden text-right sm:block"><span className="block text-xs font-bold">{handle}</span><span className="font-mono-custom text-[10px] text-muted-foreground">{examLabel} · {me?.profile.targetYear ?? ''}</span></span>
              <Avatar src={me?.profile.avatarUrl} initials={initials} className="h-10 w-10 bg-primary text-xs text-white" title={handle} />
            </Link>
          </header>
          {reminder.show && location !== '/study' && (
            <div className="mx-5 mt-4 flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 md:mx-10" data-testid="focus-reminder">
              <Timer size={16} className="shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Time for a focus block?</p>
                <p className="text-xs text-muted-foreground">Even 25 focused minutes moves the needle.</p>
              </div>
              <Link href="/study" className="shrink-0 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground" data-testid="link-reminder-study">Start a block</Link>
              <button type="button" onClick={reminder.dismiss} aria-label="Dismiss reminder" data-testid="button-dismiss-reminder" className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><X size={14} /></button>
            </div>
          )}
          <main className="page-enter px-5 pb-28 pt-7 md:min-h-0 md:flex-1 md:overflow-y-auto md:px-10 md:pb-12 md:pt-10">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-around rounded-2xl border border-border/80 bg-card/95 p-2 shadow-[0_14px_40px_hsl(186_32%_16%/.12)] backdrop-blur-md md:hidden" aria-label="Mobile navigation">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = location === href;
          return <Link key={href} href={href} data-testid={`link-mobile-${label.toLowerCase()}`} className={`flex min-w-[40px] flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-semibold ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}><Icon size={16} /><span className="leading-none">{label}</span></Link>;
        })}
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-sidebar/40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="h-full w-[82%] max-w-[300px] bg-sidebar p-6 text-sidebar-foreground shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-10 flex items-center justify-between">
              <span className="font-display text-xl font-bold">Ledger</span>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 text-sidebar-foreground/70" aria-label="Close navigation" data-testid="button-close-menu"><X size={19} /></button>
            </div>
            <nav className="space-y-2">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)} data-testid={`link-drawer-${label.toLowerCase()}`} className={`flex items-center gap-3 rounded-xl px-3 py-3 font-semibold ${location === href ? 'bg-accent/20 text-accent' : 'text-sidebar-foreground/70'}`}><Icon size={18} />{label}</Link>)}
              {me?.profile.isAdmin && <Link href="/admin" onClick={() => setMobileMenuOpen(false)} data-testid="link-drawer-admin" className={`flex items-center gap-3 rounded-xl px-3 py-3 font-semibold ${location.startsWith('/admin') ? 'bg-accent/20 text-accent' : 'text-sidebar-foreground/70'}`}><ShieldCheck size={18} />Admin</Link>}
            </nav>
            <Link href="/settings" onClick={() => setMobileMenuOpen(false)} data-testid="link-drawer-settings" className="mt-3 flex items-center gap-3 rounded-xl px-3 py-3 font-semibold text-sidebar-foreground/70"><Settings size={18} />Settings</Link>
            <button type="button" onClick={() => { setMobileMenuOpen(false); signOut(); }} data-testid="button-drawer-sign-out" className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 font-semibold text-sidebar-foreground/70"><LogOut size={18} />Sign out</button>
          </div>
        </div>
      )}
      <OnboardingModal />
    </div>
  );
}