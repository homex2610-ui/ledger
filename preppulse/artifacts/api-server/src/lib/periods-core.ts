export interface PeriodEntry {
  userId: string;
  minutes: number;
  topicsMoved: number;
}

export interface RankedPeriodEntry {
  userId: string;
  rank: number;
  pulse: number;
  minutes: number;
  topicsMoved: number;
}

/**
 * Competition ranking identical to the live leaderboard: rank is purely the
 * time studied (focus mode + timer/study-room sessions; manual logs are
 * excluded upstream), so tied minutes share a rank and the next distinct
 * score jumps by the size of the tie group. `adjustments` (userId -> pulse
 * delta, e.g. admin pulse adjustments) are applied before ranking; the
 * stored pulse includes them.
 */
export function rankPeriodEntries(entries: PeriodEntry[], adjustments?: Map<string, number>): RankedPeriodEntry[] {
  let lastScore = Number.NaN;
  let lastRank = 0;
  return entries
    .map((entry) => {
      const pulse = Math.round(entry.minutes + (adjustments?.get(entry.userId) ?? 0));
      return { ...entry, pulse };
    })
    .sort((a, b) => b.pulse - a.pulse || a.userId.localeCompare(b.userId))
    .map((entry, index) => {
      if (index === 0 || entry.pulse !== lastScore) {
        lastScore = entry.pulse;
        lastRank = index + 1;
      }
      return { ...entry, rank: lastRank };
    });
}