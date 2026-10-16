import { beforeEach, describe, expect, it } from "vitest";
import { mockApi as api } from "@/lib/data/mock";
import { AccessError } from "@/lib/data/api";
import { monthOf, shiftMonth } from "@/lib/logic/dates";

// Runs the mock data layer in-memory (no window) to check the seeded flows hang together.

beforeEach(async () => {
  await api.devReset();
  await api.devSwitchUser(null);
});

describe("mock data layer", () => {
  it("gates functions by role", async () => {
    await expect(api.getDashboard()).rejects.toBeInstanceOf(AccessError);
    await api.devSwitchUser("u-c01");
    await expect(api.getDashboard()).rejects.toBeInstanceOf(AccessError);
    await expect(api.getMyRuns()).rejects.toBeInstanceOf(AccessError);
    expect((await api.getMyHome()).user.id).toBe("u-c01");
  });

  it("signs up with OTP, matches zone, enforces one account per address", async () => {
    const { devCode } = await api.requestOtp("082 555 1234");
    const { zone } = await api.signUp({ name: "Test Person", phone: "0825551234", code: devCode, street: "1 Test St", suburb: "observatory", consent: true });
    expect(zone?.code).toBe("B");
    await api.signOut();
    const second = await api.requestOtp("083 000 0000");
    await expect(api.signUp({ name: "Other", phone: "0830000000", code: second.devCode, street: "1 test st", suburb: "Observatory", consent: true }))
      .rejects.toThrow(/one account per household/i);
  });

  it("puts unserved suburbs on the waiting list", async () => {
    const { devCode } = await api.requestOtp("0720000000");
    const { zone } = await api.signUp({ name: "Far Away", phone: "0720000000", code: devCode, street: "9 Beach Rd", suburb: "Muizenberg", consent: true });
    expect(zone).toBeNull();
  });

  it("driver records kg and the customer sees it", async () => {
    await api.devSwitchUser("u-admin");
    const runs = await api.getRuns(api.today(), api.today().slice(0, 8) + "28");
    const run = runs.find((r) => r.stopCount > 0 && r.driverId)!;
    await api.devSwitchUser(run.driverId);
    const view = await api.getRun(run.id);
    await api.markCollected(view.stops[0].id, 12.34);
    const after = await api.getRun(run.id);
    expect(after.stops[0].kg).toBe(12.3);
    expect(after.status).toBe("in_progress");
  });

  it("runs last month's draw once with 5 distinct winners", async () => {
    await api.devSwitchUser("u-admin");
    const month = shiftMonth(monthOf(api.today()), -1);
    const preview = await api.getDrawPreview(month);
    expect(preview.canRun).toBe(true);
    const draw = await api.runDraw(month, "test-seed");
    expect(draw.winners).toHaveLength(5);
    expect(new Set(draw.winners.map((w) => w.userId)).size).toBe(5);
    await expect(api.runDraw(month)).rejects.toThrow(/already run/);
    const current = await api.getDrawPreview(monthOf(api.today()));
    expect(current.canRun).toBe(false);
  });

  it("seed has a request queue and exceptions to work", async () => {
    await api.devSwitchUser("u-admin");
    expect((await api.getRequestQueue()).length).toBeGreaterThan(0);
    expect((await api.getExceptions()).some((e) => e.kind === "unassigned")).toBe(true);
    const dash = await api.getDashboard();
    expect(dash.customers).toBe(30);
    expect(dash.weekly).toHaveLength(12);
  });

  it("customers are weekly only: start, skip (not on the day), stop", async () => {
    const { devCode } = await api.requestOtp("0825550000");
    await api.signUp({ name: "Weekly Person", phone: "0825550000", code: devCode, street: "3 Week St", suburb: "Newlands", consent: true });
    await api.setPlan("weekly");
    expect((await api.getMyHome()).subscription?.status).toBe("pending");

    await api.devSwitchUser("u-c01");
    const home = await api.getMyHome();
    expect(home.subscription?.frequency).toBe("weekly");
    // Every upcoming zone day is booked unless skipped.
    expect(home.upcoming.every((d) => d.scheduled || d.skipped)).toBe(true);
    const next = home.upcoming.find((d) => d.date > api.today() && d.scheduled)!;
    await api.skipCollection(next.date, true);
    expect((await api.getMyHome()).upcoming.find((d) => d.date === next.date)?.skipped).toBe(true);
    await expect(api.skipCollection(api.today(), true)).rejects.toThrow();

    await api.setPlan(null);
    expect((await api.getMyHome()).subscription).toBeNull();
    expect("createCollectionRequest" in api).toBe(false);
  });

  it("seed has only weekly plans and no customer one-off requests", async () => {
    await api.devSwitchUser("u-admin");
    const rows = await api.getCustomers();
    expect(rows.every((r) => !r.plan || r.plan.frequency === "weekly")).toBe(true);
    expect((await api.getRequestQueue()).every((q) => q.kind === "plan")).toBe(true);
  });
});
