import { Flame } from 'lucide-react';
import type { ShareArtifact } from '@workspace/api-client-react';
import { BrandMark } from '@/components/brand-mark';

export function DailyFocusCard({ artifact, compact = false }: { artifact: ShareArtifact; compact?: boolean }) {
  const payload = artifact.payload;
  const showStreak = artifact.variant === 'B' && payload.streak > 0;
  const subjects = payload.subjects.length ? payload.subjects : [{ subject: 'Focus time', minutes: payload.minutes, percent: 100 }];

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-[#0B3D33] p-5 text-[#F5F1E6] shadow-[0_18px_48px_hsl(186_32%_16%/.25)] sm:p-6"
      data-testid="daily-focus-card"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-16 -top-24 h-56 w-56 rounded-full border-2 border-[#6CCBC0]/10" />
        <div className="absolute -right-8 -top-14 h-40 w-40 rounded-full border-2 border-[#6CCBC0]/10" />
      </div>
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark size={34} shadow={false} className="border-[1.5px] border-[#6CCBC0] bg-transparent" />
            <div>
              <p className="font-display text-base font-bold leading-none tracking-tight">Ledger</p>
              <p className="mt-1 font-mono-custom text-[8px] uppercase tracking-[.2em] text-[#F5F1E6]/60">keep moving</p>
            </div>
          </div>
          <span className="rounded-full bg-[#11483C] px-3 py-1.5 font-mono-custom text-[9px] font-bold uppercase tracking-[.18em] text-[#6CCBC0]">Daily focus</span>
        </div>
        <p className="mt-5 font-display text-[clamp(3rem,10vw,5rem)] font-bold leading-[.95] tracking-[-.04em]">{payload.minutesLabel}</p>
        <p className="mt-1 text-sm text-[#F5F1E6]/65">
          focused today · {payload.displayName} <span className="mx-1.5 text-[#F5F1E6]/30">/</span> {payload.dayLabel}
        </p>
        {showStreak && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#F0645A] px-3.5 py-1.5 text-xs font-bold text-[#0B3D33]" data-testid="daily-focus-streak">
            <Flame size={13} fill="currentColor" /> {payload.streak} day streak
          </span>
        )}
        <div className="mt-5 rounded-2xl bg-[#11483C] p-4">
          <p className="font-mono-custom text-[9px] uppercase tracking-[.2em] text-[#F5F1E6]/55">Today's subjects</p>
          <div className="mt-3 space-y-3">
            {subjects.slice(0, 4).map((subject) => (
              <div key={subject.subject}>
                <div className="mb-1 flex items-center justify-between font-mono-custom text-[10px] text-[#F5F1E6]/70">
                  <span className="truncate">{subject.subject}</span>
                  <span>{subject.minutes}m</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#6CCBC0]/20">
                  <div className="h-full rounded-full bg-[#6CCBC0]" style={{ width: `${Math.max(2, Math.min(100, subject.percent))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={`mt-4 flex items-center justify-between ${compact ? '' : 'border-t border-[#F5F1E6]/10 pt-4'}`}>
          <span className="font-display text-sm font-bold text-[#F0645A]">Study with me →</span>
          {!compact && <span className="font-mono-custom text-[8.5px] uppercase tracking-[.14em] text-[#F5F1E6]/45">every minute counted</span>}
        </div>
      </div>
    </div>
  );
}