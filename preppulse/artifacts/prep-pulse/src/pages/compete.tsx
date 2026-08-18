import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown, Clock, Copy, Crown, EyeOff, Flame, Link2, Lock, Search, ShieldCheck, Sparkles, Timer, Trash2, Trophy, UserRoundPlus, Users } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  discoverGroups,
  getGetCirclesQueryKey,
  getGetLeaderboardQueryKey,
  getListGroupsQueryKey,
  useConnectByCode,
  useCreateGroup,
  useDeleteGroup,
  useGetCircleFeed,
  useGetCircles,
  useGetCohorts,
  useGetCohortsFeed,
  useGetCohortsLeaderboard,
  useGetCohortsLeaderboardSparkline,
  useGetGroup,
  useGetGroupActivity,
  useGetGroupLeaderboard,
  useGetGroupLeaderboardSparkline,
  useGetLeaderboard,
  useJoinGroupByCode,
  useLeaveGroup,
  useListGroups,
  useRemoveConnection,
  useUpdateGroup,
  type CircleFeedItem,
  type CircleMember,
  type CohortMember as CohortMemberRow,
  type GroupSummary,
  type LeaderboardEntry,
} from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, LoadingBlock, SectionTitle, StatTile } from '@/components/ui-elements';
import { Avatar, avatarColorFor } from '@/components/avatar';
import { browserTimeZone } from '@/lib/utils';

type Tab = 'board' | 'groups';
type Scope = 'private' | 'cohort';

const SESSION_TAB_KEY = 'pp-compete-tab';
const PREV_RANK_KEY = 'pp-prev-rank';
const rankDeltaByHandle = new Map<string, number | null>();

let podiumStagedOnce = false;
let pinnedDrawnOnce = false;
const seenFeedIds = new Set<string>();

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function weekRange(label: string): string {
  const match = /^([A-Z][a-z]+) (\d+) - ([A-Z][a-z]+) (\d+)$/.exec(label);
  if (!match) return label;
  const [, monthA, dayA, monthB, dayB] = match;
  return monthA === monthB ? `${monthA} ${dayA} – ${dayB}` : `${monthA} ${dayA} – ${monthB} ${dayB}`;
}

export default function Compete() {
  const [tab, setTab] = useState<Tab>('board');

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Compare gently</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.04em] md:text-5xl">The weekly circle</h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">A private room for showing up. No public scores, no shame.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-4 py-2 text-xs font-bold" data-testid="pill-private-by-default"><Lock size={13} className="text-primary" /> Private by default</span>
      </div>

      <div className="mt-7 flex gap-1 rounded-xl border border-border/70 bg-card p-1 sm:w-fit">
        {([['board', 'Board'], ['groups', 'Groups']] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:flex-none ${tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`} data-testid={`tab-${key}`}>{label}</button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'board' && <BoardTab />}
        {tab === 'groups' && <GroupsTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board: this week's leaderboard + private connections
// ---------------------------------------------------------------------------

function BoardTab() {
  return <CompetePanel />;
}

function CompetePanel() {
  const circlesQuery = useGetCircles({ tz: browserTimeZone() });
  const [scope, setScope] = useState<Scope | null>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_TAB_KEY);
      if (stored === 'private' || stored === 'cohort') return stored;
    } catch { /* storage unavailable */ }
    return null;
  });

  useEffect(() => {
    if (scope) return;
    if (circlesQuery.isLoading || circlesQuery.isPending) return;
    setScope(circlesQuery.data && circlesQuery.data.connections.length === 0 ? 'cohort' : 'private');
  }, [scope, circlesQuery.data, circlesQuery.isLoading, circlesQuery.isPending]);

  const changeScope = (next: Scope) => {
    setScope(next);
    try { sessionStorage.setItem(SESSION_TAB_KEY, next); } catch { /* storage unavailable */ }
  };

  if (!scope) return <LoadingBlock className="h-80" />;

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-2xl border border-border/80 bg-card p-4 md:p-5">
        <SegmentedToggle scope={scope} onChange={changeScope} />
        <div className="pp-tab-fade mt-5" key={scope}>
          {scope === 'private' ? <PrivateTab /> : <CohortTab />}
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <ThePointCard scope={scope} />
        <YourBoundaryCard scope={scope} />
      </div>
    </div>
  );
}

function SegmentedToggle({ scope, onChange }: { scope: Scope; onChange: (scope: Scope) => void }) {
  const privateRef = useRef<HTMLButtonElement>(null);
  const cohortRef = useRef<HTMLButtonElement>(null);
  const refs: Record<Scope, { current: HTMLButtonElement | null }> = { private: privateRef, cohort: cohortRef };
  const options: { id: Scope; label: string; icon: ReactNode }[] = [
    { id: 'private', label: 'Private', icon: <Lock size={14} /> },
    { id: 'cohort', label: 'Cohort', icon: <Users size={14} /> },
  ];
  const activeIndex = scope === 'private' ? 0 : 1;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = options.length;
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = (index + 1) % count;
    else if (event.key === 'ArrowLeft') next = (index - 1 + count) % count;
    else return;
    event.preventDefault();
    const target = options[next].id;
    refs[target].current?.focus();
    onChange(target);
  };

  return (
    <div role="tablist" aria-label="Board scope" className="relative grid grid-cols-2 rounded-full border border-border/80 bg-background p-1">
      <span aria-hidden className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-primary/10 transition-transform duration-150 ease-out ${activeIndex === 1 ? 'translate-x-full' : ''}`} />
      {options.map((option, index) => (
        <button key={option.id} type="button" role="tab" id={`tab-${option.id}`} aria-selected={scope === option.id} aria-controls={`panel-${option.id}`} tabIndex={scope === option.id ? 0 : -1} ref={refs[option.id]} onKeyDown={(event) => onKeyDown(event, index)} onClick={() => onChange(option.id)} className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${scope === option.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          {option.icon}{option.label}
        </button>
      ))}
    </div>
  );
}

function isNotAssigned(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

function StreakChip({ streak }: { streak?: number }) {
  if (!streak) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-bold text-foreground" title={`${streak}-day streak`}>
      <Flame size={10} fill="currentColor" />{streak}
    </span>
  );
}

function useRankDelta(handle: string | undefined, rank: number | undefined): number | null {
  const [delta, setDelta] = useState<number | null>(null);
  useEffect(() => {
    if (!handle || !rank) return;
    const cached = rankDeltaByHandle.get(handle);
    if (cached !== undefined) { setDelta(cached); return; }
    try {
      const raw = localStorage.getItem(PREV_RANK_KEY);
      const prev = raw ? JSON.parse(raw) as { handle?: string; rank?: number } : null;
      const next = prev && prev.handle === handle && typeof prev.rank === 'number' && prev.rank !== rank ? rank - prev.rank : null;
      localStorage.setItem(PREV_RANK_KEY, JSON.stringify({ handle, rank }));
      rankDeltaByHandle.set(handle, next);
      setDelta(next);
    } catch { /* storage unavailable */ }
  }, [handle, rank]);
  return delta;
}

function useCountUp(value: number, animate: boolean): number {
  const [display, setDisplay] = useState(animate ? 0 : value);
  const first = useRef(true);
  useEffect(() => {
    if (!first.current) { setDisplay(value); return; }
    first.current = false;
    if (!animate) { setDisplay(value); return; }
    let raf = 0;
    const start = performance.now();
    const duration = 400;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, value]);
  return display;
}

interface BoardMeta {
  rankDelta: number | null;
  streak: number;
  pb: number | null;
  gapToNext: number | null;
  gapState: 'active' | 'leading' | 'empty';
}

const TOP_N_CELEBRATED = 3;

function useCountdown(weekEnd: string | null | undefined): { total: number } | null {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!weekEnd) { setRemaining(null); return; }
    const end = new Date(weekEnd).getTime();
    if (Number.isNaN(end)) { setRemaining(null); return; }
    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [weekEnd]);
  if (remaining === null) return null;
  return { total: remaining };
}

function formatCountdown(total: number): string {
  const days = Math.floor(total / 86_400_000);
  const hours = Math.floor((total % 86_400_000) / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function CountdownBadge({ weekEnd }: { weekEnd?: string | null }) {
  const countdown = useCountdown(weekEnd);
  if (!countdown) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-bold tabular-nums text-muted-foreground" title="Time left in this week's board" data-testid="countdown">
      <Timer size={12} className="text-primary" />{formatCountdown(countdown.total)}
    </span>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta === 0) return <span className="shrink-0 text-[10px] font-bold text-muted-foreground" title="Same rank as last week">–</span>;
  return (
    <span className={`shrink-0 text-[10px] font-bold ${delta > 0 ? 'text-success' : 'text-accent'}`} title={delta > 0 ? `Up ${delta} from last week` : `Down ${-delta} from last week`}>
      {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}
    </span>
  );
}

function WeeklyStreakChip({ streak }: { streak: number }) {
  if (streak < 2) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-600" title={`${streak} weeks in the top of this board`} data-testid="weekly-streak">
      <Trophy size={10} fill="currentColor" />{streak}
    </span>
  );
}

function Sparkline({ ranks }: { ranks: number[] }) {
  if (ranks.length < 2) return null;
  const width = 64;
  const height = 20;
  const max = Math.max(1, ...ranks);
  const points = ranks.map((rank, index) => `${(index / (ranks.length - 1)) * width},${4 + (rank / max) * (height - 8)}`).join(' ');
  const latest = ranks[ranks.length - 1];
  const rising = latest <= (ranks[ranks.length - 2] ?? latest);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden data-testid="sparkline">
      <polyline points={points} fill="none" stroke={rising ? 'var(--color-success)' : 'var(--color-accent)'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function CelebrationCard({ rank, meta, weekEnd }: { rank: number; meta: BoardMeta; weekEnd?: string | null }) {
  const [dismissed, setDismissed] = useState(false);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!weekEnd) return;
    try {
      const key = `pp-celebrate-${weekEnd}`;
      if (sessionStorage.getItem(key)) { setSeen(true); return; }
      sessionStorage.setItem(key, '1');
    } catch { /* storage unavailable */ }
  }, [weekEnd]);
  if (!weekEnd || dismissed || seen) return null;
  const leading = meta.gapState === 'leading' && rank === 1;
  const enteredTop = rank <= TOP_N_CELEBRATED;
  if (!leading && !enteredTop) return null;
  return (
    <section className="rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-400/15 via-card to-card p-4 md:p-5" data-testid="celebration">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-400/20 text-amber-500"><Crown size={17} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-foreground">{leading ? "You're leading this week's board!" : `You're in the top ${rank} this week!`}</p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{leading ? "Keep showing up — the board resets next week." : "Keep showing up — the board resets next week."}</p>
        </div>
        <button type="button" onClick={() => setDismissed(true)} className="rounded-lg px-2 py-1 text-xs font-bold text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" aria-label="Dismiss celebration">Dismiss</button>
      </div>
    </section>
  );
}


function RankedBoard({ entries, weekLabel, weekEnd, focused, streakByHandle, avatarColorByHandle, metaByHandle, sparklineByHandle, loading, error, onRetry, removableByHandle, onRemove, ownerHandle, emptyTitle, emptyDetail }: {
  entries: LeaderboardEntry[];
  weekLabel?: string;
  weekEnd?: string | null;
  focused: boolean;
  streakByHandle: Map<string, number>;
  avatarColorByHandle: Map<string, string>;
  metaByHandle?: Map<string, BoardMeta>;
  sparklineByHandle?: Map<string, number[]>;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  removableByHandle?: Map<string, { userId: string }>;
  onRemove?: (userId: string) => void;
  ownerHandle?: string | null;
  emptyTitle: string;
  emptyDetail: string;
}) {
  if (loading) return <BoardSkeleton />;
  if (error) return <ErrorState onRetry={onRetry} />;
  return (
    <section className="rounded-xl border border-border/70 bg-background/60 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-foreground">Leaderboard</h2>
          {weekLabel && <p className="mt-0.5 text-xs font-medium text-muted-foreground">{weekRange(weekLabel)}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CountdownBadge weekEnd={weekEnd} />
          {focused && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent" data-testid="notice-focus-mode"><EyeOff size={12} /> Focus mode on</span>
          )}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Pulse = minutes studied + 30 × topics moved this week.</p>
      {entries.length ? (
        <>
          <Podium entries={entries.slice(0, 3)} streakByHandle={streakByHandle} avatarColorByHandle={avatarColorByHandle} metaByHandle={metaByHandle} />
          <RankedList entries={entries} streakByHandle={streakByHandle} avatarColorByHandle={avatarColorByHandle} metaByHandle={metaByHandle} sparklineByHandle={sparklineByHandle} removableByHandle={removableByHandle} onRemove={onRemove} ownerHandle={ownerHandle} />
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-border/80 px-4 py-8 text-center">
          <p className="text-sm font-bold text-foreground">{emptyTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{emptyDetail}</p>
        </div>
      )}
    </section>
  );
}

const PODIUM_TIERS: Record<number, { card: string; flame: string }> = {
  1: { card: 'border-amber-400/70 bg-gradient-to-b from-amber-400/25 via-amber-400/10 to-transparent shadow-[0_0_0_1px_hsl(45_93%_47%/.08),0_10px_32px_hsl(45_93%_47%/.18)]', flame: 'text-amber-500' },
  2: { card: 'border-slate-300/70 bg-gradient-to-b from-slate-300/25 via-slate-300/10 to-transparent', flame: 'text-slate-400' },
  3: { card: 'border-orange-300/70 bg-gradient-to-b from-orange-300/25 via-orange-300/10 to-transparent', flame: 'text-orange-500' },
};

const PODIUM_DELAY: Record<number, number> = { 3: 0, 2: 60, 1: 120 };

function Podium({ entries, streakByHandle, avatarColorByHandle, metaByHandle }: { entries: LeaderboardEntry[]; streakByHandle: Map<string, number>; avatarColorByHandle: Map<string, string>; metaByHandle?: Map<string, BoardMeta> }) {
  const animate = !podiumStagedOnce && !prefersReducedMotion();
  useEffect(() => { podiumStagedOnce = true; }, []);
  const byRank = new Map<number, LeaderboardEntry>();
  for (const entry of entries) if (!byRank.has(entry.rank)) byRank.set(entry.rank, entry);
  const present = [2, 1, 3].filter((rank) => byRank.has(rank)).map((rank) => byRank.get(rank) as LeaderboardEntry);
  if (!present.length) return null;
  const grid = present.length === 1 ? 'grid-cols-1 max-w-xs' : present.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
  return (
    <ol aria-label="Top 3" className={`mx-auto mt-5 grid ${grid} gap-2 md:gap-3`}>
      {present.map((entry) => (
        <PodiumCard key={`${entry.rank}-${entry.handle}`} entry={entry} tier={PODIUM_TIERS[entry.rank] ?? PODIUM_TIERS[1]} streak={streakByHandle.get(entry.handle) ?? 0} avatarClass={avatarColorByHandle.get(entry.handle)} meta={metaByHandle?.get(entry.handle)} animate={animate} delay={PODIUM_DELAY[entry.rank] ?? 0} />
      ))}
    </ol>
  );
}

function PodiumCard({ entry, tier, streak, avatarClass, meta, animate, delay }: { entry: LeaderboardEntry; tier: { card: string; flame: string }; streak: number; avatarClass?: string; meta?: BoardMeta; animate: boolean; delay: number }) {
  const [staged, setStaged] = useState(() => !animate);
  useEffect(() => {
    if (!animate) return;
    const raf = requestAnimationFrame(() => setStaged(true));
    return () => cancelAnimationFrame(raf);
  }, [animate]);
  const score = useCountUp(entry.score, animate);
  const isFirst = entry.rank === 1;
  return (
    <li className={`relative rounded-2xl border p-4 text-center transition-[opacity,transform,box-shadow] duration-200 ease-out md:p-5 ${tier.card} ${staged ? 'hover:-translate-y-1 hover:shadow-lg' : ''}`} style={{ opacity: staged ? 1 : 0, transform: staged ? undefined : 'translateY(8px)', transitionDelay: `${delay}ms` }} data-testid={`podium-${entry.rank}`}>
      {isFirst && <Trophy size={15} className="absolute right-3 top-3 text-amber-500" />}
      <p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-muted-foreground">Rank {String(entry.rank).padStart(2, '0')}</p>
      <Avatar src={entry.avatarUrl} initials={entry.initials} className={`mx-auto mt-3 h-14 w-14 text-base md:h-16 md:w-16 md:text-lg ${avatarClass ?? 'bg-secondary text-foreground'}`} title={entry.handle} />
      <p className="mt-2.5 truncate text-sm font-bold text-foreground md:mt-3 md:text-base">{entry.handle}{entry.isCurrentUser && <span className="ml-1.5 font-mono-custom text-[9px] uppercase tracking-[.14em] text-primary">you</span>}</p>
      <p className="mt-0.5 text-lg font-extrabold text-foreground md:mt-1 md:text-2xl" title="Pulse = minutes studied + 30 × topics moved this week">{score}</p>
      <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground md:mt-1">
        {streak > 0 && <span className={`inline-flex items-center gap-0.5 ${tier.flame} ${isFirst ? 'flame-breathe' : ''}`} title={`${streak}-day streak`}><Flame size={11} fill="currentColor" />{streak}</span>}
        {meta?.streak ? <WeeklyStreakChip streak={meta.streak} /> : null}
        <span>{entry.hours}h · {entry.topics} topics</span>
      </p>
      <div className="mt-1 flex items-center justify-center gap-2">
        <DeltaBadge delta={meta?.rankDelta ?? null} />
        {meta?.pb && <span className="text-[10px] font-bold text-muted-foreground" title="Best rank ever on this board">PB #{meta.pb}</span>}
      </div>
    </li>
  );
}

function RankedList({ entries, streakByHandle, avatarColorByHandle, metaByHandle, sparklineByHandle, removableByHandle, onRemove, ownerHandle }: {
  entries: LeaderboardEntry[];
  streakByHandle: Map<string, number>;
  avatarColorByHandle: Map<string, string>;
  metaByHandle?: Map<string, BoardMeta>;
  sparklineByHandle?: Map<string, number[]>;
  removableByHandle?: Map<string, { userId: string }>;
  onRemove?: (userId: string) => void;
  ownerHandle?: string | null;
}) {
  const ranked = entries.slice(3);
  const self = ranked.find((entry) => entry.isCurrentUser);
  const [expanded, setExpanded] = useState(false);
  const visibleTop = ranked.slice(0, 2);
  const extras = ranked.slice(2);
  const pinSelf = !expanded && self !== undefined && !visibleTop.includes(self);
  const lastRank = ranked.length ? ranked[ranked.length - 1].rank : 0;
  const nextRank = extras.length ? extras[0].rank : 0;
  const delta = useRankDelta(self?.handle, self?.rank);
  const toggleLabel = nextRank === lastRank ? `Show ${ranked.length} more` : `Show ranks ${nextRank}–${lastRank}`;
  const toggleClass = 'mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/60 px-4 py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/30 hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

  return (
    <ol className="mt-4 divide-y divide-border/40" aria-label="Ranked leaderboard">
      {visibleTop.map((entry) => (
        <li key={`${entry.rank}-${entry.handle}`}>
          <RankedRow entry={entry} streakByHandle={streakByHandle} avatarColorByHandle={avatarColorByHandle} meta={metaByHandle?.get(entry.handle)} sparkline={sparklineByHandle?.get(entry.handle)} removable={removableByHandle?.get(entry.handle)} onRemove={onRemove} isOwner={entry.handle === ownerHandle} delta={entry.isCurrentUser ? delta : undefined} />
        </li>
      ))}
      {extras.length > 0 && (
        <li>
          {expanded ? (
            <button type="button" onClick={() => setExpanded(false)} className={toggleClass}>
              Show fewer <ChevronDown size={13} className="rotate-180" />
            </button>
          ) : (
            <button type="button" onClick={() => setExpanded(true)} className={toggleClass}>
              {toggleLabel} <ChevronDown size={13} />
            </button>
          )}
        </li>
      )}
      <li>
        <div className="grid transition-[grid-template-rows] duration-200 ease-out" style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}>
          <ol aria-label="Remaining ranks" className={`min-h-0 divide-y divide-border/40 overflow-hidden ${expanded ? '' : 'invisible'}`} aria-hidden={!expanded}>
            {extras.map((entry) => (
              <li key={`${entry.rank}-${entry.handle}`}>
                <RankedRow entry={entry} streakByHandle={streakByHandle} avatarColorByHandle={avatarColorByHandle} meta={metaByHandle?.get(entry.handle)} sparkline={sparklineByHandle?.get(entry.handle)} removable={removableByHandle?.get(entry.handle)} onRemove={onRemove} isOwner={entry.handle === ownerHandle} delta={entry.isCurrentUser ? delta : undefined} />
              </li>
            ))}
          </ol>
        </div>
      </li>
      {pinSelf && self && (
        <li>
          <PinnedRow entry={self} streak={streakByHandle.get(self.handle)} delta={delta} meta={metaByHandle?.get(self.handle)} sparkline={sparklineByHandle?.get(self.handle)} avatarClass={avatarColorByHandle.get(self.handle)} />
        </li>
      )}
    </ol>
  );
}

function RankedRow({ entry, streakByHandle, avatarColorByHandle, meta, sparkline, removable, onRemove, isOwner, delta }: {
  entry: LeaderboardEntry;
  streakByHandle: Map<string, number>;
  avatarColorByHandle: Map<string, string>;
  meta?: BoardMeta;
  sparkline?: number[];
  removable?: { userId: string };
  onRemove?: (userId: string) => void;
  isOwner: boolean;
  delta?: number | null;
}) {
  return (
    <div className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-[background-color,transform] duration-150 hover:-translate-y-px hover:bg-secondary/70" data-testid={`row-leaderboard-${entry.handle}`}>
      <span className="w-6 shrink-0 text-right font-mono-custom text-sm font-bold text-muted-foreground">{entry.rank}</span>
      <Avatar src={entry.avatarUrl} initials={entry.initials} className={`h-9 w-9 text-xs ${avatarColorByHandle.get(entry.handle) ?? 'bg-secondary text-foreground'}`} title={entry.handle} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">
          {entry.handle}
          {entry.isCurrentUser && <span className="ml-2 font-mono-custom text-[9px] uppercase tracking-[.14em] text-primary">you</span>}
          {isOwner && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase text-primary" data-testid={`owner-badge-${entry.handle}`}>Owner</span>}
        </p>
        <p className="text-[11px] text-muted-foreground">{entry.hours}h · {entry.topics} topics</p>
      </div>
      {meta ? <DeltaBadge delta={meta.rankDelta} /> : delta !== undefined && delta !== null && delta !== 0 && (
        <span className="shrink-0 text-[10px] font-bold text-muted-foreground" title="Rank change since your last visit">{delta < 0 ? '↑' : '↓'}{Math.abs(delta)}</span>
      )}
      {sparkline && <Sparkline ranks={sparkline} />}
      {meta?.streak ? <WeeklyStreakChip streak={meta.streak} /> : <StreakChip streak={streakByHandle.get(entry.handle)} />}
      {removable && onRemove && (
        <button type="button" onClick={() => onRemove(removable.userId)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" aria-label={`Remove ${entry.handle}`} data-testid={`button-remove-circle-${entry.handle}`}><Trash2 size={14} /></button>
      )}
      <span className="text-sm font-extrabold text-foreground" title="Pulse = minutes studied + 30 × topics moved this week">{entry.score}</span>
    </div>
  );
}

function PinnedRow({ entry, streak, delta, meta, sparkline, avatarClass }: { entry: LeaderboardEntry; streak?: number; delta?: number | null; meta?: BoardMeta; sparkline?: number[]; avatarClass?: string }) {
  const animate = !pinnedDrawnOnce && !prefersReducedMotion();
  const [drawn, setDrawn] = useState(() => !animate);
  useEffect(() => {
    pinnedDrawnOnce = true;
    if (!animate) return;
    const raf = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, [animate]);
  return (
    <div className="relative -mx-2 mt-1 flex items-center gap-3 rounded-xl px-2 py-3 pl-3.5 transition-[background-color,transform] duration-150 hover:-translate-y-px hover:bg-secondary/70" data-testid={`row-leaderboard-${entry.handle}`}>
      <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-accent" style={{ transform: drawn ? 'scaleY(1)' : 'scaleY(0)', transformOrigin: 'top', transition: 'transform 200ms ease-out' }} />
      <span className="w-6 shrink-0 text-right font-mono-custom text-sm font-bold text-foreground">{entry.rank}</span>
      <Avatar src={entry.avatarUrl} initials={entry.initials} className={`h-9 w-9 text-xs ${avatarClass ?? 'bg-secondary text-foreground'}`} title={entry.handle} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">{entry.handle}</p>
        <p className="text-[11px] font-semibold text-accent">Your rank</p>
      </div>
      {meta ? <DeltaBadge delta={meta.rankDelta} /> : delta !== undefined && delta !== null && delta !== 0 && (
        <span className="shrink-0 text-[10px] font-bold text-muted-foreground" title="Rank change since your last visit">{delta < 0 ? '↑' : '↓'}{Math.abs(delta)}</span>
      )}
      {sparkline && <Sparkline ranks={sparkline} />}
      {meta?.streak ? <WeeklyStreakChip streak={meta.streak} /> : <StreakChip streak={streak} />}
      <span className="text-sm font-extrabold text-foreground" title="Pulse = minutes studied + 30 × topics moved this week">{entry.score}</span>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading board" data-testid="loading-block">
      <div className="skeleton h-16 rounded-xl" />
      <div className="grid grid-cols-3 gap-2">
        <div className="skeleton h-40 rounded-2xl" /><div className="skeleton h-40 rounded-2xl" /><div className="skeleton h-40 rounded-2xl" />
      </div>
      <div className="skeleton h-24 rounded-xl" />
      <div className="skeleton h-24 rounded-xl" />
    </div>
  );
}

function BoardStats({ entries, streak, meta }: { entries: LeaderboardEntry[]; streak: number | undefined; meta?: BoardMeta }) {
  const self = entries.find((entry) => entry.isCurrentUser);
  const delta = useRankDelta(self?.handle, self?.rank);
  const tiles: { label: string; value: string; detail: string; accent: boolean }[] = [];
  if (streak && streak > 0) tiles.push({ label: 'Streak', value: `${streak}d`, detail: 'days studied in a row', accent: false });
  if (self) {
    tiles.push({ label: 'Pulse this week', value: `${self.score}`, detail: 'minutes + 30 × topics moved', accent: true });
    if (meta) {
      const deltaDetail = meta.rankDelta === null || meta.rankDelta === 0 ? 'holding steady vs last week' : meta.rankDelta > 0 ? `up ${meta.rankDelta} vs last week` : `down ${-meta.rankDelta} vs last week`;
      tiles.push({ label: 'Your rank', value: `#${self.rank}`, detail: deltaDetail, accent: false });
      if (meta.pb) tiles.push({ label: 'Personal best', value: `#${meta.pb}`, detail: 'best rank ever on this board', accent: false });
      if (meta.gapState === 'leading') tiles.push({ label: 'Board lead', value: 'Top spot', detail: 'you are rank 1 this week', accent: false });
      else if (meta.gapState === 'active' && meta.gapToNext !== null) tiles.push({ label: 'To the next rank', value: `${meta.gapToNext}`, detail: 'pulse points away', accent: false });
    } else {
      const detail = delta === null || delta === 0 ? 'holding steady' : delta < 0 ? `up ${-delta} since your last visit` : `down ${delta} since your last visit`;
      tiles.push({ label: 'Your rank', value: `#${self.rank}`, detail, accent: false });
    }
  }
  if (!tiles.length) return null;
  return (
    <div className="flex flex-wrap gap-3" data-testid="board-stats">
      {tiles.map((tile) => (
        <div key={tile.label} className="min-w-[150px] flex-1">
          <StatTile {...tile} />
        </div>
      ))}
    </div>
  );
}

function PrivateTab() {
  const queryClient = useQueryClient();
  const circlesQuery = useGetCircles({ tz: browserTimeZone() });
  const leaderboardQuery = useGetLeaderboard({ tz: browserTimeZone() });
  const feedQuery = useGetCircleFeed();
  const connect = useConnectByCode();
  const remove = useRemoveConnection();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const pendingError = sessionStorage.getItem('pp-join-error');
      if (pendingError) {
        sessionStorage.removeItem('pp-join-error');
        setError(pendingError);
      }
    } catch { /* storage unavailable */ }
  }, []);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetCirclesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey() });
  };

  const submitConnect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    connect.mutate(
      { data: { code } },
      {
        onSuccess: () => {
          setCode('');
          setJoined(true);
          window.setTimeout(() => setJoined(false), 2000);
          refresh();
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not add that code'),
      },
    );
  };

  const inviteBase = typeof window === 'undefined' ? '' : window.location.origin;

  const copyLink = async () => {
    if (!circlesQuery.data) return;
    try { await navigator.clipboard.writeText(`${inviteBase}/join/${circlesQuery.data.profileCode}`); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };

  const copyCode = async () => {
    if (!circlesQuery.data) return;
    try { await navigator.clipboard.writeText(circlesQuery.data.profileCode); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };

  if (circlesQuery.isLoading) return <LoadingBlock className="h-80" />;
  if (circlesQuery.isError || !circlesQuery.data) return <ErrorState onRetry={() => circlesQuery.refetch()} />;

  const { profileCode, memberCount, capacity, self, connections } = circlesQuery.data;
  const members: CircleMember[] = [self, ...connections];
  const streakByHandle = new Map(members.map((member) => [member.handle, member.streak ?? 0]));
  const avatarColorByHandle = new Map(members.map((member) => [member.handle, avatarColorFor(member.userId)]));
  const removableByHandle = new Map(connections.map((member) => [member.handle, { userId: member.userId }]));
  const ownerHandle = self.isOwner ? self.handle : (connections.find((member) => member.isOwner)?.handle ?? null);
  const isFull = memberCount >= capacity;
  const alone = connections.length === 0;
  const board = leaderboardQuery.data;

  return (
    <div role="tabpanel" id="panel-private" aria-labelledby="tab-private" className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <div className="min-w-0 space-y-4">
        <BoardStats entries={board?.entries ?? []} streak={streakByHandle.get(self.handle)} />
        <section className="rounded-xl border border-border/70 bg-background/60 p-4" id="connections-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold text-foreground">Your private circle</h2>
          <p className="font-mono-custom text-xs font-bold tabular-nums text-muted-foreground" data-testid="circle-member-count">{memberCount} / {capacity}</p>
        </div>
        <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">There's no public directory and no search by name — only people you connect with directly see your profile.</p>
        <form onSubmit={submitConnect} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={code} onChange={(event) => setCode(event.target.value)} disabled={isFull} placeholder={isFull ? 'Circle full' : 'e.g. 7K4M2X'} className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 font-mono-custom text-sm uppercase tracking-[.12em] outline-none focus:ring-3 focus:ring-primary/25 disabled:opacity-60" data-testid="input-circle-code" />
          <button type="submit" disabled={isFull || connect.isPending || code.trim().length < 6} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50" data-testid="button-connect-circle">{connect.isPending ? 'Adding…' : 'Add friend'}</button>
        </form>
        {error && <p className="mt-2 text-xs font-semibold text-accent" data-testid="circle-connect-error">{error}</p>}
        {joined && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-success" data-testid="circle-connect-success"><Check size={13} /> Member added to your circle.</p>}
        {isFull && <p className="mt-2 text-xs font-semibold text-accent" data-testid="circle-full-notice">Your circle is full — this private circle can have up to {capacity} members.</p>}
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
          <Link2 size={13} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-mono-custom text-xs text-muted-foreground" data-testid="text-invite-link">{inviteBase}/join/{profileCode}</span>
          <button type="button" onClick={copyLink} className="inline-flex shrink-0 items-center gap-1 rounded-lg text-xs font-bold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" data-testid="button-copy-link">{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied!' : 'Copy link'}</button>
        </div>
      </section>

      {alone ? (
        <section className="flex flex-col items-center rounded-xl border border-dashed border-border/80 px-6 py-8 text-center" data-testid="circle-empty-state">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-accent/10 text-accent"><Users size={18} /></div>
          <p className="mt-3 text-sm font-bold text-foreground">Your circle is empty</p>
          <p className="mt-1 max-w-[38ch] text-xs text-muted-foreground">Invite up to {capacity} people you actually study with. No public directory, no search — just people you add by code or link.</p>
          <button type="button" onClick={copyCode} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" data-testid="button-empty-copy-code">{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied!' : 'Copy your invite code'}</button>
        </section>
      ) : (
        <RankedBoard
          entries={board?.entries ?? []}
          weekLabel={board?.weekLabel}
          focused={board?.focused ?? false}
          streakByHandle={streakByHandle}
          avatarColorByHandle={avatarColorByHandle}
          loading={leaderboardQuery.isLoading}
          error={leaderboardQuery.isError}
          onRetry={() => leaderboardQuery.refetch()}
          removableByHandle={removableByHandle}
          onRemove={(userId) => remove.mutate({ userId }, { onSuccess: refresh })}
          ownerHandle={ownerHandle}
          emptyTitle="No one on the board yet"
          emptyDetail="Your weekly minutes and topic moves decide the score. Invite a friend to fill the board."
        />
      )}
      <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">Pulse = minutes studied + 30 × topics moved this week. Circle only — no strangers.</p>
      </div>
      <aside className="min-w-0 xl:sticky xl:top-24" aria-label="Circle activity sidebar">
        {!alone && <FeedCard eyebrow="Last 7 days" title="Circle activity" items={feedQuery.data ?? []} emptyText="Activity from your circle will appear here." />}
      </aside>
    </div>
  );
}

function CohortTab() {
  const query = useGetCohorts({ tz: browserTimeZone() });
  const leaderboardQuery = useGetCohortsLeaderboard();
  const sparklineQuery = useGetCohortsLeaderboardSparkline();
  const feedQuery = useGetCohortsFeed();

  if (query.isLoading) return <LoadingBlock className="h-80" />;
  if (query.isError && isNotAssigned(query.error)) {
    return (
      <div role="tabpanel" id="panel-cohort" aria-labelledby="tab-cohort" className="space-y-3" data-testid="cohort-section">
        <section className="flex flex-col items-center rounded-xl border border-border/70 bg-background/60 px-6 py-10 text-center" data-testid="cohort-card">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><Clock size={18} /></div>
          <p className="mt-3 text-sm font-bold text-foreground">You're not in a cohort yet</p>
          <p className="mt-1 max-w-[38ch] text-xs text-muted-foreground">New members are placed into a study cohort automatically. Check back in a moment.</p>
          <button type="button" onClick={() => query.refetch()} className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" data-testid="button-retry-cohort">Check again</button>
        </section>
        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">Not searchable, no name lookup — you'll see your cohort's weekly board and activity once you're placed.</p>
      </div>
    );
  }
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />;

  const { memberCount, capacity, members } = query.data;
  const streakByHandle = new Map(members.map((member: CohortMemberRow) => [member.handle, member.streak ?? 0]));
  const avatarColorByHandle = new Map(members.map((member: CohortMemberRow) => [member.handle, avatarColorFor(member.userId)]));
  const board = leaderboardQuery.data;
  const memberIdByHandle = new Map(members.map((member: CohortMemberRow) => [member.handle, member.userId]));
  const sparklineByHandle = new Map<string, number[]>();
  for (const row of sparklineQuery.data ?? []) {
    for (const [handle, userId] of memberIdByHandle) {
      if (userId === row.userId) sparklineByHandle.set(handle, row.ranks);
    }
  }
  const metaByHandle = new Map<string, BoardMeta>();
  for (const entry of board?.entries ?? []) {
    metaByHandle.set(entry.handle, {
      rankDelta: entry.rankDelta ?? null,
      streak: entry.streak ?? 0,
      pb: entry.pb ?? null,
      gapToNext: entry.gapToNext ?? null,
      gapState: entry.gapState ?? 'empty',
    });
  }
  const alone = memberCount <= 1;
  const selfEntry = board?.entries.find((entry) => entry.isCurrentUser);

  return (
    <div role="tabpanel" id="panel-cohort" aria-labelledby="tab-cohort" className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start" data-testid="cohort-section">
      <div className="min-w-0 space-y-4">
        <BoardStats entries={board?.entries ?? []} streak={selfEntry ? streakByHandle.get(selfEntry.handle) : undefined} meta={selfEntry ? metaByHandle.get(selfEntry.handle) : undefined} />
        {selfEntry && <CelebrationCard rank={selfEntry.rank} meta={metaByHandle.get(selfEntry.handle) ?? { rankDelta: null, streak: 0, pb: null, gapToNext: null, gapState: 'empty' }} weekEnd={board?.weekEnd} />}
        <section className="rounded-xl border border-border/70 bg-background/60 p-4" data-testid="cohort-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground"><Users size={14} className="text-primary" /> Cohort size</h2>
          <p className="font-mono-custom text-xs font-bold tabular-nums text-muted-foreground" data-testid="cohort-member-count">{memberCount} of {capacity}</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.min(100, Math.round((memberCount / capacity) * 100))}%` }} />
        </div>
      </section>

      {alone ? (
        <section className="flex flex-col items-center rounded-xl border border-dashed border-border/80 px-6 py-8 text-center">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><Sparkles size={18} /></div>
          <p className="mt-3 text-sm font-bold text-foreground">You're the first in your cohort</p>
          <p className="mt-1 max-w-[38ch] text-xs text-muted-foreground">Others who joined around the same time will appear here. Your board and activity stay private until then.</p>
        </section>
      ) : (
        <RankedBoard
          entries={board?.entries ?? []}
          weekLabel={board?.weekLabel}
          weekEnd={board?.weekEnd}
          focused={board?.focused ?? false}
          streakByHandle={streakByHandle}
          avatarColorByHandle={avatarColorByHandle}
          metaByHandle={metaByHandle}
          sparklineByHandle={sparklineByHandle}
          loading={leaderboardQuery.isLoading}
          error={leaderboardQuery.isError}
          onRetry={() => leaderboardQuery.refetch()}
          emptyTitle="No one on the board yet"
          emptyDetail="The board fills as your cohort studies."
        />
      )}
      <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">You're grouped with others who joined around the same time. Not searchable, no name lookup — it's view-only: you see each other's weekly board and activity, nothing else.</p>
      </div>
      <aside className="min-w-0 xl:sticky xl:top-24" aria-label="Cohort activity sidebar">
        {!alone && <FeedCard eyebrow="Last 7 days" title="Cohort activity" items={feedQuery.data ?? []} emptyText="Activity from your cohort will appear here." />}
      </aside>
    </div>
  );
}

function groupFeed(items: CircleFeedItem[]): { handle: string; items: CircleFeedItem[] }[] {
  const groups: { handle: string; items: CircleFeedItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.handle === item.handle) last.items.push(item);
    else groups.push({ handle: item.handle, items: [item] });
  }
  return groups;
}

function feedItemKey(item: CircleFeedItem): string {
  return `${item.userId}|${item.date}|${item.detail}`;
}

function FeedRow({ group, index, fresh }: { group: { handle: string; items: CircleFeedItem[] }; index: number; fresh: boolean }) {
  const [open, setOpen] = useState(false);
  const grouped = group.items.length > 1;
  const first = group.items[0];
  const last = group.items[group.items.length - 1];
  const sameDay = new Date(first.date).toDateString() === new Date(last.date).toDateString();
  const subjects = [...new Set(group.items.map((item) => item.subject).filter(Boolean))].join(' · ');
  const summary = `${group.items.length} update${group.items.length === 1 ? '' : 's'}${sameDay ? ' today' : ' this week'}${subjects ? ` · ${subjects}` : ''}${grouped ? ` · latest: ${last.detail}` : ''}`;
  const avatarClass = avatarColorFor(first.userId);
  const inner = (
    <>
      <Avatar src={first.avatarUrl} initials={first.handle.slice(0, 2).toUpperCase()} className={`h-8 w-8 shrink-0 text-[10px] ${avatarClass}`} title={first.handle} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-foreground">{first.handle}</span>
        <span className="block truncate text-xs font-medium text-muted-foreground">{summary}</span>
      </span>
    </>
  );

  if (!grouped) {
    return (
      <li className={`flex items-center gap-3 py-3 ${fresh ? 'pp-feed-flash' : ''}`} data-testid={`feed-item-${index}`}>
        {inner}
        <time className="shrink-0 text-[10px] font-medium text-muted-foreground" dateTime={first.date}>{new Date(first.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time>
      </li>
    );
  }

  const groupId = `feed-group-${first.date}-${index}`;
  return (
    <li className={`py-3 ${fresh ? 'pp-feed-flash' : ''}`} data-testid={`feed-item-${index}`}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls={groupId} className="flex w-full items-center gap-3 rounded-lg text-left transition-colors hover:bg-background/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        {inner}
        <ChevronDown size={14} className={`shrink-0 text-muted-foreground transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className="grid transition-[grid-template-rows] duration-200 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <ol id={groupId} className={`min-h-0 overflow-hidden ${open ? '' : 'invisible'}`} aria-hidden={!open}>
          {group.items.map((item, itemIndex) => (
            <li key={`${item.userId}-${item.date}-${itemIndex}`} className="flex items-center gap-2.5 py-1.5 pl-10 text-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="min-w-0 flex-1 text-muted-foreground">{item.subject ? `${item.subject} · ` : ''}{item.detail}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(item.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
            </li>
          ))}
        </ol>
      </div>
    </li>
  );
}

function FeedCard({ eyebrow, title, items, emptyText }: { eyebrow: string; title: string; items: CircleFeedItem[]; emptyText: string }) {
  const groups = groupFeed(items);
  const [freshKeys, setFreshKeys] = useState<Set<string>>(() => new Set());
  const firstRun = useRef(true);
  useEffect(() => {
    if (!items.length) return;
    if (firstRun.current) {
      firstRun.current = false;
      for (const item of items) seenFeedIds.add(feedItemKey(item));
      return;
    }
    const newly = new Set<string>();
    for (const item of items) {
      const key = feedItemKey(item);
      if (!seenFeedIds.has(key)) { seenFeedIds.add(key); newly.add(key); }
    }
    if (newly.size) setFreshKeys(newly);
  }, [items]);
  return (
    <section className="rounded-xl border border-border/70 bg-background/60 p-5 md:p-6">
      <h2 className="text-sm font-extrabold text-foreground">{title}</h2>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{eyebrow}</p>
      {groups.length ? (
        <ol className="mt-1 divide-y divide-border/50" aria-label="Activity feed">
          {groups.map((group, index) => <FeedRow key={`${group.handle}-${group.items[0].date}-${index}`} group={group} index={index} fresh={freshKeys.has(feedItemKey(group.items[0]))} />)}
        </ol>
      ) : (
        <div className="mt-2 flex flex-col items-center rounded-xl border border-dashed border-border/80 px-4 py-8 text-center">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-border/40 text-muted-foreground"><Clock size={15} /></div>
          <p className="mt-2 text-sm font-bold text-foreground">No activity yet</p>
          <p className="mt-0.5 max-w-[32ch] text-xs text-muted-foreground">{emptyText}</p>
        </div>
      )}
    </section>
  );
}

function ThePointCard({ scope }: { scope: Scope }) {
  return (
    <Card className="p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-8">
      <SectionTitle eyebrow="The point" title="Effort is the scoreboard" action={<Trophy size={17} className="text-primary" />} />
      <p className="text-sm leading-relaxed text-muted-foreground">{scope === 'private' ? "Pulse combines focused minutes and topics moved forward. Only the people in your private circle can see it — there's no public scoreboard." : "Pulse combines focused minutes and topics moved forward. Your cohort only ever sees your weekly board — no profiles, no messages, nothing else."}</p>
    </Card>
  );
}

function YourBoundaryCard({ scope }: { scope: Scope }) {
  return (
    <Card className="p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-8">
      <SectionTitle eyebrow="Your boundary" title="Change visibility in settings" />
      <p className="text-sm leading-relaxed text-muted-foreground">{scope === 'private' ? 'Focus mode hides comparison UI while keeping your own progress private and intact. Leaderboard visibility is opt-in — even within your circle.' : 'Focus mode hides your rank and pulse from the cohort board too. Comparison stays opt-in everywhere, no exceptions.'}</p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Groups: rooms with a shared code
// ---------------------------------------------------------------------------

function GroupsTab() {
  const queryClient = useQueryClient();
  const groupsQuery = useListGroups();
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroupByCode();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', isDiscoverable: false });
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });

  useEffect(() => {
    if (groupsQuery.data && groupsQuery.data.length > 0 && !groupsQuery.data.some((group) => group.id === selectedId)) {
      setSelectedId(groupsQuery.data[0].id);
    }
  }, [groupsQuery.data, selectedId]);

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    createGroup.mutate(
      { data: { name: createForm.name.trim(), description: createForm.description.trim() || undefined, isDiscoverable: createForm.isDiscoverable } },
      { onSuccess: (group) => { setCreateForm({ name: '', description: '', isDiscoverable: false }); setShowCreate(false); setSelectedId(group.id); refresh(); } },
    );
  };

  const submitJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    joinGroup.mutate(
      { data: { code: joinCode } },
      {
        onSuccess: (group) => { setJoinCode(''); setSelectedId(group.id); refresh(); },
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not join'),
      },
    );
  };

  if (groupsQuery.isLoading) return <LoadingBlock className="h-80" />;
  if (groupsQuery.isError) return <ErrorState onRetry={() => groupsQuery.refetch()} />;

  const groups = groupsQuery.data ?? [];
  const selected = groups.find((group) => group.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowCreate((open) => !open)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground" data-testid="button-create-group"><UserRoundPlus size={15} /> New group</button>
          <form onSubmit={submitJoin} className="flex gap-2">
            <input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="Group code" className="h-11 w-36 rounded-xl border border-border bg-background px-3 font-mono-custom text-sm uppercase outline-none focus:ring-3 focus:ring-primary/25" data-testid="input-join-code" />
            <button type="submit" disabled={joinGroup.isPending || joinCode.trim().length < 4} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-bold hover:bg-secondary disabled:opacity-50" data-testid="button-join-group">{joinGroup.isPending ? '…' : 'Join'}</button>
          </form>
        </div>
        {error && <p className="text-xs font-semibold text-accent" data-testid="group-error">{error}</p>}
      </div>

      {showCreate && (
        <Card className="border-primary/25 p-5 md:p-6">
          <p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-primary">New group</p>
          <form onSubmit={submitCreate} className="mt-4 space-y-3">
            <input required value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} placeholder="Group name, e.g. Kota batch 27" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-primary/25" data-testid="input-group-name" />
            <input value={createForm.description} onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })} placeholder="What is this room for? (optional)" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-primary/25" data-testid="input-group-description" />
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={createForm.isDiscoverable} onChange={(event) => setCreateForm({ ...createForm, isDiscoverable: event.target.checked })} className="h-4 w-4" data-testid="checkbox-group-discoverable" /> Allow anyone to find this group in discovery</label>
            <button type="submit" disabled={createGroup.isPending || !createForm.name.trim()} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50" data-testid="button-save-group">{createGroup.isPending ? 'Creating…' : 'Create group'}</button>
          </form>
        </Card>
      )}

      {groups.length ? (
        <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
          <div className="space-y-2">
            {groups.map((group) => (
              <button key={group.id} type="button" onClick={() => setSelectedId(group.id)} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${selected?.id === group.id ? 'border-primary/40 bg-primary/5' : 'border-border/70 hover:bg-secondary'}`} data-testid={`group-card-${group.id}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary font-display text-sm font-bold">{group.name.slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{group.name}</p><p className="text-xs text-muted-foreground">{group.memberCount} member{group.memberCount === 1 ? '' : 's'}{group.myRole === 'owner' ? ' · you own this' : ''}</p></div>
              </button>
            ))}
            <DiscoverGroups onPick={(group) => setSelectedId(group.id)} />
          </div>
          <div>{selected ? <GroupDetail key={selected.id} group={selected} refresh={() => refresh()} onLeave={() => setSelectedId(null)} /> : <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">Select a group to see its members, board, and activity.</p></Card>}</div>
        </div>
      ) : (
        <Card className="p-8"><EmptyState title="No groups yet" detail="Create a room with friends or join one with a code." action={<button type="button" onClick={() => setShowCreate(true)} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground" data-testid="button-empty-create-group">Create a group</button>} /></Card>
      )}
    </div>
  );
}

function DiscoverGroups({ onPick }: { onPick: (group: GroupSummary) => void }) {
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(false);
  const search = useQuery({
    queryKey: ['discoverGroups', query],
    queryFn: () => discoverGroups({ q: query || undefined }),
    enabled: visible,
    placeholderData: (previous) => previous,
  });
  return (
    <div className="rounded-xl border border-dashed border-border p-3">
      <button type="button" onClick={() => setVisible((open) => !open)} className="inline-flex items-center gap-2 text-xs font-bold text-primary" data-testid="button-toggle-discover"><Search size={13} /> {visible ? 'Hide discovery' : 'Discover open groups'}</button>
      {visible && (
        <div className="mt-3 space-y-2">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name…" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none" data-testid="input-discover-query" />
          {search.data?.map((group) => (
            <button key={group.id} type="button" onClick={() => { onPick(group); setVisible(false); }} className="flex w-full items-center gap-2 rounded-lg border border-border/70 p-2.5 text-left hover:bg-secondary" data-testid={`discover-${group.name}`}>
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{group.name}</span><span className="text-[10px] text-muted-foreground">{group.memberCount} member{group.memberCount === 1 ? '' : 's'}{group.myRole ? ' · already joined' : ''}</span></span>
              {!group.myRole && <span className="rounded-md bg-primary px-2 py-1 text-[9px] font-bold text-primary-foreground">Open</span>}
            </button>
          ))}
          {search.isFetched && !search.data?.length && <p className="px-1 text-[11px] text-muted-foreground">No open groups match.</p>}
        </div>
      )}
    </div>
  );
}

function GroupDetail({ group, refresh, onLeave }: { group: GroupSummary; refresh: () => void; onLeave: () => void }) {
  const detailQuery = useGetGroup(group.id);
  const leaderboardQuery = useGetGroupLeaderboard(group.id);
  const sparklineQuery = useGetGroupLeaderboardSparkline(group.id);
  const activityQuery = useGetGroupActivity(group.id);
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const leaveGroup = useLeaveGroup();

  if (detailQuery.isLoading) return <LoadingBlock className="h-96" />;
  if (detailQuery.isError || !detailQuery.data) return <ErrorState onRetry={() => detailQuery.refetch()} />;

  const detail = detailQuery.data;
  const isOwner = group.myRole === 'owner';
  const avatarColorByHandle = new Map(detail.members.map((member) => [member.handle, avatarColorFor(member.userId)]));
  const memberIdByHandle = new Map(detail.members.map((member) => [member.handle, member.userId]));
  const sparklineByHandle = new Map<string, number[]>();
  for (const row of sparklineQuery.data ?? []) {
    for (const [handle, userId] of memberIdByHandle) {
      if (userId === row.userId) sparklineByHandle.set(handle, row.ranks);
    }
  }
  const board = leaderboardQuery.data;
  const metaByHandle = new Map<string, BoardMeta>();
  for (const entry of board?.entries ?? []) {
    metaByHandle.set(entry.handle, {
      rankDelta: entry.rankDelta ?? null,
      streak: entry.streak ?? 0,
      pb: entry.pb ?? null,
      gapToNext: entry.gapToNext ?? null,
      gapState: entry.gapState ?? 'empty',
    });
  }
  const selfEntry = board?.entries.find((entry) => entry.isCurrentUser);

  const toggleDiscoverable = () => {
    updateGroup.mutate({ groupId: group.id, data: { name: group.name, isDiscoverable: !group.isDiscoverable } }, { onSuccess: refresh });
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-primary">{isOwner ? 'Owner' : 'Member'}</p><h2 className="mt-1 font-display text-2xl font-bold">{detail.group.name}</h2><p className="mt-1 text-sm text-muted-foreground">{detail.group.description ?? 'No description yet.'}</p></div>
          <div className="text-right"><p className="font-mono-custom text-[10px] uppercase tracking-[.14em] text-muted-foreground">Invite code</p><p className="mt-1 font-mono-custom text-2xl font-bold tracking-[.2em] text-primary">{detail.group.inviteCode}</p></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border/70 pt-4">
          {isOwner && <button type="button" onClick={toggleDiscoverable} disabled={updateGroup.isPending} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary disabled:opacity-50" data-testid="button-toggle-discoverable">{group.isDiscoverable ? 'Hide from discovery' : 'Show in discovery'}</button>}
          {isOwner && <button type="button" onClick={() => { if (window.confirm('Delete this group for everyone?')) deleteGroup.mutate({ groupId: group.id }, { onSuccess: onLeave }); }} className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 px-3 py-1.5 text-xs font-bold text-accent hover:bg-accent/10" data-testid="button-delete-group"><Trash2 size={12} /> Delete group</button>}
          {!isOwner && <button type="button" onClick={() => { if (window.confirm('Leave this group?')) leaveGroup.mutate({ groupId: group.id }, { onSuccess: onLeave }); }} className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 px-3 py-1.5 text-xs font-bold text-accent hover:bg-accent/10" data-testid="button-leave-group"><Trash2 size={12} /> Leave group</button>}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 md:p-6">
          <SectionTitle eyebrow={`${detail.members.length} in the room`} title="Members" />
          <div className="mt-3 divide-y divide-border/70">
            {detail.members.map((member) => (
              <div key={member.userId} className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-1">
                <Avatar src={member.avatarUrl} initials={member.initials} className={`h-9 w-9 text-xs ${avatarColorByHandle.get(member.handle) ?? 'bg-secondary'}`} title={member.handle} />
                <p className="flex-1 text-sm font-bold">{member.handle}</p>
                {member.role === 'owner' && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase text-primary"><ShieldCheck size={11} /> Owner</span>}
              </div>
            ))}
          </div>
        </Card>
<Card className="p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle eyebrow={leaderboardQuery.data?.weekLabel} title="Group board" action={<Trophy size={17} className="text-primary" />} />
            <CountdownBadge weekEnd={board?.weekEnd} />
          </div>
          {selfEntry && <div className="mt-3"><CelebrationCard rank={selfEntry.rank} meta={metaByHandle.get(selfEntry.handle) ?? { rankDelta: null, streak: 0, pb: null, gapToNext: null, gapState: 'empty' }} weekEnd={board?.weekEnd} /></div>}
          {board?.entries.length ? (
            <div className="mt-3 divide-y divide-border/70">
              {board.entries.map((entry) => {
                const meta = metaByHandle.get(entry.handle);
                return (
                  <div key={`${entry.rank}-${entry.handle}`} className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-1">
                    <span className="w-6 font-display text-base font-bold text-muted-foreground">{entry.rank}</span>
                    <Avatar src={entry.avatarUrl} initials={entry.initials} className={`h-9 w-9 text-xs ${avatarColorByHandle.get(entry.handle) ?? 'bg-secondary'}`} title={entry.handle} />
                    <p className="min-w-0 flex-1 truncate text-sm font-bold">{entry.handle}{entry.isCurrentUser && ' (you)'}</p>
                    {meta ? <DeltaBadge delta={meta.rankDelta} /> : null}
                    {sparklineByHandle.get(entry.handle) && <Sparkline ranks={sparklineByHandle.get(entry.handle) ?? []} />}
                    {meta?.streak ? <WeeklyStreakChip streak={meta.streak} /> : null}
                    <p className="font-display font-bold">{entry.score}</p>
                  </div>
                );
              })}
            </div>
          ) : <p className="mt-3 text-sm text-muted-foreground">The board fills as members study.</p>}
        </Card>
      </div>

      <Card className="p-5 md:p-6">
        <SectionTitle eyebrow="Last 7 days" title="Study activity" />
        {activityQuery.data?.length ? (
          <div className="mt-4 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {activityQuery.data.map((item, index) => (
              <div key={`${item.userId}-${index}`} className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5">
                <div className="min-w-0"><p className="truncate text-xs font-bold">{item.handle}</p><p className="font-mono-custom text-[9px] text-muted-foreground">{new Date(item.day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p></div>
                <p className="font-display text-base font-bold">{item.minutes}m</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-muted-foreground">No sessions logged this week.</p>}
      </Card>
    </div>
  );
}