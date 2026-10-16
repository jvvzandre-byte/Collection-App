import { beforeEach, describe, expect, it } from "vitest";
import { mockApi as api } from "@/lib/data/mock";
import { addDays } from "@/lib/logic/dates";

// Admin functions on the in-memory mock (no window).

beforeEach(async () => {
  await api.devReset();
  await api.devSwitchUser("u-admin");
});

const nextRunWithStops = async () => {
  const runs = await api.getRuns(api.today(), addDays(api.today(), 21));
  return runs.find((r) => r.status === "planned" && r.stopCount > 1)!;
};

describe("admin: customers", () => {
  it("creates a customer, matches zone, rejects duplicate address and phone", async () => {
    const u = await api.saveCustomer({ name: "New Person", phone: "0821112222", street: "5 Lane St", suburb: "Wynberg" });
    expect((await api.getCustomer(u.id)).row.zone?.code).toBe("C");
    await expect(api.saveCustomer({ name: "X", phone: "0821112222", street: "6 Lane St", suburb: "Wynberg" })).rejects.toThrow(/number/);
    await expect(api.saveCustomer({ name: "X", phone: "0821113333", street: "5 lane st", suburb: "wynberg" })).rejects.toThrow(/address/);
  });

  it("moving to an unserved suburb drops the plan and joins the waiting list", async () => {
    const before = (await api.getWaitlist()).length;
    const c = await api.getCustomer("u-c01");
    await api.saveCustomer({ id: "u-c01", name: c.row.user.name, phone: c.row.user.phone, street: "1 Beach Rd", suburb: "Muizenberg" });
    const after = await api.getCustomer("u-c01");
    expect(after.row.zone).toBeNull();
    expect(after.row.plan).toBeNull();
    expect((await api.getWaitlist()).length).toBe(before + 1);
  });

  it("admin confirms a weekly pickup directly (active, no queue)", async () => {
    expect((await api.getCustomer("u-c10")).row.plan?.status).toBe("pending");
    await api.adminSetPlan("u-c10", "weekly");
    const c = await api.getCustomer("u-c10");
    expect(c.row.plan?.status).toBe("active");
    expect(c.upcoming.some((d) => d.scheduled)).toBe(true);
  });

  it("suspended customers drop off upcoming runs", async () => {
    const run = await nextRunWithStops();
    const victim = run.stops[0].userId;
    await api.setUserStatus(victim, "suspended");
    expect((await api.getRun(run.id)).stops.some((s) => s.userId === victim)).toBe(false);
    await api.setUserStatus(victim, "active");
    expect((await api.getRun(run.id)).stops.some((s) => s.userId === victim)).toBe(true);
  });

  it("erasure wipes personal details but keeps the ledger", async () => {
    const kgBefore = (await api.getCustomer("u-c05")).row.lifetimeKg;
    await api.eraseCustomer("u-c05");
    const c = await api.getCustomer("u-c05");
    expect(c.row.user.name).toBe("Erased customer");
    expect(c.row.user.phone).toBe("");
    expect(c.row.lifetimeKg).toBe(kgBefore);
  });
});

describe("admin: runs", () => {
  it("removes, re-adds and reorders stops", async () => {
    const run = await nextRunWithStops();
    const [first, second] = run.stops;
    await api.moveStop(second.id, -1);
    expect((await api.getRun(run.id)).stops[0].userId).toBe(second.userId);

    await api.removeStop(first.id);
    expect((await api.getRun(run.id)).stops.some((s) => s.userId === first.userId)).toBe(false);
    await api.addStopToRun(run.id, first.userId);
    expect((await api.getRun(run.id)).stops.some((s) => s.userId === first.userId)).toBe(true);
  });

  it("rejects adding a household from another zone", async () => {
    const run = await nextRunWithStops();
    const other = (await api.getCustomers()).find((r) => r.zone && r.zone.id !== run.zoneId)!;
    await expect(api.addStopToRun(run.id, other.user.id)).rejects.toThrow(/zone/);
  });

  it("reopens a completed run so outcomes can be corrected", async () => {
    const past = (await api.getRuns(addDays(api.today(), -14), addDays(api.today(), -1))).find((r) => r.stopCount)!;
    await expect(api.resetStop(past.stops[0].id)).rejects.toThrow(/completed/);
    await api.reopenRun(past.id);
    await api.resetStop(past.stops[0].id);
    expect((await api.getRun(past.id)).stops[0].status).toBe("pending");
  });
});

describe("admin: team, queue, messages", () => {
  it("adds a driver and suspending unassigns their upcoming runs", async () => {
    const d = await api.saveStaff({ role: "driver", name: "Test Driver", phone: "0839998888" });
    expect((await api.getDrivers()).some((x) => x.id === d.id)).toBe(true);
    await api.setUserStatus("u-driver-1", "suspended");
    const team = await api.getTeam();
    expect(team.find((t) => t.user.id === "u-driver-1")!.upcoming).toEqual([]);
    expect((await api.getDrivers()).some((x) => x.id === "u-driver-1")).toBe(false);
  });

  it("won't suspend the last admin", async () => {
    await expect(api.setUserStatus("u-admin", "suspended")).rejects.toThrow();
  });

  it("approves everything that fits", async () => {
    const res = await api.approveAllFitting();
    expect(res.approved).toBeGreaterThan(0);
    expect(await api.getRequestQueue()).toHaveLength(res.skipped);
  });

  it("broadcasts to a zone", async () => {
    const zone = (await api.getZones())[0];
    const n = await api.previewAudience({ audience: "zone", zoneId: zone.id });
    expect(n).toBe(10);
    const before = (await api.getNotifications()).length;
    expect(await api.sendBroadcast({ audience: "zone", zoneId: zone.id, channel: "sms", body: "Truck delayed by an hour." })).toBe(10);
    expect((await api.getNotifications()).length).toBe(before + 10);
  });

  it("is admin-only", async () => {
    await api.devSwitchUser("u-c01");
    await expect(api.getTeam()).rejects.toThrow();
    await expect(api.sendBroadcast({ audience: "all", channel: "sms", body: "hi" })).rejects.toThrow();
  });
});

describe("admin: phone formatting", () => {
  it("stores SA numbers in one format so lookups and display match", async () => {
    const u = await api.saveStaff({ role: "driver", name: "Format Test", phone: "072 333 4444" });
    expect(u.phone).toBe("+27 72 333 4444");
    await expect(api.saveStaff({ role: "driver", name: "Dup", phone: "+27723334444" })).rejects.toThrow(/number/);
  });
});
