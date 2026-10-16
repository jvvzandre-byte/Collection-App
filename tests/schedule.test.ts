import { describe, expect, it } from "vitest";
import type { Subscription, Zone } from "@/lib/types";
import { isDue, matchZone, planCovers, upcomingCollectionDays } from "@/lib/logic/schedule";

const zone: Zone = { id: "z", code: "A", name: "Zone A", suburbs: ["Rondebosch", "Newlands"], collectionDay: 2, capacity: 40, active: true };
const sub = (frequency: Subscription["frequency"], skipped: string[] = []): Subscription => ({
  id: "s", userId: "u", frequency, startDate: "2026-10-06", status: "active", skipped, createdAt: "",
});

describe("schedule", () => {
  it("matches suburbs case- and space-insensitively", () => {
    expect(matchZone("  rondebosch ", [zone])?.id).toBe("z");
    expect(matchZone("Wynberg", [zone])).toBeNull();
    expect(matchZone("Newlands", [{ ...zone, active: false }])).toBeNull();
  });

  it("lists the zone's next collection days", () => {
    // 2026-10-15 is a Thursday; zone day is Tuesday.
    expect(upcomingCollectionDays(zone, "2026-10-15", 3)).toEqual(["2026-10-20", "2026-10-27", "2026-11-03"]);
    expect(upcomingCollectionDays(zone, "2026-10-20", 1)).toEqual(["2026-10-20"]);
  });

  it("weekly and fortnightly plans", () => {
    expect(planCovers(sub("weekly"), "2026-10-13")).toBe(true);
    expect(planCovers(sub("fortnightly"), "2026-10-13")).toBe(false);
    expect(planCovers(sub("fortnightly"), "2026-10-20")).toBe(true);
    expect(planCovers(sub("weekly"), "2026-09-29")).toBe(false);
  });

  it("skips and one-off requests", () => {
    expect(isDue("u", "2026-10-13", [sub("weekly", ["2026-10-13"])], [])).toBe(false);
    expect(isDue("u", "2026-10-13", [], [{ id: "r", userId: "u", date: "2026-10-13", status: "approved", createdAt: "" }])).toBe(true);
    expect(isDue("u", "2026-10-13", [], [{ id: "r", userId: "u", date: "2026-10-13", status: "pending", createdAt: "" }])).toBe(false);
  });
});
