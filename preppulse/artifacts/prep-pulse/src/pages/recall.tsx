import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Eye, EyeOff, Flame, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetCardStatsQueryKey,
  getListCardsQueryKey,
  useCreateCard,
  useDeleteCard,
  useGetCardStats,
  useGetProfile,
  useListCards,
  useReviewCard,
  type Card as CardItem,
  type CardReviewInputGrade,
} from '@workspace/api-client-react';
import { getExamConfig } from '@workspace/exam-config';
import { Card, EmptyState, ErrorState, LoadingBlock, SectionTitle } from '@/components/ui-elements';
import { Select } from '@/components/ui/select';

const gradeMeta: Array<{ grade: CardReviewInputGrade; label: string; hint: string; accent: boolean }> = [
  { grade: 'again', label: 'Again', hint: 'forgot it', accent: true },
  { grade: 'hard', label: 'Hard', hint: 'almost', accent: false },
  { grade: 'good', label: 'Good', hint: 'got it', accent: false },
  { grade: 'easy', label: 'Easy', hint: 'too easy', accent: false },
];

function isDue(card: CardItem): boolean {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return new Date(card.due).getTime() <= endOfToday.getTime();
}

export default function Recall() {
  const queryClient = useQueryClient();
  const cardsQuery = useListCards();
  const statsQuery = useGetCardStats();
  const reviewCard = useReviewCard();
  const createCard = useCreateCard();
  const deleteCard = useDeleteCard();
  const profileQuery = useGetProfile();
  const subjects = [...getExamConfig(profileQuery.data?.examTrack ?? 'jee_main').subjects, 'General'];

  const cards = cardsQuery.data ?? [];
  const dueCards = useMemo(() => cards.filter(isDue).sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()), [cards]);

  const [queueIndex, setQueueIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ front: '', back: '', subject: subjects[0] });

  const current = queueIndex < dueCards.length ? dueCards[queueIndex] : undefined;

  useEffect(() => {
    if (!current) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.tagName === 'BUTTON')) return;
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setFlipped((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListCardsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCardStatsQueryKey() });
  };

  const submitReview = (grade: CardReviewInputGrade) => {
    if (!current) return;
    reviewCard.mutate(
      { cardId: current.id, data: { grade } },
      {
        onSuccess: () => {
          setFlipped(false);
          setQueueIndex((index) => index + 1);
          refresh();
        },
      },
    );
  };

  const addCard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createCard.mutate(
      { data: { front: form.front.trim(), back: form.back.trim(), subject: form.subject } },
      {
        onSuccess: () => {
          setForm({ front: '', back: '', subject: subjects[0] });
          setShowForm(false);
          refresh();
        },
      },
    );
  };

  if (cardsQuery.isLoading || statsQuery.isLoading) {
    return <div className="mx-auto max-w-6xl"><div className="skeleton h-28 w-2/3 rounded-2xl" /><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((n) => <LoadingBlock key={n} className="h-28" />)}</div><div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><LoadingBlock className="h-96" /><LoadingBlock className="h-96" /></div></div>;
  }
  if (cardsQuery.isError || statsQuery.isError) return <div className="mx-auto max-w-6xl"><ErrorState onRetry={() => { cardsQuery.refetch(); statsQuery.refetch(); }} /></div>;

  const stats = statsQuery.data;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Spaced repetition, your way</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.04em] md:text-5xl">Recall</h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">Short, honest reviews. The scheduler spaces them out so the work sticks.</p>
        </div>
        <button type="button" onClick={() => setShowForm((open) => !open)} className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="button-add-card"><Plus size={16} /> Add a card</button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Due today" value={String(stats?.due ?? 0)} detail="cards waiting for you" />
        <MiniStat label="Mastered" value={String(stats?.mastered ?? 0)} detail="interval 30 days or more" />
        <MiniStat label="Retention" value={`${stats?.retentionRate ?? 0}%`} detail="share kept past 21 days" />
        <MiniStat label="Review streak" value={`${stats?.reviewStreak ?? 0} days`} detail="keep it alive" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="flex flex-col overflow-hidden p-5 md:p-7">
          <SectionTitle eyebrow="Review queue" title={dueCards.length ? `${Math.min(queueIndex + 1, dueCards.length)} of ${dueCards.length}` : 'All caught up'} action={<Flame size={18} className="text-accent" />} />
          {current ? (
            <div className="flex flex-1 flex-col">
              <button type="button" onClick={() => setFlipped((value) => !value)} className="flex min-h-[260px] flex-1 flex-col items-center justify-center rounded-2xl border border-border/70 bg-secondary/40 p-8 text-center transition-colors hover:bg-secondary/70" data-testid="card-flashcard">
                <span className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-muted-foreground">{current.subject}</span>
                <p className="mt-4 max-w-md font-display text-2xl font-bold leading-snug">{flipped ? current.back : current.front}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">{flipped ? <EyeOff size={14} /> : <Eye size={14} />}{flipped ? 'Tap to see question · press Space' : 'Tap to reveal answer · press Space'}</span>
              </button>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {gradeMeta.map(({ grade, label, hint, accent }) => (
                  <button key={grade} type="button" onClick={() => submitReview(grade)} disabled={reviewCard.isPending} className={`rounded-xl px-2 py-3 text-center text-xs font-bold transition-transform hover:-translate-y-0.5 disabled:opacity-50 ${accent ? 'bg-accent text-accent-foreground' : 'bg-secondary hover:bg-secondary/70'}`} data-testid={`button-grade-${grade}`}>
                    {label}<span className={`mt-0.5 block text-[9px] font-semibold ${accent ? 'text-accent-foreground/70' : 'text-muted-foreground'}`}>{hint}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center py-16"><EmptyState title={dueCards.length === 0 && cards.length > 0 ? 'Queue is clear' : 'No cards yet'} detail={cards.length === 0 ? 'Add your first card and reviews will queue up here.' : 'Come back when the scheduler wakes the next batch.'} action={cards.length === 0 ? <button type="button" onClick={() => setShowForm(true)} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Add a card</button> : undefined} /></div>
          )}
        </Card>

        <div className="space-y-6">
          {showForm && (
            <Card className="border-primary/25 p-5 md:p-6">
              <p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-primary">New card</p>
              <form onSubmit={addCard} className="mt-4 space-y-3">
                <label className="block"><span className="mb-1.5 block text-xs font-bold">Subject</span><Select value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} data-testid="select-card-subject">{subjects.map((subject) => <option key={subject}>{subject}</option>)}</Select></label>
                <label className="block"><span className="mb-1.5 block text-xs font-bold">Question</span><textarea required rows={2} value={form.front} onChange={(event) => setForm({ ...form, front: event.target.value })} placeholder="e.g. State Newton's second law" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-3 focus:ring-primary/20" data-testid="input-card-front" /></label>
                <label className="block"><span className="mb-1.5 block text-xs font-bold">Answer</span><textarea required rows={3} value={form.back} onChange={(event) => setForm({ ...form, back: event.target.value })} placeholder="The shorthand you want to recall" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-3 focus:ring-primary/20" data-testid="input-card-back" /></label>
                <button type="submit" disabled={createCard.isPending || !form.front.trim() || !form.back.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50" data-testid="button-save-card">{createCard.isPending ? 'Saving…' : 'Save card'}</button>
              </form>
            </Card>
          )}
          <Card className="p-5 md:p-6">
            <SectionTitle eyebrow={`${cards.length} saved`} title="Your cards" />
            {cards.length ? (
              <div className="mt-3 divide-y divide-border/70">
                {cards.slice(0, 8).map((card) => (
                  <div key={card.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1" data-testid={`row-card-${card.id}`}>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{card.front}</p><p className="font-mono-custom text-[10px] text-muted-foreground">{card.subject} · interval {card.interval}d · {card.reps} reps</p></div>
                    {card.interval >= 30 && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase text-primary"><Check size={11} /> Mastered</span>}
                    <button type="button" onClick={() => deleteCard.mutate({ cardId: card.id }, { onSuccess: refresh })} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-accent" aria-label="Delete card" data-testid={`button-delete-card-${card.id}`}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            ) : <p className="mt-3 text-sm text-muted-foreground">Nothing here yet — your first card takes ten seconds.</p>}
          </Card>
          <Card className="p-5 md:p-6">
            <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent"><RotateCcw size={16} /></div><div><p className="text-sm font-bold">How the scheduler thinks</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Grade honestly. "Again" resets the card; "Good" grows the gap; "Easy" jumps it forward. Small daily reviews beat a heroic cram.</p></div></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, detail }: { label: string; value: string; detail: string }) { return <Card className="p-4"><p className="font-mono-custom text-[10px] uppercase tracking-[.15em] text-muted-foreground">{label}</p><p className="mt-2 font-display text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></Card>; }