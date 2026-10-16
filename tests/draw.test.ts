import { describe, expect, it } from "vitest";
import type { EntrySnapshotRow } from "@/lib/types";
import { rng, selectWinners } from "@/lib/logic/draw";

const snap: EntrySnapshotRow[] = Array.from({ length: 12 }, (_, i) => ({ userId: `u${i}`, kg: i + 1, entries: i + 1 }));
const vouchers = ["v1", "v2", "v3", "v4", "v5"];

describe("draw", () => {
  it("picks 5 distinct winners, one per voucher", () => {
    const picks = selectWinners(snap, vouchers, "seed-1");
    expect(picks.map((p) => p.voucherId)).toEqual(vouchers);
    expect(new Set(picks.map((p) => p.userId)).size).toBe(5);
  });

  it("is deterministic for a seed and order-independent", () => {
    const a = selectWinners(snap, vouchers, "abc");
    const b = selectWinners([...snap].reverse(), vouchers, "abc");
    expect(a).toEqual(b);
    expect(selectWinners(snap, vouchers, "xyz")).not.toEqual(a);
  });

  it("never picks excluded customers", () => {
    const exclude = ["u11", "u10", "u9"];
    for (let i = 0; i < 50; i++) {
      const picks = selectWinners(snap, vouchers, `s${i}`, exclude);
      expect(picks.some((p) => exclude.includes(p.userId))).toBe(false);
    }
  });

  it("leaves vouchers unawarded when there are too few customers", () => {
    expect(selectWinners(snap.slice(0, 3), vouchers, "s")).toHaveLength(3);
    expect(selectWinners([], vouchers, "s")).toEqual([]);
  });

  it("weights by entries", () => {
    const skewed: EntrySnapshotRow[] = [{ userId: "big", kg: 90, entries: 90 }, { userId: "small", kg: 10, entries: 10 }];
    let big = 0;
    for (let i = 0; i < 2000; i++) if (selectWinners(skewed, ["v"], `w${i}`)[0].userId === "big") big++;
    expect(big / 2000).toBeGreaterThan(0.85);
    expect(big / 2000).toBeLessThan(0.95);
  });

  it("rng is uniform-ish in [0,1)", () => {
    const r = rng("u");
    const xs = Array.from({ length: 5000 }, r);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    expect(xs.reduce((a, b) => a + b) / xs.length).toBeCloseTo(0.5, 1);
  });
});
