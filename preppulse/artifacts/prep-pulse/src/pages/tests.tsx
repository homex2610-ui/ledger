import { useState, type FormEvent, type ReactNode } from 'react';
import { BarChart3, CalendarDays, Check, ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getListTestAttemptsQueryKey, useAnalyzeTestAttempts, useCreateTestAttempt, useDeleteTestAttempt, useGetProfile, useListTestAttempts, useUpdateTestAttempt } from '@workspace/api-client-react';
import type { SubjectScores, TestAttempt, TestAttemptExam, TestAttemptInputExam } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, LoadingBlock, SectionTitle } from '@/components/ui-elements';
import { Select } from '@/components/ui/select';

const subjectsByExam: Record<TestAttemptExam, Array<{ key: keyof SubjectScores; label: string }>> = {
  jee_main: [
    { key: 'physics', label: 'Physics' },
    { key: 'chemistry', label: 'Chemistry' },
    { key: 'mathematics', label: 'Mathematics' },
  ],
  jee_adv: [
    { key: 'physics', label: 'Physics' },
    { key: 'chemistry', label: 'Chemistry' },
    { key: 'mathematics', label: 'Mathematics' },
  ],
  neet: [
    { key: 'physics', label: 'Physics' },
    { key: 'chemistry', label: 'Chemistry' },
    { key: 'biology', label: 'Biology' },
  ],
};

const defaultsByExam: Record<TestAttemptExam, { maxScore: string; totalQuestions: string; timeMinutes: string }> = {
  jee_main: { maxScore: '300', totalQuestions: '90', timeMinutes: '180' },
  jee_adv: { maxScore: '240', totalQuestions: '60', timeMinutes: '180' },
  neet: { maxScore: '720', totalQuestions: '180', timeMinutes: '200' },
};

function examOptionsFor(track: string): { value: TestAttemptInputExam; label: string }[] {
  if (track === 'neet') return [{ value: 'neet', label: 'NEET' }];
  return [
    { value: 'jee_main', label: 'JEE Main' },
    { value: 'jee_adv', label: 'JEE Advanced' },
  ];
}

function defaultExamFor(track: string): TestAttemptInputExam {
  return track === 'neet' ? 'neet' : 'jee_main';
}

function examLabel(exam: TestAttemptExam): string {
  if (exam === 'jee_main') return 'JEE Main';
  if (exam === 'jee_adv') return 'JEE Advanced';
  return 'NEET';
}

function subjectEntries(attempt: TestAttempt): Array<{ key: string; label: string; value: number }> {
  const scores = attempt.subjectScores;
  if (!scores) return [];
  return subjectsByExam[attempt.exam]
    .filter(({ key }) => typeof scores[key] === 'number')
    .map(({ key, label }) => ({ key: String(key), label, value: scores[key] as number }));
}

type TestForm = ReturnType<typeof emptyForm>;
type FormErrors = Partial<Record<keyof TestForm, string>> & { subjects?: string };

function emptyForm(track: string) {
  const exam = defaultExamFor(track);
  return {
    name: '',
    exam,
    physics: '',
    chemistry: '',
    mathematics: '',
    biology: '',
    score: '',
    maxScore: defaultsByExam[exam].maxScore,
    attempted: '',
    totalQuestions: defaultsByExam[exam].totalQuestions,
    timeMinutes: defaultsByExam[exam].timeMinutes,
    negativeMarksLost: '0',
  };
}

function formFrom(attempt: TestAttempt): TestForm {
  const scores = attempt.subjectScores ?? {};
  const form = emptyForm('jee_main');
  form.name = attempt.name;
  form.exam = attempt.exam;
  form.physics = scores.physics !== undefined ? String(scores.physics) : '';
  form.chemistry = scores.chemistry !== undefined ? String(scores.chemistry) : '';
  form.mathematics = scores.mathematics !== undefined ? String(scores.mathematics) : '';
  form.biology = scores.biology !== undefined ? String(scores.biology) : '';
  form.score = String(attempt.score);
  form.maxScore = String(attempt.maxScore);
  form.attempted = String(attempt.attempted);
  form.totalQuestions = String(attempt.totalQuestions);
  form.timeMinutes = String(attempt.timeMinutes);
  form.negativeMarksLost = String(attempt.negativeMarksLost);
  return form;
}

function hasSubjectScores(attempt: TestAttempt): boolean {
  return !!attempt.subjectScores && Object.keys(attempt.subjectScores).length > 0;
}

function formSubjects(form: TestForm): SubjectScores {
  return subjectsByExam[form.exam].reduce<SubjectScores>((acc, { key }) => {
    acc[key] = Number(form[key]) || 0;
    return acc;
  }, {});
}

function formSubjectTotal(form: TestForm): number {
  return subjectsByExam[form.exam].reduce((sum, { key }) => sum + (Number(form[key]) || 0), 0);
}

function validateForm(form: TestForm, requireSubjects: boolean): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Test name is required.';
  const maxScore = Number(form.maxScore);
  const attempted = Number(form.attempted);
  const totalQuestions = Number(form.totalQuestions);
  const negative = Number(form.negativeMarksLost);
  if (requireSubjects) {
    for (const { key, label } of subjectsByExam[form.exam]) {
      const raw = form[key].trim();
      if (!raw) {
        errors[key] = `${label} score is required.`;
        continue;
      }
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) errors[key] = 'Use a number ≥ 0.';
    }
  }
  if (attempted > totalQuestions) errors.attempted = "Attempted questions can't exceed total questions.";
  if (requireSubjects) {
    const values = subjectsByExam[form.exam].map(({ key }) => Number(form[key]));
    if (values.some((value) => value > maxScore)) errors.subjects = "A subject score can't exceed the max score.";
    else if (values.reduce((a, b) => a + b, 0) > maxScore) errors.subjects = "Combined score can't exceed the max score.";
  } else {
    const score = Number(form.score);
    if (score > maxScore) errors.score = "Score can't exceed the max score.";
  }
  if (negative < 0) errors.negativeMarksLost = "Negative marks lost can't be negative.";
  return errors;
}

function firstError(errors: FormErrors): string | null {
  return errors.name ?? errors.subjects ?? errors.physics ?? errors.chemistry ?? errors.mathematics ?? errors.biology ?? errors.attempted ?? errors.score ?? errors.negativeMarksLost ?? null;
}

export default function Tests() {
  const queryClient = useQueryClient();
  const query = useListTestAttempts();
  const analyzeQuery = useAnalyzeTestAttempts();
  const createTest = useCreateTestAttempt();
  const profileQuery = useGetProfile();
  const track = profileQuery.data?.examTrack ?? 'jee_main';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => emptyForm(track));
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const attempts = query.data ?? [];
  const average = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) / attempts.length) : 0;
  const best = attempts.length ? Math.max(...attempts.map((attempt) => attempt.accuracy)) : 0;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListTestAttemptsQueryKey() });
    analyzeQuery.refetch();
  };

  const openForm = () => {
    setFormError(null);
    setFieldErrors({});
    setForm(emptyForm(track));
    setShowForm(true);
  };

  const switchExam = (exam: TestAttemptInputExam) => {
    setForm((current) => ({ ...current, exam, physics: '', chemistry: '', mathematics: '', biology: '', ...defaultsByExam[exam] }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm(form, true);
    setFieldErrors(errors);
    if (firstError(errors)) {
      setFormError(firstError(errors));
      return;
    }
    setFormError(null);
    createTest.mutate(
      { data: { name: form.name, exam: form.exam, subjectScores: formSubjects(form), score: formSubjectTotal(form), maxScore: Number(form.maxScore), attempted: Number(form.attempted), totalQuestions: Number(form.totalQuestions), timeMinutes: Number(form.timeMinutes), negativeMarksLost: Number(form.negativeMarksLost) } },
      {
        onSuccess: () => { invalidateAll(); setShowForm(false); setForm(emptyForm(track)); },
        onError: (err) => setFormError(err instanceof Error ? err.message : 'Could not log that test'),
      },
    );
  };

  if (query.isLoading) return <div className="mx-auto max-w-6xl"><LoadingBlock className="h-24" /><div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><LoadingBlock className="h-72" /><LoadingBlock className="h-72" /></div></div>;
  if (query.isError) return <div className="mx-auto max-w-6xl"><ErrorState onRetry={() => query.refetch()} /></div>;

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Evidence, not ego</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.04em] md:text-5xl">Test log</h1><p className="mt-3 max-w-xl text-sm text-muted-foreground">A test is a map of what to fix next, never a verdict on you.</p></div><button type="button" onClick={openForm} className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="button-log-test"><Plus size={16} /> Log a test</button></div>
    {showForm && <Card className="mt-6 border-primary/25 p-5 md:p-7"><div className="mb-5 flex items-center justify-between"><div><p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-primary">New attempt</p><h2 className="mt-1 font-display text-xl font-bold">Add the useful numbers</h2></div><button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label="Close form" data-testid="button-close-test-form"><X size={17} /></button></div>{formError && <div className="mb-5 rounded-xl border border-accent/25 bg-accent/10 px-4 py-3 text-xs font-semibold text-accent" data-testid="test-form-error">{formError}</div>}<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Test name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="e.g. Allen Major 04" testId="input-test-name" required error={fieldErrors.name} /><SelectField label="Exam" value={form.exam} onChange={(value) => switchExam(value as TestAttemptInputExam)} testId="select-test-exam">{examOptionsFor(track).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectField>{subjectsByExam[form.exam].map(({ key, label }) => <Field key={key} label={`${label} score`} value={form[key]} onChange={(value) => setForm({ ...form, [key]: value })} placeholder="0" testId={`input-test-${key}`} type="number" required error={fieldErrors[key]} />)}<div className="flex items-end"><label className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-bold"><input type="radio" name="test-scope" defaultChecked className="h-3.5 w-3.5 accent-primary" data-testid="radio-test-full-syllabus" /> Full syllabus</label></div><Field label="Max score" value={form.maxScore} onChange={(value) => setForm({ ...form, maxScore: value })} placeholder="300" testId="input-test-max" type="number" required /><Field label="Attempted" value={form.attempted} onChange={(value) => setForm({ ...form, attempted: value })} placeholder="90" testId="input-test-attempted" type="number" required error={fieldErrors.attempted} /><Field label="Total questions" value={form.totalQuestions} onChange={(value) => setForm({ ...form, totalQuestions: value })} placeholder="90" testId="input-test-total" type="number" required /><Field label="Time (minutes)" value={form.timeMinutes} onChange={(value) => setForm({ ...form, timeMinutes: value })} placeholder="180" testId="input-test-time" type="number" required /><Field label="Marks lost to negatives" value={form.negativeMarksLost} onChange={(value) => setForm({ ...form, negativeMarksLost: value })} placeholder="0" testId="input-test-negative" type="number" required error={fieldErrors.negativeMarksLost} /><div className="flex items-end"><p className="font-mono-custom text-[10px] uppercase tracking-[.14em] text-muted-foreground">Overall <span className="text-primary">{formSubjectTotal(form)}</span> / {form.maxScore || '—'}</p></div><div className="flex items-end"><button type="submit" disabled={createTest.isPending} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50" data-testid="button-save-test">{createTest.isPending ? 'Logging…' : <><Check size={14} /> Log test</>}</button></div></form></Card>}
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><MiniStat label="Attempts logged" value={String(attempts.length)} detail="keep the sample honest" /><MiniStat label="Average accuracy" value={`${average}%`} muted={attempts.length < 5} detail={attempts.length < 5 ? `based on ${attempts.length} attempt${attempts.length === 1 ? '' : 's'} — keep the sample honest` : 'across your attempts'} /><MiniStat label="Best accuracy" value={`${best}%`} muted={attempts.length < 5} detail={attempts.length < 5 ? 'a single attempt can flatter — log more to trust it' : 'a signal worth repeating'} /></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <Card className="p-5 md:p-7"><SectionTitle eyebrow="Trend line" title="Accuracy over time" action={<BarChart3 size={18} className="text-primary" />} /><div className="mt-7 flex h-48 items-end gap-2 border-b border-border/70 pb-0">{attempts.length ? attempts.slice().reverse().map((attempt) => <div key={attempt.id} className="group flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="font-mono-custom text-[10px] text-primary opacity-0 transition-opacity group-hover:opacity-100">{attempt.accuracy}%</span><div className="w-full max-w-10 rounded-t-lg bg-primary/75 transition-colors group-hover:bg-accent" style={{ height: `${Math.max(8, attempt.accuracy)}%` }} title={`${attempt.name} — ${attempt.accuracy}% on ${new Date(attempt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`} /><span className="font-mono-custom text-[9px] text-muted-foreground">{new Date(attempt.date).toLocaleDateString(undefined, { day: 'numeric' })}</span></div>) : <p className="mb-6 text-sm text-muted-foreground">Log one attempt to start your trend.</p>}</div></Card>
      <Card className="overflow-hidden"><div className="p-5 pb-3 md:p-7 md:pb-4"><SectionTitle eyebrow={`${attempts.length} logged`} title="Recent attempts" /></div>{attempts.length ? <div className="divide-y divide-border/70">{attempts.map((attempt) => <TestRow key={attempt.id} attempt={attempt} expanded={expandedId === attempt.id} onToggle={() => setExpandedId((current) => (current === attempt.id ? null : attempt.id))} onEdited={() => { setExpandedId(null); invalidateAll(); }} />)}</div> : <div className="px-5 pb-6"><EmptyState title="No tests logged yet" detail="Your first attempt turns uncertainty into a plan." action={<button type="button" onClick={openForm} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground" data-testid="button-empty-log-test">Log your first test</button>} /></div>}</Card>
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
      <Card className="p-5 md:p-7"><SectionTitle eyebrow="Where to look next" title="Weak areas" /><div className="mt-4 flex flex-wrap gap-2">{analyzeQuery.data?.weakAreas.length ? analyzeQuery.data.weakAreas.map((area) => <span key={area.name} className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 font-mono-custom text-[10px] font-bold uppercase tracking-[.1em] text-accent">{area.name} <span className="text-accent/70">×{area.count}</span></span>) : <p className="text-sm text-muted-foreground">Weak areas will appear here once you log attempts with subject data.</p>}</div></Card>
      <Card className="p-5 md:p-7"><SectionTitle eyebrow="By subject" title="Average accuracy" /><div className="mt-4 space-y-3">{analyzeQuery.data?.subjectAverages.length ? analyzeQuery.data.subjectAverages.map((subject) => <div key={subject.subject} className="flex items-center gap-3"><span className="w-32 truncate text-xs font-bold">{subject.subject}</span><div className="h-2.5 flex-1 rounded-full bg-secondary"><div className="h-2.5 rounded-full bg-primary" style={{ width: `${subject.averageAccuracy}%` }} /></div><span className="w-10 text-right font-mono-custom text-xs font-bold text-primary">{subject.averageAccuracy}%</span></div>) : <p className="text-sm text-muted-foreground">Subject averages appear once attempts are logged.</p>}</div></Card>
    </div>
  </div>;
}

function Field({ label, value, onChange, placeholder, testId, type = 'text', required = false, error }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; testId: string; type?: string; required?: boolean; error?: string }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-xs font-bold">{label}</span><input required={required} type={type} min={type === 'number' ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`h-10 w-full min-w-0 rounded-xl border bg-background px-3 text-sm outline-none transition focus:ring-3 ${error ? 'border-accent/70 focus:ring-accent/20' : 'border-border focus:ring-primary/20'}`} data-testid={testId} />{error && <p className="mt-1 text-[11px] font-semibold text-accent">{error}</p>}</label>;
}

function SelectField({ label, value, onChange, testId, children, error }: { label: string; value: string; onChange: (value: string) => void; testId: string; children: ReactNode; error?: string }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-xs font-bold">{label}</span><Select error={Boolean(error)} value={value} onChange={(event) => onChange(event.target.value)} data-testid={testId}>{children}</Select>{error && <p className="mt-1 text-[11px] font-semibold text-accent">{error}</p>}</label>;
}

function MiniStat({ label, value, detail, muted = false }: { label: string; value: string; detail: string; muted?: boolean }) {
  return <Card className="flex h-full min-h-[8.5rem] flex-col p-5"><p className="font-mono-custom text-[10px] uppercase tracking-[.15em] text-muted-foreground">{label}</p><p className={`mt-3 font-display text-3xl font-bold tracking-tight ${muted ? 'text-muted-foreground' : ''}`}>{value}</p><p className="mt-2 text-xs leading-snug text-muted-foreground">{detail}</p></Card>;
}

function TestRow({ attempt, expanded, onToggle, onEdited }: { attempt: TestAttempt; expanded: boolean; onToggle: () => void; onEdited: () => void }) {
  const queryClient = useQueryClient();
  const updateAttempt = useUpdateTestAttempt();
  const deleteAttempt = useDeleteTestAttempt();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(() => formFrom(attempt));
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const withSubjectScores = hasSubjectScores(attempt);
  const scopeLabel = withSubjectScores ? 'Full syllabus' : (attempt.subject ?? 'Full syllabus');
  const accuracyLabel = `${attempt.accuracy}%`;
  const entries = subjectEntries(attempt);

  const handleEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm(form, withSubjectScores);
    setFieldErrors(errors);
    if (firstError(errors)) { setError(firstError(errors)); return; }
    setError(null);
    updateAttempt.mutate(
      { id: attempt.id, data: withSubjectScores ? { name: form.name, exam: form.exam, subjectScores: formSubjects(form), score: formSubjectTotal(form), maxScore: Number(form.maxScore), attempted: Number(form.attempted), totalQuestions: Number(form.totalQuestions), timeMinutes: Number(form.timeMinutes), negativeMarksLost: Number(form.negativeMarksLost) } : { name: form.name, exam: form.exam, score: Number(form.score), maxScore: Number(form.maxScore), attempted: Number(form.attempted), totalQuestions: Number(form.totalQuestions), timeMinutes: Number(form.timeMinutes), negativeMarksLost: Number(form.negativeMarksLost) } },
      {
        onSuccess: () => { setEditOpen(false); onEdited(); },
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not save changes'),
      },
    );
  };

  const handleDelete = () => {
    deleteAttempt.mutate(
      { id: attempt.id },
      {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTestAttemptsQueryKey() }); onEdited(); },
        onError: () => setError('Could not delete this attempt. Try again.'),
      },
    );
  };

  return (
    <div className={expanded ? 'bg-secondary/30' : ''} data-testid={`row-test-${attempt.id}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-5 py-4 text-left md:px-7" aria-expanded={expanded}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><CalendarDays size={16} /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{attempt.name}</span><span className="block text-xs text-muted-foreground">{examLabel(attempt.exam)} · {scopeLabel} · {new Date(attempt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></span>
        <span className="text-right"><span className="block font-display font-bold">{accuracyLabel}</span><span className="font-mono-custom text-[10px] text-muted-foreground">{attempt.score}/{attempt.maxScore}</span></span>
        <ChevronDown size={15} className={`shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="px-5 pb-5 md:px-7">
          <div className="grid gap-3 rounded-xl border border-border/70 bg-background p-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCell label="Attempted" value={`${attempt.attempted} / ${attempt.totalQuestions}`} detail={`${attempt.totalQuestions ? Math.round((attempt.attempted / attempt.totalQuestions) * 100) : 0}% of the paper`} />
            <StatCell label="Time" value={`${attempt.timeMinutes} min`} detail="planned duration" />
            <StatCell label="Negatives" value={`${attempt.negativeMarksLost}`} detail="marks lost to wrong answers" />
            <StatCell label="Score" value={accuracyLabel} detail={`${attempt.score} out of ${attempt.maxScore}`} />
          </div>
          {entries.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{entries.map(({ key, label, value }) => <span key={key} className="rounded-full bg-secondary px-2.5 py-1 font-mono-custom text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">{label} {value}</span>)}</div>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {editOpen ? (
              <button type="button" onClick={() => { setEditOpen(false); setError(null); setFieldErrors({}); setForm(formFrom(attempt)); }} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary" data-testid={`button-cancel-edit-${attempt.id}`}>Cancel</button>
            ) : (
              <button type="button" onClick={() => { setEditOpen(true); setError(null); setFieldErrors({}); setForm(formFrom(attempt)); }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary" data-testid={`button-edit-test-${attempt.id}`}><Pencil size={12} /> Edit details</button>
            )}
            {deleteConfirmOpen ? (
              <span className="inline-flex items-center gap-2">
                <button type="button" onClick={handleDelete} disabled={deleteAttempt.isPending} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground disabled:opacity-50" data-testid={`button-confirm-delete-test-${attempt.id}`}>{deleteAttempt.isPending ? 'Deleting…' : 'Delete forever'}</button>
                <button type="button" onClick={() => setDeleteConfirmOpen(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary">Keep it</button>
              </span>
            ) : (
              <button type="button" onClick={() => setDeleteConfirmOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 px-3 py-1.5 text-xs font-bold text-accent hover:bg-accent/10" data-testid={`button-delete-test-${attempt.id}`}><Trash2 size={12} /> Delete</button>
            )}
            {attempt.weakAreas.length > 0 && <span className="ml-auto rounded-full bg-secondary px-2.5 py-1 font-mono-custom text-[9px] uppercase tracking-[.1em] text-muted-foreground">weak: {attempt.weakAreas.join(', ')}</span>}
          </div>
          {error && <p className="mt-2 text-xs font-semibold text-accent" data-testid={`test-row-error-${attempt.id}`}>{error}</p>}
          {editOpen && (
            <form onSubmit={handleEdit} className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4 rounded-xl border border-primary/25 bg-background p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Test name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} testId={`input-edit-name-${attempt.id}`} required error={fieldErrors.name} />
              <SelectField label="Exam" value={form.exam} onChange={(value) => setForm({ ...form, exam: value as TestAttemptInputExam, physics: '', chemistry: '', mathematics: '', biology: '', ...defaultsByExam[value as TestAttemptExam] })} testId={`select-edit-exam-${attempt.id}`}>{examOptionsFor(form.exam === 'neet' ? 'neet' : 'jee_main').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectField>
              {withSubjectScores ? subjectsByExam[form.exam].map(({ key, label }) => <Field key={key} label={`${label} score`} value={form[key]} onChange={(value) => setForm({ ...form, [key]: value })} testId={`input-edit-${key}-${attempt.id}`} type="number" required error={fieldErrors[key]} />) : <Field label="Score" value={form.score} onChange={(value) => setForm({ ...form, score: value })} testId={`input-edit-score-${attempt.id}`} type="number" required error={fieldErrors.score} />}
              <Field label="Max score" value={form.maxScore} onChange={(value) => setForm({ ...form, maxScore: value })} testId={`input-edit-max-${attempt.id}`} type="number" required />
              <Field label="Attempted" value={form.attempted} onChange={(value) => setForm({ ...form, attempted: value })} testId={`input-edit-attempted-${attempt.id}`} type="number" required error={fieldErrors.attempted} />
              <Field label="Total questions" value={form.totalQuestions} onChange={(value) => setForm({ ...form, totalQuestions: value })} testId={`input-edit-total-${attempt.id}`} type="number" required />
              <Field label="Time (minutes)" value={form.timeMinutes} onChange={(value) => setForm({ ...form, timeMinutes: value })} testId={`input-edit-time-${attempt.id}`} type="number" required />
              <Field label="Marks lost to negatives" value={form.negativeMarksLost} onChange={(value) => setForm({ ...form, negativeMarksLost: value })} testId={`input-edit-negative-${attempt.id}`} type="number" required error={fieldErrors.negativeMarksLost} />
              <div className="flex items-end sm:col-span-2 lg:col-span-4"><button type="submit" disabled={updateAttempt.isPending} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50" data-testid={`button-save-edit-${attempt.id}`}>{updateAttempt.isPending ? 'Saving…' : <><Check size={14} /> Save changes</>}</button></div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl bg-secondary/50 p-3"><p className="font-mono-custom text-[9px] uppercase tracking-[.14em] text-muted-foreground">{label}</p><p className="mt-1 font-display text-sm font-bold">{value}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p></div>;
}