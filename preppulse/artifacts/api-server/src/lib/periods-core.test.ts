import { strict as assert } from "node:assert";
import { test } from "node:test";
import { rankPeriodEntries, type PeriodEntry } from "./periods-core.js";

function e(userId: string, minutes: number, topicsMoved: number): PeriodEntry {
  return { userId, minutes, topicsMoved };
}

test("rankPeriodEntries orders by pulse descending and ties share a rank", () => {
  const ranked = rankPeriodEntries([
    e("b", 100, 0),
    e("a", 100, 0),
    e("d", 0, 1),
    e("c", 30, 0),
  ]);
  assert.deepEqual(
    ranked.map(({ userId, rank, pulse }) => ({ userId, rank, pulse })),
    [
      { userId: "a", rank: 1, pulse: 100 },
      { userId: "b", rank: 1, pulse: 100 },
      { userId: "c", rank: 3, pulse: 30 },
      { userId: "d", rank: 3, pulse: 30 },
    ],
  );
});

test("rankPeriodEntries applies 30 pulse per topic moved", () => {
  const ranked = rankPeriodEntries([e("a", 10, 3), e("b", 100, 0)]);
  assert.deepEqual(
    ranked.map(({ userId, pulse }) => ({ userId, pulse })),
    [
      { userId: "a", pulse: 100 },
      { userId: "b", pulse: 100 },
    ],
  );
});

test("rankPeriodEntries keeps minutes and topicsMoved on entries", () => {
  const ranked = rankPeriodEntries([e("x", 45, 2)]);
  assert.equal(ranked[0].minutes, 45);
  assert.equal(ranked[0].topicsMoved, 2);
});

test("rankPeriodEntries returns empty for no entries", () => {
  assert.deepEqual(rankPeriodEntries([]), []);
});

test("rankPeriodEntries rounds pulse to integers", () => {
  const ranked = rankPeriodEntries([e("a", 59.5, 1)]);
  assert.equal(ranked[0].pulse, 90);
});
