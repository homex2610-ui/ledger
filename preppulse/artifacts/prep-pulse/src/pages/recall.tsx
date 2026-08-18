import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  Flame,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
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
import { Card, ErrorState, LoadingBlock, ProgressBar, SectionTitle } from '@/components/ui-elements';
import { Select } from '@/components/ui/select';

const gradeMeta: Array<{ grade: CardReviewInputGrade; keyNum: string; label: string; hint: string; color: string }> = [
  { grade: 'again', keyNum: '1', label: 'Again', hint: 'forgot it', color: 'bg-destructive/15 text-destructive hover:bg-destructive/25' },
  { grade: 'hard', keyNum: '2', label: 'Hard', hint: 'struggled', color: 'bg-warm/15 text-warm hover:bg-warm/25' },
  { grade: 'good', keyNum: '3', label: 'Good', hint: 'recalled cleanly', color: 'bg-primary/15 text-primary hover:bg-primary/25' },
  { grade: 'easy', keyNum: '4', label: 'Easy', hint: 'instant mastery', color: 'bg-success/15 text-success hover:bg-success/25' },
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
  const dueCards = useMemo(
    () => cards.filter(isDue).sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()),
    [cards],
  );

  const [queueIndex, setQueueIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ front: '', back: '', subject: subjects[0] });

  const current = queueIndex < dueCards.length ? dueCards[queueIndex] : undefined;
  const queueProgress = dueCards.length > 0 ? Math.round((queueIndex / dueCards.length) * 100) : 100;

  useEffect(() => {
    if (!current) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON')
      ) {
        return;
      }
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setFlipped((value) => !value);
      } else if (flipped) {
        if (event.key === '1') submitReview('again');
        else if (event.key === '2') submitReview('hard');
        else if (event.key === '3') submitReview('good');
        else if (event.key === '4') submitReview('easy');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, flipped]);

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
    return (
      <div className="mx-auto max-w-6xl">
        <div className="skeleton h-28 w-2/3 rounded-2xl" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <LoadingBlock key={n} className="h-28" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <LoadingBlock className="h-96" />
          <LoadingBlock className="h-96" />
        </div>
      </div>
    );
  }
  if (cardsQuery.isError || statsQuery.isError) {
    return (
      <div className="mx-auto max-w-6xl">
        <ErrorState
          onRetry={() => {
            cardsQuery.refetch();
            statsQuery.refetch();
          }}
        />
      </div>
    );
  }

  const stats = statsQuery.data;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary font-bold">
            Spaced Repetition & Formulas
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.04em] md:text-5xl">Recall</h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Short, high-yield active recall reviews. The SM-2 scheduler spaces them out so critical JEE & NEET concepts stick permanently.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((open) => !open)}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
          data-testid="button-add-card"
        >
          <Plus size={16} /> Add a card
        </button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Due today" value={String(stats?.due ?? 0)} detail="cards waiting for you" />
        <MiniStat label="Mastered" value={String(stats?.mastered ?? 0)} detail="interval ≥ 30 days" />
        <MiniStat label="Retention" value={`${stats?.retentionRate ?? 0}%`} detail="retained past 21 days" />
        <MiniStat label="Review streak" value={`${stats?.reviewStreak ?? 0} days`} detail="consecutive daily reviews" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="flex flex-col overflow-hidden p-5 md:p-7 shadow-lg">
          <div className="mb-4">
            <SectionTitle
              eyebrow="Review queue"
              title={dueCards.length ? `${Math.min(queueIndex + 1, dueCards.length)} of ${dueCards.length}` : 'All caught up'}
              action={
                <div className="flex items-center gap-2">
                  <span className="font-mono-custom text-xs font-bold text-primary">{queueProgress}%</span>
                  <Flame size={18} className="text-accent" />
                </div>
              }
            />
            {dueCards.length > 0 && (
              <ProgressBar value={queueProgress} className="h-1.5 w-full mt-1" color="primary" />
            )}
          </div>

          {current ? (
            <div className="flex flex-1 flex-col">
              {/* 3D Flashcard container with flip animation */}
              <div className="perspective-1000 min-h-[300px] flex-1">
                <button
                  type="button"
                  onClick={() => setFlipped((value) => !value)}
                  className={`relative h-full min-h-[290px] w-full rounded-3xl border border-border/80 p-8 text-center transition-transform duration-500 transform-style-3d cursor-pointer shadow-md ${
                    flipped ? 'rotate-y-180 bg-card' : 'bg-gradient-to-b from-secondary/40 to-secondary/70'
                  }`}
                  data-testid="card-flashcard"
                >
                  {/* Front Face (Question) */}
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-between p-8 backface-hidden ${
                      flipped ? 'pointer-events-none' : ''
                    }`}
                  >
                    <span className="rounded-full bg-primary/10 px-3 py-1 font-mono-custom text-[10px] font-bold uppercase tracking-[.18em] text-primary">
                      {current.subject}
                    </span>
                    <p className="my-auto max-w-md font-display text-2xl font-bold leading-snug text-foreground">
                      {current.front}
                    </p>
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <Eye size={14} /> Tap to flip card · Space
                    </span>
                  </div>

                  {/* Back Face (Answer) */}
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-between p-8 rotate-y-180 backface-hidden ${
                      !flipped ? 'pointer-events-none' : ''
                    }`}
                  >
                    <span className="rounded-full bg-accent/10 px-3 py-1 font-mono-custom text-[10px] font-bold uppercase tracking-[.18em] text-accent">
                      Answer · {current.subject}
                    </span>
                    <p className="my-auto max-w-md font-sans text-xl font-semibold leading-relaxed text-foreground">
                      {current.back}
                    </p>
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <EyeOff size={14} /> Tap to hide answer · Space
                    </span>
                  </div>
                </button>
              </div>

              {/* Grade Buttons with keyboard numbers 1-4 */}
              <div className="mt-5 grid grid-cols-4 gap-2">
                {gradeMeta.map(({ grade, keyNum, label, hint, color }) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => submitReview(grade)}
                    disabled={reviewCard.isPending}
                    className={`relative rounded-xl border border-transparent p-3 text-center transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 ${color}`}
                    data-testid={`button-grade-${grade}`}
                  >
                    <span className="absolute top-1.5 right-2 font-mono text-[9px] opacity-60 font-bold">
                      [{keyNum}]
                    </span>
                    <span className="block text-xs font-bold">{label}</span>
                    <span className="mt-0.5 block text-[10px] opacity-80">{hint}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-inner mb-4">
                <Sparkles size={32} />
              </div>
              <h3 className="font-display text-2xl font-bold">Review Queue Cleared!</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                All due flashcards for today have been reviewed. Rest and let synaptic consolidation do the work.
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90"
              >
                <Plus size={14} /> Add new flashcards
              </button>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          {showForm && (
            <Card className="border-primary/30 p-5 md:p-6 shadow-md">
              <div className="flex items-center justify-between">
                <p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-primary font-bold">
                  New Flashcard
                </p>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
              <form onSubmit={addCard} className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold">Subject</span>
                  <Select
                    value={form.subject}
                    onChange={(event) => setForm({ ...form, subject: event.target.value })}
                    data-testid="select-card-subject"
                  >
                    {subjects.map((subject) => (
                      <option key={subject}>{subject}</option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold">Question / Formula trigger</span>
                  <textarea
                    required
                    rows={2}
                    value={form.front}
                    onChange={(event) => setForm({ ...form, front: event.target.value })}
                    placeholder="e.g. Formula for Carnot engine efficiency"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-3 focus:ring-primary/20"
                    data-testid="input-card-front"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold">Answer / Concise definition</span>
                  <textarea
                    required
                    rows={3}
                    value={form.back}
                    onChange={(event) => setForm({ ...form, back: event.target.value })}
                    placeholder="η = 1 - (T_cold / T_hot)"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-3 focus:ring-primary/20"
                    data-testid="input-card-back"
                  />
                </label>
                <button
                  type="submit"
                  disabled={createCard.isPending || !form.front.trim() || !form.back.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-50"
                  data-testid="button-save-card"
                >
                  {createCard.isPending ? 'Saving…' : 'Save Flashcard'}
                </button>
              </form>
            </Card>
          )}

          <Card className="p-5 md:p-6">
            <SectionTitle eyebrow={`${cards.length} saved`} title="Your Cards" />
            {cards.length ? (
              <div className="mt-3 divide-y divide-border/70 max-h-80 overflow-y-auto">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center gap-3 py-3 first:pt-1 last:pb-1"
                    data-testid={`row-card-${card.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{card.front}</p>
                      <p className="font-mono-custom text-[10px] text-muted-foreground">
                        {card.subject} · interval {card.interval}d · {card.reps} reps
                      </p>
                    </div>
                    {card.interval >= 30 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase text-primary">
                        <Check size={11} /> Mastered
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteCard.mutate({ cardId: card.id }, { onSuccess: refresh })}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-accent"
                      aria-label="Delete card"
                      data-testid={`button-delete-card-${card.id}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Nothing here yet — your first card takes ten seconds.</p>
            )}
          </Card>

          <Card className="p-5 md:p-6 bg-secondary/30">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <RotateCcw size={16} />
              </div>
              <div>
                <p className="text-sm font-bold">SM-2 Spaced Algorithm</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Grade honestly. &ldquo;Again&rdquo; resets the card; &ldquo;Good&rdquo; doubles the spacing interval; &ldquo;Easy&rdquo; vaults it forward.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="p-4">
      <p className="font-mono-custom text-[10px] uppercase tracking-[.15em] text-muted-foreground font-semibold">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </Card>
  );
}