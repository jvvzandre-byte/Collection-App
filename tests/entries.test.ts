import { describe, expect, it } from "vitest";
import type { Collection } from "@/lib/types";
import { buildSnapshot, countedKg, entriesFromKg, monthlyKgByUser, roundKg } from "@/lib/logic/entries";

let n = 0;
const col = (userId: string, date: string, kg: number | null, status: Collection["status"] = "collected"): Collection => ({
  id: `c${n++}`, runId: "r", userId, date, order: 0, status, kg, driverId: "d",
});

describe("entries", () => {
  it("rounds kg to one decimal", () => {
    expect(roundKg(12.345)).toBe(12.3);
    expect(roundKg(0.05)).toBe(0.1);
  });

  it("applies the per-collection cap", () => {
    expect(countedKg(62.4, 50)).toBe(50);
    expect(countedKg(62.4, null)).toBe(62.4);
    expect(countedKg(-3, 50)).toBe(0);
  });

  it("rounds monthly kg down to whole entries", () => {
    expect(entriesFromKg(9.9)).toBe(9);
    expect(entriesFromKg(10)).toBe(10);
    expect(entriesFromKg(0.9)).toBe(0);
  });

  it("sums without floating point drift", () => {
    // 0.1 + 0.2 + 0.7 would be 0.9999999999999999 in floats → 0 entries if done naively.
    const cs = [col("u1", "2026-09-01", 0.1), col("u1", "2026-09-08", 0.2), col("u1", "2026-09-15", 0.7)];
    expect(monthlyKgByUser(cs, "2026-09", null).get("u1")).toBe(1);
    expect(buildSnapshot(cs, "2026-09", null)[0].entries).toBe(1);
  });

  it("only counts accepted kg in the given month", () => {
    const cs = [
      col("u1", "2026-09-02", 10.5),
      col("u1", "2026-09-09", 8, "rejected"),
      col("u1", "2026-09-16", null, "missed"),
      col("u1", "2026-10-01", 20),
      col("u2", "2026-09-30", 4.6),
    ];
    const kg = monthlyKgByUser(cs, "2026-09", 50);
    expect(kg.get("u1")).toBe(10.5);
    expect(kg.get("u2")).toBe(4.6);
  });

  it("snapshot drops zero-entry customers and caps each collection", () => {
    const cs = [col("u1", "2026-09-02", 70), col("u1", "2026-09-09", 5.5), col("u2", "2026-09-02", 0.8)];
    expect(buildSnapshot(cs, "2026-09", 50)).toEqual([{ userId: "u1", kg: 55.5, entries: 55 }]);
  });
});
