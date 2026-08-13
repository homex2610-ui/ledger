import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, Filter, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getListTopicsQueryKey, useListTopics, useUpdateTopicProgress } from '@workspace/api-client-react';
import type { Topic, TopicProgressInputStatus } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, LoadingBlock, ProgressBar, SectionTitle } from '@/components/ui-elements';

const statuses: TopicProgressInputStatus[] = ['not_started', 'learning', 'practiced', 'revised', 'mastered'];
const statusLabel: Record<string, string> = { not_started: 'Not started', learning: 'Learning', practiced: 'Practiced', revised: 'Revised', mastered: 'Mastered' };
const statusWeight: Record<string, number> = { not_started: 0, learning: 25, practiced: 50, revised: 75, mastered: 100 };
const statusTone: Record<string, string> = {
  not_started: 'bg-secondary text-muted-foreground',
  learning: 'bg-[#fae8cf] text-[#9a621b]',
  practiced: 'bg-[#fae8cf] text-[#9a621b]',
  revised: 'bg-[#fae8cf] text-[#9a621b]',
  mastered: 'bg-[#d5f0e1] text-[#1e7a4e]',
};

export default function Syllabus() {
  const queryClient = useQueryClient();
  const query = useListTopics();
  const updateTopic = useUpdateTopicProgress();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All subjects');
  const [status, setStatus] = useState('All status');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const topics = query.data ?? [];
  const subjects = useMemo(() => ['All subjects', ...Array.from(new Set(topics.map((topic) => topic.subject)))], [topics]);
  const filtered = useMemo(() => topics.filter((topic) => `${topic.name} ${topic.chapter} ${topic.subject}`.toLowerCase().includes(search.toLowerCase()) && (subject === 'All subjects' || topic.subject === subject) && (status === 'All status' || topic.status === status)), [topics, search, subject, status]);
  const grouped = useMemo(() => filtered.reduce<Record<string, Topic[]>>((groups, topic) => { const key = `${topic.subject} / ${topic.chapter}`; (groups[key] ??= []).push(topic); return groups; }, {}), [filtered]);
  const mastered = topics.filter((topic) => topic.status === 'mastered').length;
  const progress = topics.length ? Math.round((mastered / topics.length) * 100) : 0;
  const handleUpdate = (topicId: string, nextStatus: string) => updateTopic.mutate({ topicId, data: { status: nextStatus as TopicProgressInputStatus } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTopicsQueryKey() }) });
  const toggleSubject = (subjectName: string) => setCollapsed((current) => { const next = new Set(current); next.has(subjectName) ? next.delete(subjectName) : next.add(subjectName); return next; });
  const allCollapsed = collapsed.size > 0 && subjects.slice(1).every((item) => collapsed.has(item));
  const toggleAll = () => setCollapsed(allCollapsed ? new Set() : new Set(subjects.slice(1)));

  if (query.isLoading) return <div className="mx-auto max-w-6xl"><LoadingBlock className="h-24" /><div className="mt-6 space-y-3"><LoadingBlock className="h-20" /><LoadingBlock className="h-20" /><LoadingBlock className="h-20" /></div></div>;
  if (query.isError) return <div className="mx-auto max-w-6xl"><ErrorState onRetry={() => query.refetch()} /></div>;

  const chapterGroups = Object.entries(grouped);
  const bySubject = chapterGroups.reduce<Record<string, Array<[string, Topic[]]>>>((sections, [key, groupTopics]) => {
    const [subjectName] = key.split(' / ');
    (sections[subjectName] ??= []).push([key, groupTopics]);
    return sections;
  }, {});

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">The map, not the mountain</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.04em] md:text-5xl">Syllabus</h1><p className="mt-3 max-w-xl text-sm text-muted-foreground">Move each topic forward when the evidence says it is ready.</p></div><div className="rounded-2xl bg-primary px-5 py-4 text-primary-foreground"><p className="font-mono-custom text-[10px] uppercase tracking-[.15em] text-primary-foreground/65">Mastery pulse</p><p className="mt-1 font-display text-3xl font-bold">{progress}%</p></div></div>
    <Card className="mt-7 p-4 md:p-5"><div className="flex flex-col gap-3 md:flex-row"><label className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-muted-foreground" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search chapter or topic" className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none ring-primary/30 transition focus:ring-3" data-testid="input-search-topics" /></label><div className="flex gap-2"><select value={subject} onChange={(event) => setSubject(event.target.value)} className="h-10 min-w-32 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none" data-testid="select-subject-filter">{subjects.map((value) => <option key={value}>{value}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 min-w-32 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none" data-testid="select-status-filter"><option>All status</option>{statuses.map((value) => <option key={value} value={value}>{statusLabel[value]}</option>)}</select></div></div></Card>
    <div className="mt-7"><SectionTitle eyebrow={`${filtered.length} of ${topics.length} topics`} title="Your study map" action={<span className="flex items-center gap-3"><span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex"><Filter size={13} /> filters shape the view</span>{subjects.length > 1 && <button type="button" onClick={toggleAll} className="text-xs font-bold text-primary hover:underline" data-testid="button-collapse-all">{allCollapsed ? 'Expand all' : 'Collapse all'}</button>}</span>} />{chapterGroups.length ? <div className="space-y-5">{Object.entries(bySubject).map(([subjectName, chapters]) => { const isCollapsed = collapsed.has(subjectName); const chapterTotal = chapters.reduce((sum, [, groupTopics]) => sum + groupTopics.length, 0); return <div key={subjectName}><button type="button" onClick={() => toggleSubject(subjectName)} className={`flex w-full items-center justify-between rounded-t-2xl border border-b-0 border-border/70 bg-secondary/50 px-4 py-3 transition-colors hover:bg-secondary/70 md:px-5 ${isCollapsed ? 'rounded-b-2xl border-b' : ''}`} data-testid={`button-collapse-${subjectName.toLowerCase()}`}><span className="flex items-center gap-2"><BookOpen size={15} className="text-primary" /><span className="text-xs font-bold uppercase tracking-[.08em]">{subjectName}</span><span className="font-mono-custom text-[10px] text-muted-foreground">{chapterTotal} topics</span></span><ChevronDown size={15} className={`text-muted-foreground transition-transform ${isCollapsed ? '-rotate-90' : ''}`} /></button>{isCollapsed ? null : <div className="space-y-5 rounded-b-2xl border border-border/70 border-t-0 p-4 pt-0 md:p-5">{chapters.map(([key, groupTopics]) => <Card key={key} className="overflow-hidden"><div className="flex items-center justify-between border-b border-border/70 bg-secondary/35 px-4 py-3 md:px-5"><div className="flex items-center gap-2"><BookOpen size={15} className="text-primary" /><p className="text-xs font-bold">{key.replace(`${subjectName} / `, '')}</p></div><span className="font-mono-custom text-[10px] text-muted-foreground">{groupTopics.length} topics</span></div><div>{groupTopics.map((topic) => <TopicRow key={topic.id} topic={topic} pending={updateTopic.isPending} onUpdate={handleUpdate} />)}</div></Card>)}</div>}</div>; })}</div> : <EmptyState title="No topics match this view" detail="Try clearing a filter or searching for another chapter." />}</div>
  </div>;
}

function TopicRow({ topic, pending, onUpdate }: { topic: Topic; pending: boolean; onUpdate: (id: string, status: string) => void }) {
  return <div className={`flex flex-col gap-3 border-b border-border/60 p-4 last:border-b-0 md:flex-row md:items-center md:px-5 ${topic.locked ? 'opacity-60' : ''}`}><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-bold">{topic.name}</p>{topic.locked && <span className="rounded-full bg-muted px-2 py-0.5 font-mono-custom text-[9px] uppercase text-muted-foreground">Locked</span>}<span className={`rounded-full px-2 py-0.5 font-mono-custom text-[9px] uppercase ${topic.weightage === 'high' ? 'bg-accent/15 text-accent' : 'bg-secondary text-muted-foreground'}`}>{topic.weightage}</span></div><div className="mt-2 flex items-center gap-3"><ProgressBar value={statusWeight[topic.status] ?? 0} className="h-1.5 max-w-44 flex-1" color={topic.status === 'mastered' ? 'success' : 'warm'} locked={topic.locked} /><span className="font-mono-custom text-[10px] text-muted-foreground">{topic.accuracy}% accuracy · {topic.questionCount} Qs</span></div></div><div className="relative flex items-center gap-2 md:w-36"><select disabled={pending || topic.locked} value={topic.status} onChange={(event) => onUpdate(topic.id, event.target.value)} className={`h-9 w-full appearance-none rounded-lg border-0 px-3 pr-7 text-xs font-bold outline-none disabled:cursor-not-allowed ${statusTone[topic.status]}`} data-testid={`select-topic-status-${topic.id}`}>{statuses.map((value) => <option key={value} value={value}>{statusLabel[value]}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-2.5" /></div></div>;
}