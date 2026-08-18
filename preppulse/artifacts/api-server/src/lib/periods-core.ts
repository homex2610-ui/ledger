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
 * Competition ranking identical to the live leaderboard: tied pulse shares a
 * rank, the next distinct score jumps by the size of the tie group.
 */
export function rankPeriodEntries(entries: PeriodEntry[]): RankedPeriodEntry[] {
  let lastScore = Number.NaN;
  let lastRank = 0;
  return entries
    .map((entry) => ({
      ...entry,
      pulse: Math.round(entry.minutes + entry.topicsMoved * 30),
    }))
    .sort((a, b) => b.pulse - a.pulse || a.userId.localeCompare(b.userId))
    .map((entry, index) => {
      if (index === 0 || entry.pulse !== lastScore) {
        lastScore = entry.pulse;
        lastRank = index + 1;
      }
      return { ...entry, rank: lastRank };
    });
}