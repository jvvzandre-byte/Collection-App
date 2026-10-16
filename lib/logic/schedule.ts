import type { CollectionRequest, ISODate, Subscription, Zone } from "@/lib/types";
import { addDays, daysBetween, nextWeekday } from "./dates";

export function normaliseSuburb(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Match an address suburb to an active zone. null → waiting list. */
export function matchZone(suburb: string, zones: Zone[]): Zone | null {
  const key = normaliseSuburb(suburb);
  return zones.find((z) => z.active && z.suburbs.some((s) => normaliseSuburb(s) === key)) ?? null;
}

/** The next `count` collection days for a zone, starting on or after `from`. */
export function upcomingCollectionDays(zone: Zone, from: ISODate, count: number): ISODate[] {
  const first = nextWeekday(from, zone.collectionDay);
  return Array.from({ length: count }, (_, i) => addDays(first, i * 7));
}

/** Does a weekly plan fall on this date (ignoring skips)? */
export function planCovers(sub: Subscription, date: ISODate): boolean {
  if (sub.status !== "active") return false;
  const diff = daysBetween(sub.startDate, date);
  return diff >= 0 && diff % 7 === 0;
}

/** Is this customer due for a collection on `date`? */
export function isDue(userId: string, date: ISODate, subs: Subscription[], requests: CollectionRequest[]): boolean {
  const sub = subs.find((s) => s.userId === userId);
  if (sub && planCovers(sub, date) && !sub.skipped.includes(date)) return true;
  return requests.some((r) => r.userId === userId && r.date === date && r.status === "approved");
}
