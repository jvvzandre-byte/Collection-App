import type {
  Address, AuditEvent, Collection, CollectionRequest, Draw, Notification, Run, Settings,
  Subscription, User, Voucher, WaitlistEntry, Zone,
} from "@/lib/types";

/** Shape of the mock store. Each key becomes a Supabase table. */
export interface DB {
  version: number;
  seededOn: string;
  users: User[];
  addresses: Address[];
  zones: Zone[];
  waitlist: WaitlistEntry[];
  subscriptions: Subscription[];
  requests: CollectionRequest[];
  runs: Run[];
  collections: Collection[];
  vouchers: Voucher[];
  draws: Draw[];
  notifications: Notification[];
  audit: AuditEvent[];
  settings: Settings;
  /** Dev-only: pending OTP codes by phone. Real auth replaces this. */
  otps: Record<string, string>;
}

/** Bump when the seed or shape changes; browsers with an older copy reseed. */
export const DB_VERSION = 2;
