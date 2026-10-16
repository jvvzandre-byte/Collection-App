import type { ISODate, MonthKey, Weekday } from "@/lib/types";

// Dates are handled as local calendar days ("YYYY-MM-DD"). Pure helpers only.

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: ISODate, days: number): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000);
}

export function weekdayOf(s: ISODate): Weekday {
  return parseISODate(s).getDay() as Weekday;
}

export function monthOf(s: ISODate): MonthKey {
  return s.slice(0, 7);
}

export function shiftMonth(m: MonthKey, delta: number): MonthKey {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** First date on or after `from` that falls on `weekday`. */
export function nextWeekday(from: ISODate, weekday: Weekday): ISODate {
  const diff = (weekday - weekdayOf(from) + 7) % 7;
  return addDays(from, diff);
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function formatDay(s: ISODate, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return parseISODate(s).toLocaleDateString("en-ZA", opts);
}

export function formatMonth(m: MonthKey, opts: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" }) {
  return parseISODate(`${m}-01`).toLocaleDateString("en-ZA", opts);
}
