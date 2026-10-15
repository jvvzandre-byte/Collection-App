"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowRight, IconLogout, IconTruck } from "@/components/Icons";
import { Card, Skeleton } from "@/components/ui";
import { api, type RunView } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { formatDay } from "@/lib/logic/dates";
import { kg } from "@/lib/format";

export default function DriverHome() {
  const router = useRouter();
  const { data } = useData(async () => ({ me: await api.getCurrentUser(), runs: await api.getMyRuns() }));
  if (!data) return <div className="space-y-3"><Skeleton className="h-12 w-52" /><Skeleton className="h-64" /></div>;
  const today = api.today();
  const todays = data.runs.filter((r) => r.date === today);
  const later = data.runs.filter((r) => r.date > today);

  return (
    <div className="rise">
      <header className="flex items-start justify-between pt-2">
        <div>
          <p className="text-sm text-ink-2">{formatDay(today, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="font-display text-[40px] leading-none">Morning, {data.me?.name.split(" ")[0]}</h1>
        </div>
        <button onClick={async () => { await api.signOut(); router.replace("/login"); }} aria-label="Sign out" className="grid size-12 place-items-center rounded-full bg-card"><IconLogout /></button>
      </header>

      <h2 className="mb-3 mt-7 text-[19px] font-semibold">Today</h2>
      {todays.length ? todays.map((r) => <TodayCard key={r.id} run={r} />) : (
        <Card className="flex items-center gap-4 p-5">
          <span className="grid size-12 place-items-center rounded-2xl bg-lilac-soft text-lilac-deep"><IconTruck /></span>
          <p className="text-ink-2">No runs for you today.</p>
        </Card>
      )}

      <h2 className="mb-3 mt-8 text-[19px] font-semibold">Coming up</h2>
      <div className="space-y-2">
        {later.map((r) => (
          <Link key={r.id} href={`/driver/run/${r.id}`} className="flex items-center gap-4 rounded-3xl bg-card p-4">
            <div className="grid size-14 place-items-center rounded-2xl bg-paper text-center leading-none">
              <span className="text-lg font-semibold">{formatDay(r.date, { day: "numeric" })}</span>
              <span className="text-[11px] uppercase text-ink-3">{formatDay(r.date, { weekday: "short" })}</span>
            </div>
            <div className="flex-1">
              <p className="font-medium">Zone {r.zone.code} · {r.zone.name}</p>
              <p className="text-sm text-ink-2">{r.stopCount} stops booked</p>
            </div>
            <IconArrowRight className="text-ink-3" />
          </Link>
        ))}
        {!later.length && <p className="text-sm text-ink-2">Nothing assigned in the next two weeks.</p>}
      </div>
    </div>
  );
}

function TodayCard({ run }: { run: RunView }) {
  const done = run.stops.filter((s) => s.status !== "pending").length;
  const pct = run.stopCount ? (done / run.stopCount) * 100 : 0;
  return (
    <div className="mb-3 overflow-hidden rounded-[2rem] bg-ink p-6 text-white">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/60">Zone {run.zone.code}</p>
          <p className="text-[22px] font-semibold leading-tight">{run.zone.name}</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm capitalize">{run.status.replace("_", " ")}</span>
      </div>
      <div className="mt-6 flex items-end gap-6">
        <div>
          <p className="font-display text-[64px] leading-[.85] tabular">{done}<span className="text-white/40">/{run.stopCount}</span></p>
          <p className="mt-1 text-sm text-white/60">stops done</p>
        </div>
        <div>
          <p className="font-display text-[40px] leading-[.85] tabular">{kg(run.collectedKg)}</p>
          <p className="mt-1 text-sm text-white/60">accepted</p>
        </div>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-butter transition-all" style={{ width: `${pct}%` }} /></div>
      <Link href={`/driver/run/${run.id}`} className="mt-6 flex h-16 items-center justify-between rounded-full bg-white p-2 pl-6 text-[17px] font-medium text-ink">
        {run.status === "completed" ? "View run" : done ? "Continue route" : "Start route"}
        <span className="grid size-12 place-items-center rounded-full bg-ink text-white"><IconArrowRight /></span>
      </Link>
    </div>
  );
}
