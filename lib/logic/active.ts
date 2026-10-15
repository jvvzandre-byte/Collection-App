import type { Collection, MonthKey } from "@/lib/types";
import { monthOf } from "./dates";

// A customer is ACTIVE for a month if they had at least one accepted collection in that month.
// (TBC: rolling 30/60 day window instead.)

export function isActive(userId: string, collections: Collection[], month: MonthKey): boolean {
  return collections.some((c) => c.userId === userId && c.status === "collected" && monthOf(c.date) === month);
}

export function activeCustomerIds(collections: Collection[], month: MonthKey): Set<string> {
  const ids = new Set<string>();
  for (const c of collections) if (c.status === "collected" && monthOf(c.date) === month) ids.add(c.userId);
  return ids;
}
