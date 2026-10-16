// Core domain types. These map 1:1 to the future Supabase tables.

export type Role = "customer" | "driver" | "admin";

/** ISO date, "YYYY-MM-DD" (local calendar day, no time). */
export type ISODate = string;
/** Month key, "YYYY-MM". */
export type MonthKey = string;
/** 0 = Sunday … 6 = Saturday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface User {
  id: string;
  role: Role;
  name: string;
  phone: string;
  phoneVerified: boolean;
  createdAt: string;
  /** POPIA consent timestamp (customers only). */
  consentAt?: string;
}

export interface Address {
  id: string;
  userId: string;
  street: string;
  suburb: string;
  /** null when the suburb is not served yet (customer sits on the waiting list). */
  zoneId: string | null;
}

export interface Zone {
  id: string;
  code: string; // "A", "B", …
  name: string;
  suburbs: string[];
  collectionDay: Weekday;
  /** Max stops per run. */
  capacity: number;
  active: boolean;
}

export interface WaitlistEntry {
  id: string;
  userId?: string;
  name: string;
  phone: string;
  suburb: string;
  createdAt: string;
}

export type Frequency = "weekly" | "fortnightly";

/** A standing pickup. */
export interface Subscription {
  id: string;
  userId: string;
  frequency: Frequency;
  /** First collection date; fortnightly plans count from here. */
  startDate: ISODate;
  status: "pending" | "active" | "paused" | "declined";
  /** Dates the customer has skipped. */
  skipped: ISODate[];
  createdAt: string;
}

/** A one-off opt-in for a specific collection date. */
export interface CollectionRequest {
  id: string;
  userId: string;
  date: ISODate;
  status: "pending" | "approved" | "declined" | "cancelled";
  note?: string;
  createdAt: string;
}

export interface Run {
  id: string;
  zoneId: string;
  date: ISODate;
  driverId: string | null;
  status: "planned" | "in_progress" | "completed";
}

export type StopStatus = "pending" | "collected" | "rejected" | "missed";

/** One household on one run. Becomes the `collections` table. */
export interface Collection {
  id: string;
  runId: string;
  userId: string;
  date: ISODate;
  order: number;
  status: StopStatus;
  /** Accepted kg, one decimal. Only set when collected. */
  kg: number | null;
  reason?: string;
  driverId: string | null;
  recordedAt?: string;
  /** Admin has dealt with this exception. */
  resolved?: boolean;
}

export type VoucherStatus = "available" | "drawn" | "notified" | "claimed" | "expired";

export interface Voucher {
  id: string;
  month: MonthKey;
  name: string;
  sponsor: string;
  valueRands: number;
  /** Background tone for the voucher card (no image upload in the mock). */
  tone: "lilac" | "butter" | "mint" | "rose" | "sky";
  expiry: ISODate;
  status: VoucherStatus;
  winnerId?: string;
  drawId?: string;
  notifiedAt?: string;
  claimedAt?: string;
}

export interface EntrySnapshotRow {
  userId: string;
  kg: number;
  entries: number;
}

export interface DrawWinner {
  voucherId: string;
  userId: string;
  /** "draw" for the original pick, "redraw" when a voucher was re-awarded. */
  kind: "draw" | "redraw";
  at: string;
}

export interface Draw {
  id: string;
  month: MonthKey;
  seed: string;
  runAt: string;
  runBy: string;
  totalEntries: number;
  snapshot: EntrySnapshotRow[];
  winners: DrawWinner[];
}

export interface Notification {
  id: string;
  userId: string | null;
  phone: string;
  channel: "sms" | "whatsapp";
  body: string;
  sentAt: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  action: string;
  detail: string;
}

export interface Settings {
  /** Cap on counted kg per collection. null = no cap. (TBC, suggested 50) */
  kgCapPerCollection: number | null;
  /** Days before an unclaimed voucher may be redrawn. (TBC, suggested 14) */
  redrawAfterDays: number;
  /** Active-customer rule. (TBC) */
  activeRule: "calendar_month";
  /** Day of month the draw runs for the previous month. (TBC, suggested 1) */
  drawDay: number;
}
