import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Check, ChevronRight, Copy, Download, Eye, EyeOff, Focus, Link2, LoaderCircle, Moon, MoonStar, Rocket, Share2, Sun, Timer, Trash2, Unplug, UserRound } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, exportMyData, getGetAuthDiscordAuthorizeQueryKey, getGetCardStatsQueryKey, getGetDashboardQueryKey, getGetMeQueryKey, getGetProfileQueryKey, getGetSyllabusSummaryQueryKey, getListCardsQueryKey, getListTestAttemptsQueryKey, getListTopicsQueryKey, useChangePassword, useDeleteMyAccount, useDisconnectOauthProvider, useGetAuthDiscordAuthorize, useGetAuthOauthProviders, useGetProfile, useOauthLink, useUpdateProfile, type AuthResponse, type ProfileUpdate } from '@workspace/api-client-react';
import { EXAM_TRACKS, getExamConfig } from '@workspace/exam-config';
import { Card, ErrorState, LoadingBlock, SavingLabel, SectionTitle } from '@/components/ui-elements';
import { Select } from '@/components/ui/select';
import { GoogleSignInButton, DiscordOAuthButton } from '@/components/oauth-buttons';
import { Avatar } from '@/components/avatar';
import { getGisCsrfToken, initialsFor } from '@/lib/utils';
import { applyTemplate, applyTheme, getStoredTemplate, getStoredTheme, type AppTemplate, type AppTheme } from '@/lib/theme';
import { formatMinutes, formatPace, formatWeekShare } from '@/lib/format-duration';
import { hourLabel, loadReminderPrefs, REMINDER_INTERVALS, saveReminderPrefs, type ReminderPrefs } from '@/lib/reminder-prefs';
import { APP_RELEASES, APP_VERSION, BUILD_SHA, DB_SCHEMA_VERSION, ENVIRONMENT, isChangelogSeen, markChangelogSeen } from '@/lib/version';
import { setSharePromptsEnabled, sharePromptsEnabled } from '@/lib/share';

export default function Settings() {
  const queryClient = useQueryClient();
  const query = useGetProfile();
  const updateProfile = useUpdateProfile();
  const deleteAccount = useDeleteMyAccount();
  const providers = useGetAuthOauthProviders();
  const linkOAuth = useOauthLink();
  const disconnectOAuth = useDisconnectOauthProvider();
  const discordAuthorizeLink = useGetAuthDiscordAuthorize({ link: true }, { query: { queryKey: getGetAuthDiscordAuthorizeQueryKey({ link: true }), enabled: false } });
  const profile = query.data;
  const [values, setValues] = useState<ProfileUpdate>({ focusMode: false, showOnLeaderboard: true });
  const valuesRef = useRef<ProfileUpdate>(values);
  valuesRef.current = values;
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNext, setPwNext] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [changelogSeen, setChangelogSeen] = useState(isChangelogSeen());
  const changePassword = useChangePassword();
  const me = queryClient.getQueryData<AuthResponse>(getGetMeQueryKey());
  const hasPassword = Boolean(me?.user?.hasPassword);
  const [theme, setTheme] = useState<AppTheme>(getStoredTheme());
  const [template, setTemplate] = useState<AppTemplate>(getStoredTemplate());
  const [reminderPrefs, setReminderPrefs] = useState<ReminderPrefs>(loadReminderPrefs());
  const [sharePrompts, setSharePrompts] = useState<boolean>(sharePromptsEnabled());
  const updateReminderPrefs = (next: Partial<ReminderPrefs>) => {
    const merged = { ...reminderPrefs, ...next };
    setReminderPrefs(merged);
    saveReminderPrefs({ ...merged, nextAt: null });
  };
  useEffect(() => { if (profile) setValues({ focusMode: profile.focusMode, showOnLeaderboard: profile.showOnLeaderboard }); }, [profile]);

  const update = (next: Partial<ProfileUpdate>) => {
    // Merge against the latest values (ref), not the render's snapshot, so
    // rapid successive toggles can't clobber each other's changes in flight.
    const merged = { ...valuesRef.current, ...next };
    valuesRef.current = merged;
    setValues(merged);
    updateProfile.mutate({ data: merged }, {
      onSuccess: (saved) => {
        queryClient.setQueryData(getGetProfileQueryKey(), saved);
        if (next.examTrack !== undefined && next.examTrack !== profile?.examTrack) {
          for (const queryKey of [getListTopicsQueryKey(), getGetSyllabusSummaryQueryKey(), getGetDashboardQueryKey(), getGetCardStatsQueryKey(), getListCardsQueryKey(), getListTestAttemptsQueryKey()]) {
            queryClient.invalidateQueries({ queryKey });
          }
        }
      },
    });
  };

  const updateField = (field: keyof ProfileUpdate) => (value: string | number | boolean) => update({ [field]: value } as Partial<ProfileUpdate>);

  const copyCode = async () => {
    if (!profile) return;
    try { await navigator.clipboard.writeText(profile.profileCode); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'preppulse-data.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch { setExportError('Export failed — try again in a moment.'); } finally { setExporting(false); }
  };

  const confirmDelete = () => {
    deleteAccount.mutate(undefined, {
      onSuccess: () => { setDeleteOpen(false); queryClient.clear(); },
    });
  };

  const handleGoogleLink = (response: { credential: string; select_by?: string }) => {
    setOauthError(null);
    if (response.select_by === 'auto') {
      console.info('[settings] ignoring auto-selected Google credential — waiting for an explicit connect attempt');
      return;
    }
    const csrfToken = getGisCsrfToken();
    if (!csrfToken) {
      setOauthError('Google sign-in state expired. Reload the page and try again.');
      return;
    }
    linkOAuth.mutate(
      { data: { provider: 'google', credential: response.credential, csrfToken } },
      {
        onSuccess: () => { providers.refetch(); },
        onError: (err) => {
          const data = err instanceof ApiError ? (err.data as { error?: string; code?: string } | null) : null;
          const code = data?.code;
          if (code === 'already_linked') setOauthError('This Google account is already linked to another Ledger account.');
          else if (code === 'invalid_credential' || code === 'csrf_mismatch') setOauthError('Google credential was invalid or expired. Try again.');
          else if (code === 'rate_limited') setOauthError('Too many sign-in attempts. Wait a few minutes and try again.');
          else {
            console.error('Google link error:', err);
            setOauthError(data?.error ?? 'Could not connect Google. Try again.');
          }
        },
      },
    );
  };

  const handleDiscordLink = async () => {
    setOauthError(null);
    try {
      const result = await discordAuthorizeLink.refetch();
      if (result.data?.url) {
        window.location.href = result.data.url;
        return;
      }
      setOauthError('Discord is unavailable right now.');
    } catch (err) {
      const data = err instanceof ApiError ? (err.data as { error?: string; code?: string } | null) : null;
      const code = data?.code;
      if (code === 'rate_limited') setOauthError('Too many attempts. Wait a few minutes and try again.');
      else if (code === 'provider_unavailable') setOauthError('Discord isn\u2019t configured yet.');
      else {
        console.error('Discord link error:', err);
        setOauthError(data?.error ?? 'Discord is unavailable right now.');
      }
    }
  };

  const handleDisconnect = (provider: 'google' | 'discord') => {
    setOauthError(null);
    disconnectOAuth.mutate(
      { provider },
      {
        onSuccess: () => { providers.refetch(); },
        onError: (err) => {
          const data = err instanceof ApiError ? (err.data as { error?: string; code?: string } | null) : null;
          if (data?.code === 'last_auth_method') setOauthError('You need another sign-in method before disconnecting this one.');
          else setOauthError(data?.error ?? 'Could not disconnect. Try again.');
        },
      },
    );
  };

  const handlePasswordSubmit = (event: FormEvent) => {
    event.preventDefault();
    setPwError(null);
    setPwSaved(false);
    if (hasPassword && !pwCurrent) {
      setPwError('Enter your current password');
      return;
    }
    if (pwNext.length < 8) {
      setPwError('Choose a password of at least 8 characters');
      return;
    }
    if (pwNext.length > 72) {
      setPwError('Password must be 72 characters or fewer');
      return;
    }
    if (pwNext !== pwConfirm) {
      setPwError('Passwords do not match');
      return;
    }
    changePassword.mutate(
      { data: { currentPassword: hasPassword ? pwCurrent : undefined, newPassword: pwNext } },
      {
        onSuccess: () => {
          setPwCurrent('');
          setPwNext('');
          setPwConfirm('');
          setPwSaved(true);
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : '';
          try {
            const parsed = JSON.parse(message) as { error?: unknown };
            if (typeof parsed.error === 'string') {
              setPwError(parsed.error);
              return;
            }
          } catch {
            /* not JSON */
          }
          setPwError('Could not update the password. Try again.');
        },
      },
    );
  };

  if (query.isLoading) return <div className="mx-auto max-w-4xl"><LoadingBlock className="h-28" /><div className="mt-6 space-y-4"><LoadingBlock className="h-32" /><LoadingBlock className="h-48" /></div></div>;
  if (query.isError || !profile) return <div className="mx-auto max-w-4xl"><ErrorState onRetry={() => query.refetch()} /></div>;

  return <div className="mx-auto max-w-4xl">
    <div><p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Your space, your rules</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.04em] md:text-5xl">Settings</h1><p className="mt-3 max-w-xl text-sm text-muted-foreground">Shape the companion around how you actually study.</p></div>
    <Card className="mt-7 flex flex-col gap-5 p-5 sm:flex-row sm:items-center md:p-7"><Avatar src={profile.avatarUrl} initials={initialsFor(profile.handle)} className="h-16 w-16 bg-primary text-xl text-primary-foreground" title={profile.handle} /><div className="flex-1"><p className="font-display text-2xl font-bold">{profile.handle}</p><p className="mt-1 text-sm text-muted-foreground">{getExamConfig(profile.examTrack).label} · {labelStage(profile.stage)} · target {profile.targetYear}</p></div></Card>

    <div className="mt-7 space-y-6">
      <Card className="p-5 md:p-7">
        <SectionTitle eyebrow="Profile" title="Who this pulse belongs to" action={<SavingLabel pending={updateProfile.isPending} />} />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Handle" value={profile.handle} onCommit={(value) => updateField('handle')(value)} placeholder="your handle" testId="input-profile-handle" />
          <label className="block"><span className="mb-1.5 block text-xs font-bold">Exam track</span><Select value={profile.examTrack} onChange={(event) => updateField('examTrack')(event.target.value)} data-testid="select-profile-exam">{EXAM_TRACKS.map((track) => <option key={track.value} value={track.value}>{track.label}</option>)}</Select></label>
          <label className="block"><span className="mb-1.5 block text-xs font-bold">Stage</span><Select value={profile.stage} onChange={(event) => updateField('stage')(event.target.value)} data-testid="select-profile-stage"><option value="class_11">Class 11</option><option value="class_12">Class 12</option><option value="dropper">Dropper</option></Select></label>
          <label className="block"><span className="mb-1.5 block text-xs font-bold">Target year</span><NumberField value={profile.targetYear} min={new Date().getFullYear()} max={new Date().getFullYear() + 6} onCommit={(value) => updateField('targetYear')(value)} testId="input-profile-year" /></label>
        </div>
      </Card>

      <Card className="p-5 md:p-7">
        <SectionTitle eyebrow="Daily targets" title="Sensible goals, not fantasy" action={<SavingLabel pending={updateProfile.isPending} />} />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-xs font-bold">Daily goal (minutes)</span><NumberField value={profile.dailyGoalMinutes} min={1} max={1440} onCommit={(value) => updateField('dailyGoalMinutes')(value)} testId="input-profile-daily" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-bold">Weekly goal (minutes)</span><NumberField value={profile.weeklyGoalMinutes} min={1} max={10080} onCommit={(value) => updateField('weeklyGoalMinutes')(value)} testId="input-profile-weekly" /></label>
        </div>
        <p className="mt-4 rounded-xl border border-border/70 bg-secondary/35 px-4 py-3 font-mono-custom text-[11px] leading-relaxed text-muted-foreground" data-testid="goal-readout">{formatMinutes(profile.dailyGoalMinutes)} a day · {formatMinutes(profile.weeklyGoalMinutes)} a week · {formatPace(profile.weeklyGoalMinutes, 7)} across 7 days · {formatWeekShare(profile.weeklyGoalMinutes)}</p>
      </Card>

      <Card className="p-5 md:p-7"><SectionTitle eyebrow="Preferences" title="How Ledger shows up" action={<SavingLabel pending={updateProfile.isPending} />} /><div className="divide-y divide-border/70"><SettingRow icon={<Focus size={17} />} title="Focus mode" detail="Keep your rank and activity out of the weekly circle." enabled={values.focusMode ?? false} onToggle={() => update({ focusMode: !values.focusMode })} testId="switch-focus-mode" /><SettingRow icon={values.showOnLeaderboard ? <Eye size={17} /> : <EyeOff size={17} />} title="Show me on leaderboard" detail="Let your friends see your handle and weekly pulse." enabled={values.showOnLeaderboard ?? true} onToggle={() => update({ showOnLeaderboard: !values.showOnLeaderboard })} testId="switch-leaderboard-visibility" /></div></Card>

      <Card className="p-5 md:p-7">
        <SectionTitle eyebrow="Study reminders" title="A gentle nudge, on your terms" />
        <div className="divide-y divide-border/70">
          <SettingRow icon={<Timer size={17} />} title="Remind me to start focus blocks" detail="Shows a banner while you're in the app, between your chosen hours." enabled={reminderPrefs.enabled} onToggle={() => updateReminderPrefs({ enabled: !reminderPrefs.enabled })} testId="switch-reminder-enabled" />
          {reminderPrefs.enabled && (
            <div className="space-y-4 py-5 first:pt-2 last:pb-2">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold">Remind every</span>
                  <Select value={String(reminderPrefs.intervalMinutes)} onChange={(event) => updateReminderPrefs({ intervalMinutes: Number(event.target.value) })} data-testid="select-reminder-interval">
                    {REMINDER_INTERVALS.map((minutes) => <option key={minutes} value={minutes}>{formatMinutes(minutes)}</option>)}
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold">From</span>
                  <Select value={String(reminderPrefs.startHour)} onChange={(event) => updateReminderPrefs({ startHour: Number(event.target.value) })} data-testid="select-reminder-start">
                    {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold">Until</span>
                  <Select value={String(reminderPrefs.endHour)} onChange={(event) => updateReminderPrefs({ endHour: Number(event.target.value) })} data-testid="select-reminder-end">
                    {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}
                  </Select>
                </label>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">Saved on this device only — nothing is sent to the server.</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5 md:p-7">
        <SectionTitle eyebrow="Appearance" title="Pick your vibe" />
        <div className="mt-4 flex gap-2">
          {([
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'dark', label: 'Dark', icon: Moon },
            { value: 'black', label: 'Black', icon: MoonStar },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setTheme(value); applyTheme(value); }}
              data-testid={`button-theme-${value}`}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${theme === value ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:bg-secondary'}`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {([
            { value: 'original', label: 'Original', swatch: ['#1e9a83', '#e5613a'] },
            { value: 'ocean', label: 'Ocean', swatch: ['#4f46e5', '#f59e0b', '#22c3d6'] },
            { value: 'ember', label: 'Ember', swatch: ['#d64545', '#1e9a83', '#ed9f0f'] },
            { value: 'forest', label: 'Forest', swatch: ['#2f9e5f', '#8ac926', '#23927f'] },
            { value: 'sunset', label: 'Sunset', swatch: ['#e0579b', '#f59e0b', '#8a7bf2'] },
            { value: 'midnight', label: 'Midnight', swatch: ['#5b5be0', '#22c3d6', '#eba817'] },
            { value: 'grape', label: 'Grape', swatch: ['#8b5cf6', '#ec4899', '#eba817'] },
            { value: 'royal', label: 'Royal', swatch: ['#d9a326', '#3b5bdb', '#14a3c9'] },
          ] as const).map(({ value, label, swatch }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setTemplate(value); applyTemplate(value); }}
              data-testid={`button-template-${value}`}
              className={`inline-flex min-w-[104px] flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${template === value ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:bg-secondary'}`}
            >
              <span className="flex h-4 w-8 overflow-hidden rounded-full border border-border/70" aria-hidden="true">{swatch.map((color) => <span key={color} className="h-full flex-1" style={{ background: color }} />)}</span>
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5 md:p-7"><SectionTitle eyebrow="Circle code" title="Find your people" action={<Link2 size={17} className="text-primary" />} /><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Share this code with someone on Ledger. They enter it under Compete → My circle, and you become mutual connections — the only way anyone sees your pulse.</p><div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-border p-5"><p className="font-mono-custom text-3xl font-bold tracking-[.25em] text-primary" data-testid="text-settings-code">{profile.profileCode}</p><button type="button" onClick={copyCode} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-secondary" data-testid="button-copy-code">{copied ? <Check size={13} className="text-primary" /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button></div></Card>

      <Card className="p-5 md:p-7">
        <SectionTitle eyebrow="Sharing" title="Daily focus cards" action={<Share2 size={17} className="text-primary" />} />
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">After a 25+ minute focus block, Ledger can offer to turn your day into a shareable card. Nothing is shared without your tap.</p>
        <div className="mt-2 border-t border-border/70">
          <SettingRow icon={<Share2 size={16} />} title="Share prompts" detail="Ask whether you'd like to share after a qualifying focus block." enabled={sharePrompts} onToggle={() => { const next = !sharePrompts; setSharePrompts(next); setSharePromptsEnabled(next); }} testId="switch-share-prompts" />
        </div>
      </Card>

      <Card className="p-5 md:p-7">
        <SectionTitle eyebrow="Connected accounts" title="Sign in with Discord or Google" />
        {oauthError && <div className="mt-3 rounded-xl border border-accent/25 bg-accent/10 px-4 py-3 text-xs font-semibold text-accent" data-testid="oauth-error">{oauthError}</div>}
        <div className="mt-4 space-y-3">
          <ProviderRow label="Google" connected={providers.data?.google.connected ?? false} enabled={providers.data?.google.enabled ?? false} pending={linkOAuth.isPending || disconnectOAuth.isPending} onConnect={(enabled) => enabled && providers.data?.google.clientId ? <GoogleSignInButton clientId={providers.data.google.clientId} onCredential={handleGoogleLink} disabled={linkOAuth.isPending} /> : null} onDisconnect={() => handleDisconnect('google')} />
          <ProviderRow label="Discord" connected={providers.data?.discord.connected ?? false} enabled={providers.data?.discord.enabled ?? false} pending={disconnectOAuth.isPending} onConnect={(enabled) => enabled ? <DiscordOAuthButton label="Connect Discord" onStart={handleDiscordLink} disabled={disconnectOAuth.isPending} /> : null} onDisconnect={() => handleDisconnect('discord')} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Connecting lets you sign in without a password. You can disconnect any provider as long as you keep at least one sign-in method.</p>
      </Card>

      <Card className="p-5 md:p-7">
        <SectionTitle eyebrow="Password" title={hasPassword ? 'Change your password' : 'Set a password'} />
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {hasPassword
            ? 'Your password lets you sign in with email. Pick a new one anytime.'
            : 'This account has no password yet — it was created before email sign-in existed. Set one to sign in with email.'}
        </p>
        <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3">
          {hasPassword && (
            <input
              type="password"
              value={pwCurrent}
              onChange={(event) => setPwCurrent(event.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-3 focus:ring-accent/25"
              data-testid="input-password-current"
            />
          )}
          <input
            type="password"
            value={pwNext}
            onChange={(event) => setPwNext(event.target.value)}
            placeholder="New password (8+ characters)"
            autoComplete="new-password"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-3 focus:ring-accent/25"
            data-testid="input-password-new"
          />
          <input
            type="password"
            value={pwConfirm}
            onChange={(event) => setPwConfirm(event.target.value)}
            placeholder="Repeat new password"
            autoComplete="new-password"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-3 focus:ring-accent/25"
            data-testid="input-password-confirm"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={changePassword.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
              data-testid="button-save-password"
            >
              {changePassword.isPending ? <LoaderCircle size={13} className="animate-spin" /> : null}
              {hasPassword ? 'Change password' : 'Set password'}
            </button>
            {pwSaved && <span className="text-xs font-semibold text-primary" data-testid="password-saved">Password saved</span>}
          </div>
          {pwError && <div className="rounded-xl border border-accent/25 bg-accent/10 px-4 py-3 text-xs font-semibold text-accent" data-testid="password-error">{pwError}</div>}
        </form>
      </Card>

      <Card className="p-5 md:p-7">
        <SectionTitle eyebrow="Privacy & care" title="Your data stays yours" />
        <div className="space-y-4">
          <InfoRow icon={<UserRound size={17} />} title="Account" detail={`Signed in as ${profile.email}.`} status="Email verified" />
        </div>
        <div className="mt-4 flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row">
          <button type="button" onClick={handleExport} disabled={exporting} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-secondary disabled:opacity-50" data-testid="button-export-data">{exporting ? 'Preparing…' : <><Download size={14} /> Export your data</>}</button>
          {exportError && <p className="text-[11px] font-semibold text-accent" data-testid="export-error">{exportError}</p>}
          <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent/30 px-4 py-2.5 text-xs font-bold text-accent hover:bg-accent/10" data-testid="button-delete-account"><Trash2 size={14} /> Delete account</button>
        </div>
      </Card>

      <Card className="p-5 md:p-7">
        <SectionTitle eyebrow="About Ledger" title="Version and changelog" action={!changelogSeen ? <span className="rounded-full bg-accent px-2.5 py-1 font-mono-custom text-[10px] font-bold uppercase tracking-[.1em] text-accent-foreground" data-testid="badge-whats-new">New · {APP_VERSION}</span> : undefined} />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="font-display text-3xl font-bold tracking-tight" data-testid="text-app-version">{APP_VERSION}</p>
          <button type="button" onClick={() => { setChangelogOpen((open) => !open); if (!changelogSeen) { markChangelogSeen(); setChangelogSeen(true); } }} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold transition-colors hover:bg-secondary" data-testid="button-whats-new"><Rocket size={13} className="text-primary" /> What's new<ChevronRight size={13} className={`transition-transform duration-200 ${changelogOpen ? 'rotate-90' : ''}`} /></button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <InfoRow icon={<Rocket size={17} />} title="Build" detail={`Commit ${BUILD_SHA} · ${ENVIRONMENT} · released ${APP_RELEASES[0].date}.`} status={ENVIRONMENT} />
          <InfoRow icon={<UserRound size={17} />} title="Data layer" detail={`Database schema ${DB_SCHEMA_VERSION} — the app version above is independent of it.`} status="Schema" />
        </div>
        {changelogOpen && (
          <div className="mt-4 space-y-3 border-t border-border/70 pt-4" data-testid="changelog">
            {APP_RELEASES.map((release) => (
              <div key={release.version} className="rounded-xl border border-border/70 p-4" data-testid={`changelog-release-${release.version}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono-custom text-sm font-bold text-primary">v{release.version}</p>
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground">{release.type}</span>
                  <span className="font-mono-custom text-[10px] text-muted-foreground">{release.date}</span>
                </div>
                <p className="mt-2 text-sm font-bold">{release.heading}</p>
                {release.added.length > 0 && <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">{release.added.map((note) => <li key={note}>{note}</li>)}</ul>}
                {release.improved.length > 0 && <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">{release.improved.map((note) => <li key={note}>{note}</li>)}</ul>}
                {release.fixed.length > 0 && <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">{release.fixed.map((note) => <li key={note}>{note}</li>)}</ul>}
              </div>
            ))}
            <p className="text-[11px] leading-relaxed text-muted-foreground/70">Rollbacks are handled through the deployment pipeline, not this screen — this changelog only documents what shipped.</p>
          </div>
        )}
      </Card>

      <Card className="border-accent/20 bg-accent/5 p-5 md:p-7"><div className="flex gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Check size={17} /></div><div><p className="font-display font-bold">A note for the hard days</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">This is a tracker, not a judge. If you miss a day, the next honest session is all that matters.</p></div></div></Card>
    </div>

    {deleteOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/40 p-4" onClick={() => setDeleteOpen(false)}>
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()} role="alertdialog" aria-label="Delete account confirmation">
          <p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-accent">Irreversible</p>
          <h2 className="mt-2 font-display text-xl font-bold">Delete your account?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">This permanently removes your profile, progress, cards, sessions, groups you own, and circle connections. Type <span className="font-bold text-foreground">{profile.handle}</span> to confirm.</p>
          <input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} placeholder={profile.handle} className="mt-4 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-accent/25" data-testid="input-delete-confirm" />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteOpen(false)} className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-secondary" data-testid="button-cancel-delete">Cancel</button>
            <button type="button" disabled={deleteConfirm !== profile.handle || deleteAccount.isPending} onClick={confirmDelete} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-confirm-delete">{deleteAccount.isPending ? 'Deleting…' : 'Delete forever'}</button>
          </div>
        </div>
      </div>
    )}
  </div>;
}

function NumberField({ value, min, max, onCommit, testId }: { value: number; min: number; max: number; onCommit: (value: number) => void; testId: string }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return <input type="number" min={min} max={max} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => { const parsed = Math.min(max, Math.max(min, Number(draft))); if (Number.isFinite(parsed) && parsed !== value) onCommit(parsed); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none" data-testid={testId} />;
}

function Field({ label, value, onCommit, placeholder, testId }: { label: string; value: string; onCommit: (value: string) => void; placeholder: string; testId: string }) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const next = draft.trim();
    if (next.length < 2) { setError('Needs at least 2 characters'); return; }
    if (next.length > 24) { setError('Keep it to 24 characters or fewer'); return; }
    if (!/^[a-zA-Z0-9._-]+$/.test(next)) { setError('Only letters, numbers, dots, dashes, and underscores'); return; }
    setError(null);
    if (next !== value) onCommit(next);
  };
  return <label className="block"><span className="mb-1.5 block text-xs font-bold">{label}</span><div className="flex gap-2"><input maxLength={24} value={draft} onChange={(event) => { setDraft(event.target.value); if (error) setError(null); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.currentTarget.blur(); } }} onBlur={commit} placeholder={placeholder} className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-primary/20" data-testid={testId} /><button type="button" onClick={commit} className="rounded-xl border border-border px-3 text-xs font-bold hover:bg-secondary" data-testid={`${testId}-save`}>Save</button></div>{error && <p className="mt-1 text-[11px] font-semibold text-accent">{error}</p>}</label>;
}

function SettingRow({ icon, title, detail, enabled, onToggle, testId }: { icon: ReactNode; title: string; detail: string; enabled: boolean; onToggle: () => void; testId: string }) {
  return <div className="flex items-center gap-4 py-5 first:pt-2 last:pb-2"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</div><div className="flex-1"><p className="text-sm font-bold">{title}</p><p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">{detail}</p></div><button type="button" role="switch" aria-checked={enabled} onClick={onToggle} className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition-colors ${enabled ? 'bg-primary' : 'bg-secondary'}`} data-testid={testId}><span className={`block h-5 w-5 rounded-full bg-card shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} /></button></div>;
}
function InfoRow({ icon, title, detail, status, action }: { icon: ReactNode; title: string; detail: string; status: string; action?: ReactNode }) { return <div className="flex items-start gap-4 rounded-xl border border-border/70 p-4"><div className="mt-0.5 text-primary">{icon}</div><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold">{title}</p><span className="rounded-full bg-secondary px-2 py-0.5 font-mono-custom text-[9px] uppercase text-muted-foreground">{status}</span></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></div>{action ?? <ChevronRight size={15} className="mt-1 text-muted-foreground" />}</div>; }
function ProviderRow({ label, connected, enabled, pending, onConnect, onDisconnect }: { label: string; connected: boolean; enabled: boolean; pending: boolean; onConnect: (enabled: boolean) => ReactNode | null; onDisconnect: () => void }) {
  return <div className="flex items-center gap-4 rounded-xl border border-border/70 p-4">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><UserRound size={16} /></div>
    <div className="flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold">{label}</p>
        <span className={`rounded-full px-2 py-0.5 font-mono-custom text-[9px] uppercase ${connected ? 'bg-[#d5f0e1] text-[#1e7a4e]' : 'bg-secondary text-muted-foreground'}`} data-testid={`oauth-status-${label.toLowerCase()}`}>{connected ? 'Connected' : 'Not connected'}</span>
      </div>
    </div>
    {connected
      ? <button type="button" onClick={onDisconnect} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-secondary disabled:opacity-50" data-testid={`button-disconnect-${label.toLowerCase()}`}>{pending ? <LoaderCircle size={13} className="animate-spin" /> : <Unplug size={13} />}Disconnect</button>
      : enabled ? onConnect(enabled) : <span className="text-xs font-semibold text-muted-foreground">Unavailable</span>}
  </div>;
}
function labelStage(stage: string) { return stage === 'class_11' ? 'Class 11' : stage === 'class_12' ? 'Class 12' : 'Dropper'; }
