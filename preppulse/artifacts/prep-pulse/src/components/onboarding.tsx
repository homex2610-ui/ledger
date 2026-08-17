import { useEffect, useState, type FormEvent } from 'react';
import { GraduationCap, Target } from 'lucide-react';
import { useGetProfile, useUpdateProfile, type ProfileUpdateExamTrack, type ProfileUpdateStage } from '@workspace/api-client-react';
import { EXAM_TRACKS } from '@workspace/exam-config';
import { Select } from '@/components/ui/select';

const ONBOARDING_KEY = 'pp-onboarded';

const STAGE_OPTIONS = [
  { value: 'class_11', label: 'Class 11' },
  { value: 'class_12', label: 'Class 12' },
  { value: 'dropper', label: 'Dropper / Repeater' },
];

const DAILY_OPTIONS = [
  { value: 60, label: 'About 1 hour' },
  { value: 120, label: 'About 2 hours' },
  { value: 180, label: 'About 3 hours' },
  { value: 240, label: 'About 4 hours' },
  { value: 360, label: '5 hours or more' },
];

const WEEKLY_OPTIONS = [
  { value: 600, label: 'Around 10 hours' },
  { value: 900, label: 'Around 15 hours' },
  { value: 1200, label: 'Around 20 hours' },
  { value: 1500, label: 'Around 25 hours' },
  { value: 1800, label: '30 hours or more' },
];

type OnboardingValues = {
  examTrack: ProfileUpdateExamTrack;
  stage: ProfileUpdateStage;
  targetYear: number;
  dailyGoalMinutes: number;
  weeklyGoalMinutes: number;
};

export function OnboardingModal() {
  const profileQuery = useGetProfile();
  const updateProfile = useUpdateProfile();
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_KEY) !== '1');
  const [values, setValues] = useState<OnboardingValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = profileQuery.data;
  useEffect(() => {
    if (open && profile && !values) {
      setValues({
        examTrack: profile.examTrack,
        stage: profile.stage,
        targetYear: profile.targetYear,
        dailyGoalMinutes: profile.dailyGoalMinutes,
        weeklyGoalMinutes: profile.weeklyGoalMinutes,
      });
    }
  }, [open, profile, values]);

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values) return;
    setSaving(true);
    setError(null);
    updateProfile.mutate(
      { data: values },
      {
        onSuccess: () => {
          profileQuery.refetch();
          finish();
        },
        onError: (err) => {
          setSaving(false);
          setError(err instanceof Error ? err.message : 'Could not save your setup. Try again.');
        },
      },
    );
  };

  if (!open || !values) return null;

  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Set up your prep" data-testid="onboarding-modal">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl md:p-8">
        <div className="flex items-start gap-4">
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex"><Target size={22} /></span>
          <div>
            <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">One-time setup</p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Tell Ledger about you</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">A few details make your prep personal — syllabus, focus mode and your weekly circle will all use them. You can change everything later in Settings.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="block min-w-0 sm:col-span-2"><span className="mb-1.5 block text-xs font-bold">What are you preparing for?</span><Select value={values.examTrack} onChange={(event) => setValues({ ...values, examTrack: event.target.value as ProfileUpdateExamTrack })} icon={<GraduationCap size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />} data-testid="select-onboard-exam">{EXAM_TRACKS.map((track) => <option key={track.value} value={track.value}>{track.label}</option>)}</Select></label>
          <label className="block min-w-0"><span className="mb-1.5 block text-xs font-bold">Which class are you in?</span><Select value={values.stage} onChange={(event) => setValues({ ...values, stage: event.target.value as ProfileUpdateStage })} data-testid="select-onboard-stage">{STAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></label>
          <label className="block min-w-0"><span className="mb-1.5 block text-xs font-bold">Which year are you targeting?</span><Select value={values.targetYear} onChange={(event) => setValues({ ...values, targetYear: Number(event.target.value) })} data-testid="select-onboard-year">{[currentYear, currentYear + 1, currentYear + 2, currentYear + 3].map((year) => <option key={year} value={year}>{year}</option>)}</Select></label>
          <label className="block min-w-0"><span className="mb-1.5 block text-xs font-bold">Daily study goal</span><Select value={values.dailyGoalMinutes} onChange={(event) => setValues({ ...values, dailyGoalMinutes: Number(event.target.value) })} data-testid="select-onboard-daily">{DAILY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></label>
          <label className="block min-w-0"><span className="mb-1.5 block text-xs font-bold">Weekly study goal</span><Select value={values.weeklyGoalMinutes} onChange={(event) => setValues({ ...values, weeklyGoalMinutes: Number(event.target.value) })} data-testid="select-onboard-weekly">{WEEKLY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></label>
          {error && <p className="text-xs font-semibold text-accent sm:col-span-2" data-testid="onboarding-error">{error}</p>}
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-end">
            <button type="button" onClick={finish} disabled={saving} className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-secondary disabled:opacity-50" data-testid="button-onboard-skip">Skip for now</button>
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50" data-testid="button-onboard-save">{saving ? 'Saving…' : 'Save my setup'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}