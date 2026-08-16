import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, EyeOff, HelpCircle, Link2, Lock, Search, ShieldCheck, Trash2, Trophy, UserRoundPlus, Users } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  discoverGroups,
  getListGroupsQueryKey,
  getGetLeaderboardQueryKey,
  getGetCirclesQueryKey,
  useConnectByCode,
  useCreateGroup,
  useDeleteGroup,
  useGetCircleFeed,
  useGetCircles,
  useGetCohorts,
  useGetCohortsFeed,
  useGetCohortsLeaderboard,
  useGetGroup,
  useGetGroupActivity,
  useGetGroupLeaderboard,
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
import { Card, EmptyState, ErrorState, LoadingBlock, SectionTitle } from '@/components/ui-elements';
import { Avatar } from '@/components/avatar';
import { browserTimeZone } from '@/lib/utils';

type Tab = 'board' | 'groups';

function weekRange(label: string): string {
  const match = /^([A-Z][a-z]+) (\d+) - ([A-Z][a-z]+) (\d+)$/.exec(label);
  if (!match) return label;
  const [, monthA, dayA, monthB, dayB] = match;
  return monthA === monthB ? `${monthA} ${dayA} – ${dayB}` : `${monthA} ${dayA} – ${monthB} ${dayB}`;
}

export default function Compete() {
  const [tab, setTab] = useState<Tab>('board');

  return (
    <div className="mx-auto max-w-6xl">
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
  return (
    <div className="space-y-6">
      <PrivateCircleCard />
      <CohortSection />
      <LeaderboardCard />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <CircleActivityCard />
        <div className="space-y-6">
          <ThePointCard />
          <YourBoundaryCard />
        </div>
      </div>
    </div>
  );
}

function CohortSection() {
  return (
    <section className="space-y-6 pt-2" data-testid="cohort-section">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Auto-assigned · not searchable</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight md:text-3xl">Your study cohort</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">A small group of up to 25 members, grouped by when you signed up. No directory, no search by name — just the weekly board.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-4 py-2 text-xs font-bold"><Users size={13} className="text-primary" /> Joined automatically</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <StudyCohortCard />
        <CohortBoardCard />
      </div>
      <CohortActivityCard />
    </section>
  );
}

function isNotAssigned(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

function LeaderboardEntries({ entries }: { entries: LeaderboardEntry[] }) {
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  return (
    <>
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {podium.map((entry) => <PodiumCard key={`${entry.rank}-${entry.handle}`} entry={entry} />)}
      </div>
      {rest.length > 0 && (
        <div className="mt-6 divide-y divide-border/70">
          {rest.map((entry) => (
            <div key={`${entry.rank}-${entry.handle}`} className="flex items-center gap-4 py-3.5 first:pt-1 last:pb-1" data-testid={`row-leaderboard-${entry.handle}`}>
              <span className="w-7 font-display text-base font-bold text-muted-foreground">{entry.rank}</span>
              <Avatar src={entry.avatarUrl} initials={entry.initials} className={`h-10 w-10 text-xs ${entry.isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`} title={entry.handle} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{entry.handle}{entry.isCurrentUser && <span className="ml-2 font-mono-custom text-[9px] uppercase tracking-[.14em] text-primary">you</span>}</p>
              </div>
              <p className="hidden text-xs text-muted-foreground sm:block">{entry.hours}h · {entry.topics} topics</p>
              <p className="w-20 text-right font-display text-lg font-bold text-primary" title="Pulse = minutes studied + 30 × topics moved">{entry.score} <span className="inline-flex align-middle"><HelpCircle size={12} className="text-primary/60" /></span></p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function LeaderboardCard() {
  const query = useGetLeaderboard({ tz: browserTimeZone() });
  const circlesQuery = useGetCircles({ tz: browserTimeZone() });
  const memberCount = circlesQuery.data?.memberCount ?? 1;
  if (query.isLoading) return <LeaderboardSkeleton />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />;
  const { entries, focused, weekLabel } = query.data;
  const isAlone = entries.length <= 1 && memberCount <= 1;

  return (
    <div className="space-y-6">
      {focused && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent" data-testid="notice-focus-mode"><EyeOff size={15} /> Focus mode is on — your rank and pulse are hidden from this list.</div>
      )}
      <Card className="overflow-hidden p-5 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">This week</p>
            <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight md:text-3xl">{weekRange(weekLabel)}</h2>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><EyeOff size={13} /> Everyone is pacing themselves.</p>
        </div>

        {isAlone ? (
          <div className="mt-7">
            <EmptyState title="You're the only one here" detail="The board fills when you add a friend with your invite code — no one to compare against yet, just you showing up." action={<button type="button" onClick={() => document.getElementById('connections-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground" data-testid="button-go-to-connections">Add a friend</button>} />
          </div>
        ) : entries.length ? (
          <LeaderboardEntries entries={entries} />
        ) : (
          <div className="mt-7">
            <EmptyState title="No one on the board yet" detail="Your weekly minutes and topic moves decide the score. Invite a friend to fill the board." />
          </div>
        )}
      </Card>
      <p className="text-center text-xs text-muted-foreground">Pulse = minutes studied + 30 × topics moved this week. Circle only — no strangers.</p>
    </div>
  );
}

function PodiumCard({ entry }: { entry: LeaderboardEntry }) {
  const isFirst = entry.rank === 1;
  return (
    <div className={`relative rounded-2xl border p-5 text-center ${isFirst ? 'border-accent/40 bg-accent/10' : 'border-border/70 bg-card'}`} data-testid={`podium-${entry.rank}`}>
      {isFirst && <Trophy size={16} className="absolute right-4 top-4 text-accent" />}
      <p className="text-left font-mono-custom text-[10px] uppercase tracking-[.16em] text-muted-foreground">Rank {String(entry.rank).padStart(2, '0')}</p>
      <Avatar src={entry.avatarUrl} initials={entry.initials} className={`mx-auto mt-4 h-14 w-14 text-base ${isFirst ? 'bg-accent text-accent-foreground' : 'bg-primary/15 text-primary'}`} title={entry.handle} />
      <p className="mt-3 truncate text-sm font-bold">{entry.handle}{entry.isCurrentUser && <span className="ml-1.5 font-mono-custom text-[9px] uppercase tracking-[.14em] text-primary">you</span>}</p>
      <p className="mt-1 font-display text-xl font-bold text-primary" title="Pulse = minutes studied + 30 × topics moved">{entry.score} <span className="text-sm font-semibold">pulse</span> <HelpCircle size={12} className="inline text-primary/50" /></p>
      <p className="mt-0.5 text-xs text-muted-foreground">{entry.hours}h · {entry.topics} topics</p>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading leaderboard" data-testid="loading-block">
      <div className="skeleton h-24 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="skeleton h-52 rounded-2xl" /><div className="skeleton h-52 rounded-2xl" /><div className="skeleton h-52 rounded-2xl" />
      </div>
      <div className="skeleton h-24 rounded-2xl" />
    </div>
  );
}

function PrivateCircleCard() {
  const queryClient = useQueryClient();
  const circlesQuery = useGetCircles({ tz: browserTimeZone() });
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

  if (circlesQuery.isLoading) return <Card className="p-6"><LoadingBlock className="h-80" /></Card>;
  if (circlesQuery.isError || !circlesQuery.data) return <ErrorState onRetry={() => circlesQuery.refetch()} />;

  const { profileCode, memberCount, capacity, self, connections } = circlesQuery.data;
  const members: CircleMember[] = [self, ...connections];
  const isFull = memberCount >= capacity;
  const compact = members.length > 8;

  return (
    <Card className="p-5 md:p-7" id="connections-card">
      <SectionTitle eyebrow="Private circle" title="Study with people you trust" action={<UserRoundPlus size={17} className="text-primary" />} />
      <p className="text-sm leading-relaxed text-muted-foreground">Your private circle is limited to {capacity} members. Invite only people you actually study with — there is no public directory and no search by name.</p>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-border/70 bg-secondary/40 px-4 py-3">
        <p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-primary">Members</p>
        <p className="font-display text-lg font-bold tabular-nums" data-testid="circle-member-count">{memberCount} / {capacity}</p>
      </div>

      <form onSubmit={submitConnect} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input value={code} onChange={(event) => setCode(event.target.value)} disabled={isFull} placeholder={isFull ? 'Circle full' : 'e.g. 7K4M2X'} className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 font-mono-custom text-sm uppercase tracking-[.12em] outline-none focus:ring-3 focus:ring-primary/25 disabled:opacity-60" data-testid="input-circle-code" />
        <button type="submit" disabled={isFull || connect.isPending || code.trim().length < 6} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50" data-testid="button-connect-circle">{connect.isPending ? 'Adding…' : 'Add friend'}</button>
      </form>
      {error && <p className="mt-2 text-xs font-semibold text-accent" data-testid="circle-connect-error">{error}</p>}
      {joined && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-success" data-testid="circle-connect-success"><Check size={13} /> Member added to your circle.</p>}
      {isFull && <p className="mt-2 text-xs font-semibold text-accent" data-testid="circle-full-notice">Your circle is full — this private circle can have up to {capacity} members.</p>}
      <p className="mt-2 text-[11px] text-muted-foreground">Codes are 6 characters — like the one in your invite box below.</p>

      <div className="mt-5 rounded-2xl border border-border/70 bg-secondary/40 p-4">
        <div className="flex items-start gap-3">
          <Link2 size={16} className="mt-0.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">Share your invite link</p>
            <p className="mt-1 truncate font-mono-custom text-xs text-muted-foreground" data-testid="text-invite-link">{inviteBase}/join/{profileCode}</p>
            <button type="button" onClick={copyLink} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" data-testid="button-copy-link">{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied!' : 'Copy link'}</button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Your circle</p>
        <p className="text-[11px] text-muted-foreground">{compact ? `${members.length} members · scroll` : 'Only members of your circle are shown.'}</p>
      </div>

      {members.length > 1 ? (
        <div className={`mt-3 space-y-2 ${compact ? 'max-h-64 overflow-y-auto pr-1' : ''}`}>
          {members.map((member) => (
            <div key={member.userId} className={`flex items-center gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:border-primary/30 hover:bg-secondary/40 ${compact ? 'p-2.5' : ''}`} data-testid={`row-circle-${member.handle}`}>
              <Avatar src={member.avatarUrl} initials={member.initials} className={`h-9 w-9 text-xs ${member.isOwner ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`} title={member.handle} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {member.handle}
                  {member.isOwner && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase text-primary" data-testid={`owner-badge-${member.handle}`}>Owner</span>}
                </p>
                <p className="text-xs text-muted-foreground">{member.weeklyMinutes}m this week · {member.weeklyTopics} topics</p>
              </div>
              {!member.isOwner && (
                <span className="hidden font-mono-custom text-[9px] uppercase tracking-[.14em] text-muted-foreground sm:inline">Member</span>
              )}
              {!member.isOwner && <button type="button" onClick={() => remove.mutate({ userId: member.userId }, { onSuccess: refresh })} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-accent" aria-label={`Remove ${member.handle}`} data-testid={`button-remove-circle-${member.handle}`}><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-center" data-testid="circle-empty-state">
          <p className="font-display font-bold">Your circle is empty</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Invite people you actually study with. Your private circle can have up to {capacity} members.</p>
          <button type="button" onClick={copyLink} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="button-empty-copy-code">{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied!' : 'Copy your invite code'}</button>
        </div>
      )}
    </Card>
  );
}

function StudyCohortCard() {
  const query = useGetCohorts({ tz: browserTimeZone() });
  if (query.isLoading) return <Card className="p-6"><LoadingBlock className="h-80" /></Card>;
  if (query.isError && isNotAssigned(query.error)) {
    return (
      <Card className="p-5 md:p-7">
        <SectionTitle eyebrow="Study cohort" title="You're not in a cohort yet" action={<Users size={17} className="text-primary" />} />
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">New members are placed into a study cohort automatically. Check back in a moment.</p>
        <button type="button" onClick={() => query.refetch()} className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground" data-testid="button-retry-cohort">Check again</button>
      </Card>
    );
  }
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />;

  const { memberCount, capacity, members } = query.data;
  const compact = members.length > 8;

  return (
    <Card className="p-5 md:p-7" data-testid="cohort-card">
      <SectionTitle eyebrow="Study cohort" title="Your auto-assigned group" action={<Users size={17} className="text-primary" />} />
      <p className="text-sm leading-relaxed text-muted-foreground">A study cohort is a group of up to {capacity} members who signed up around the same time. It's assigned automatically — there is no directory, no search, and no way to look up members by name. You can't message them; you only see each other's weekly board and activity.</p>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-border/70 bg-secondary/40 px-4 py-3">
        <p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-primary">Members</p>
        <p className="font-display text-lg font-bold tabular-nums" data-testid="cohort-member-count">{memberCount} / {capacity}</p>
      </div>

      <div className={`mt-3 space-y-2 ${compact ? 'max-h-64 overflow-y-auto pr-1' : ''}`}>
        {members.map((member: CohortMemberRow) => (
          <div key={member.userId} className="flex items-center gap-3 rounded-xl border border-border/70 p-3" data-testid={`row-cohort-${member.handle}`}>
            <Avatar src={member.avatarUrl} initials={member.initials} className="h-9 w-9 bg-secondary text-xs" title={member.handle} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{member.handle}</p>
              <p className="text-xs text-muted-foreground">{member.weeklyMinutes}m this week · {member.weeklyTopics} topics</p>
            </div>
            <span className="hidden font-mono-custom text-[9px] uppercase tracking-[.14em] text-muted-foreground sm:inline">{member.streak} day{member.streak === 1 ? '' : 's'} streak</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CohortBoardCard() {
  const query = useGetCohortsLeaderboard();
  if (query.isLoading) return <Card className="p-6"><LoadingBlock className="h-80" /></Card>;
  if (query.isError && isNotAssigned(query.error)) {
    return (
      <Card className="p-5 md:p-7">
        <SectionTitle eyebrow="This week" title="Cohort board" action={<Trophy size={17} className="text-primary" />} />
        <p className="mt-1 text-sm text-muted-foreground">The board appears once you're placed in a study cohort.</p>
      </Card>
    );
  }
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />;

  const { entries, weekLabel, focused } = query.data;
  return (
    <Card className="p-5 md:p-7">
      <SectionTitle eyebrow={weekRange(weekLabel)} title="Cohort board" action={<Trophy size={17} className="text-primary" />} />
      {focused && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-accent" data-testid="cohort-focus-notice"><EyeOff size={13} /> Focus mode is on — your rank and pulse are hidden from the cohort board.</p>
      )}
      {entries.length ? (
        <LeaderboardEntries entries={entries} />
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">The board fills as your cohort studies.</p>
      )}
    </Card>
  );
}

function FeedCard({ eyebrow, title, items, emptyText }: { eyebrow: string; title: string; items: CircleFeedItem[]; emptyText: string }) {
  return (
    <Card className="p-5 md:p-7">
      <SectionTitle eyebrow={eyebrow} title={title} />
      {items.length ? (
        <div className="space-y-2.5">
          {items.map((item, index) => (
            <div key={`${item.userId}-${item.date}-${index}`} className="flex items-start gap-3 rounded-xl border border-border/70 p-3" data-testid={`feed-item-${index}`}>
              <Avatar src={item.avatarUrl} initials={item.handle.slice(0, 2).toUpperCase()} className="h-8 w-8 bg-secondary text-[10px]" title={item.handle} />
              <div className="min-w-0"><p className="text-sm"><span className="font-bold">{item.handle}</span> <span className="text-muted-foreground">{item.detail}</span></p><p className="mt-0.5 font-mono-custom text-[10px] text-muted-foreground">{item.subject} · {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p></div>
            </div>
          ))}
        </div>
      ) : <p className="mt-1 text-sm text-muted-foreground">{emptyText}</p>}
    </Card>
  );
}

function CircleActivityCard() {
  const feedQuery = useGetCircleFeed();
  return <FeedCard eyebrow="Last 7 days" title="Circle activity" items={feedQuery.data ?? []} emptyText="Activity from your circle will appear here." />;
}

function CohortActivityCard() {
  const feedQuery = useGetCohortsFeed();
  if (feedQuery.isError && isNotAssigned(feedQuery.error)) {
    return <FeedCard eyebrow="Last 7 days" title="Cohort activity" items={[]} emptyText="Activity from your cohort will appear once you're placed in one." />;
  }
  return <FeedCard eyebrow="Last 7 days" title="Cohort activity" items={feedQuery.data ?? []} emptyText="Activity from your cohort will appear here." />;
}

function ThePointCard() {
  return (
    <Card className="p-5 md:p-7">
      <SectionTitle eyebrow="The point" title="Effort is the scoreboard" action={<Trophy size={17} className="text-primary" />} />
      <p className="text-sm leading-relaxed text-muted-foreground">Pulse combines focused minutes and topics moved forward. It rewards the repeatable work that compounds.</p>
    </Card>
  );
}

function YourBoundaryCard() {
  return (
    <Card className="p-5 md:p-7">
      <SectionTitle eyebrow="Your boundary" title="Change visibility in settings" />
      <p className="text-sm leading-relaxed text-muted-foreground">Focus mode hides comparison UI while keeping your own progress private and intact. Leaderboard visibility is opt-in.</p>
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
  const activityQuery = useGetGroupActivity(group.id);
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const leaveGroup = useLeaveGroup();

  if (detailQuery.isLoading) return <LoadingBlock className="h-96" />;
  if (detailQuery.isError || !detailQuery.data) return <ErrorState onRetry={() => detailQuery.refetch()} />;

  const detail = detailQuery.data;
  const isOwner = group.myRole === 'owner';

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
                <Avatar src={member.avatarUrl} initials={member.initials} className="h-9 w-9 bg-secondary text-xs" title={member.handle} />
                <p className="flex-1 text-sm font-bold">{member.handle}</p>
                {member.role === 'owner' && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase text-primary"><ShieldCheck size={11} /> Owner</span>}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 md:p-6">
          <SectionTitle eyebrow={leaderboardQuery.data?.weekLabel} title="Group board" action={<Trophy size={17} className="text-primary" />} />
          {leaderboardQuery.data?.entries.length ? (
            <div className="mt-3 divide-y divide-border/70">
              {leaderboardQuery.data.entries.map((entry) => (
                <div key={`${entry.rank}-${entry.handle}`} className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-1">
                  <span className="w-6 font-display text-base font-bold text-muted-foreground">{entry.rank}</span>
                  <Avatar src={entry.avatarUrl} initials={entry.initials} className={`h-9 w-9 text-xs ${entry.isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`} title={entry.handle} />
                  <p className="min-w-0 flex-1 truncate text-sm font-bold">{entry.handle}{entry.isCurrentUser && ' (you)'}</p>
                  <p className="font-display font-bold">{entry.score}</p>
                </div>
              ))}
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