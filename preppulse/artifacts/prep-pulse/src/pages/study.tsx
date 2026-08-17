import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CalendarDays, Check, CheckCircle2, ChevronDown, Circle, Clock3, Flame, Maximize2, Pause, Pencil, PictureInPicture2, Play, Plus, RotateCcw, SkipForward, Target, Timer, Trash2, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetDashboardQueryKey, getListTasksQueryKey, useCreateShare, useCreateStudySession, useCreateTask, useDeleteTask, useGetDashboard, useGetProfile, useListTasks, useUpdateTask, type ShareArtifact } from '@workspace/api-client-react';
import type { StudySessionInputSource, TaskUpdateStatus } from '@workspace/api-client-react';
import { getExamConfig } from '@workspace/exam-config';
import { Card, ProgressBar, SectionTitle } from '@/components/ui-elements';
import { Select } from '@/components/ui/select';
import { closePipWindow, openPipWindow, pipSupported, type PipState } from '@/lib/pip-timer';
import { playReward, playTick, unlockAudio } from '@/lib/focus-audio';
import { formatMinutes } from '@/lib/format-duration';
import { clearFocusSession, focusSessionSeconds, loadFocusSession, saveFocusSession } from '@/lib/focus-session';
import { FocusMusic } from '@/components/focus-music';
import { BarStrip, Ring } from '@/components/mini-charts';
import { SharePrompt } from '@/components/share-prompt';
import { ShareSheet } from '@/components/share-sheet';
import { sharePromptsEnabled } from '@/lib/share';
import { APP_VERSION } from '@/lib/version';

const RITUAL_STEPS = ['Phone in another room.', 'This block is for one thing.', 'When it ends, write one sentence.'];

const QUICK_MINUTES = [25, 45, 60, 90];

export default function Study() {
  const queryClient = useQueryClient();
  const createSession = useCreateStudySession();
  const dashboardQuery = useGetDashboard(undefined, { query: { queryKey: getGetDashboardQueryKey(), refetchInterval: 60_000 } });
  const tasksQuery = useListTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const profileQuery = useGetProfile();
  const track = profileQuery.data?.examTrack ?? 'jee_main';
  const subjects = [...getExamConfig(track).subjects, 'Mixed revision'];
  const [subject, setSubject] = useState(subjects[0]);
  const [manualMinutes, setManualMinutes] = useState('45');
  const [restoredSession] = useState(() => loadFocusSession());
  const [seconds, setSeconds] = useState(() => (restoredSession ? focusSessionSeconds(restoredSession) : 25 * 60));
  const [running, setRunning] = useState(() => restoredSession?.running ?? false);
  const [timerSubject, setTimerSubject] = useState(() => restoredSession?.subject ?? subjects[0]);
  const [logged, setLogged] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState('Mixed revision');
  const [mode, setMode] = useState<'pomodoro' | 'flow'>(() => restoredSession?.mode ?? (localStorage.getItem('pp-focus-mode') === 'flow' ? 'flow' : 'pomodoro'));
  const [phase, setPhase] = useState<'focus' | 'short_break' | 'long_break'>(() => restoredSession?.phase ?? 'focus');
  const [pomoCycle, setPomoCycle] = useState(() => restoredSession?.cycle ?? 1);
  const [pipOpen, setPipOpen] = useState(false);
  const [timerTaskId, setTimerTaskId] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [ritual, setRitual] = useState<boolean[]>([false, false, false]);
  const [intention, setIntention] = useState('');
  const [blockJustDone, setBlockJustDone] = useState(false);
  const [selectFlash, setSelectFlash] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('Mixed revision');
  const [promptMinutes, setPromptMinutes] = useState<number | null>(null);
  const [createdArtifact, setCreatedArtifact] = useState<ShareArtifact | null>(null);
  const createShare = useCreateShare();

  const phaseRef = useRef(restoredSession?.phase ?? phase);
  const cycleRef = useRef(restoredSession?.cycle ?? pomoCycle);
  const anchorRef = useRef(restoredSession ? (restoredSession.running ? { epoch: restoredSession.epoch, base: restoredSession.base } : { epoch: Date.now(), base: restoredSession.base }) : { epoch: 0, base: 25 * 60 });
  const pipStateRef = useRef<PipState | null>(null);
  const taskIdRef = useRef('');
  const intervalRef = useRef<number | null>(null);
  const secondsRef = useRef(seconds);
  const modeRef = useRef(mode);
  const subjectRef = useRef(timerSubject);
  const blockFlashRef = useRef<number | null>(null);
  phaseRef.current = phase;
  cycleRef.current = pomoCycle;
  taskIdRef.current = timerTaskId;
  secondsRef.current = seconds;
  modeRef.current = mode;
  subjectRef.current = timerSubject;
  pipStateRef.current = { running, mode, phase, seconds, subject: timerSubject };

  useEffect(() => () => { if (blockFlashRef.current !== null) window.clearTimeout(blockFlashRef.current); }, []);

  const persistSession = (isRunning: boolean) => {
    const { epoch, base } = anchorRef.current;
    saveFocusSession({ epoch, base, running: isRunning, mode: modeRef.current, phase: phaseRef.current, cycle: cycleRef.current, subject: subjectRef.current });
  };

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const { epoch, base } = anchorRef.current;
      const delta = Math.floor((Date.now() - epoch) / 1000);
      if (modeRef.current === 'flow') {
        setSeconds(base + delta);
        return;
      }
      const next = base - delta;
      if (next > 0) {
        setSeconds(next);
        return;
      }
      setSeconds(0);
      if (phaseRef.current === 'focus') {
        const cycle = cycleRef.current + 1;
        cycleRef.current = cycle;
        const nextPhase = cycle % 4 === 0 ? 'long_break' : 'short_break';
        phaseRef.current = nextPhase;
        const target = nextPhase === 'long_break' ? 15 * 60 : 5 * 60;
        setPomoCycle(cycle);
        setPhase(nextPhase);
        anchorRef.current = { epoch: Date.now(), base: target };
        setSeconds(target);
        persistSession(true);
        logBlock();
      } else {
        phaseRef.current = 'focus';
        setPhase('focus');
        anchorRef.current = { epoch: Date.now(), base: 25 * 60 };
        setSeconds(25 * 60);
        persistSession(true);
        playReward();
      }
    };
    if (intervalRef.current !== null) {
      console.warn('[focus-timer] stray interval detected; clearing before re-arm');
      window.clearInterval(intervalRef.current);
    }
    const interval = window.setInterval(() => {
      if (modeRef.current === 'flow' || phaseRef.current === 'focus') playTick();
      tick();
    }, 1000);
    intervalRef.current = interval;
    const snap = () => tick();
    document.addEventListener('visibilitychange', snap);
    window.addEventListener('focus', snap);
    return () => {
      window.clearInterval(interval);
      intervalRef.current = null;
      document.removeEventListener('visibilitychange', snap);
      window.removeEventListener('focus', snap);
    };
  }, [running]);

  useEffect(() => { localStorage.setItem('pp-focus-mode', mode); }, [mode]);

  const maybeRequestNotify = () => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    } catch {
      return;
    }
  };
  const sendBlockNotification = (body: string) => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Focus block complete', { body, tag: 'preppulse-focus' });
      }
    } catch {
      return;
    }
  };

  const logSession = (minutes: number, source: StudySessionInputSource, sessionSubject: string, callback?: () => void) => {
    createSession.mutate({ data: { subject: sessionSubject, minutes, source } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); callback?.(); setLogged(true); if (minutes >= 25 && sharePromptsEnabled()) setPromptMinutes(minutes); } });
  };
  const startSharing = () => {
    if (!promptMinutes) return;
    setPromptMinutes(null);
    createShare.mutate(
      { data: { visibility: 'public', appVersion: APP_VERSION.replace('v', ''), tz: Intl.DateTimeFormat().resolvedOptions().timeZone } },
      { onSuccess: (artifact) => setCreatedArtifact(artifact) },
    );
  };
  const logBlock = () => {
    logSession(25, 'timer', subjectRef.current, () => {});
    completeTask();
    playReward();
    sendBlockNotification(`${subjectRef.current} — 25 minutes logged.`);
    setBlockJustDone(true);
    if (blockFlashRef.current !== null) window.clearTimeout(blockFlashRef.current);
    blockFlashRef.current = window.setTimeout(() => setBlockJustDone(false), 3400);
  };
  const startTimer = () => {
    setLogged(false);
    anchorRef.current = { epoch: Date.now(), base: secondsRef.current };
    setRunning(true);
    persistSession(true);
    unlockAudio();
    maybeRequestNotify();
    if (taskIdRef.current) {
      updateTask.mutate({ taskId: taskIdRef.current, data: { status: 'in_progress' } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }) });
    }
  };
  const completeTask = () => {
    if (!taskIdRef.current) return;
    const id = taskIdRef.current;
    taskIdRef.current = '';
    updateTask.mutate({ taskId: id, data: { status: 'done' } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }) });
    setTimerTaskId('');
  };
  const pauseTimer = () => {
    const { epoch, base } = anchorRef.current;
    const delta = Math.floor((Date.now() - epoch) / 1000);
    const current = modeRef.current === 'flow' ? base + delta : Math.max(0, base - delta);
    setSeconds(current);
    anchorRef.current = { epoch: Date.now(), base: current };
    setRunning(false);
    persistSession(false);
  };
  const abandonTask = () => {
    if (!taskIdRef.current) return;
    const id = taskIdRef.current;
    taskIdRef.current = '';
    updateTask.mutate({ taskId: id, data: { status: 'todo' } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }) });
    setTimerTaskId('');
  };
  const resetTimer = () => {
    const hadProgress = running || (modeRef.current === 'flow' ? secondsRef.current > 0 : phaseRef.current !== 'focus' || cycleRef.current > 1 || secondsRef.current < 25 * 60);
    if (hadProgress) {
      console.warn('[focus-timer] reset discarded an in-flight session', { mode: modeRef.current, phase: phaseRef.current, seconds: secondsRef.current, cycle: cycleRef.current, running });
    }
    setRunning(false);
    setLogged(false);
    if (pipOpen) {
      closePipWindow();
      setPipOpen(false);
    }
    cycleRef.current = 1;
    phaseRef.current = 'focus';
    setPomoCycle(1);
    setPhase('focus');
    setSeconds(modeRef.current === 'pomodoro' ? 25 * 60 : 0);
    clearFocusSession();
    abandonTask();
  };
  const skipTimer = () => {
    if (mode !== 'pomodoro') return;
    const cycle = cycleRef.current + 1;
    cycleRef.current = cycle;
    const nextPhase = cycle % 4 === 0 ? 'long_break' : 'short_break';
    phaseRef.current = nextPhase;
    setPomoCycle(cycle);
    setPhase(nextPhase);
    const target = nextPhase === 'long_break' ? 15 * 60 : 5 * 60;
    anchorRef.current = { epoch: Date.now(), base: target };
    setSeconds(target);
    persistSession(running);
  };
  const finishTimer = () => {
    const secs = secondsRef.current;
    const elapsed = Math.max(1, Math.round(modeRef.current === 'flow' ? secs / 60 : (25 * 60 - secs) / 60));
    const finalSubject = subjectRef.current;
    logSession(elapsed, 'timer', finalSubject, resetTimer);
    completeTask();
    playReward();
    sendBlockNotification(`${finalSubject} — ${elapsed} ${elapsed === 1 ? 'minute' : 'minutes'} logged.`);
  };
  const selectMode = (next: 'pomodoro' | 'flow') => {
    setMode(next);
    setRunning(false);
    setLogged(false);
    if (pipOpen) {
      closePipWindow();
      setPipOpen(false);
    }
    cycleRef.current = 1;
    phaseRef.current = 'focus';
    setPomoCycle(1);
    setPhase('focus');
    setSeconds(next === 'pomodoro' ? 25 * 60 : 0);
    clearFocusSession();
    unlockAudio();
  };
  const togglePip = () => {
    if (pipOpen) {
      closePipWindow();
      setPipOpen(false);
      return;
    }
    void openPipWindow({
      getState: () => pipStateRef.current,
      onPause: pauseTimer,
      onResume: startTimer,
      onStop: finishTimer,
      onClose: () => setPipOpen(false),
    }).then((win) => {
      if (win) setPipOpen(true);
    });
  };

  useEffect(() => {
    if (pipOpen && !running && seconds === 0) {
      closePipWindow();
      setPipOpen(false);
    }
  }, [pipOpen, running, seconds]);

  const openFullscreen = () => {
    setFullscreen(true);
    unlockAudio();
    if (document.fullscreenElement) return;
    try { void document.documentElement.requestFullscreen().catch(() => { return; }); } catch { return; }
  };
  const closeFullscreen = () => {
    setFullscreen(false);
    if (!document.fullscreenElement) return;
    try { void document.exitFullscreen().catch(() => { return; }); } catch { return; }
  };

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  useEffect(() => () => closePipWindow(), []);

  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remaining = (seconds % 60).toString().padStart(2, '0');
  const cycleProgress = ((pomoCycle - 1) % 4) + 1;
  const phaseNote = mode === 'pomodoro' ? (phase === 'focus' ? `Focus ${cycleProgress}/4 · 25 min` : phase === 'short_break' ? 'Short break · 5 min' : 'Long break · 15 min') : 'No limit — stop when the flow breaks';
  const ringTarget = mode === 'pomodoro' ? (phase === 'focus' ? 25 * 60 : phase === 'short_break' ? 5 * 60 : 15 * 60) : 0;
  const ringProgress = mode === 'pomodoro' ? Math.min(1, Math.max(0, (ringTarget - seconds) / ringTarget)) : null;
  const dashboard = dashboardQuery.data;
  const todayPercent = dashboard?.todayGoalMinutes ? (dashboard.todayMinutes / dashboard.todayGoalMinutes) * 100 : 0;
  const activity = dashboard?.activity7d ?? [];
  const liveElapsed = mode === 'flow' ? Math.floor(seconds / 60) : running && phase === 'focus' ? Math.max(0, 25 * 60 - seconds) : 0;
  const weeklyAvg = activity.length ? Math.round(activity.reduce((sum, day) => sum + day.minutes, 0) / 7) : 0;
  const bestDayIndex = activity.length ? activity.reduce((best, day, index, arr) => (day.minutes > arr[best].minutes ? index : best), 0) : -1;
  const bestDayLabel = bestDayIndex >= 0 ? `${new Date(activity[bestDayIndex].day).toLocaleDateString(undefined, { weekday: 'short' })} · ${formatMinutes(activity[bestDayIndex].minutes)}` : '';
  const tasks = tasksQuery.data ?? [];
  const openTasks = tasks.filter((task) => task.status !== 'done');
  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const timerTaskName = openTasks.find((task) => task.id === timerTaskId)?.title;
  const midSession = mode === 'flow' ? seconds > 0 : phase !== 'focus' || seconds < 25 * 60 || pomoCycle > 1;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });

  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createTask.mutate({ data: { title: taskTitle.trim(), subject: taskSubject } }, { onSuccess: () => { setTaskTitle(''); queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }); } });
  };

  const toggleTask = (id: string, done: boolean) => {
    updateTask.mutate({ taskId: id, data: { status: done ? 'done' : 'todo' } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }) });
  };

  const startEditTask = (task: { id: string; title: string; subject: string }) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditSubject(task.subject);
  };
  const saveEditTask = (id: string, status: TaskUpdateStatus) => {
    const title = editTitle.trim();
    if (!title) return;
    updateTask.mutate({ taskId: id, data: { title, subject: editSubject, status } }, { onSuccess: () => { setEditingTaskId(null); queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }); } });
  };
  const cancelEditTask = () => setEditingTaskId(null);
  const attachTaskToTimer = (id: string, taskSubject: string) => {
    setTimerTaskId(id);
    if (!running) setTimerSubject(taskSubject);
    setLogged(false);
  };
  const flashSelect = () => {
    setSelectFlash(true);
    window.setTimeout(() => setSelectFlash(false), 380);
  };

  const ring = (size: number, track: string, arc: string) => ringProgress !== null
    ? <Ring value={ringProgress * 100} size={size} stroke={6} trackClass={track} arcClass={arc} className="absolute inset-0 h-full w-full" />
    : <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full text-accent" aria-hidden="true"><circle cx="100" cy="100" r="97" fill="none" strokeWidth="6" className={track} /><circle cx="100" cy="100" r="97" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray="92 517" className="pp-spin-slow" /></svg>;

  const chip = (icon: ReactNode, label: string) => (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1.5 text-xs font-bold text-foreground/85 shadow-[0_4px_12px_hsl(186_32%_16%/.04)]">
      {icon}{label}
    </span>
  );

  return <div className="mx-auto max-w-[1400px]">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">{dateLabel}</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.04em] md:text-5xl">Study room</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">Choose the smallest useful block. Leave with proof, not pressure.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {chip(<Flame size={13} className="text-warm" />, `${dashboard?.streak ?? 0} day streak`)}
        {chip(<Timer size={13} className="text-accent" />, `${dashboard?.todayMinutes ?? 0}/${dashboard?.todayGoalMinutes ?? 200} min today`)}
        {chip(<Target size={13} className="text-primary" />, `week ${dashboard?.weeklyMinutes ?? 0}/${dashboard?.weeklyGoalMinutes ?? 1000}`)}
        {chip(<CalendarDays size={13} className="text-muted-foreground" />, `${dashboard?.daysLeft ?? 0} days to exam`)}
      </div>
    </div>
    {logged && <div className="mt-5 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary" data-testid="status-session-saved"><Check size={16} /> Session saved to your pulse.</div>}
    <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_352px]">
      <Card className="relative overflow-hidden bg-sidebar p-5 text-sidebar-foreground lg:sticky lg:top-6 md:p-7"><div className={`absolute right-[-30px] top-[-42px] h-36 w-36 rounded-full border transition-all duration-700 ${running ? 'animate-[spin_36s_linear_infinite] border-dashed border-accent/25' : 'border-accent/20'}`} /><div className={`absolute right-[-8px] top-[-20px] h-24 w-24 rounded-full border transition-all duration-700 ${running ? 'animate-[spin_24s_linear_infinite] border-dashed border-accent/25' : 'border-accent/20'}`} /><div className="relative"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-mono-custom text-[10px] uppercase tracking-[.17em] text-accent">Focus timer</p><h2 className="mt-1.5 font-display text-2xl font-bold">One clean block</h2></div><div className="flex items-center gap-2"><Timer className="text-accent" size={20} /><div className="flex items-center gap-1 rounded-xl border border-sidebar-foreground/15 p-1">{(['pomodoro', 'flow'] as const).map((key) => <button key={key} type="button" disabled={running} onClick={() => selectMode(key)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${mode === key ? 'bg-sidebar-foreground/15 text-sidebar-foreground' : 'text-sidebar-foreground/55 hover:text-sidebar-foreground'}`} data-testid={`tab-focus-mode-${key}`}>{key === 'pomodoro' ? 'Pomodoro' : 'Flow'}</button>)}</div></div></div><div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center md:gap-8"><div className="relative w-[196px] shrink-0 md:w-[212px]"><div className={`pointer-events-none absolute inset-[-12px] rounded-full bg-accent blur-2xl transition-opacity duration-700 ${running ? 'pp-breathe' : 'opacity-0'}`} /><div className="relative aspect-square">{ring(200, 'stroke-sidebar-foreground/10', 'stroke-accent transition-[stroke-dasharray] duration-500 ease-linear')}<div className="absolute inset-0 flex flex-col items-center justify-center text-center"><p className={`font-mono-custom text-[2.6rem] tracking-[-.08em] tabular-nums md:text-6xl ${mode === 'pomodoro' && phase !== 'focus' ? 'text-sidebar-foreground/75' : 'text-sidebar-foreground'}`} data-testid="text-timer">{minutes}:{remaining}</p><p className="mt-1 text-[11px] text-sidebar-foreground/55">{mode === 'pomodoro' ? (phase === 'focus' ? 'Focus' : phase === 'short_break' ? 'Short break' : 'Long break') : 'Flow'}</p>{mode === 'pomodoro' && phase === 'focus' && <div className="mt-2.5 flex items-center justify-center gap-1.5">{[1, 2, 3, 4].map((dot) => <span key={dot} className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${dot < cycleProgress ? 'bg-accent' : dot === cycleProgress ? 'scale-125 animate-pulse bg-accent shadow-[0_0_8px_hsl(var(--accent)/.8)]' : 'border border-sidebar-foreground/30'}`} />)}</div>}</div></div></div><div className="flex min-w-0 flex-1 flex-col gap-3.5"><div className="flex flex-wrap items-center gap-2">{mode === 'pomodoro' && <span className="inline-flex items-center gap-1.5 rounded-full bg-sidebar-foreground/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-sidebar-foreground/80">Session {cycleProgress}/4</span>}{mode === 'pomodoro' && phase !== 'focus' && <span className="inline-flex items-center gap-1.5 rounded-full bg-warm/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-warm">Break</span>}{running && <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-success"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />Live</span>}{blockJustDone && <span className="pp-tab-fade inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-accent"><Check size={11} /> Block logged +25 min</span>}</div>{intention ? <p className="flex min-w-0 items-center gap-2 truncate rounded-xl border border-sidebar-foreground/10 bg-sidebar-foreground/5 px-3 py-2 text-xs text-sidebar-foreground/85" data-testid="timer-intention"><Target size={13} className="shrink-0 text-accent" /><span className="truncate">{intention}</span></p> : null}<div className={`grid gap-3 rounded-2xl transition-shadow sm:grid-cols-2 ${selectFlash ? 'ring-2 ring-accent/30' : ''}`}><label className="block"><span className="mb-1.5 block font-mono-custom text-[10px] uppercase tracking-[.15em] text-sidebar-foreground/55">Focus on</span><Select value={timerSubject} onChange={(event) => { setTimerSubject(event.target.value); flashSelect(); if (running) persistSession(true); }} className="border-sidebar-foreground/15 bg-sidebar-foreground/10 text-sidebar-foreground" icon={<ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/55" />} data-testid="select-timer-subject">{subjects.map((value) => <option className="text-foreground" key={value}>{value}</option>)}</Select></label><label className="block"><span className="mb-1.5 block font-mono-custom text-[10px] uppercase tracking-[.15em] text-sidebar-foreground/55">Attached task</span><Select value={timerTaskId} disabled={running} onChange={(event) => { setTimerTaskId(event.target.value); flashSelect(); }} className="border-sidebar-foreground/15 bg-sidebar-foreground/10 text-sidebar-foreground" icon={<ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/55" />} data-testid="select-timer-task"><option className="text-foreground" value="">No task</option>{openTasks.map((task) => <option className="text-foreground" key={task.id} value={task.id}>{task.title}</option>)}</Select></label></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={running ? pauseTimer : startTimer} className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground transition-[transform,background-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_hsl(var(--accent)/.35)]" data-testid="button-toggle-timer"><span className="relative inline-flex h-4 w-4 items-center justify-center"><Play size={16} fill="currentColor" className={`absolute transition-all duration-200 ease-out ${running ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`} /><Pause size={16} className={`absolute transition-all duration-200 ease-out ${running ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'}`} /></span>{running ? 'Pause' : seconds > 0 ? 'Resume' : mode === 'flow' ? 'Start flow' : 'Start focus'}</button>{seconds > 0 && !running && (mode === 'flow' || (mode === 'pomodoro' && phase === 'focus' && seconds < 25 * 60)) && <button type="button" onClick={finishTimer} disabled={createSession.isPending} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-[transform,background-color] duration-150 hover:-translate-y-0.5 disabled:opacity-60" data-testid="button-finish-timer">{createSession.isPending ? 'Saving...' : 'Finish & log'}</button>}<button type="button" onClick={resetTimer} className="rounded-xl border border-sidebar-foreground/15 p-3 text-sidebar-foreground/70 transition-all duration-150 hover:-translate-y-0.5 hover:bg-sidebar-foreground/10" aria-label="Reset timer" data-testid="button-reset-timer"><RotateCcw size={16} /></button>{mode === 'pomodoro' && <button type="button" onClick={skipTimer} className="rounded-xl border border-sidebar-foreground/15 p-3 text-sidebar-foreground/70 transition-all duration-150 hover:-translate-y-0.5 hover:bg-sidebar-foreground/10" aria-label="Skip to next phase" title="Skip to the next phase" data-testid="button-skip-timer"><SkipForward size={16} /></button>}{pipSupported() && <button type="button" onClick={togglePip} className={`rounded-xl border p-3 transition-all duration-150 hover:-translate-y-0.5 ${pipOpen ? 'border-accent/40 bg-accent/15 text-accent' : 'border-sidebar-foreground/15 text-sidebar-foreground/70 hover:bg-sidebar-foreground/10'}`} aria-label="Float timer" title="Float timer over other windows" data-testid="button-float-timer"><PictureInPicture2 size={16} /></button>}<button type="button" onClick={fullscreen ? closeFullscreen : openFullscreen} className="rounded-xl border border-sidebar-foreground/15 p-3 text-sidebar-foreground/70 transition-all duration-150 hover:-translate-y-0.5 hover:bg-sidebar-foreground/10" aria-label="Fullscreen focus" title="Fullscreen focus view" data-testid="button-fullscreen-timer"><Maximize2 size={16} /></button></div></div></div></div></Card>
      <div className="flex min-w-0 flex-col gap-5">
        <Card className="p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-5"><SectionTitle eyebrow="Today" title="Your progress" action={<span className="font-mono-custom text-xs font-bold text-primary">{Math.round(todayPercent)}%</span>} /><div className="flex items-end justify-between"><p className="font-display text-3xl font-bold tracking-tight">{dashboard?.todayMinutes ?? 0}<span className="text-base font-semibold text-muted-foreground"> / {dashboard?.todayGoalMinutes ?? 200} min</span></p><p className="font-mono-custom text-[10px] uppercase tracking-[.15em] text-muted-foreground/60">{formatMinutes(dashboard?.todayMinutes ?? 0)} logged</p></div><ProgressBar value={todayPercent} color="warm" className="mt-3" /><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-border/70 bg-secondary/40 px-3 py-2"><p className="flex items-center gap-1.5 font-mono-custom text-[10px] uppercase tracking-[.12em] text-muted-foreground"><Flame size={11} className="text-warm" />Streak</p><p className="mt-1 font-display text-lg font-bold">{dashboard?.streak ?? 0} days</p></div><div className="rounded-xl border border-border/70 bg-secondary/40 px-3 py-2"><p className="flex items-center gap-1.5 font-mono-custom text-[10px] uppercase tracking-[.12em] text-muted-foreground"><Target size={11} className="text-primary" />Week</p><p className="mt-1 font-display text-lg font-bold">{dashboard?.weeklyMinutes ?? 0}<span className="text-xs font-semibold text-muted-foreground"> / {dashboard?.weeklyGoalMinutes ?? 1000}</span></p></div></div></Card>
        <Card className="p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-5"><SectionTitle eyebrow="Current focus" title="This block" action={running ? <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-success"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />Live</span> : <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Standby</span>} /><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-accent/25 bg-accent/12 px-3 py-1 text-xs font-bold text-accent">{timerSubject}</span><span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">{mode === 'pomodoro' ? (phase === 'focus' ? 'Focus' : 'Break') : 'Flow'}</span></div><div className="mt-3 flex items-center gap-2 text-sm"><Clock3 size={14} className="shrink-0 text-muted-foreground/70" /><span className="min-w-0 truncate font-semibold">{timerTaskName ?? 'No task attached'}</span></div><div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Timer size={14} className="shrink-0 text-muted-foreground/70" /><span>{formatMinutes(Math.max(1, Math.ceil(seconds / 60)))} left in this block</span></div>{intention ? <p className="mt-3 flex items-start gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-foreground/80"><Target size={12} className="mt-0.5 shrink-0 text-primary" /><span className="min-w-0">{intention}</span></p> : <p className="mt-3 text-[11px] text-muted-foreground/70">Set a session intention in the ritual card below.</p>}</Card>
        <Card className="p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-5"><SectionTitle eyebrow="Consistency" title="Last 7 days" action={bestDayLabel ? <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Best {bestDayLabel}</span> : undefined} />{activity.length ? <><BarStrip values={activity.map((day) => day.minutes)} className="mt-4 h-16 w-full" barClass="bg-primary/15" lastBarClass="bg-accent" /><div className="mt-1.5 flex justify-between font-mono-custom text-[8px] uppercase tracking-wide text-muted-foreground/40">{activity.map((day, index) => <span key={String(day.day)} className="group relative cursor-default">{new Date(day.day).toLocaleDateString(undefined, { weekday: 'narrow' })}<span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-background px-1.5 py-0.5 font-mono-custom text-[9px] normal-case tracking-normal text-foreground opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">{formatMinutes(day.minutes + (index === activity.length - 1 ? liveElapsed : 0))}</span></span>)}</div><div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground"><span>{formatMinutes(weeklyAvg)} avg / day</span><span>{formatMinutes(dashboard?.weeklyMinutes ?? 0)} this week</span><span className="font-semibold text-primary">{formatMinutes(dashboard?.weeklyGoalMinutes ?? 1000)} goal</span></div></> : <p className="py-6 text-center text-xs text-muted-foreground">No sessions yet this week — the first block is the hardest.</p>}</Card>
      </div>
    </div>
    <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <Card className="p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-5"><SectionTitle eyebrow="Log session" title="Already studied?" action={<Clock3 size={18} className="text-primary" />} /><p className="text-sm leading-relaxed text-muted-foreground">Work that happened away from the timer counts just as much.</p><div className="mt-3 flex flex-wrap items-center gap-1.5">{QUICK_MINUTES.map((value) => <button key={value} type="button" onClick={() => setManualMinutes(String(value))} className={`rounded-full border px-3 py-1 text-xs font-bold transition-all duration-150 ${Number(manualMinutes) === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border/80 text-muted-foreground hover:border-primary/40 hover:text-foreground'}`} data-testid={`quick-minutes-${value}`}>{value}m</button>)}</div><div className="mt-4 space-y-2.5"><label className="block"><span className="mb-1.5 block text-xs font-bold">Subject</span><Select value={subject} onChange={(event) => setSubject(event.target.value)} data-testid="select-manual-subject">{subjects.map((value) => <option key={value}>{value}</option>)}</Select></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Minutes studied</span><input type="number" min="1" max="600" value={manualMinutes} onChange={(event) => setManualMinutes(event.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-primary/20" data-testid="input-manual-minutes" />{Number(manualMinutes) < 1 || Number(manualMinutes) > 600 ? <span className="mt-1 block text-[11px] font-semibold text-accent">Keep it between 1 and 600 minutes.</span> : <span className="mt-1 block text-[11px] text-muted-foreground">Between 1 and 600 minutes.</span>}</label><button type="button" disabled={createSession.isPending || Number(manualMinutes) < 1 || Number(manualMinutes) > 600} onClick={() => logSession(Number(manualMinutes), 'manual', subject, () => { setManualMinutes('45'); setJustAdded(true); window.setTimeout(() => setJustAdded(false), 2400); })} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-50" data-testid="button-log-manual">{createSession.isPending ? 'Saving...' : 'Add to today'}</button>{justAdded && <p className="pp-tab-fade flex items-center gap-1.5 text-xs font-bold text-success"><Check size={13} /> Added to today.</p>}</div></Card>
      <FocusMusic />
      <Card className="p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-5"><SectionTitle eyebrow="Ritual" title="Before you begin" action={<span className="font-mono-custom text-[10px] text-muted-foreground">{ritual.filter(Boolean).length}/3</span>} /><label className="block"><span className="mb-1.5 block text-xs font-bold">What are you finishing this session?</span><input value={intention} onChange={(event) => setIntention(event.target.value)} placeholder="e.g. Conquer rotational motion" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-3 focus:ring-primary/20" data-testid="ritual-intention" /></label><div className="mt-3 space-y-1.5">{RITUAL_STEPS.map((step, index) => { const checked = ritual[index]; return (<button key={step} type="button" onClick={() => setRitual((prev) => prev.map((value, i) => (i === index ? !value : value)))} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-[border-color,background-color,transform] duration-200 hover:-translate-y-px ${checked ? 'border-primary/25 bg-primary/5' : 'border-border/70 hover:bg-secondary/60'}`} data-testid={`ritual-step-${index + 1}`}><span className={`shrink-0 transition-colors duration-200 ${checked ? 'text-primary' : 'text-muted-foreground/50'}`}>{checked ? <CheckCircle2 size={15} /> : <Circle size={15} />}</span><span className={`transition-[color,text-decoration-color] duration-200 ${checked ? 'text-muted-foreground line-through decoration-primary/50' : 'text-foreground'}`}>{step}</span></button>); })}</div></Card>
    </div>
    <Card className="mt-5 p-4 md:p-5">
      <SectionTitle eyebrow={`${openTasks.length} open`} title="Today's tasks" action={<span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-primary" />{tasks.length > 0 && <span className="font-mono-custom text-xs text-muted-foreground">{doneCount}/{tasks.length} done</span>}</span>} />
      <form onSubmit={addTask} className="flex gap-2">
        <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="e.g. Finish rotational motion sheet" className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-3 focus:ring-primary/20" data-testid="input-task-title" />
        <Select value={taskSubject} onChange={(event) => setTaskSubject(event.target.value)} className="w-28 px-2 text-xs" data-testid="select-task-subject">{subjects.map((value) => <option key={value}>{value}</option>)}</Select>
        <button type="submit" disabled={createTask.isPending || !taskTitle.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-50" data-testid="button-add-task"><Plus size={14} /> Add</button>
      </form>
      {tasks.length ? <div className="mt-3 divide-y divide-border/60">{tasks.map((task) => {
        if (editingTaskId === task.id) {
          return <div key={task.id} className="flex items-center gap-2 py-2" data-testid={`row-edit-task-${task.id}`}><input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} autoFocus className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-primary/20" data-testid="input-edit-task-title" /><Select value={editSubject} onChange={(event) => setEditSubject(event.target.value)} className="w-28 px-2 text-xs" data-testid="select-edit-task-subject">{subjects.map((value) => <option key={value}>{value}</option>)}</Select><button type="button" onClick={() => saveEditTask(task.id, task.status)} disabled={!editTitle.trim() || updateTask.isPending} className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50" data-testid={`button-save-task-${task.id}`}><Check size={13} /></button><button type="button" onClick={cancelEditTask} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Cancel edit" data-testid={`button-cancel-task-${task.id}`}><X size={14} /></button></div>;
        }
        return <div key={task.id} className={`flex items-center gap-3 py-2.5 transition-opacity duration-300 ${task.status === 'done' ? 'opacity-60' : 'opacity-100'}`} data-testid={`row-task-${task.id}`}><button type="button" onClick={() => toggleTask(task.id, task.status !== 'done')} className="text-muted-foreground transition-colors hover:text-primary" aria-label="Toggle task">{task.status === 'done' ? <CheckCircle2 size={18} className="text-primary" /> : <Circle size={18} />}</button><div className="min-w-0 flex-1"><p className={`truncate text-sm transition-[color,text-decoration-color] duration-300 ${task.status === 'done' ? 'text-muted-foreground line-through decoration-primary/40' : 'font-semibold'}`}>{task.title}</p><p className="font-mono-custom text-[10px] text-muted-foreground">{task.subject}</p></div>{task.status !== 'done' && <button type="button" onClick={() => attachTaskToTimer(task.id, task.subject)} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-colors ${timerTaskId === task.id ? 'bg-accent text-accent-foreground' : 'border border-border/80 text-muted-foreground hover:border-accent/40 hover:text-foreground'}`} aria-label="Start focus session on this task" title="Attach to the focus timer" data-testid={`button-focus-task-${task.id}`}><Play size={10} fill="currentColor" /> Focus</button>}<button type="button" onClick={() => startEditTask(task)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Edit task" data-testid={`button-edit-task-${task.id}`}><Pencil size={13} /></button><button type="button" onClick={() => deleteTask.mutate({ taskId: task.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }) })} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-accent" aria-label="Delete task" data-testid={`button-delete-task-${task.id}`}><Trash2 size={13} /></button></div>;
      })}</div> : <p className="mt-4 text-sm text-muted-foreground">A task is a promise to your future self. Add one.</p>}
    </Card>
    {midSession && <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 md:hidden" data-testid="mini-timer"><div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-sidebar/95 px-4 py-2.5 text-sidebar-foreground shadow-[0_18px_48px_hsl(186_32%_16%/.25)] backdrop-blur"><p className="font-mono-custom text-xl font-bold tabular-nums tracking-[-.04em]">{minutes}:{remaining}</p><button type="button" onClick={running ? pauseTimer : startTimer} className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-transform duration-150 hover:scale-105" aria-label={running ? 'Pause timer' : 'Resume timer'}>{running ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}</button><button type="button" onClick={resetTimer} className="flex h-9 w-9 items-center justify-center rounded-xl border border-sidebar-foreground/15 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-foreground/10" aria-label="Reset timer"><RotateCcw size={14} /></button></div></div>}
    {promptMinutes !== null && !createdArtifact && <SharePrompt minutes={promptMinutes} onShare={startSharing} onDismiss={() => setPromptMinutes(null)} />}
    {createdArtifact && <ShareSheet artifact={createdArtifact} onClose={() => setCreatedArtifact(null)} />}
    {fullscreen && <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background px-6" data-testid="focus-fullscreen"><div className="pointer-events-none absolute inset-0"><div className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/15" /><div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/10" /><div className={`absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl ${running ? 'pp-breathe' : ''}`} /></div><div className="relative flex flex-col items-center gap-6 text-center"><div className="flex items-center gap-2"><p className="font-mono-custom text-[10px] uppercase tracking-[.2em] text-accent">{mode === 'pomodoro' ? `Pomodoro · ${phase === 'focus' ? 'Focus' : phase === 'short_break' ? 'Short break' : 'Long break'}` : 'Flow'}</p>{running && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />}</div><p className="font-mono-custom text-[8rem] leading-none tracking-[-.06em] tabular-nums text-foreground md:text-[10rem]" data-testid="text-fullscreen-timer">{minutes}:{remaining}</p><div><p className="text-sm text-muted-foreground">{phaseNote}</p><p className="mt-1 font-mono-custom text-xs text-muted-foreground/70">{timerSubject}{timerTaskId && timerTaskName ? ` · ${timerTaskName}` : ''}</p></div>{mode === 'pomodoro' && phase === 'focus' && <div className="flex items-center gap-1.5">{[1, 2, 3, 4].map((dot) => <span key={dot} className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${dot < cycleProgress ? 'bg-accent' : dot === cycleProgress ? 'scale-125 animate-pulse bg-accent shadow-[0_0_8px_hsl(var(--accent)/.8)]' : 'border border-muted-foreground/30'}`} />)}</div>}<div className="mt-4 flex flex-wrap items-center justify-center gap-3"><button type="button" onClick={running ? pauseTimer : startTimer} className="inline-flex items-center gap-2 rounded-2xl bg-accent px-8 py-4 text-base font-bold text-accent-foreground transition-[transform,background-color] duration-150 hover:-translate-y-0.5" data-testid="button-fullscreen-toggle"><span className="relative inline-flex h-[18px] w-[18px] items-center justify-center"><Play size={18} fill="currentColor" className={`absolute transition-all duration-200 ease-out ${running ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`} /><Pause size={18} className={`absolute transition-all duration-200 ease-out ${running ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'}`} /></span>{running ? 'Pause' : seconds > 0 ? 'Resume' : mode === 'flow' ? 'Start flow' : 'Start focus'}</button>{seconds > 0 && !running && (mode === 'flow' || (mode === 'pomodoro' && phase === 'focus' && seconds < 25 * 60)) && <button type="button" onClick={finishTimer} disabled={createSession.isPending} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground transition-[transform,background-color] duration-150 hover:-translate-y-0.5 disabled:opacity-60">{createSession.isPending ? 'Saving...' : 'Finish & log'}</button>}{mode === 'pomodoro' && <button type="button" onClick={skipTimer} className="inline-flex items-center gap-2 rounded-2xl border border-border px-6 py-4 text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary" data-testid="button-fullscreen-skip"><SkipForward size={16} /> Skip</button>}<button type="button" onClick={closeFullscreen} className="inline-flex items-center gap-2 rounded-2xl border border-border px-6 py-4 text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary" data-testid="button-fullscreen-exit"><X size={16} /> Exit</button></div><p className="mt-2 font-mono-custom text-[10px] uppercase tracking-[.2em] text-muted-foreground/50">Esc to exit</p></div></div>}
  </div>;
}
