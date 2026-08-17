import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, CheckCircle2, ChevronDown, Circle, Clock3, Maximize2, Pause, PictureInPicture2, Play, Plus, RotateCcw, Timer, Trash2, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetDashboardQueryKey, getListTasksQueryKey, useCreateStudySession, useCreateTask, useDeleteTask, useGetDashboard, useGetProfile, useListTasks, useUpdateTask } from '@workspace/api-client-react';
import type { StudySessionInputSource } from '@workspace/api-client-react';
import { getExamConfig } from '@workspace/exam-config';
import { Card, ProgressBar, SectionTitle } from '@/components/ui-elements';
import { Select } from '@/components/ui/select';
import { closePipWindow, openPipWindow, pipSupported, type PipState } from '@/lib/pip-timer';
import { playReward, playTick, unlockAudio } from '@/lib/focus-audio';
import { formatMinutes } from '@/lib/format-duration';
import { clearFocusSession, focusSessionSeconds, loadFocusSession, saveFocusSession } from '@/lib/focus-session';
import { FocusMusic } from '@/components/focus-music';
import { Ring, Sparkline } from '@/components/mini-charts';

const RITUAL_STEPS = ['Put the phone somewhere inconvenient.', 'Name the one thing this block is for.', 'When the timer ends, write one sentence about what moved.'];

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

  const phaseRef = useRef(restoredSession?.phase ?? phase);
  const cycleRef = useRef(restoredSession?.cycle ?? pomoCycle);
  const anchorRef = useRef(restoredSession ? (restoredSession.running ? { epoch: restoredSession.epoch, base: restoredSession.base } : { epoch: Date.now(), base: restoredSession.base }) : { epoch: 0, base: 25 * 60 });
  const pipStateRef = useRef<PipState | null>(null);
  const taskIdRef = useRef('');
  const intervalRef = useRef<number | null>(null);
  const secondsRef = useRef(seconds);
  const modeRef = useRef(mode);
  const subjectRef = useRef(timerSubject);
  phaseRef.current = phase;
  cycleRef.current = pomoCycle;
  taskIdRef.current = timerTaskId;
  secondsRef.current = seconds;
  modeRef.current = mode;
  subjectRef.current = timerSubject;
  pipStateRef.current = { running, mode, phase, seconds, subject: timerSubject };

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
    createSession.mutate({ data: { subject: sessionSubject, minutes, source } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); callback?.(); setLogged(true); } });
  };
  const logBlock = () => {
    logSession(25, 'timer', subjectRef.current, () => {});
    completeTask();
    playReward();
    sendBlockNotification(`${subjectRef.current} — 25 minutes logged.`);
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
  const sparkValues = activity.map((day, index) => day.minutes + (index === activity.length - 1 ? liveElapsed : 0));
  const tasks = tasksQuery.data ?? [];
  const openTasks = tasks.filter((task) => task.status !== 'done');
  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const timerTaskName = openTasks.find((task) => task.id === timerTaskId)?.title;
  const midSession = mode === 'flow' ? seconds > 0 : phase !== 'focus' || seconds < 25 * 60 || pomoCycle > 1;

  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createTask.mutate({ data: { title: taskTitle.trim(), subject: taskSubject } }, { onSuccess: () => { setTaskTitle(''); queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }); } });
  };

  const toggleTask = (id: string, done: boolean) => {
    updateTask.mutate({ taskId: id, data: { status: done ? 'done' : 'todo' } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }) });
  };

  return <div className="mx-auto max-w-6xl">
    <div><p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Attention is a practice</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.04em] md:text-5xl">Study room</h1><p className="mt-3 max-w-xl text-sm text-muted-foreground">Choose the smallest useful block. Leave with proof, not pressure.</p></div>
    {logged && <div className="mt-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary" data-testid="status-session-saved"><Check size={16} /> Session saved to your pulse.</div>}
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <Card className="relative overflow-hidden bg-sidebar p-6 text-sidebar-foreground lg:sticky lg:top-6 lg:self-start md:p-10"><div className={`absolute right-[-40px] top-[-55px] h-48 w-48 rounded-full border transition-all duration-700 ${running ? 'animate-[spin_36s_linear_infinite] border-dashed border-accent/25' : 'border-accent/20'}`} /><div className={`absolute right-[-15px] top-[-30px] h-32 w-32 rounded-full border transition-all duration-700 ${running ? 'animate-[spin_24s_linear_infinite] border-dashed border-accent/25' : 'border-accent/20'}`} /><div className="relative"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-mono-custom text-[10px] uppercase tracking-[.17em] text-accent">Focus timer</p><h2 className="mt-2 font-display text-2xl font-bold">One clean block</h2></div><div className="flex items-center gap-2"><Timer className="text-accent" size={20} /><div className="flex items-center gap-1 rounded-xl border border-sidebar-foreground/15 p-1">{(['pomodoro', 'flow'] as const).map((key) => <button key={key} type="button" disabled={running} onClick={() => selectMode(key)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${mode === key ? 'bg-sidebar-foreground/15 text-sidebar-foreground' : 'text-sidebar-foreground/55 hover:text-sidebar-foreground'}`} data-testid={`tab-focus-mode-${key}`}>{key === 'pomodoro' ? 'Pomodoro' : 'Flow'}</button>)}</div></div></div><div className="relative mx-auto mt-8 w-[300px] md:w-[380px]"><div className={`pointer-events-none absolute inset-[-14px] rounded-full bg-accent blur-2xl transition-opacity duration-700 ${running ? 'pp-breathe' : 'opacity-0'}`} /><div className="relative aspect-square">{ringProgress !== null ? <Ring value={ringProgress * 100} size={300} stroke={7} trackClass="stroke-sidebar-foreground/10" arcClass="stroke-accent transition-[stroke-dasharray] duration-500 ease-linear" className="absolute inset-0 h-full w-full" /> : <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full text-accent" aria-hidden="true"><circle cx="150" cy="150" r="146" fill="none" strokeWidth="7" className="stroke-sidebar-foreground/10" /><circle cx="150" cy="150" r="146" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeDasharray="140 777" className="pp-spin-slow" /></svg>}<div className="absolute inset-0 flex flex-col items-center justify-center text-center"><p className={`font-mono-custom text-6xl tracking-[-.08em] tabular-nums md:text-7xl ${mode === 'pomodoro' && phase !== 'focus' ? 'text-sidebar-foreground/75' : 'text-sidebar-foreground'}`} data-testid="text-timer">{minutes}:{remaining}</p><p className="mt-2 text-xs text-sidebar-foreground/55">{phaseNote}</p>{mode === 'pomodoro' && phase !== 'focus' && <p className="mt-2 inline-block rounded-full bg-warm/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-warm">Break</p>}{mode === 'pomodoro' && phase === 'focus' && <div className="mt-3 flex items-center justify-center gap-1.5">{[1, 2, 3, 4].map((dot) => <span key={dot} className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${dot < cycleProgress ? 'bg-accent' : dot === cycleProgress ? 'scale-125 animate-pulse bg-accent shadow-[0_0_8px_hsl(var(--accent)/.8)]' : 'border border-sidebar-foreground/30'}`} />)}</div>}</div></div></div><div className="mx-auto mt-8 max-w-xs space-y-3"><label className="block"><span className="mb-2 block font-mono-custom text-[10px] uppercase tracking-[.15em] text-sidebar-foreground/55">Focus on</span><Select value={timerSubject} onChange={(event) => { setTimerSubject(event.target.value); if (running) persistSession(true); }} className="border-sidebar-foreground/15 bg-sidebar-foreground/10 text-sidebar-foreground" icon={<ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/55" />} data-testid="select-timer-subject">{subjects.map((value) => <option className="text-foreground" key={value}>{value}</option>)}</Select></label><label className="block"><span className="mb-2 block font-mono-custom text-[10px] uppercase tracking-[.15em] text-sidebar-foreground/55">Attached task</span><Select value={timerTaskId} disabled={running} onChange={(event) => setTimerTaskId(event.target.value)} className="border-sidebar-foreground/15 bg-sidebar-foreground/10 text-sidebar-foreground" icon={<ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/55" />} data-testid="select-timer-task"><option className="text-foreground" value="">No task</option>{openTasks.map((task) => <option className="text-foreground" key={task.id} value={task.id}>{task.title}</option>)}</Select></label></div><div className="mt-7 flex flex-wrap items-center justify-center gap-2"><button type="button" onClick={running ? pauseTimer : startTimer} className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground transition-[transform,background-color] duration-150 hover:-translate-y-0.5" data-testid="button-toggle-timer"><span className="relative inline-flex h-4 w-4 items-center justify-center"><Play size={16} fill="currentColor" className={`absolute transition-all duration-200 ease-out ${running ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`} /><Pause size={16} className={`absolute transition-all duration-200 ease-out ${running ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'}`} /></span>{running ? 'Pause' : seconds > 0 ? 'Resume' : mode === 'flow' ? 'Start flow' : 'Start focus'}</button>{seconds > 0 && !running && (mode === 'flow' || (mode === 'pomodoro' && phase === 'focus' && seconds < 25 * 60)) && <button type="button" onClick={finishTimer} disabled={createSession.isPending} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-[transform,background-color] duration-150 hover:-translate-y-0.5 disabled:opacity-60" data-testid="button-finish-timer">{createSession.isPending ? 'Saving...' : 'Finish & log'}</button>}<button type="button" onClick={resetTimer} className="rounded-xl border border-sidebar-foreground/15 p-3 text-sidebar-foreground/70 transition-all duration-150 hover:-translate-y-0.5 hover:bg-sidebar-foreground/10" aria-label="Reset timer" data-testid="button-reset-timer"><RotateCcw size={16} /></button>{pipSupported() && <button type="button" onClick={togglePip} className={`rounded-xl border p-3 transition-all duration-150 hover:-translate-y-0.5 ${pipOpen ? 'border-accent/40 bg-accent/15 text-accent' : 'border-sidebar-foreground/15 text-sidebar-foreground/70 hover:bg-sidebar-foreground/10'}`} aria-label="Float timer" title="Float timer over other windows" data-testid="button-float-timer"><PictureInPicture2 size={16} /></button>}<button type="button" onClick={fullscreen ? closeFullscreen : openFullscreen} className="rounded-xl border border-sidebar-foreground/15 p-3 text-sidebar-foreground/70 transition-all duration-150 hover:-translate-y-0.5 hover:bg-sidebar-foreground/10" aria-label="Fullscreen focus" title="Fullscreen focus view" data-testid="button-fullscreen-timer"><Maximize2 size={16} /></button></div></div></Card>
      <div className="space-y-4"><Card className="p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-7"><SectionTitle eyebrow="Manual entry" title="Already studied?" action={<Clock3 size={18} className="text-primary" />} /><p className="text-sm leading-relaxed text-muted-foreground">Log the work that happened away from the timer. It counts just as much.</p><div className="mt-4 space-y-2.5"><label className="block"><span className="mb-1.5 block text-xs font-bold">Subject</span><Select value={subject} onChange={(event) => setSubject(event.target.value)} data-testid="select-manual-subject">{subjects.map((value) => <option key={value}>{value}</option>)}</Select></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Minutes studied</span><input type="number" min="1" max="600" value={manualMinutes} onChange={(event) => setManualMinutes(event.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-primary/20" data-testid="input-manual-minutes" />{Number(manualMinutes) < 1 || Number(manualMinutes) > 600 ? <span className="mt-1 block text-[11px] font-semibold text-accent">Keep it between 1 and 600 minutes.</span> : <span className="mt-1 block text-[11px] text-muted-foreground">Between 1 and 600 minutes.</span>}</label><button type="button" disabled={createSession.isPending || Number(manualMinutes) < 1 || Number(manualMinutes) > 600} onClick={() => logSession(Number(manualMinutes), 'manual', subject, () => { setManualMinutes('45'); setJustAdded(true); window.setTimeout(() => setJustAdded(false), 2400); })} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-50" data-testid="button-log-manual">{createSession.isPending ? 'Saving...' : 'Add to today'}</button>{justAdded && <p className="pp-tab-fade flex items-center gap-1.5 text-xs font-bold text-success"><Check size={13} /> Added to today.</p>}</div></Card><FocusMusic /><Card className="p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-7"><SectionTitle eyebrow="A small ritual" title="Before you begin" action={<span className="font-mono-custom text-[10px] text-muted-foreground">{ritual.filter(Boolean).length}/3</span>} /><div className="mt-4 space-y-2">{RITUAL_STEPS.map((step, index) => { const checked = ritual[index]; return (<button key={step} type="button" onClick={() => setRitual((prev) => prev.map((value, i) => (i === index ? !value : value)))} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-[border-color,background-color,transform] duration-200 hover:-translate-y-px ${checked ? 'border-primary/25 bg-primary/5' : 'border-border/70 hover:bg-secondary/60'}`} data-testid={`ritual-step-${index + 1}`}><span className={`shrink-0 transition-colors duration-200 ${checked ? 'text-primary' : 'text-muted-foreground/50'}`}>{checked ? <CheckCircle2 size={16} /> : <Circle size={16} />}</span><span className={`transition-[color,text-decoration-color] duration-200 ${checked ? 'text-muted-foreground line-through decoration-primary/50' : 'text-foreground'}`}>{step}</span></button>); })}</div></Card></div>
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <Card className="p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-7"><SectionTitle eyebrow="Today" title="Your study bar" action={<span className="font-mono-custom text-xs text-muted-foreground">{dashboard?.todayMinutes ?? 0}/{dashboard?.todayGoalMinutes ?? 180} min</span>} /><ProgressBar value={todayPercent} color="warm" className="mt-5" /><div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{formatMinutes(dashboard?.todayMinutes ?? 0)} logged</span><span>{formatMinutes(dashboard?.todayGoalMinutes ?? 180)} goal</span></div>{activity.length ? <div className="mt-6"><p className="font-mono-custom text-[10px] uppercase tracking-[.15em] text-muted-foreground/55">Last 7 days</p><Sparkline values={sparkValues} className="mt-2 h-10 w-full text-accent" strokeClass="stroke-accent" areaClass="fill-accent/15" dotClass="fill-accent" /><div className="mt-1 flex justify-between font-mono-custom text-[8px] uppercase tracking-wide text-muted-foreground/40">{activity.map((day, index) => <span key={String(day.day)} className="group relative cursor-default">{new Date(day.day).toLocaleDateString(undefined, { weekday: 'narrow' })}<span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-background px-1.5 py-0.5 font-mono-custom text-[9px] normal-case tracking-normal text-foreground opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">{formatMinutes(day.minutes + (index === activity.length - 1 ? liveElapsed : 0))}</span></span>)}</div></div> : null}</Card>
      <Card className="p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-7">
        <SectionTitle eyebrow={`${openTasks.length} open`} title="Today's tasks" action={<span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-primary" />{tasks.length > 0 && <span className="font-mono-custom text-xs text-muted-foreground">{doneCount}/{tasks.length} done</span>}</span>} />
        <form onSubmit={addTask} className="mt-4 flex gap-2">
          <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="e.g. Finish rotational motion sheet" className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-primary/20" data-testid="input-task-title" />
          <Select value={taskSubject} onChange={(event) => setTaskSubject(event.target.value)} className="w-28 px-2 text-xs" data-testid="select-task-subject">{subjects.map((value) => <option key={value}>{value}</option>)}</Select>
          <button type="submit" disabled={createTask.isPending || !taskTitle.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-50" data-testid="button-add-task"><Plus size={14} /> Add</button>
        </form>
        {tasks.length ? <div className="mt-3 divide-y divide-border/70">{tasks.map((task) => <div key={task.id} className={`flex items-center gap-3 py-2.5 transition-opacity duration-300 ${task.status === 'done' ? 'opacity-60' : 'opacity-100'}`} data-testid={`row-task-${task.id}`}><button type="button" onClick={() => toggleTask(task.id, task.status !== 'done')} className="text-muted-foreground transition-colors hover:text-primary" aria-label="Toggle task">{task.status === 'done' ? <CheckCircle2 size={18} className="text-primary" /> : <Circle size={18} />}</button><div className="min-w-0 flex-1"><p className={`truncate text-sm transition-[color,text-decoration-color] duration-300 ${task.status === 'done' ? 'text-muted-foreground line-through decoration-primary/40' : 'font-semibold'}`}>{task.title}</p><p className="font-mono-custom text-[10px] text-muted-foreground">{task.subject}</p></div><button type="button" onClick={() => deleteTask.mutate({ taskId: task.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }) })} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-accent" aria-label="Delete task"><Trash2 size={13} /></button></div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">A task is a promise to your future self. Add one.</p>}
      </Card>
    </div>
    {midSession && <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 md:hidden" data-testid="mini-timer"><div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-sidebar/95 px-4 py-2.5 text-sidebar-foreground shadow-[0_18px_48px_hsl(186_32%_16%/.25)] backdrop-blur"><p className="font-mono-custom text-xl font-bold tabular-nums tracking-[-.04em]">{minutes}:{remaining}</p><button type="button" onClick={running ? pauseTimer : startTimer} className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-transform duration-150 hover:scale-105" aria-label={running ? 'Pause timer' : 'Resume timer'}>{running ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}</button><button type="button" onClick={resetTimer} className="flex h-9 w-9 items-center justify-center rounded-xl border border-sidebar-foreground/15 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-foreground/10" aria-label="Reset timer"><RotateCcw size={14} /></button></div></div>}
    {fullscreen && <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background px-6" data-testid="focus-fullscreen"><div className="pointer-events-none absolute inset-0"><div className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/15" /><div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/10" /><div className={`absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl ${running ? 'pp-breathe' : ''}`} /></div><div className="relative flex flex-col items-center gap-6 text-center"><div className="flex items-center gap-2"><p className="font-mono-custom text-[10px] uppercase tracking-[.2em] text-accent">{mode === 'pomodoro' ? `Pomodoro · ${phase === 'focus' ? 'Focus' : phase === 'short_break' ? 'Short break' : 'Long break'}` : 'Flow'}</p>{running && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />}</div><p className="font-mono-custom text-[8rem] leading-none tracking-[-.06em] tabular-nums text-foreground md:text-[10rem]" data-testid="text-fullscreen-timer">{minutes}:{remaining}</p><div><p className="text-sm text-muted-foreground">{phaseNote}</p><p className="mt-1 font-mono-custom text-xs text-muted-foreground/70">{timerSubject}{timerTaskId && timerTaskName ? ` · ${timerTaskName}` : ''}</p></div>{mode === 'pomodoro' && phase === 'focus' && <div className="flex items-center gap-1.5">{[1, 2, 3, 4].map((dot) => <span key={dot} className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${dot < cycleProgress ? 'bg-accent' : dot === cycleProgress ? 'scale-125 animate-pulse bg-accent shadow-[0_0_8px_hsl(var(--accent)/.8)]' : 'border border-muted-foreground/30'}`} />)}</div>}<div className="mt-4 flex flex-wrap items-center justify-center gap-3"><button type="button" onClick={running ? pauseTimer : startTimer} className="inline-flex items-center gap-2 rounded-2xl bg-accent px-8 py-4 text-base font-bold text-accent-foreground transition-[transform,background-color] duration-150 hover:-translate-y-0.5" data-testid="button-fullscreen-toggle"><span className="relative inline-flex h-[18px] w-[18px] items-center justify-center"><Play size={18} fill="currentColor" className={`absolute transition-all duration-200 ease-out ${running ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`} /><Pause size={18} className={`absolute transition-all duration-200 ease-out ${running ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'}`} /></span>{running ? 'Pause' : seconds > 0 ? 'Resume' : mode === 'flow' ? 'Start flow' : 'Start focus'}</button>{seconds > 0 && !running && (mode === 'flow' || (mode === 'pomodoro' && phase === 'focus' && seconds < 25 * 60)) && <button type="button" onClick={finishTimer} disabled={createSession.isPending} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground transition-[transform,background-color] duration-150 hover:-translate-y-0.5 disabled:opacity-60">{createSession.isPending ? 'Saving...' : 'Finish & log'}</button>}<button type="button" onClick={closeFullscreen} className="inline-flex items-center gap-2 rounded-2xl border border-border px-6 py-4 text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary" data-testid="button-fullscreen-exit"><X size={16} /> Exit</button></div><p className="mt-2 font-mono-custom text-[10px] uppercase tracking-[.2em] text-muted-foreground/50">Esc to exit</p></div></div>}
  </div>;
}
