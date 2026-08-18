export interface RankSnapshotPoint {
  weekStart: Date;
  rank: number;
}

export interface RankHistory {
  /** Snapshots newest-first. */
  points: RankSnapshotPoint[];
}

/**
 * Consecutive completed weeks ranked within the top N, counting back from the
 * most recent snapshot. Breaks at the first week outside the top N or at a
 * missing week (no snapshot for that scope that week).
 */
export function computeStreakFromSnapshots(points: RankSnapshotPoint[], topN: number): number {
  let streak = 0;
  for (let i = 0; i < points.length; i += 1) {
    if (points[i].rank <= topN) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

/** Best (lowest) rank across all snapshots, or null when there are none. */
export function computeBestRank(points: RankSnapshotPoint[]): number | null {
  if (points.length === 0) return null;
  let best = points[0].rank;
  for (const point of points) {
    if (point.rank < best) best = point.rank;
  }
  return best;
}

/**
 * Rank movement versus the previous week. Positive means the member rose
 * (better rank), negative means they fell, null when there is no prior
 * snapshot to compare against.
 */
export function computeRankDelta(currentRank: number, points: RankSnapshotPoint[]): number | null {
  const previous = points[0];
  if (!previous) return null;
  return previous.rank - currentRank;
}

export type GapState = "active" | "leading" | "empty";

/**
 * Pulse gap to the entry directly above. "leading" when the member is rank 1;
 * "empty" when they are the only ranked member; otherwise "active" with the
 * number of pulse points needed to overtake.
 */
export function computeGap(rank: number, score: number, previousScore: number | null): { state: GapState; gapToNext: number | null } {
  if (rank === 1) return { state: "leading", gapToNext: null };
  if (previousScore === null) return { state: "empty", gapToNext: null };
  return { state: "active", gapToNext: Math.max(0, previousScore - score) };
}

/** Last `weeks` snapshot ranks per user, oldest-first, for sparklines. */
export function sparklineRanks(points: RankSnapshotPoint[], weeks: number): number[] {
  return points.slice(0, weeks).reverse().map((point) => point.rank);
}