import { describe, expect, it } from "vitest";
import type { Collection } from "@/lib/types";
import { activeCustomerIds, isActive } from "@/lib/logic/active";

const col = (userId: string, date: string, status: Collection["status"]): Collection => ({
  id: userId + date, runId: "r", userId, date, order: 0, status, kg: status === "collected" ? 5 : null, driverId: null,
});

describe("active customer rule", () => {
  const cs = [col("u1", "2026-09-10", "collected"), col("u2", "2026-09-10", "rejected"), col("u3", "2026-08-31", "collected")];

  it("needs at least one accepted collection in the month", () => {
    expect(isActive("u1", cs, "2026-09")).toBe(true);
    expect(isActive("u2", cs, "2026-09")).toBe(false);
    expect(isActive("u3", cs, "2026-09")).toBe(false);
    expect(isActive("u3", cs, "2026-08")).toBe(true);
  });

  it("lists active ids", () => {
    expect([...activeCustomerIds(cs, "2026-09")]).toEqual(["u1"]);
  });
});
