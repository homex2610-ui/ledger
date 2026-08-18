import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  computeBestRank,
  computeGap,
  computeRankDelta,
  computeStreakFromSnapshots,
  sparklineRanks,
  type RankSnapshotPoint,
} from "./leaderboard-meta-core.js";

const week = (offset: number) => new Date(Date.UTC(2026, 7, 17 - offset * 7));

test("computeStreakFromSnapshots counts consecutive top-N weeks from newest", () => {
  const points: RankSnapshotPoint[] = [
    { weekStart: week(0), rank: 2 },
    { weekStart: week(1), rank: 1 },
    { weekStart: week(2), rank: 4 },
    { weekStart: week(3), rank: 3 },
  ];
  assert.equal(computeStreakFromSnapshots(points, 3), 2);
  assert.equal(computeStreakFromSnapshots(points, 4), 4);
});

test("computeStreakFromSnapshots is zero with no snapshots", () => {
  assert.equal(computeStreakFromSnapshots([], 3), 0);
});

test("computeStreakFromSnapshots breaks at a missing week", () => {
  const points: RankSnapshotPoint[] = [
    { weekStart: week(0), rank: 1 },
    { weekStart: week(2), rank: 1 },
    { weekStart: week(3), rank: 1 },
  ];
  assert.equal(computeStreakFromSnapshots(points, 3), 1);
});

test("computeStreakFromSnapshots breaks at a gap before ranking breaks", () => {
  const points: RankSnapshotPoint[] = [
    { weekStart: week(0), rank: 2 },
    { weekStart: week(1), rank: 9 },
    { weekStart: week(3), rank: 1 },
    { weekStart: week(4), rank: 1 },
  ];
  assert.equal(computeStreakFromSnapshots(points, 3), 1);
});

test("computeBestRank returns lowest rank or null", () => {
  const points: RankSnapshotPoint[] = [
    { weekStart: week(0), rank: 5 },
    { weekStart: week(1), rank: 2 },
    { weekStart: week(2), rank: 3 },
  ];
  assert.equal(computeBestRank(points), 2);
  assert.equal(computeBestRank([]), null);
});

test("computeRankDelta compares against most recent snapshot", () => {
  const points: RankSnapshotPoint[] = [
    { weekStart: week(0), rank: 4 },
    { weekStart: week(1), rank: 2 },
  ];
  assert.equal(computeRankDelta(1, points), 3);
  assert.equal(computeRankDelta(6, points), -2);
  assert.equal(computeRankDelta(4, []), null);
});

test("computeGap states: leading, empty, active", () => {
  assert.deepEqual(computeGap(1, 120, 100), { state: "leading", gapToNext: null });
  assert.deepEqual(computeGap(1, 120, null), { state: "leading", gapToNext: null });
  assert.deepEqual(computeGap(2, 40, null), { state: "empty", gapToNext: null });
  // Pulse scores are integers: overtaking the entry above needs one more than
  // the raw score difference (matching only ties).
  assert.deepEqual(computeGap(2, 40, 90), { state: "active", gapToNext: 51 });
  assert.deepEqual(computeGap(3, 90, 40), { state: "active", gapToNext: 0 });
  assert.deepEqual(computeGap(2, 40, 40), { state: "active", gapToNext: 1 });
});

test("sparklineRanks returns newest weeks oldest-first", () => {
  const points: RankSnapshotPoint[] = [
    { weekStart: week(0), rank: 3 },
    { weekStart: week(1), rank: 1 },
    { weekStart: week(2), rank: 2 },
  ];
  assert.deepEqual(sparklineRanks(points, 8), [2, 1, 3]);
  assert.deepEqual(sparklineRanks(points, 2), [1, 3]);
  assert.deepEqual(sparklineRanks([], 8), []);
});