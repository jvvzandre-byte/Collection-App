import type {
  Audience,
  RouteProviderId,
  Address, AuditEvent, Collection, CollectionRequest, Draw, Frequency, ISODate, MonthKey, Notification,
  Role, Run, Settings, Subscription, User, Voucher, WaitlistEntry, Zone,
} from "@/lib/types";

// The data-access layer. UI code only ever talks to this interface.
// `mock.ts` implements it on localStorage; a Supabase implementation replaces it later.
// Every function checks the caller's role; customer/driver functions are scoped to the current user.

export class AccessError extends Error {}

// ---------- view models ----------

export interface UpcomingDay {
  date: ISODate;
  /** On the customer's weekly plan (not skipped) or an admin-booked extra collection. */
  scheduled: boolean;
  skipped: boolean;
  /** An admin-booked extra collection on this date. */
  request?: CollectionRequest;
}

export interface CustomerHome {
  user: User;
  address: Address | null;
  zone: Zone | null;
  subscription: Subscription | null;
  upcoming: UpcomingDay[];
  next: UpcomingDay | null;
  month: MonthKey;
  monthKg: number;
  monthEntries: number;
  lifetimeKg: number;
  collectionsCount: number;
  history: Collection[];
  active: boolean;
}

export interface PublicWinner {
  displayName: string;
  suburb: string;
  voucher: Voucher;
}

export interface CustomerDraw {
  month: MonthKey;
  myKg: number;
  myEntries: number;
  totalEntries: number;
  prizes: Voucher[];
  pastDraws: { month: MonthKey; runAt: string; winners: PublicWinner[]; mine: Voucher | null }[];
  settings: Settings;
}

export interface StopView extends Collection {
  customerName: string;
  phone: string;
  lat: number | null;
  lng: number | null;
  geo: "approximate" | "exact" | null;
  street: string;
  suburb: string;
}

export interface RunView extends Run {
  zone: Zone;
  driver: User | null;
  stops: StopView[];
  stopCount: number;
  collectedKg: number;
  depot: Settings["depot"];
  /** Straight-line length of depot → stops in current order → depot, km. */
  routeKm: number;
}

export interface DashboardData {
  adminName: string;
  month: MonthKey;
  customers: number;
  activeThisMonth: number;
  /** Same point in the previous month (month-to-date comparison). */
  activeLastMonth: number;
  kgThisMonth: number;
  /** Same point in the previous month (month-to-date comparison). */
  kgLastMonth: number;
  entriesThisMonth: number;
  pendingRequests: number;
  openExceptions: number;
  waitlist: number;
  weekly: { weekStart: ISODate; acceptedKg: number; rejectedCount: number; collectedCount: number }[];
  outcomes: { collected: number; rejected: number; missed: number };
  upcomingRuns: RunView[];
  capacityUsedPct: number;
  zoneKg: { zone: Zone; kg: number; customers: number }[];
  nextDraw: { month: MonthKey; ready: boolean; done: boolean; vouchers: number; entries: number };
}

export interface QueueItem {
  kind: "request" | "plan";
  id: string;
  user: User;
  address: Address | null;
  zone: Zone | null;
  date: ISODate;
  frequency?: Frequency;
  note?: string;
  createdAt: string;
  /** Stops already booked on that date's run vs capacity. */
  load: { booked: number; capacity: number };
}

export interface ExceptionItem {
  kind: "rejected" | "missed" | "unassigned" | "over_capacity";
  id: string;
  date: ISODate;
  title: string;
  detail: string;
  zone: Zone | null;
  collectionId?: string;
  runId?: string;
}

export interface CustomerRow {
  user: User;
  address: Address | null;
  zone: Zone | null;
  plan: Subscription | null;
  kgThisMonth: number;
  entriesThisMonth: number;
  lifetimeKg: number;
  active: boolean;
  lastCollection: ISODate | null;
}

export interface DrawPreview {
  month: MonthKey;
  snapshot: { userId: string; name: string; suburb: string; kg: number; entries: number }[];
  totalEntries: number;
  vouchers: Voucher[];
  draw: Draw | null;
  canRun: boolean;
  blockers: string[];
}

export interface CustomerDetail {
  row: CustomerRow;
  collections: (Collection & { zoneCode: string | null })[];
  requests: CollectionRequest[];
  upcoming: UpcomingDay[];
  months: { month: MonthKey; kg: number; entries: number; collections: number }[];
  messages: Notification[];
  wins: Voucher[];
}

export interface StaffRow {
  user: User;
  runsThisMonth: number;
  kgThisMonth: number;
  upcoming: { id: string; date: ISODate; zoneCode: string }[];
}

export interface CustomerInput {
  id?: string;
  name: string;
  phone: string;
  street: string;
  suburb: string;
  note?: string;
}

export interface BroadcastInput {
  audience: Audience;
  zoneId?: string;
  userId?: string;
  channel: Notification["channel"];
  body: string;
}

export interface RouteProviderInfo {
  id: RouteProviderId;
  label: string;
  description: string;
  available: boolean;
  /** Why it's unavailable, and what's needed to switch it on. */
  reason?: string;
}

export interface SignUpInput {
  name: string;
  phone: string;
  code: string;
  street: string;
  suburb: string;
  consent: boolean;
}

export interface DataApi {
  /** Subscribe to data changes (mock: local writes; Supabase: realtime). */
  onChange(fn: () => void): () => void;
  today(): ISODate;

  // session
  getCurrentUser(): Promise<User | null>;
  requestOtp(phone: string): Promise<{ devCode: string }>;
  signIn(phone: string, code: string): Promise<User>;
  signUp(input: SignUpInput): Promise<{ user: User; zone: Zone | null }>;
  signOut(): Promise<void>;
  /** Dev-only role switcher. */
  devListUsers(): Promise<User[]>;
  devSwitchUser(userId: string | null): Promise<void>;
  devReset(): Promise<void>;

  // shared reference data
  getZones(): Promise<Zone[]>;
  getServedSuburbs(): Promise<{ suburb: string; zone: Zone }[]>;
  getSettings(): Promise<Settings>;

  // customer
  getMyHome(): Promise<CustomerHome>;
  setPlan(frequency: Frequency | null): Promise<void>;
  skipCollection(date: ISODate, skip: boolean): Promise<void>;
  getMyDraw(): Promise<CustomerDraw>;
  updateProfile(input: { name: string }): Promise<void>;

  // driver
  getMyRuns(date?: ISODate): Promise<RunView[]>;
  getRun(runId: string): Promise<RunView>;
  startRun(runId: string): Promise<void>;
  completeRun(runId: string): Promise<void>;
  markCollected(stopId: string, kg: number): Promise<void>;
  markRejected(stopId: string, reason: string): Promise<void>;
  markMissed(stopId: string, reason: string): Promise<void>;
  resetStop(stopId: string): Promise<void>;

  // admin
  getDashboard(): Promise<DashboardData>;
  saveZone(zone: Omit<Zone, "id"> & { id?: string }): Promise<Zone>;
  getDrivers(): Promise<User[]>;
  getRuns(from: ISODate, to: ISODate): Promise<RunView[]>;
  assignDriver(runId: string, driverId: string | null): Promise<void>;
  getRequestQueue(): Promise<QueueItem[]>;
  decideQueueItem(kind: QueueItem["kind"], id: string, approve: boolean): Promise<void>;
  getExceptions(): Promise<ExceptionItem[]>;
  resolveException(collectionId: string, action: "resolve" | "reschedule"): Promise<void>;
  getCustomers(): Promise<CustomerRow[]>;
  getWaitlist(): Promise<WaitlistEntry[]>;
  getVouchers(month: MonthKey): Promise<Voucher[]>;
  saveVoucher(v: Omit<Voucher, "id" | "status"> & { id?: string }): Promise<Voucher>;
  deleteVoucher(id: string): Promise<void>;
  setVoucherStatus(id: string, status: "claimed" | "expired"): Promise<void>;
  getDrawPreview(month: MonthKey): Promise<DrawPreview>;
  runDraw(month: MonthKey, seed?: string): Promise<Draw>;
  redrawVoucher(voucherId: string): Promise<void>;
  getDraws(): Promise<Draw[]>;
  getNotifications(): Promise<Notification[]>;
  getAuditLog(): Promise<AuditEvent[]>;
  updateSettings(s: Partial<Settings>): Promise<void>;
  getUserNames(): Promise<Record<string, string>>;

  // admin: customers
  getCustomer(userId: string): Promise<CustomerDetail>;
  saveCustomer(input: CustomerInput): Promise<User>;
  adminSetPlan(userId: string, frequency: Frequency | null): Promise<void>;
  setUserStatus(userId: string, status: "active" | "suspended"): Promise<void>;
  /** POPIA erasure: wipe personal details, keep anonymised collection history for the ledger. */
  eraseCustomer(userId: string): Promise<void>;
  removeWaitlistEntry(id: string): Promise<void>;

  // admin: team
  getTeam(): Promise<StaffRow[]>;
  saveStaff(input: { id?: string; role: "driver" | "admin"; name: string; phone: string }): Promise<User>;

  // admin: run editing
  addStopToRun(runId: string, userId: string): Promise<void>;
  removeStop(stopId: string): Promise<void>;
  getRouteProviders(): Promise<RouteProviderInfo[]>;
  /** Re-order a run's open stops. Done stops keep their place at the top. */
  optimiseRun(runId: string, provider: RouteProviderId): Promise<{ beforeKm: number; afterKm: number }>;
  moveStop(stopId: string, direction: -1 | 1): Promise<void>;
  reopenRun(runId: string): Promise<void>;

  // admin: queue + messages
  approveAllFitting(): Promise<{ approved: number; skipped: number }>;
  previewAudience(input: Omit<BroadcastInput, "body" | "channel">): Promise<number>;
  sendBroadcast(input: BroadcastInput): Promise<number>;
}

export type { Role };
