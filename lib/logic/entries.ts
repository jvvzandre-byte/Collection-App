import type { Collection, EntrySnapshotRow, MonthKey } from "@/lib/types";
import { monthOf } from "./dates";

// Entry rules (README "Rules → Entries"):
// - kg recorded to one decimal place
// - only accepted (collected) kg counts
// - optional per-collection cap
// - monthly kg per customer summed, then rounded DOWN to whole entries

/** Work in integer tenths of a kg so sums never drift. */
const toTenths = (kg: number) => Math.round(kg * 10);

export function roundKg(kg: number): number {
  return toTenths(kg) / 10;
}

export function countedKg(kg: number, cap: number | null): number {
  const k = Math.max(0, roundKg(kg));
  return cap == null ? k : Math.min(k, cap);
}

/** Accepted kg per customer for a month, after the cap. */
export function monthlyKgByUser(collections: Collection[], month: MonthKey, cap: number | null): Map<string, number> {
  const tenths = new Map<string, number>();
  for (const c of collections) {
    if (c.status !== "collected" || c.kg == null || monthOf(c.date) !== month) continue;
    tenths.set(c.userId, (tenths.get(c.userId) ?? 0) + toTenths(countedKg(c.kg, cap)));
  }
  return new Map([...tenths].map(([u, t]) => [u, t / 10]));
}

export function entriesFromKg(kg: number): number {
  return Math.floor(toTenths(kg) / 10);
}

/** The entries snapshot a draw is run against. Customers with 0 entries are left out. */
export function buildSnapshot(collections: Collection[], month: MonthKey, cap: number | null): EntrySnapshotRow[] {
  return [...monthlyKgByUser(collections, month, cap)]
    .map(([userId, kg]) => ({ userId, kg, entries: entriesFromKg(kg) }))
    .filter((r) => r.entries > 0)
    .sort((a, b) => b.entries - a.entries || a.userId.localeCompare(b.userId));
}
