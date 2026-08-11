import { describe, it } from "node:test";
import assert from "node:assert";
import { fmtTotal, computeRingSegments } from "../src/lib/ringSegments.js";

describe("fmtTotal", () => {
  it("zero returns 0m", () => {
    assert.strictEqual(fmtTotal(0), "0m");
    assert.strictEqual(fmtTotal(-5), "0m");
    assert.strictEqual(fmtTotal(null), "0m");
  });

  it("under 60 minutes returns Xm", () => {
    assert.strictEqual(fmtTotal(5), "5m");
    assert.strictEqual(fmtTotal(45), "45m");
    assert.strictEqual(fmtTotal(59), "59m");
  });

  it("60 minutes returns 1h 0m", () => {
    assert.strictEqual(fmtTotal(60), "1h 0m");
  });

  it("mixed hours/minutes rounds minutes", () => {
    assert.strictEqual(fmtTotal(65), "1h 5m");
    assert.strictEqual(fmtTotal(125), "2h 5m");
    assert.strictEqual(fmtTotal(600), "10h 0m");
    assert.strictEqual(fmtTotal(185), "3h 5m");
  });
});

describe("computeRingSegments", () => {
  const colors = ["#A89BFF", "#7FC8E8", "#FFA860"];

  it("empty entries returns empty state", () => {
    const res = computeRingSegments([], colors);
    assert.strictEqual(res.isEmpty, true);
    assert.strictEqual(res.total, 0);
    assert.deepStrictEqual(res.segments, []);
  });

  it("zero-value entries returns empty state", () => {
    const res = computeRingSegments([{ subject: "Physics", minutes: 0 }], colors);
    assert.strictEqual(res.isEmpty, true);
  });

  it("single entry produces one segment covering full circle", () => {
    const res = computeRingSegments([{ subject: "Physics", minutes: 60 }], colors);
    assert.strictEqual(res.isEmpty, false);
    assert.strictEqual(res.total, 60);
    assert.strictEqual(res.segments.length, 1);
    assert.strictEqual(res.segments[0].subject, "Physics");
    assert.strictEqual(res.segments[0].fraction, 1);
    assert.strictEqual(res.segments[0].dashOffset, 0);
  });

  it("multiple entries fractions sum to 1", () => {
    const entries = [
      { subject: "Physics", minutes: 120 },
      { subject: "Chemistry", minutes: 60 },
      { subject: "Maths", minutes: 60 },
    ];
    const res = computeRingSegments(entries, colors);
    assert.strictEqual(res.total, 240);
    const sum = res.segments.reduce((s, seg) => s + seg.fraction, 0);
    assert.ok(Math.abs(sum - 1) < 0.001, `fractions sum to ${sum}`);
  });

  it("dashOffsets accumulate correctly", () => {
    const entries = [
      { subject: "A", minutes: 50 },
      { subject: "B", minutes: 50 },
    ];
    const res = computeRingSegments(entries, colors);
    assert.strictEqual(res.segments[0].dashOffset, 0);
    assert.ok(Math.abs(res.segments[1].dashOffset - res.segments[0].dashLength) < 0.001);
  });

  it("colors cycle by index", () => {
    const entries = [
      { subject: "A", minutes: 10 },
      { subject: "B", minutes: 10 },
      { subject: "C", minutes: 10 },
      { subject: "D", minutes: 10 },
    ];
    const res = computeRingSegments(entries, colors);
    assert.strictEqual(res.segments[0].color, "#A89BFF");
    assert.strictEqual(res.segments[1].color, "#7FC8E8");
    assert.strictEqual(res.segments[2].color, "#FFA860");
    assert.strictEqual(res.segments[3].color, "#A89BFF");
  });

  it("zero-value subjects are included in segment list (caller filters)", () => {
    const entries = [
      { subject: "Physics", minutes: 60 },
      { subject: "Chemistry", minutes: 0 },
      { subject: "Maths", minutes: 30 },
    ];
    const res = computeRingSegments(entries, colors);
    assert.strictEqual(res.segments.length, 3);
    assert.strictEqual(res.segments[1].minutes, 0);
    assert.strictEqual(res.segments[1].fraction, 0);
  });
});