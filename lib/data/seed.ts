import type { Collection, Draw, ISODate, Notification, User, Voucher, Zone } from "@/lib/types";
import { addDays, monthOf, nextWeekday, shiftMonth, toISODate } from "@/lib/logic/dates";
import { buildSnapshot, roundKg } from "@/lib/logic/entries";
import { rng, selectWinners } from "@/lib/logic/draw";
import { isDue } from "@/lib/logic/schedule";
import { DB_VERSION, type DB } from "./db";

// Deterministic demo data: 3 zones, 30 households, 2 drivers, 1 admin,
// ~10 weeks of collection history ending today, plus a finished draw for
// two months ago and a draw ready to run for last month.

const CUSTOMER_NAMES = [
  "Lerato Mahlangu", "Pieter du Plessis", "Aisha Patel", "Thabo Nkosi", "Megan Jacobs",
  "Zanele Khumalo", "Riaan Botha", "Fatima Isaacs", "Kagiso Molefe", "Chloé Fourie",
  "Bongani Zulu", "Naledi Sithole", "Grant Williams", "Ayanda Mthembu", "Yusuf Adams",
  "Karabo Tau", "Liezl Smit", "Sibusiso Cele", "Priya Naidoo", "Michael Abrahams",
  "Nandi Shabalala", "Ruan Steyn", "Busisiwe Ntuli", "Tasneem Davids", "Kyle October",
  "Palesa Mokoena", "Johan Nel", "Siphokazi Mbeki", "Ebrahim Salie", "Refilwe Moloi",
];

const STREETS = [
  "Belmont Rd", "Kildare Rd", "Station Rd", "Albert Rd", "Victoria Rd", "Milner Rd",
  "Cecil Rd", "Durban Rd", "Lynton Rd", "Rhodes Ave", "Palmyra Rd", "Lower Main Rd",
];

const REJECT_REASONS = ["Wet cardboard", "Mixed with garden waste", "Rubble in bags", "Food contamination"];
const MISS_REASONS = ["Bags not out", "Gate locked", "Not out by 7am"];

export const SEED_ZONES: Zone[] = [
  { id: "zone-a", code: "A", name: "Southern Suburbs North", suburbs: ["Rondebosch", "Newlands", "Claremont", "Rosebank"], collectionDay: 2, capacity: 40, active: true },
  { id: "zone-b", code: "B", name: "Observatory & Surrounds", suburbs: ["Observatory", "Mowbray", "Woodstock", "Salt River"], collectionDay: 4, capacity: 40, active: true },
  { id: "zone-c", code: "C", name: "Southern Suburbs South", suburbs: ["Kenilworth", "Wynberg", "Plumstead", "Harfield Village"], collectionDay: 6, capacity: 40, active: true },
];

const iso = (d: ISODate, hour = 9) => `${d}T${String(hour).padStart(2, "0")}:00:00.000Z`;

export function createSeed(today: ISODate = toISODate(new Date())): DB {
  const r = rng("collection-app-seed");
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const created = iso(addDays(today, -80));

  const admin: User = { id: "u-admin", role: "admin", name: "Nomsa Dlamini", phone: "+27 82 000 0001", phoneVerified: true, createdAt: created };
  const drivers: User[] = [
    { id: "u-driver-1", role: "driver", name: "Sipho Mokoena", phone: "+27 82 000 0011", phoneVerified: true, createdAt: created },
    { id: "u-driver-2", role: "driver", name: "Jaco van Wyk", phone: "+27 82 000 0012", phoneVerified: true, createdAt: created },
  ];
  const driverFor = (zoneId: string) => (zoneId === "zone-b" ? drivers[1].id : drivers[0].id);

  const db: DB = {
    version: DB_VERSION,
    seededOn: today,
    users: [admin, ...drivers],
    addresses: [],
    zones: structuredClone(SEED_ZONES),
    waitlist: [],
    subscriptions: [],
    requests: [],
    runs: [],
    collections: [],
    vouchers: [],
    draws: [],
    notifications: [],
    audit: [],
    settings: { kgCapPerCollection: 50, redrawAfterDays: 14, activeRule: "calendar_month", drawDay: 1 },
    otps: {},
  };

  // Households: 10 per zone. Most on standing plans, a few one-off only, a few pending approval.
  CUSTOMER_NAMES.forEach((name, i) => {
    const zone = db.zones[i % 3];
    const id = `u-c${String(i + 1).padStart(2, "0")}`;
    const joined = addDays(today, -80 + Math.floor(r() * 50));
    db.users.push({
      id, role: "customer", name, phone: `+27 8${2 + (i % 3)} ${100 + i * 7} ${String(1000 + i * 137).slice(-4)}`,
      phoneVerified: true, createdAt: iso(joined), consentAt: iso(joined),
    });
    db.addresses.push({ id: `a-${id}`, userId: id, street: `${3 + Math.floor(r() * 140)} ${pick(STREETS)}`, suburb: pick(zone.suburbs), zoneId: zone.id });

    const firstDay = nextWeekday(addDays(today, -70), zone.collectionDay);
    if (i % 10 === 9) {
      // Newer sign-up waiting for approval.
      db.subscriptions.push({ id: `s-${id}`, userId: id, frequency: "weekly", startDate: nextWeekday(addDays(today, 1), zone.collectionDay), status: "pending", skipped: [], createdAt: iso(addDays(today, -2)) });
    } else if (i % 10 !== 8) {
      const frequency = i % 4 === 1 ? "fortnightly" : "weekly";
      db.subscriptions.push({ id: `s-${id}`, userId: id, frequency, startDate: addDays(firstDay, (i % 2) * 7), status: "active", skipped: [], createdAt: iso(joined) });
    }
  });

  // Runs: 10 weeks back, 3 weeks ahead.
  for (const zone of db.zones) {
    let d = nextWeekday(addDays(today, -70), zone.collectionDay);
    while (d <= addDays(today, 21)) {
      const past = d < today;
      // Leave one upcoming run unassigned so the exceptions screen has something to show.
      const unassigned = zone.id === "zone-c" && d > addDays(today, 7) && d <= addDays(today, 14);
      db.runs.push({ id: `run-${zone.code}-${d}`, zoneId: zone.id, date: d, driverId: unassigned ? null : driverFor(zone.id), status: past ? "completed" : "planned" });
      d = addDays(d, 7);
    }
  }

  // Random skips on upcoming dates and occasional past ones.
  for (const s of db.subscriptions) if (r() < 0.25) s.skipped.push(addDays(s.startDate, 7 * (1 + Math.floor(r() * 6))));

  // One-off requests: some approved in the past, some pending in the queue.
  const oneOffs = db.users.filter((u) => u.role === "customer" && !db.subscriptions.some((s) => s.userId === u.id));
  for (const u of oneOffs) {
    const zone = db.zones.find((z) => z.id === db.addresses.find((a) => a.userId === u.id)!.zoneId)!;
    for (const w of [-56, -28, -7]) db.requests.push({ id: `req-${u.id}${w}`, userId: u.id, date: nextWeekday(addDays(today, w), zone.collectionDay), status: "approved", createdAt: iso(addDays(today, w - 4)) });
    db.requests.push({ id: `req-${u.id}-next`, userId: u.id, date: nextWeekday(addDays(today, 1), zone.collectionDay), status: "pending", createdAt: iso(addDays(today, -1)) });
  }
  // A couple of extra one-off top-ups from plan customers.
  for (const id of ["u-c04", "u-c11"]) {
    const zone = db.zones.find((z) => z.id === db.addresses.find((a) => a.userId === id)!.zoneId)!;
    db.requests.push({ id: `req-${id}-extra`, userId: id, date: nextWeekday(addDays(today, 8), zone.collectionDay), status: "pending", note: "Moving house, extra boxes", createdAt: iso(addDays(today, -1)) });
  }

  // Past collections with outcomes.
  for (const run of db.runs.filter((x) => x.status === "completed")) {
    const due = db.addresses
      .filter((a) => a.zoneId === run.zoneId && isDue(a.userId, run.date, db.subscriptions, db.requests))
      .sort((a, b) => a.street.localeCompare(b.street));
    due.forEach((a, order) => {
      const roll = r();
      const status: Collection["status"] = roll < 0.86 ? "collected" : roll < 0.94 ? "rejected" : "missed";
      const recent = run.date >= addDays(today, -8);
      db.collections.push({
        id: `col-${run.id}-${a.userId}`, runId: run.id, userId: a.userId, date: run.date, order, status,
        kg: status === "collected" ? roundKg(r() < 0.04 ? 50 + r() * 15 : 3 + r() * r() * 30) : null,
        reason: status === "rejected" ? pick(REJECT_REASONS) : status === "missed" ? pick(MISS_REASONS) : undefined,
        driverId: run.driverId, recordedAt: iso(run.date, 8 + Math.floor(order / 4)),
        resolved: status === "collected" ? undefined : !recent,
      });
    });
  }

  // Vouchers + draws.
  const thisMonth = monthOf(today);
  const lastMonth = shiftMonth(thisMonth, -1);
  const twoAgo = shiftMonth(thisMonth, -2);
  const VOUCHERS: Omit<Voucher, "id" | "month" | "expiry" | "status">[] = [
    { name: "Grocery voucher", sponsor: "Corner Market", valueRands: 1000, tone: "butter" },
    { name: "Coffee for a month", sponsor: "Hatch Coffee Co.", valueRands: 450, tone: "rose" },
    { name: "Garden centre voucher", sponsor: "Greenhouse Nursery", valueRands: 750, tone: "mint" },
    { name: "Bookshop voucher", sponsor: "Page & Co.", valueRands: 500, tone: "sky" },
    { name: "Dinner for two", sponsor: "Olive Street Bistro", valueRands: 800, tone: "lilac" },
  ];
  for (const month of [twoAgo, lastMonth, thisMonth]) {
    VOUCHERS.forEach((v, i) => db.vouchers.push({ ...v, id: `v-${month}-${i + 1}`, month, expiry: `${shiftMonth(month, 4)}-01`, status: "available" }));
  }

  const drawDate = `${shiftMonth(twoAgo, 1)}-01`;
  const snapshot = buildSnapshot(db.collections, twoAgo, db.settings.kgCapPerCollection);
  const seed = "5eed0a1fc0ffee42";
  const monthVouchers = db.vouchers.filter((v) => v.month === twoAgo);
  const picks = selectWinners(snapshot, monthVouchers.map((v) => v.id), seed);
  const draw: Draw = {
    id: `draw-${twoAgo}`, month: twoAgo, seed, runAt: iso(drawDate, 8), runBy: admin.id,
    totalEntries: snapshot.reduce((s, x) => s + x.entries, 0), snapshot,
    winners: picks.map((p) => ({ ...p, kind: "draw", at: iso(drawDate, 8) })),
  };
  db.draws.push(draw);
  picks.forEach((p, i) => {
    const v = db.vouchers.find((x) => x.id === p.voucherId)!;
    Object.assign(v, { winnerId: p.userId, drawId: draw.id, status: i < 3 ? "claimed" : "notified", notifiedAt: iso(drawDate, 9), claimedAt: i < 3 ? iso(addDays(drawDate, 3 + i), 10) : undefined });
    const u = db.users.find((x) => x.id === p.userId)!;
    db.notifications.push(note(u, `Congratulations ${u.name.split(" ")[0]}! You've won a ${v.name} from ${v.sponsor} in the ${twoAgo} draw. Reply CLAIM to arrange collection.`, iso(drawDate, 9)));
  });
  db.audit.push({ id: `au-${draw.id}`, at: draw.runAt, actorId: admin.id, action: "draw.run", detail: `Draw for ${twoAgo}: ${draw.totalEntries} entries, ${picks.length} winners, seed ${seed}` });

  // Waiting list demand outside current zones.
  [["Muizenberg", 4], ["Bergvliet", 3], ["Tokai", 2], ["Pinelands", 5]].forEach(([suburb, n]) => {
    for (let i = 0; i < (n as number); i++)
      db.waitlist.push({ id: `w-${suburb}-${i}`, name: `${pick(["Anele", "Chris", "Dineo", "Erin", "Hannah", "Imran", "Lwazi", "Mia"])} ${pick(["K.", "P.", "M.", "V.", "S."])}`, phone: `+27 7${i} 555 0${10 + i}`, suburb: suburb as string, createdAt: iso(addDays(today, -Math.floor(r() * 40))) });
  });

  // Reminder messages for the last week of runs.
  for (const run of db.runs.filter((x) => x.date > addDays(today, -7) && x.date <= addDays(today, 2))) {
    for (const a of db.addresses.filter((x) => x.zoneId === run.zoneId).slice(0, 3)) {
      const u = db.users.find((x) => x.id === a.userId)!;
      db.notifications.push(note(u, `Reminder: your recycling collection is on ${run.date}. Please have bags out by 7am.`, iso(addDays(run.date, -1), 16)));
    }
  }
  db.notifications.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  return db;
}

let noteId = 0;
function note(u: User, body: string, sentAt: string): Notification {
  return { id: `n-seed-${noteId++}`, userId: u.id, phone: u.phone, channel: "whatsapp", body, sentAt };
}
