import { describe, it } from "node:test";
import assert from "node:assert";
import { genCode, normalizeInviteCode, buildLeaderboard, timeAgo } from "../src/lib/utils.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

describe("genCode", () => {
  it("generates 6-character invite codes from the code alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const code = genCode();
      assert.strictEqual(code.length, 6);
      for (const ch of code) assert.ok(CODE_ALPHABET.includes(ch), `char ${ch} not in alphabet`);
    }
  });

  it("never collides across a realistic batch", () => {
    const seen = new Set();
    for (let i = 0; i < 2000; i++) seen.add(genCode());
    assert.strictEqual(seen.size, 2000);
  });
});

describe("normalizeInviteCode", () => {
  it("trims surrounding whitespace and uppercases", () => {
    assert.strictEqual(normalizeInviteCode("  j7k4qp  "), "J7K4QP");
    assert.strictEqual(normalizeInviteCode("abc123"), "ABC123");
  });

  it("handles empty/blank/garbage input without throwing", () => {
    assert.strictEqual(normalizeInviteCode(""), "");
    assert.strictEqual(normalizeInviteCode("   "), "");
    assert.strictEqual(normalizeInviteCode(null), "");
    assert.strictEqual(normalizeInviteCode(undefined), "");
  });
});

describe("buildLeaderboard", () => {
  const rows = [
    { user_id: "a", display_name: "Adi", minutes: 120, days_active: 2 },
    { user_id: "b", display_name: "Riya", minutes: 300, days_active: 3 },
    { user_id: "c", display_name: "Sam", minutes: 300, days_active: 4 },
    { user_id: "d", display_name: "Zed", minutes: 0, days_active: 0 },
  ];

  it("sorts by minutes descending", () => {
    const out = buildLeaderboard(rows, "x");
    assert.deepStrictEqual(out.map(r => r.user_id), ["b", "c", "a", "d"]);
  });

  it("assigns standard competition ranks (1, 1, 3, 4)", () => {
    const out = buildLeaderboard(rows, "x");
    assert.deepStrictEqual(out.map(r => r.rank), [1, 1, 3, 4]);
  });

  it("flags the caller's row with me=true", () => {
    const out = buildLeaderboard(rows, "a");
    assert.strictEqual(out.find(r => r.user_id === "a").me, true);
    assert.strictEqual(out.find(r => r.user_id === "b").me, false);
  });

  it("handles empty/undefined input", () => {
    assert.deepStrictEqual(buildLeaderboard(null, "x"), []);
    assert.deepStrictEqual(buildLeaderboard([], "x"), []);
  });

  it("ties break alphabetically by name", () => {
    const out = buildLeaderboard(rows, "x");
    assert.deepStrictEqual(out.slice(0, 2).map(r => r.display_name), ["Riya", "Sam"]);
  });
});

describe("timeAgo", () => {
  it("renders just now for recent timestamps", () => {
    assert.strictEqual(timeAgo(new Date().toISOString()), "just now");
  });

  it("renders minutes, hours and days", () => {
    const now = Date.now();
    assert.strictEqual(timeAgo(new Date(now - 2 * 60_000).toISOString()), "2m ago");
    assert.strictEqual(timeAgo(new Date(now - 90 * 60_000).toISOString()), "1h ago");
    assert.strictEqual(timeAgo(new Date(now - 3 * 86_400_000).toISOString()), "3d ago");
  });

  it("falls back to a short date past a week", () => {
    const old = new Date(Date.now() - 10 * 86_400_000);
    const out = timeAgo(old.toISOString());
    assert.match(out, /^[A-Z][a-z]{2} \d{1,2}$/);
  });

  it("returns empty for invalid input", () => {
    assert.strictEqual(timeAgo(null), "");
    assert.strictEqual(timeAgo("not-a-date"), "");
  });
});
