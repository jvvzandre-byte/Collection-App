import type {
  Collection, CollectionRequest, ISODate, Notification, Role, Run, User, Voucher, Zone,
} from "@/lib/types";
import { activeCustomerIds } from "@/lib/logic/active";
import { addDays, daysBetween, formatDay, formatMonth, monthOf, nextWeekday, shiftMonth, toISODate, weekdayOf } from "@/lib/logic/dates";
import { buildSnapshot, entriesFromKg, monthlyKgByUser, roundKg } from "@/lib/logic/entries";
import { generateSeed, selectWinners } from "@/lib/logic/draw";
import { isDue, matchZone, normaliseSuburb, planCovers, upcomingCollectionDays } from "@/lib/logic/schedule";
import {
  AccessError, type CustomerDetail, type CustomerRow, type StaffRow, type DataApi, type DrawPreview, type ExceptionItem, type QueueItem, type RunView,
  type StopView, type UpcomingDay,
} from "./api";
import { DB_VERSION, type DB } from "./db";
import { createSeed } from "./seed";

// Mock backend: one JSON document in localStorage. Development only —
// in particular the draw must move server-side when Supabase goes in.

const DB_KEY = "rc.db";
const SESSION_KEY = "rc.session";

let db: DB | null = null;
let sessionUserId: string | null = null;
const listeners = new Set<() => void>();

const hasWindow = () => typeof window !== "undefined";
const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clone = <T,>(x: T): T => structuredClone(x);
const today = () => toISODate(new Date());

function load(): DB {
  if (db) return db;
  if (hasWindow()) {
    try {
      const raw = localStorage.getItem(DB_KEY);
      const parsed = raw ? (JSON.parse(raw) as DB) : null;
      if (parsed && parsed.version === DB_VERSION) db = parsed;
      sessionUserId = localStorage.getItem(SESSION_KEY);
    } catch {
      /* fall through to seed */
    }
  }
  if (!db) {
    db = createSeed();
    save(false);
  }
  return db;
}

function save(emit = true) {
  if (hasWindow() && db) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      if (sessionUserId) localStorage.setItem(SESSION_KEY, sessionUserId);
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage full / private mode: keep working in memory */
    }
  }
  if (emit) listeners.forEach((fn) => fn());
}

if (hasWindow()) {
  window.addEventListener("storage", (e) => {
    if (e.key !== DB_KEY && e.key !== SESSION_KEY) return;
    db = null;
    load();
    listeners.forEach((fn) => fn());
  });
}

// ---------- helpers ----------

function currentUser(): User | null {
  const d = load();
  return d.users.find((u) => u.id === sessionUserId) ?? null;
}

function requireRole(...roles: Role[]): User {
  const u = currentUser();
  if (!u) throw new AccessError("Please sign in.");
  if (!roles.includes(u.role)) throw new AccessError(`This needs the ${roles.join(" or ")} role.`);
  return u;
}

/** "082 123 4567" / "+27821234567" → "+27 82 123 4567" (SA numbers); other countries keep their digits. */
function normalisePhone(p: string): string {
  const raw = p.replace(/[^\d+]/g, "");
  const full = raw.startsWith("+") ? raw : raw.startsWith("0") ? `+27${raw.slice(1)}` : `+${raw}`;
  const sa = full.match(/^\+27(\d{2})(\d{3})(\d{4})$/);
  return sa ? `+27 ${sa[1]} ${sa[2]} ${sa[3]}` : full;
}

const samePhone = (a: string, b: string) => normalisePhone(a) === normalisePhone(b);

function audit(actor: User | null, action: string, detail: string) {
  load().audit.unshift({ id: uid("au"), at: now(), actorId: actor?.id ?? "system", action, detail });
}

function notify(user: { id?: string; phone: string } | null, body: string, channel: Notification["channel"] = "whatsapp") {
  if (!user) return;
  load().notifications.unshift({ id: uid("n"), userId: user.id ?? null, phone: user.phone, channel, body, sentAt: now() });
}

const addressOf = (userId: string) => load().addresses.find((a) => a.userId === userId) ?? null;
const zoneById = (id: string | null | undefined) => load().zones.find((z) => z.id === id) ?? null;
const userById = (id: string | null | undefined) => load().users.find((u) => u.id === id) ?? null;
const firstName = (u: User) => u.name.split(" ")[0];
const publicName = (u: User) => {
  const [f, ...rest] = u.name.split(" ");
  return rest.length ? `${f} ${rest[rest.length - 1][0]}.` : f;
};

/** Make sure a run exists for every active zone's collection day in [from, to]. */
function ensureRuns(from: ISODate, to: ISODate) {
  const d = load();
  for (const zone of d.zones.filter((z) => z.active)) {
    for (let day = nextWeekday(from, zone.collectionDay); day <= to; day = addDays(day, 7)) {
      if (!d.runs.some((r) => r.zoneId === zone.id && r.date === day))
        d.runs.push({ id: `run-${zone.code}-${day}`, zoneId: zone.id, date: day, driverId: null, status: "planned" });
    }
  }
}

/** Suspended and erased customers get no collections. */
const isCollectable = (userId: string) => {
  const s = userById(userId)?.status;
  return s !== "suspended" && s !== "erased";
};

/** Bring a not-yet-finished run's stop list in line with plans, skips and approved requests. */
function syncStops(run: Run) {
  if (run.status === "completed") return;
  const d = load();
  const due = d.addresses
    .filter((a) => a.zoneId === run.zoneId && isCollectable(a.userId) && isDue(a.userId, run.date, d.subscriptions, d.requests))
    .sort((a, b) => a.street.localeCompare(b.street));
  const dueIds = new Set(due.map((a) => a.userId));
  d.collections = d.collections.filter((c) => c.runId !== run.id || c.status !== "pending" || dueIds.has(c.userId));
  const existing = d.collections.filter((c) => c.runId === run.id);
  let order = existing.reduce((m, c) => Math.max(m, c.order + 1), 0);
  for (const a of due) {
    if (existing.some((c) => c.userId === a.userId)) continue;
    d.collections.push({ id: uid("col"), runId: run.id, userId: a.userId, date: run.date, order: order++, status: "pending", kg: null, driverId: run.driverId });
  }
}

function stopView(c: Collection): StopView {
  const u = userById(c.userId)!;
  const a = addressOf(c.userId);
  return { ...c, customerName: u.name, phone: u.phone, street: a?.street ?? "", suburb: a?.suburb ?? "" };
}

function runView(run: Run, withStops = true): RunView {
  syncStops(run);
  const stops = load().collections.filter((c) => c.runId === run.id).sort((a, b) => a.order - b.order);
  return {
    ...clone(run),
    zone: clone(zoneById(run.zoneId)!),
    driver: clone(userById(run.driverId)),
    stops: withStops ? stops.map(stopView) : [],
    stopCount: stops.length,
    collectedKg: roundKg(stops.reduce((s, c) => s + (c.status === "collected" ? c.kg ?? 0 : 0), 0)),
  };
}

function runFor(zoneId: string, date: ISODate) {
  ensureRuns(date, date);
  return load().runs.find((r) => r.zoneId === zoneId && r.date === date) ?? null;
}

function bookedOn(zoneId: string, date: ISODate) {
  const run = runFor(zoneId, date);
  if (!run) return 0;
  syncStops(run);
  return load().collections.filter((c) => c.runId === run.id).length;
}

function findStop(stopId: string, driver: User) {
  const d = load();
  const c = d.collections.find((x) => x.id === stopId);
  if (!c) throw new Error("Stop not found.");
  const run = d.runs.find((r) => r.id === c.runId)!;
  if (driver.role === "driver" && run.driverId !== driver.id) throw new AccessError("This stop is on another driver's run.");
  if (run.status === "completed") throw new Error("This run is already completed.");
  return { c, run };
}

function startIfPlanned(run: Run) {
  if (run.status === "planned") run.status = "in_progress";
}

function monthKgFor(userId: string, month: string) {
  const d = load();
  return monthlyKgByUser(d.collections, month, d.settings.kgCapPerCollection).get(userId) ?? 0;
}

function upcomingFor(userId: string, zone: Zone, count = 6): UpcomingDay[] {
  const d = load();
  const sub = d.subscriptions.find((s) => s.userId === userId) ?? null;
  return upcomingCollectionDays(zone, today(), count).map((date) => {
    const request = d.requests.find((r) => r.userId === userId && r.date === date && (r.status === "pending" || r.status === "approved"));
    const onPlan = !!sub && planCovers(sub, date);
    const skipped = onPlan && sub!.skipped.includes(date);
    return { date, scheduled: (onPlan && !skipped) || request?.status === "approved", skipped, request: clone(request) };
  });
}

/** Who a broadcast reaches. Waitlist entries without an account are addressed by phone. */
function audienceOf({ audience, zoneId, userId }: { audience: string; zoneId?: string; userId?: string }): { id?: string; phone: string }[] {
  const d = load();
  const customers = d.users.filter((u) => u.role === "customer" && u.status !== "erased" && u.phone);
  switch (audience) {
    case "all": return customers.filter((u) => addressOf(u.id)?.zoneId);
    case "active": {
      const ids = activeCustomerIds(d.collections, monthOf(today()));
      return customers.filter((u) => ids.has(u.id));
    }
    case "zone": return customers.filter((u) => addressOf(u.id)?.zoneId === zoneId);
    case "waitlist": return d.waitlist.map((w) => ({ id: w.userId, phone: w.phone }));
    case "user": return customers.filter((u) => u.id === userId);
    default: return [];
  }
}

// ---------- implementation ----------

export const mockApi: DataApi = {
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  today,

  // ----- session -----
  async getCurrentUser() {
    return clone(currentUser());
  },

  async requestOtp(phone) {
    const d = load();
    const code = String(1000 + Math.floor(Math.random() * 9000));
    d.otps[normalisePhone(phone)] = code;
    notify({ phone }, `Your verification code is ${code}. It expires in 10 minutes.`, "sms");
    save();
    return { devCode: code };
  },

  async signIn(phone, code) {
    const d = load();
    if (d.otps[normalisePhone(phone)] !== code.trim()) throw new Error("That code doesn't match. Try again or resend.");
    const u = d.users.find((x) => x.status !== "erased" && samePhone(x.phone, phone));
    if (!u) throw new Error("No account for this number yet. Sign up instead.");
    if (u.role !== "customer" && u.status === "suspended") throw new Error("This account is suspended. Contact an admin.");
    delete d.otps[normalisePhone(phone)];
    sessionUserId = u.id;
    save();
    return clone(u);
  },

  async signUp(input) {
    const d = load();
    if (!input.consent) throw new Error("We need your consent to store your details.");
    if (!input.name.trim()) throw new Error("Please enter your name.");
    if (d.otps[normalisePhone(input.phone)] !== input.code.trim()) throw new Error("That code doesn't match.");
    if (d.users.some((u) => u.status !== "erased" && samePhone(u.phone, input.phone))) throw new Error("This number already has an account. Sign in instead.");
    const street = input.street.trim().toLowerCase().replace(/\s+/g, " ");
    const suburb = normaliseSuburb(input.suburb);
    if (d.addresses.some((a) => a.street.toLowerCase().replace(/\s+/g, " ") === street && normaliseSuburb(a.suburb) === suburb))
      throw new Error("This address already has an account. Only one account per household is allowed.");

    const zone = matchZone(input.suburb, d.zones);
    const user: User = { id: uid("u"), role: "customer", name: input.name.trim(), phone: normalisePhone(input.phone), phoneVerified: true, createdAt: now(), consentAt: now() };
    d.users.push(user);
    d.addresses.push({ id: uid("a"), userId: user.id, street: input.street.trim(), suburb: input.suburb.trim(), zoneId: zone?.id ?? null });
    if (!zone) d.waitlist.push({ id: uid("w"), userId: user.id, name: user.name, phone: user.phone, suburb: input.suburb.trim(), createdAt: now() });
    delete d.otps[normalisePhone(input.phone)];
    sessionUserId = user.id;
    notify(user, zone
      ? `Welcome ${firstName(user)}! You're in Zone ${zone.code}. Collections are on ${["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][zone.collectionDay]}.`
      : `Thanks ${firstName(user)}! We don't collect in ${input.suburb} yet. You're on the waiting list and we'll let you know when we do.`);
    audit(user, "user.signup", `${user.name} · ${input.suburb}${zone ? ` → Zone ${zone.code}` : " → waiting list"}`);
    save();
    return { user: clone(user), zone: clone(zone) };
  },

  async signOut() {
    sessionUserId = null;
    save();
  },

  async devListUsers() {
    return clone(load().users);
  },
  async devSwitchUser(userId) {
    load();
    sessionUserId = userId;
    save();
  },
  async devReset() {
    db = createSeed();
    save();
  },

  // ----- reference -----
  async getZones() {
    return clone(load().zones);
  },
  async getServedSuburbs() {
    return load().zones.filter((z) => z.active).flatMap((zone) => zone.suburbs.map((suburb) => ({ suburb, zone: clone(zone) })))
      .sort((a, b) => a.suburb.localeCompare(b.suburb));
  },
  async getSettings() {
    return clone(load().settings);
  },

  // ----- customer -----
  async getMyHome() {
    const user = requireRole("customer");
    const d = load();
    const address = addressOf(user.id);
    const zone = zoneById(address?.zoneId);
    const subscription = d.subscriptions.find((s) => s.userId === user.id) ?? null;
    const upcoming = zone ? upcomingFor(user.id, zone) : [];
    const month = monthOf(today());
    const monthKg = monthKgFor(user.id, month);
    const mine = d.collections.filter((c) => c.userId === user.id && c.status !== "pending");
    const lifetimeKg = roundKg(mine.reduce((s, c) => s + (c.status === "collected" ? c.kg ?? 0 : 0), 0));
    return {
      user: clone(user), address: clone(address), zone: clone(zone), subscription: clone(subscription),
      upcoming, next: upcoming.find((u) => u.scheduled || u.skipped || u.request) ?? null,
      month, monthKg, monthEntries: entriesFromKg(monthKg), lifetimeKg,
      collectionsCount: mine.filter((c) => c.status === "collected").length,
      history: clone(mine.sort((a, b) => b.date.localeCompare(a.date))),
      active: activeCustomerIds(d.collections, month).has(user.id),
    };
  },

  async setPlan(frequency) {
    const user = requireRole("customer");
    const d = load();
    const zone = zoneById(addressOf(user.id)?.zoneId);
    if (!zone) throw new Error("Your area isn't served yet, so plans aren't available.");
    const existing = d.subscriptions.find((s) => s.userId === user.id);
    const startDate = nextWeekday(addDays(today(), 1), zone.collectionDay);
    if (!frequency) {
      d.subscriptions = d.subscriptions.filter((s) => s.userId !== user.id);
      audit(user, "plan.cancel", `${user.name} stopped their standing pickup`);
    } else if (existing && existing.status === "active") {
      if (existing.frequency !== frequency) Object.assign(existing, { frequency, startDate });
      audit(user, "plan.change", `${user.name} → ${frequency}`);
    } else {
      d.subscriptions = d.subscriptions.filter((s) => s.userId !== user.id);
      d.subscriptions.push({ id: uid("s"), userId: user.id, frequency, startDate, status: "pending", skipped: [], createdAt: now() });
      audit(user, "plan.request", `${user.name} asked for a ${frequency} pickup`);
    }
    save();
  },

  async skipCollection(date, skip) {
    const user = requireRole("customer");
    const sub = load().subscriptions.find((s) => s.userId === user.id);
    if (!sub || !planCovers(sub, date)) throw new Error("That date isn't on your plan.");
    if (date < today()) throw new Error("You can't change a past collection.");
    sub.skipped = skip ? [...new Set([...sub.skipped, date])] : sub.skipped.filter((x) => x !== date);
    save();
  },

  async createCollectionRequest({ date, note }) {
    const user = requireRole("customer");
    const d = load();
    const zone = zoneById(addressOf(user.id)?.zoneId);
    if (!zone) throw new Error("Your area isn't served yet.");
    if (weekdayOf(date) !== zone.collectionDay || date <= today()) throw new Error("Pick one of your zone's upcoming collection days. Same-day requests aren't possible.");
    if (d.requests.some((r) => r.userId === user.id && r.date === date && (r.status === "pending" || r.status === "approved")))
      throw new Error("You've already asked for this date.");
    const req: CollectionRequest = { id: uid("req"), userId: user.id, date, status: "pending", note: note?.trim() || undefined, createdAt: now() };
    d.requests.push(req);
    save();
    return clone(req);
  },

  async cancelCollectionRequest(id) {
    const user = requireRole("customer");
    const req = load().requests.find((r) => r.id === id && r.userId === user.id);
    if (!req) throw new Error("Request not found.");
    req.status = "cancelled";
    save();
  },

  async getMyDraw() {
    const user = requireRole("customer");
    const d = load();
    const month = monthOf(today());
    const myKg = monthKgFor(user.id, month);
    const all = monthlyKgByUser(d.collections, month, d.settings.kgCapPerCollection);
    return {
      month, myKg, myEntries: entriesFromKg(myKg),
      totalEntries: [...all.values()].reduce((s, kg) => s + entriesFromKg(kg), 0),
      prizes: clone(d.vouchers.filter((v) => v.month === month)),
      pastDraws: [...d.draws].sort((a, b) => b.month.localeCompare(a.month)).map((dr) => {
        const vouchers = d.vouchers.filter((v) => v.drawId === dr.id && v.winnerId);
        return {
          month: dr.month, runAt: dr.runAt,
          winners: vouchers.map((v) => ({ displayName: publicName(userById(v.winnerId)!), suburb: addressOf(v.winnerId!)?.suburb ?? "", voucher: clone(v) })),
          mine: clone(vouchers.find((v) => v.winnerId === user.id) ?? null),
        };
      }),
      settings: clone(d.settings),
    };
  },

  async updateProfile({ name }) {
    const user = requireRole("customer", "driver", "admin");
    if (!name.trim()) throw new Error("Name can't be empty.");
    load().users.find((u) => u.id === user.id)!.name = name.trim();
    save();
  },

  // ----- driver -----
  async getMyRuns(date) {
    const me = requireRole("driver", "admin");
    const from = date ?? today();
    const to = date ?? addDays(today(), 14);
    ensureRuns(from, to);
    const runs = load().runs
      .filter((r) => r.date >= from && r.date <= to && (me.role === "admin" || r.driverId === me.id))
      .sort((a, b) => a.date.localeCompare(b.date));
    const views = runs.map((r) => runView(r));
    save(false);
    return views;
  },

  async getRun(runId) {
    const me = requireRole("driver", "admin");
    const run = load().runs.find((r) => r.id === runId);
    if (!run) throw new Error("Run not found.");
    if (me.role === "driver" && run.driverId !== me.id) throw new AccessError("This run is assigned to another driver.");
    const view = runView(run);
    save(false);
    return view;
  },

  async startRun(runId) {
    const me = requireRole("driver", "admin");
    const run = load().runs.find((r) => r.id === runId);
    if (!run || (me.role === "driver" && run.driverId !== me.id)) throw new AccessError("Not your run.");
    startIfPlanned(run);
    audit(me, "run.start", `${run.id}`);
    save();
  },

  async completeRun(runId) {
    const me = requireRole("driver", "admin");
    const d = load();
    const run = d.runs.find((r) => r.id === runId);
    if (!run || (me.role === "driver" && run.driverId !== me.id)) throw new AccessError("Not your run.");
    syncStops(run);
    for (const c of d.collections.filter((x) => x.runId === run.id && x.status === "pending"))
      Object.assign(c, { status: "missed", reason: "Not reached", recordedAt: now(), driverId: me.id });
    run.status = "completed";
    audit(me, "run.complete", `${run.id}`);
    save();
  },

  async markCollected(stopId, kg) {
    const me = requireRole("driver", "admin");
    const { c, run } = findStop(stopId, me);
    const value = roundKg(kg);
    if (!(value > 0) || value > 300) throw new Error("Enter a weight between 0.1 and 300 kg.");
    Object.assign(c, { status: "collected", kg: value, reason: undefined, recordedAt: now(), driverId: me.id });
    startIfPlanned(run);
    const u = userById(c.userId)!;
    const total = monthKgFor(u.id, monthOf(c.date));
    const cap = load().settings.kgCapPerCollection;
    notify(u, `Collected today: ${value} kg${cap != null && value > cap ? ` (${cap} kg counts toward the draw)` : ""}. You're on ${total} kg this month, which is ${entriesFromKg(total)} entries so far. Thank you!`);
    save();
  },

  async markRejected(stopId, reason) {
    const me = requireRole("driver", "admin");
    const { c, run } = findStop(stopId, me);
    if (!reason.trim()) throw new Error("Pick a reason.");
    Object.assign(c, { status: "rejected", kg: null, reason: reason.trim(), recordedAt: now(), driverId: me.id, resolved: false });
    startIfPlanned(run);
    notify(userById(c.userId), `We couldn't accept your recycling today: ${reason.trim()}. Please keep it dry and separate next time.`);
    save();
  },

  async markMissed(stopId, reason) {
    const me = requireRole("driver", "admin");
    const { c, run } = findStop(stopId, me);
    Object.assign(c, { status: "missed", kg: null, reason: reason.trim() || "Not out", recordedAt: now(), driverId: me.id, resolved: false });
    startIfPlanned(run);
    notify(userById(c.userId), `We missed your collection today (${reason.trim() || "bags not out"}). Reply if you'd like us to come back on the next run.`);
    save();
  },

  async resetStop(stopId) {
    const me = requireRole("driver", "admin");
    const { c } = findStop(stopId, me);
    Object.assign(c, { status: "pending", kg: null, reason: undefined, recordedAt: undefined, resolved: undefined });
    save();
  },

  // ----- admin -----
  async getDashboard() {
    const me = requireRole("admin");
    const d = load();
    const t = today();
    const month = monthOf(t);
    const lastMonth = shiftMonth(month, -1);
    const cap = d.settings.kgCapPerCollection;
    ensureRuns(t, addDays(t, 21));

    // Compare month-to-date against the same point last month, not the whole of last month.
    const lastMonthToDate = d.collections.filter((c) => c.date <= `${lastMonth}-${t.slice(8)}`);
    const sumKg = (m: string, cs = d.collections) => roundKg([...monthlyKgByUser(cs, m, cap).values()].reduce((s, k) => s + k, 0));
    const weekStart = (iso: ISODate) => addDays(iso, -((weekdayOf(iso) + 6) % 7));
    const thisWeek = weekStart(t);
    const weekly = Array.from({ length: 12 }, (_, i) => {
      const ws = addDays(thisWeek, (i - 11) * 7);
      const inWeek = d.collections.filter((c) => c.date >= ws && c.date < addDays(ws, 7));
      return {
        weekStart: ws,
        acceptedKg: roundKg(inWeek.reduce((s, c) => s + (c.status === "collected" ? c.kg ?? 0 : 0), 0)),
        collectedCount: inWeek.filter((c) => c.status === "collected").length,
        rejectedCount: inWeek.filter((c) => c.status === "rejected").length,
      };
    });
    const last30 = d.collections.filter((c) => c.date > addDays(t, -30) && c.date <= t && c.status !== "pending");
    const upcoming = d.runs.filter((r) => r.date >= t && r.date <= addDays(t, 6)).sort((a, b) => a.date.localeCompare(b.date)).map((r) => runView(r, false));
    const capTotal = upcoming.reduce((s, r) => s + r.zone.capacity, 0);
    const kgByUser = monthlyKgByUser(d.collections, month, cap);
    const prevMonthVouchers = d.vouchers.filter((v) => v.month === lastMonth);
    const prevSnapshot = buildSnapshot(d.collections, lastMonth, cap);
    const exceptions = await mockApi.getExceptions();
    const queue = await mockApi.getRequestQueue();
    save(false);

    return {
      adminName: me.name,
      month,
      customers: d.users.filter((u) => u.role === "customer").length,
      activeThisMonth: activeCustomerIds(d.collections, month).size,
      activeLastMonth: activeCustomerIds(lastMonthToDate, lastMonth).size,
      kgThisMonth: sumKg(month),
      kgLastMonth: sumKg(lastMonth, lastMonthToDate),
      entriesThisMonth: [...kgByUser.values()].reduce((s, k) => s + entriesFromKg(k), 0),
      pendingRequests: queue.length,
      openExceptions: exceptions.length,
      waitlist: d.waitlist.length,
      weekly,
      outcomes: {
        collected: last30.filter((c) => c.status === "collected").length,
        rejected: last30.filter((c) => c.status === "rejected").length,
        missed: last30.filter((c) => c.status === "missed").length,
      },
      upcomingRuns: upcoming,
      capacityUsedPct: capTotal ? Math.round((upcoming.reduce((s, r) => s + r.stopCount, 0) / capTotal) * 100) : 0,
      zoneKg: d.zones.map((zone) => {
        const ids = new Set(d.addresses.filter((a) => a.zoneId === zone.id).map((a) => a.userId));
        return { zone: clone(zone), customers: ids.size, kg: roundKg([...kgByUser].filter(([u]) => ids.has(u)).reduce((s, [, k]) => s + k, 0)) };
      }),
      nextDraw: {
        month: lastMonth,
        done: d.draws.some((x) => x.month === lastMonth),
        ready: prevMonthVouchers.length > 0 && prevSnapshot.length > 0,
        vouchers: prevMonthVouchers.length,
        entries: prevSnapshot.reduce((s, x) => s + x.entries, 0),
      },
    };
  },

  async saveZone(input) {
    const me = requireRole("admin");
    const d = load();
    const suburbs = [...new Set(input.suburbs.map((s) => s.trim()).filter(Boolean))];
    if (!input.name.trim() || !input.code.trim()) throw new Error("Zone needs a code and a name.");
    if (!suburbs.length) throw new Error("Add at least one suburb.");
    for (const z of d.zones.filter((x) => x.id !== input.id)) {
      if (z.code.toLowerCase() === input.code.trim().toLowerCase()) throw new Error(`Zone code ${z.code} is taken.`);
      const clash = suburbs.find((s) => z.suburbs.some((o) => normaliseSuburb(o) === normaliseSuburb(s)));
      if (clash) throw new Error(`${clash} is already in Zone ${z.code}.`);
    }
    const zone: Zone = { ...input, id: input.id ?? uid("zone"), code: input.code.trim().toUpperCase(), name: input.name.trim(), suburbs, capacity: Math.max(1, Math.round(input.capacity)) };
    const idx = d.zones.findIndex((z) => z.id === zone.id);
    const before = idx >= 0 ? d.zones[idx] : null;
    if (idx >= 0) d.zones[idx] = zone;
    else d.zones.push(zone);

    if (before && before.collectionDay !== zone.collectionDay) {
      // Planned runs on the old weekday no longer apply.
      const dropped = new Set(d.runs.filter((r) => r.zoneId === zone.id && r.status === "planned" && r.date >= today()).map((r) => r.id));
      d.runs = d.runs.filter((r) => !dropped.has(r.id));
      d.collections = d.collections.filter((c) => !dropped.has(c.runId));
      for (const s of d.subscriptions.filter((x) => addressOf(x.userId)?.zoneId === zone.id))
        s.startDate = nextWeekday(addDays(today(), 1), zone.collectionDay);
    }

    // Opening a suburb converts its waiting list.
    if (zone.active) {
      for (const w of [...d.waitlist]) {
        if (!matchZone(w.suburb, [zone])) continue;
        const addr = w.userId ? addressOf(w.userId) : null;
        if (addr) addr.zoneId = zone.id;
        notify(w, `Good news: we now collect in ${w.suburb}! ${addr ? "Open the app to choose a pickup plan." : "Sign up in the app to get started."}`);
        d.waitlist = d.waitlist.filter((x) => x.id !== w.id);
      }
    }
    audit(me, before ? "zone.update" : "zone.create", `Zone ${zone.code} · ${suburbs.join(", ")}`);
    save();
    return clone(zone);
  },

  async getDrivers() {
    requireRole("admin");
    return clone(load().users.filter((u) => u.role === "driver" && u.status !== "suspended"));
  },

  async getRuns(from, to) {
    requireRole("admin");
    ensureRuns(from, to);
    const views = load().runs.filter((r) => r.date >= from && r.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || a.zoneId.localeCompare(b.zoneId))
      .map((r) => runView(r));
    save(false);
    return views;
  },

  async assignDriver(runId, driverId) {
    const me = requireRole("admin");
    const d = load();
    const run = d.runs.find((r) => r.id === runId);
    if (!run) throw new Error("Run not found.");
    if (driverId && userById(driverId)?.role !== "driver") throw new Error("Not a driver.");
    if (driverId && userById(driverId)?.status === "suspended") throw new Error("That driver is suspended.");
    run.driverId = driverId;
    for (const c of d.collections.filter((x) => x.runId === runId && x.status === "pending")) c.driverId = driverId;
    audit(me, "run.assign", `${run.id} → ${userById(driverId)?.name ?? "unassigned"}`);
    save();
  },

  async getRequestQueue() {
    requireRole("admin");
    const d = load();
    const item = (u: User, partial: Omit<QueueItem, "user" | "address" | "zone" | "load">): QueueItem => {
      const address = addressOf(u.id);
      const zone = zoneById(address?.zoneId);
      return { ...partial, user: clone(u), address: clone(address), zone: clone(zone), load: { booked: zone ? bookedOn(zone.id, partial.date) : 0, capacity: zone?.capacity ?? 0 } };
    };
    const items = [
      ...d.requests.filter((r) => r.status === "pending" && r.date >= today()).map((r) => item(userById(r.userId)!, { kind: "request", id: r.id, date: r.date, note: r.note, createdAt: r.createdAt })),
      ...d.subscriptions.filter((s) => s.status === "pending").map((s) => item(userById(s.userId)!, { kind: "plan", id: s.id, date: s.startDate, frequency: s.frequency, createdAt: s.createdAt })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    save(false);
    return items;
  },

  async decideQueueItem(kind, id, approve) {
    const me = requireRole("admin");
    const d = load();
    if (kind === "request") {
      const r = d.requests.find((x) => x.id === id);
      if (!r || r.status !== "pending") throw new Error("Request is no longer pending.");
      const u = userById(r.userId)!;
      const zone = zoneById(addressOf(u.id)?.zoneId);
      if (approve && zone && bookedOn(zone.id, r.date) >= zone.capacity) throw new Error(`The ${formatDay(r.date)} run is full (${zone.capacity} stops).`);
      r.status = approve ? "approved" : "declined";
      notify(u, approve ? `You're booked for collection on ${formatDay(r.date, { weekday: "long", day: "numeric", month: "long" })}. Bags out by 7am.` : `Sorry, we can't collect on ${formatDay(r.date)}. Please pick another day in the app.`);
      audit(me, approve ? "request.approve" : "request.decline", `${u.name} · ${r.date}`);
    } else {
      const s = d.subscriptions.find((x) => x.id === id);
      if (!s || s.status !== "pending") throw new Error("Plan is no longer pending.");
      const u = userById(s.userId)!;
      s.status = approve ? "active" : "declined";
      if (approve && s.startDate < today()) {
        const zone = zoneById(addressOf(u.id)?.zoneId);
        if (zone) s.startDate = nextWeekday(today(), zone.collectionDay);
      }
      notify(u, approve ? `Your ${s.frequency} pickup is confirmed, starting ${formatDay(s.startDate, { weekday: "long", day: "numeric", month: "long" })}.` : "Sorry, we can't add a standing pickup for you right now. We'll be in touch.");
      audit(me, approve ? "plan.approve" : "plan.decline", `${u.name} · ${s.frequency}`);
    }
    save();
  },

  async getExceptions() {
    requireRole("admin");
    const d = load();
    const t = today();
    const items: ExceptionItem[] = [];
    for (const c of d.collections) {
      if ((c.status !== "rejected" && c.status !== "missed") || c.resolved !== false) continue;
      const u = userById(c.userId)!;
      const a = addressOf(c.userId);
      items.push({
        kind: c.status, id: c.id, collectionId: c.id, runId: c.runId, date: c.date, zone: clone(zoneById(a?.zoneId)),
        title: `${u.name} · ${a?.street ?? ""}, ${a?.suburb ?? ""}`, detail: c.reason ?? (c.status === "missed" ? "Missed" : "Rejected"),
      });
    }
    ensureRuns(t, addDays(t, 14));
    for (const run of d.runs.filter((r) => r.date >= t && r.date <= addDays(t, 14))) {
      const zone = zoneById(run.zoneId)!;
      if (!run.driverId) items.push({ kind: "unassigned", id: `un-${run.id}`, runId: run.id, date: run.date, zone: clone(zone), title: `Zone ${zone.code} run has no driver`, detail: `${zone.name} · ${formatDay(run.date)}` });
      const n = bookedOn(run.zoneId, run.date);
      if (n > zone.capacity) items.push({ kind: "over_capacity", id: `oc-${run.id}`, runId: run.id, date: run.date, zone: clone(zone), title: `Zone ${zone.code} run is over capacity`, detail: `${n} stops booked, capacity ${zone.capacity}` });
    }
    save(false);
    return items.sort((a, b) => b.date.localeCompare(a.date));
  },

  async resolveException(collectionId, action) {
    const me = requireRole("admin");
    const d = load();
    const c = d.collections.find((x) => x.id === collectionId);
    if (!c) throw new Error("Not found.");
    const u = userById(c.userId)!;
    if (action === "reschedule") {
      const zone = zoneById(addressOf(u.id)?.zoneId);
      if (!zone) throw new Error("Customer has no zone.");
      const date = nextWeekday(addDays(today(), 1), zone.collectionDay);
      if (!d.requests.some((r) => r.userId === u.id && r.date === date && r.status === "approved"))
        d.requests.push({ id: uid("req"), userId: u.id, date, status: "approved", note: `Rescheduled from ${c.date}`, createdAt: now() });
      notify(u, `We'll come back for your recycling on ${formatDay(date, { weekday: "long", day: "numeric", month: "long" })}.`);
    }
    c.resolved = true;
    audit(me, `exception.${action}`, `${u.name} · ${c.date} · ${c.status}`);
    save();
  },

  async getCustomers() {
    requireRole("admin");
    const d = load();
    const month = monthOf(today());
    const kg = monthlyKgByUser(d.collections, month, d.settings.kgCapPerCollection);
    const active = activeCustomerIds(d.collections, month);
    return d.users.filter((u) => u.role === "customer").map((user): CustomerRow => {
      const address = addressOf(user.id);
      const mine = d.collections.filter((c) => c.userId === user.id && c.status === "collected");
      const k = kg.get(user.id) ?? 0;
      return {
        user: clone(user), address: clone(address), zone: clone(zoneById(address?.zoneId)),
        plan: clone(d.subscriptions.find((s) => s.userId === user.id) ?? null),
        kgThisMonth: k, entriesThisMonth: entriesFromKg(k),
        lifetimeKg: roundKg(mine.reduce((s, c) => s + (c.kg ?? 0), 0)),
        active: active.has(user.id),
        lastCollection: mine.map((c) => c.date).sort().at(-1) ?? null,
      };
    }).sort((a, b) => a.user.name.localeCompare(b.user.name));
  },

  async getWaitlist() {
    requireRole("admin");
    return clone(load().waitlist).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getVouchers(month) {
    requireRole("admin");
    return clone(load().vouchers.filter((v) => v.month === month));
  },

  async saveVoucher(input) {
    const me = requireRole("admin");
    const d = load();
    if (!input.name.trim() || !input.sponsor.trim()) throw new Error("Voucher needs a name and a sponsor.");
    if (!(input.valueRands > 0)) throw new Error("Value must be more than R0.");
    if (input.id) {
      const v = d.vouchers.find((x) => x.id === input.id);
      if (!v) throw new Error("Voucher not found.");
      if (v.status !== "available") throw new Error("Drawn vouchers can't be edited.");
      Object.assign(v, { ...input, name: input.name.trim(), sponsor: input.sponsor.trim() });
      audit(me, "voucher.update", `${v.name} · ${v.month}`);
      save();
      return clone(v);
    }
    if (d.draws.some((x) => x.month === input.month)) throw new Error("That month's draw has already run.");
    if (d.vouchers.filter((v) => v.month === input.month).length >= 5) throw new Error("A draw has 5 vouchers. Remove one first.");
    const v: Voucher = { ...input, id: uid("v"), name: input.name.trim(), sponsor: input.sponsor.trim(), status: "available" };
    d.vouchers.push(v);
    audit(me, "voucher.create", `${v.name} · ${v.sponsor} · ${v.month}`);
    save();
    return clone(v);
  },

  async deleteVoucher(id) {
    const me = requireRole("admin");
    const d = load();
    const v = d.vouchers.find((x) => x.id === id);
    if (!v) return;
    if (v.status !== "available") throw new Error("Drawn vouchers can't be removed.");
    d.vouchers = d.vouchers.filter((x) => x.id !== id);
    audit(me, "voucher.delete", `${v.name} · ${v.month}`);
    save();
  },

  async setVoucherStatus(id, status) {
    const me = requireRole("admin");
    const v = load().vouchers.find((x) => x.id === id);
    if (!v || !v.winnerId) throw new Error("Voucher has no winner yet.");
    v.status = status;
    if (status === "claimed") v.claimedAt = now();
    audit(me, `voucher.${status}`, `${v.name} · ${userById(v.winnerId)?.name}`);
    save();
  },

  async getDrawPreview(month): Promise<DrawPreview> {
    requireRole("admin");
    const d = load();
    const draw = d.draws.find((x) => x.month === month) ?? null;
    const rows = draw ? draw.snapshot : buildSnapshot(d.collections, month, d.settings.kgCapPerCollection);
    const vouchers = d.vouchers.filter((v) => v.month === month);
    const blockers: string[] = [];
    if (draw) blockers.push("This month's draw has already run.");
    if (month >= monthOf(today())) blockers.push(`${formatMonth(month)} hasn't ended yet.`);
    if (!vouchers.length) blockers.push("Add vouchers for this month first.");
    if (!rows.length) blockers.push("No customers have entries this month.");
    return {
      month,
      snapshot: rows.map((r) => {
        const u = userById(r.userId);
        return { ...r, name: u?.name ?? "Removed user", suburb: addressOf(r.userId)?.suburb ?? "" };
      }),
      totalEntries: rows.reduce((s, r) => s + r.entries, 0),
      vouchers: clone(vouchers),
      draw: clone(draw),
      canRun: blockers.length === 0,
      blockers,
    };
  },

  async runDraw(month, seed) {
    // DEV ONLY: in production this runs server-side (Edge Function) so the seed can't be gamed.
    const me = requireRole("admin");
    const preview = await mockApi.getDrawPreview(month);
    if (!preview.canRun) throw new Error(preview.blockers[0]);
    const d = load();
    const s = seed?.trim() || generateSeed();
    const snapshot = buildSnapshot(d.collections, month, d.settings.kgCapPerCollection);
    const vouchers = d.vouchers.filter((v) => v.month === month).sort((a, b) => b.valueRands - a.valueRands || a.id.localeCompare(b.id));
    const picks = selectWinners(snapshot, vouchers.map((v) => v.id), s);
    const at = now();
    const draw = { id: uid("draw"), month, seed: s, runAt: at, runBy: me.id, totalEntries: snapshot.reduce((t, x) => t + x.entries, 0), snapshot, winners: picks.map((p) => ({ ...p, kind: "draw" as const, at })) };
    d.draws.push(draw);
    for (const p of picks) {
      const v = d.vouchers.find((x) => x.id === p.voucherId)!;
      const u = userById(p.userId)!;
      Object.assign(v, { winnerId: u.id, drawId: draw.id, status: "notified", notifiedAt: at });
      notify(u, `Congratulations ${firstName(u)}! You've won a ${v.name} (R${v.valueRands}) from ${v.sponsor} in the ${formatMonth(month)} draw. Reply CLAIM within ${d.settings.redrawAfterDays} days.`);
    }
    audit(me, "draw.run", `Draw for ${month}: ${draw.totalEntries} entries, ${picks.length} winners, seed ${s}`);
    save();
    return clone(draw);
  },

  async redrawVoucher(voucherId) {
    const me = requireRole("admin");
    const d = load();
    const v = d.vouchers.find((x) => x.id === voucherId);
    const draw = d.draws.find((x) => x.id === v?.drawId);
    if (!v || !draw) throw new Error("Voucher hasn't been drawn.");
    if (v.status !== "notified") throw new Error("Only unclaimed vouchers can be redrawn.");
    const age = daysBetween(v.notifiedAt!.slice(0, 10), today());
    if (age < d.settings.redrawAfterDays) throw new Error(`Winners get ${d.settings.redrawAfterDays} days to claim. ${d.settings.redrawAfterDays - age} days to go.`);
    const exclude = draw.winners.map((w) => w.userId);
    const n = draw.winners.filter((w) => w.kind === "redraw").length + 1;
    const [pick] = selectWinners(draw.snapshot, [v.id], `${draw.seed}:redraw:${n}`, exclude);
    if (!pick) throw new Error("No eligible customers left to redraw.");
    const prev = userById(v.winnerId)!;
    const u = userById(pick.userId)!;
    const at = now();
    draw.winners.push({ voucherId: v.id, userId: u.id, kind: "redraw", at });
    Object.assign(v, { winnerId: u.id, status: "notified", notifiedAt: at });
    notify(u, `Congratulations ${firstName(u)}! You've won a ${v.name} from ${v.sponsor} in the ${formatMonth(draw.month)} redraw. Reply CLAIM within ${d.settings.redrawAfterDays} days.`);
    audit(me, "draw.redraw", `${v.name}: ${prev.name} (unclaimed) → ${u.name}, seed ${draw.seed}:redraw:${n}`);
    save();
  },

  async getDraws() {
    requireRole("admin");
    return clone(load().draws).sort((a, b) => b.month.localeCompare(a.month));
  },

  async getNotifications() {
    requireRole("admin");
    return clone(load().notifications);
  },

  async getAuditLog() {
    requireRole("admin");
    return clone(load().audit);
  },

  async updateSettings(s) {
    const me = requireRole("admin");
    Object.assign(load().settings, s);
    audit(me, "settings.update", JSON.stringify(s));
    save();
  },

  // ----- admin: customers -----
  async getCustomer(userId) {
    requireRole("admin");
    const d = load();
    const row = (await mockApi.getCustomers()).find((r) => r.user.id === userId);
    if (!row) throw new Error("Customer not found.");
    const cap = d.settings.kgCapPerCollection;
    const t = today();
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(monthOf(t), -i)).map((month) => {
      const kgM = monthlyKgByUser(d.collections, month, cap).get(userId) ?? 0;
      return { month, kg: kgM, entries: entriesFromKg(kgM), collections: d.collections.filter((c) => c.userId === userId && c.status === "collected" && monthOf(c.date) === month).length };
    });
    const detail: CustomerDetail = {
      row,
      collections: d.collections.filter((c) => c.userId === userId && c.status !== "pending").sort((a, b) => b.date.localeCompare(a.date))
        .map((c) => ({ ...clone(c), zoneCode: zoneById(d.runs.find((r) => r.id === c.runId)?.zoneId)?.code ?? null })),
      requests: clone(d.requests.filter((r) => r.userId === userId).sort((a, b) => b.date.localeCompare(a.date))),
      upcoming: row.zone ? upcomingFor(userId, row.zone) : [],
      months,
      messages: clone(d.notifications.filter((n) => n.userId === userId)),
      wins: clone(d.vouchers.filter((v) => v.winnerId === userId)),
    };
    save(false);
    return detail;
  },

  async saveCustomer(input) {
    const me = requireRole("admin");
    const d = load();
    const name = input.name.trim();
    const street = input.street.trim();
    const suburb = input.suburb.trim();
    if (!name || !street || !suburb) throw new Error("Name, street and suburb are required.");
    if (input.phone.replace(/\D/g, "").length < 9) throw new Error("Enter a valid cellphone number.");
    const others = d.users.filter((u) => u.id !== input.id && u.status !== "erased");
    if (others.some((u) => samePhone(u.phone, input.phone))) throw new Error("Another account already uses this number.");
    const key = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    const othersAddr = d.addresses.filter((a) => a.userId !== input.id && others.some((u) => u.id === a.userId));
    if (othersAddr.some((a) => key(a.street) === key(street) && normaliseSuburb(a.suburb) === normaliseSuburb(suburb)))
      throw new Error("Another household already has this address.");
    const zone = matchZone(suburb, d.zones);

    let user: User;
    if (input.id) {
      user = d.users.find((u) => u.id === input.id && u.role === "customer")!;
      if (!user) throw new Error("Customer not found.");
      if (user.status === "erased") throw new Error("This customer has been erased.");
      const addr = d.addresses.find((a) => a.userId === user.id);
      const moved = !addr || key(addr.street) !== key(street) || normaliseSuburb(addr.suburb) !== normaliseSuburb(suburb);
      Object.assign(user, { name, phone: normalisePhone(input.phone), note: input.note?.trim() || undefined });
      if (addr) Object.assign(addr, { street, suburb, zoneId: zone?.id ?? null });
      if (moved) {
        const oldZone = addr ? zoneById(addr.zoneId) : null;
        // A new zone means a new collection day: restart the plan from the next one.
        const sub = d.subscriptions.find((s) => s.userId === user.id);
        if (sub && zone && zone.id !== oldZone?.id) Object.assign(sub, { startDate: nextWeekday(addDays(today(), 1), zone.collectionDay), skipped: [] });
        if (sub && !zone) d.subscriptions = d.subscriptions.filter((s) => s !== sub);
        d.waitlist = d.waitlist.filter((w) => w.userId !== user.id);
        if (!zone) d.waitlist.push({ id: uid("w"), userId: user.id, name, phone: user.phone, suburb, createdAt: now() });
      }
      audit(me, "customer.update", `${name}${moved ? ` · moved to ${street}, ${suburb}` : ""}`);
    } else {
      user = { id: uid("u"), role: "customer", name, phone: normalisePhone(input.phone), phoneVerified: false, createdAt: now(), status: "active", note: input.note?.trim() || undefined };
      d.users.push(user);
      d.addresses.push({ id: uid("a"), userId: user.id, street, suburb, zoneId: zone?.id ?? null });
      if (!zone) d.waitlist.push({ id: uid("w"), userId: user.id, name, phone: user.phone, suburb, createdAt: now() });
      notify(user, `Hi ${name.split(" ")[0]}, we've set up your Kilo recycling account. Open the app to confirm your number and accept the privacy notice.`, "sms");
      audit(me, "customer.create", `${name} · ${suburb}${zone ? ` → Zone ${zone.code}` : " → waiting list"}`);
    }
    save();
    return clone(user);
  },

  async adminSetPlan(userId, frequency) {
    const me = requireRole("admin");
    const d = load();
    const u = userById(userId);
    const zone = zoneById(addressOf(userId)?.zoneId);
    if (!u || u.role !== "customer") throw new Error("Customer not found.");
    if (!frequency) {
      d.subscriptions = d.subscriptions.filter((s) => s.userId !== userId);
      notify(u, "Your standing pickup has been stopped. You can still book one-off collections in the app.");
    } else {
      if (!zone) throw new Error("This customer's suburb isn't in a zone yet.");
      const startDate = nextWeekday(addDays(today(), 1), zone.collectionDay);
      const sub = d.subscriptions.find((s) => s.userId === userId);
      if (sub) Object.assign(sub, { frequency, status: "active", ...(sub.status !== "active" ? { startDate } : {}) });
      else d.subscriptions.push({ id: uid("s"), userId, frequency, startDate, status: "active", skipped: [], createdAt: now() });
      notify(u, `Your ${frequency} pickup is set up. Next collection: ${formatDay(d.subscriptions.find((s) => s.userId === userId)!.startDate, { weekday: "long", day: "numeric", month: "long" })}.`);
    }
    audit(me, "plan.admin_set", `${u.name} → ${frequency ?? "none"}`);
    save();
  },

  async setUserStatus(userId, status) {
    const me = requireRole("admin");
    const d = load();
    const u = userById(userId);
    if (!u || u.status === "erased") throw new Error("User not found.");
    if (u.id === me.id) throw new Error("You can't suspend yourself.");
    if (u.role === "admin" && status === "suspended" && d.users.filter((x) => x.role === "admin" && x.status !== "suspended").length <= 1)
      throw new Error("There must be at least one active admin.");
    u.status = status;
    if (u.role === "driver" && status === "suspended") {
      // Pull them off upcoming runs so the gaps show up as exceptions.
      for (const r of d.runs.filter((x) => x.driverId === u.id && x.date >= today() && x.status === "planned")) r.driverId = null;
    }
    audit(me, `user.${status === "active" ? "reactivate" : "suspend"}`, `${u.name} (${u.role})`);
    save();
  },

  async eraseCustomer(userId) {
    const me = requireRole("admin");
    const d = load();
    const u = userById(userId);
    if (!u || u.role !== "customer") throw new Error("Customer not found.");
    if (d.vouchers.some((v) => v.winnerId === userId && v.status === "notified")) throw new Error("This customer has an unclaimed prize. Resolve it first.");
    const old = u.name;
    Object.assign(u, { name: "Erased customer", phone: "", note: undefined, status: "erased" });
    const a = addressOf(userId);
    if (a) Object.assign(a, { street: "(erased)", zoneId: null });
    d.subscriptions = d.subscriptions.filter((s) => s.userId !== userId);
    d.requests = d.requests.filter((r) => r.userId !== userId || r.date < today());
    d.waitlist = d.waitlist.filter((w) => w.userId !== userId);
    d.collections = d.collections.filter((c) => c.userId !== userId || c.status !== "pending");
    for (const n of d.notifications.filter((x) => x.userId === userId)) Object.assign(n, { phone: "", body: "(erased)" });
    audit(me, "customer.erase", `POPIA erasure for ${old}`);
    save();
  },

  async removeWaitlistEntry(id) {
    const me = requireRole("admin");
    const d = load();
    const w = d.waitlist.find((x) => x.id === id);
    if (!w) return;
    d.waitlist = d.waitlist.filter((x) => x.id !== id);
    audit(me, "waitlist.remove", `${w.name} · ${w.suburb}`);
    save();
  },

  // ----- admin: team -----
  async getTeam() {
    requireRole("admin");
    const d = load();
    const t = today();
    const month = monthOf(t);
    ensureRuns(t, addDays(t, 14));
    return d.users.filter((u) => u.role !== "customer").map((user): StaffRow => {
      const mine = d.runs.filter((r) => r.driverId === user.id);
      return {
        user: clone(user),
        runsThisMonth: mine.filter((r) => monthOf(r.date) === month && r.date <= t).length,
        kgThisMonth: roundKg(d.collections.filter((c) => c.driverId === user.id && c.status === "collected" && monthOf(c.date) === month).reduce((s, c) => s + (c.kg ?? 0), 0)),
        upcoming: mine.filter((r) => r.date >= t && r.date <= addDays(t, 14)).sort((a, b) => a.date.localeCompare(b.date))
          .map((r) => ({ id: r.id, date: r.date, zoneCode: zoneById(r.zoneId)?.code ?? "?" })),
      };
    }).sort((a, b) => a.user.role.localeCompare(b.user.role) || a.user.name.localeCompare(b.user.name));
  },

  async saveStaff(input) {
    const me = requireRole("admin");
    const d = load();
    if (!input.name.trim()) throw new Error("Enter a name.");
    if (input.phone.replace(/\D/g, "").length < 9) throw new Error("Enter a valid cellphone number.");
    if (d.users.some((u) => u.id !== input.id && u.status !== "erased" && samePhone(u.phone, input.phone))) throw new Error("Another account already uses this number.");
    let user = d.users.find((u) => u.id === input.id);
    if (user) {
      if (user.role === "customer") throw new Error("Not a staff account.");
      Object.assign(user, { name: input.name.trim(), phone: normalisePhone(input.phone) });
      audit(me, "staff.update", `${user.name} (${user.role})`);
    } else {
      user = { id: uid("u"), role: input.role, name: input.name.trim(), phone: normalisePhone(input.phone), phoneVerified: false, createdAt: now(), status: "active" };
      d.users.push(user);
      notify(user, `You've been added to Kilo as ${input.role === "admin" ? "an admin" : "a driver"}. Sign in with this number.`, "sms");
      audit(me, "staff.create", `${user.name} (${user.role})`);
    }
    save();
    return clone(user);
  },

  // ----- admin: run editing -----
  async addStopToRun(runId, userId) {
    const me = requireRole("admin");
    const d = load();
    const run = d.runs.find((r) => r.id === runId);
    if (!run) throw new Error("Run not found.");
    if (run.status === "completed") throw new Error("Reopen the run first.");
    const u = userById(userId);
    if (!u || addressOf(userId)?.zoneId !== run.zoneId) throw new Error("That household isn't in this run's zone.");
    if (!isCollectable(userId)) throw new Error("That customer is suspended.");
    syncStops(run);
    if (d.collections.some((c) => c.runId === run.id && c.userId === userId)) throw new Error("Already on this run.");
    const sub = d.subscriptions.find((s) => s.userId === userId);
    if (sub && planCovers(sub, run.date) && sub.skipped.includes(run.date)) sub.skipped = sub.skipped.filter((x) => x !== run.date);
    else {
      const pending = d.requests.find((r) => r.userId === userId && r.date === run.date && r.status === "pending");
      if (pending) pending.status = "approved";
      else d.requests.push({ id: uid("req"), userId, date: run.date, status: "approved", note: "Added by admin", createdAt: now() });
    }
    syncStops(run);
    notify(u, `You've been added to the collection on ${formatDay(run.date, { weekday: "long", day: "numeric", month: "long" })}. Bags out by 7am.`);
    audit(me, "run.add_stop", `${u.name} → ${run.id}`);
    save();
  },

  async removeStop(stopId) {
    const me = requireRole("admin");
    const d = load();
    const c = d.collections.find((x) => x.id === stopId);
    if (!c) throw new Error("Stop not found.");
    if (c.status !== "pending") throw new Error("Only open stops can be removed. Undo the outcome first.");
    // Remove the reason it's on the run, otherwise the next sync puts it back.
    const sub = d.subscriptions.find((s) => s.userId === c.userId);
    if (sub && planCovers(sub, c.date)) sub.skipped = [...new Set([...sub.skipped, c.date])];
    for (const r of d.requests.filter((x) => x.userId === c.userId && x.date === c.date && x.status === "approved")) r.status = "cancelled";
    d.collections = d.collections.filter((x) => x.id !== stopId);
    const u = userById(c.userId);
    notify(u, `Your collection on ${formatDay(c.date, { weekday: "long", day: "numeric", month: "long" })} has been cancelled. Sorry for the change.`);
    audit(me, "run.remove_stop", `${u?.name} · ${c.runId}`);
    save();
  },

  async moveStop(stopId, direction) {
    requireRole("admin");
    const d = load();
    const c = d.collections.find((x) => x.id === stopId);
    if (!c) throw new Error("Stop not found.");
    const stops = d.collections.filter((x) => x.runId === c.runId).sort((a, b) => a.order - b.order);
    const i = stops.indexOf(c);
    const j = i + direction;
    if (j < 0 || j >= stops.length) return;
    stops.forEach((s, k) => (s.order = k));
    [stops[i].order, stops[j].order] = [j, i];
    save();
  },

  async reopenRun(runId) {
    const me = requireRole("admin");
    const run = load().runs.find((r) => r.id === runId);
    if (!run) throw new Error("Run not found.");
    if (run.status !== "completed") return;
    run.status = "in_progress";
    audit(me, "run.reopen", run.id);
    save();
  },

  // ----- admin: queue + messages -----
  async approveAllFitting() {
    requireRole("admin");
    let approved = 0;
    let skipped = 0;
    for (const q of await mockApi.getRequestQueue()) {
      try {
        await mockApi.decideQueueItem(q.kind, q.id, true);
        approved++;
      } catch {
        skipped++;
      }
    }
    return { approved, skipped };
  },

  async previewAudience(input) {
    requireRole("admin");
    return audienceOf(input).length;
  },

  async sendBroadcast(input) {
    const me = requireRole("admin");
    const body = input.body.trim();
    if (!body) throw new Error("Write a message first.");
    if (body.length > 640) throw new Error("Keep it under 640 characters.");
    const people = audienceOf(input);
    if (!people.length) throw new Error("Nobody matches that audience.");
    for (const p of people) notify(p, body, input.channel);
    audit(me, "message.broadcast", `${input.audience}${input.zoneId ? ` ${zoneById(input.zoneId)?.code}` : ""} · ${people.length} recipients · ${body.slice(0, 60)}`);
    save();
    return people.length;
  },

  async getUserNames() {
    requireRole("admin");
    return Object.fromEntries(load().users.map((u) => [u.id, u.name]));
  },
};

