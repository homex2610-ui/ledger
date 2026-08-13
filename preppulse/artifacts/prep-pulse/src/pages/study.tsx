import { useEffect, useState, type FormEvent } from 'react';
import { Check, CheckCircle2, Circle, Clock3, Pause, Play, Plus, RotateCcw, Timer, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetDashboardQueryKey, getListTasksQueryKey, useCreateStudySession, useCreateTask, useDeleteTask, useGetDashboard, useListTasks, useUpdateTask } from '@workspace/api-client-react';
import type { StudySessionInputSource } from '@workspace/api-client-react';
import { Card, ProgressBar, SectionTitle } from '@/components/ui-elements';

const subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Mixed revision'];

export default function Study() {
  const queryClient = useQueryClient();
  const createSession = useCreateStudySession();
  const dashboardQuery = useGetDashboard();
  const tasksQuery = useListTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [subject, setSubject] = useState('Physics');
  const [manualMinutes, setManualMinutes] = useState('45');
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [timerSubject, setTimerSubject] = useState('Physics');
  const [logged, setLogged] = useState(false);
  const [autoFinished, setAutoFinished] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState('Mixed revision');

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setSeconds((value) => {
      if (value <= 1) { setRunning(false); setAutoFinished(true); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (!autoFinished) return;
    setAutoFinished(false);
    setLogged(true);
    createSession.mutate({ data: { subject: timerSubject, minutes: 25, source: 'timer' } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
    });
  }, [autoFinished]);

  const logSession = (minutes: number, source: StudySessionInputSource, sessionSubject: string, callback?: () => void) => {
    createSession.mutate({ data: { subject: sessionSubject, minutes, source } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); setLogged(true); callback?.(); } });
  };
  const startTimer = () => { setLogged(false); setRunning(true); };
  const pauseTimer = () => setRunning(false);
  const resetTimer = () => { setRunning(false); setSeconds(25 * 60); };
  const finishTimer = () => {
    const elapsed = Math.max(1, Math.round((25 * 60 - seconds) / 60));
    logSession(elapsed, 'timer', timerSubject, resetTimer);
  };
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remaining = (seconds % 60).toString().padStart(2, '0');
  const dashboard = dashboardQuery.data;
  const todayPercent = dashboard?.todayGoalMinutes ? (dashboard.todayMinutes / dashboard.todayGoalMinutes) * 100 : 0;
  const tasks = tasksQuery.data ?? [];
  const openTasks = tasks.filter((task) => task.status !== 'done');

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
    <div className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <Card className="relative overflow-hidden bg-sidebar p-6 text-sidebar-foreground md:p-10"><div className="absolute right-[-40px] top-[-55px] h-48 w-48 rounded-full border border-accent/20" /><div className="absolute right-[-15px] top-[-30px] h-32 w-32 rounded-full border border-accent/20" /><div className="relative"><div className="flex items-center justify-between"><div><p className="font-mono-custom text-[10px] uppercase tracking-[.17em] text-accent">Focus timer</p><h2 className="mt-2 font-display text-2xl font-bold">One clean block</h2></div><Timer className="text-accent" size={23} /></div><div className="my-12 text-center"><p className="font-mono-custom text-7xl tracking-[-.08em] text-sidebar-foreground md:text-8xl" data-testid="text-timer">{minutes}:{remaining}</p><p className="mt-3 text-xs text-sidebar-foreground/55">25 minute focus / 5 minute reset</p></div><div className="mx-auto max-w-xs"><label className="mb-2 block font-mono-custom text-[10px] uppercase tracking-[.15em] text-sidebar-foreground/55">Focus on</label><select value={timerSubject} onChange={(event) => setTimerSubject(event.target.value)} className="h-10 w-full rounded-xl border border-sidebar-foreground/15 bg-sidebar-foreground/10 px-3 text-sm text-sidebar-foreground outline-none" data-testid="select-timer-subject">{subjects.map((value) => <option className="text-foreground" key={value}>{value}</option>)}</select></div><div className="mt-6 flex items-center justify-center gap-2"><button type="button" onClick={running ? pauseTimer : startTimer} className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground" data-testid="button-toggle-timer">{running ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}{running ? 'Pause' : seconds < 25 * 60 ? 'Resume' : 'Start focus'}</button>{seconds < 25 * 60 && seconds > 0 && !running && <button type="button" onClick={finishTimer} disabled={createSession.isPending} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60" data-testid="button-finish-timer">{createSession.isPending ? 'Saving…' : 'Finish & log'}</button>}<button type="button" onClick={resetTimer} className="rounded-xl border border-sidebar-foreground/15 p-3 text-sidebar-foreground/70 hover:bg-sidebar-foreground/10" aria-label="Reset timer" data-testid="button-reset-timer"><RotateCcw size={16} /></button></div></div></Card>
      <div className="space-y-6"><Card className="p-5 md:p-7"><SectionTitle eyebrow="Manual entry" title="Already studied?" action={<Clock3 size={18} className="text-primary" />} /><p className="text-sm leading-relaxed text-muted-foreground">Log the work that happened away from the timer. It counts just as much.</p><div className="mt-5 space-y-3"><label className="block"><span className="mb-1.5 block text-xs font-bold">Subject</span><select value={subject} onChange={(event) => setSubject(event.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none" data-testid="select-manual-subject">{subjects.map((value) => <option key={value}>{value}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Minutes studied</span><input type="number" min="1" max="600" value={manualMinutes} onChange={(event) => setManualMinutes(event.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-primary/20" data-testid="input-manual-minutes" />{Number(manualMinutes) < 1 || Number(manualMinutes) > 600 ? <span className="mt-1 block text-[11px] font-semibold text-accent">Keep it between 1 and 600 minutes.</span> : <span className="mt-1 block text-[11px] text-muted-foreground">Between 1 and 600 minutes.</span>}</label><button type="button" disabled={createSession.isPending || Number(manualMinutes) < 1 || Number(manualMinutes) > 600} onClick={() => logSession(Number(manualMinutes), 'manual', subject, () => setManualMinutes('45'))} className="mt-2 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50" data-testid="button-log-manual">{createSession.isPending ? 'Saving...' : 'Add to today'}</button></div></Card><Card className="p-5 md:p-7"><SectionTitle eyebrow="A small ritual" title="Before you begin" /><div className="space-y-3 text-sm">{['Put the phone somewhere inconvenient.', 'Name the one thing this block is for.', 'When the timer ends, write one sentence about what changed.'].map((item, index) => <div className="flex items-center gap-3" key={item}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary font-mono-custom text-[10px] text-primary">0{index + 1}</span><span className="text-muted-foreground">{item}</span></div>)}</div></Card></div>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Card className="p-5 md:p-7"><SectionTitle eyebrow="Today" title="Your study bar" action={<span className="font-mono-custom text-xs text-muted-foreground">{dashboard?.todayMinutes ?? 0}/{dashboard?.todayGoalMinutes ?? 180} min</span>} /><ProgressBar value={todayPercent} color="warm" className="mt-5" /><div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{dashboard?.todayMinutes ?? 0} minutes logged</span><span>{dashboard?.todayGoalMinutes ?? 180} minute goal</span></div></Card>
      <Card className="p-5 md:p-7">
        <SectionTitle eyebrow={`${openTasks.length} open`} title="Today's tasks" action={<CheckCircle2 size={17} className="text-primary" />} />
        <form onSubmit={addTask} className="mt-4 flex gap-2">
          <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="e.g. Finish rotational motion sheet" className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-primary/20" data-testid="input-task-title" />
          <select value={taskSubject} onChange={(event) => setTaskSubject(event.target.value)} className="h-10 w-28 rounded-xl border border-border bg-background px-2 text-xs outline-none" data-testid="select-task-subject">{subjects.map((value) => <option key={value}>{value}</option>)}</select>
          <button type="submit" disabled={createTask.isPending || !taskTitle.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50" data-testid="button-add-task"><Plus size={14} /> Add</button>
        </form>
        {tasks.length ? <div className="mt-3 divide-y divide-border/70">{tasks.map((task) => <div key={task.id} className="flex items-center gap-3 py-2.5" data-testid={`row-task-${task.id}`}><button type="button" onClick={() => toggleTask(task.id, task.status !== 'done')} className="text-muted-foreground hover:text-primary" aria-label="Toggle task">{task.status === 'done' ? <CheckCircle2 size={18} className="text-primary" /> : <Circle size={18} />}</button><div className="min-w-0 flex-1"><p className={`truncate text-sm ${task.status === 'done' ? 'text-muted-foreground line-through' : 'font-semibold'}`}>{task.title}</p><p className="font-mono-custom text-[10px] text-muted-foreground">{task.subject}</p></div><button type="button" onClick={() => deleteTask.mutate({ taskId: task.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }) })} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-accent" aria-label="Delete task"><Trash2 size={13} /></button></div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">A task is a promise to your future self. Add one.</p>}
      </Card>
    </div>
  </div>;
}