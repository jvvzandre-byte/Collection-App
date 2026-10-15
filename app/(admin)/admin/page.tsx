"use client";

import Link from "next/link";
import { useState } from "react";
import { Bubbles, LineChart, PillBar } from "@/components/admin/charts";
import { Avatar, Count, Panel, Seg, Tag } from "@/components/admin/ui";
import { IconArrowUpRight, IconCalendar, IconGift, IconMessage, IconTruck } from "@/components/Icons";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { WEEKDAYS, formatDay, formatMonth } from "@/lib/logic/dates";
import { kg } from "@/lib/format";

export default function Overview() {
  const { data: d } = useData(() => api.getDashboard());
  const [range, setRange] = useState<"12" | "8" | "4">("12");
  if (!d) return <div className="h-[70vh] animate-pulse rounded-3xl bg-night-1" />;

  const delta = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);
  const outcomesTotal = d.outcomes.collected + d.outcomes.rejected + d.outcomes.missed || 1;
  const weeks = d.weekly.slice(-Number(range));
  const first = d.adminName.split(" ")[0];

  return (
    <div className="rise space-y-4">
      {/* Header row */}
      <div className="grid gap-6 pb-2 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <h1 className="text-[40px] font-light leading-tight tracking-tight">Welcome in, <span className="text-fog-2">{first}</span></h1>
          <div className="mt-5 grid max-w-[720px] grid-cols-2 gap-3 sm:grid-cols-4">
            <PillBar label="Active households" pct={(d.activeThisMonth / Math.max(1, d.customers)) * 100} tone="hot" />
            <PillBar label="Run capacity, 7 days" pct={d.capacityUsedPct} tone="white" />
            <PillBar label="Accepted rate" pct={(d.outcomes.collected / outcomesTotal) * 100} tone="dark" />
            <PillBar label="Waitlist vs base" pct={(d.waitlist / Math.max(1, d.customers)) * 100} tone="hatch" />
          </div>
        </div>
        <div className="flex flex-wrap gap-8">
          <BigStat value={kg(d.kgThisMonth).replace(" kg", "")} unit="kg" label={`Recycled in ${formatMonth(d.month, { month: "long" })}`} delta={delta(d.kgThisMonth, d.kgLastMonth)} />
          <BigStat value={String(d.activeThisMonth)} label="Active households" delta={delta(d.activeThisMonth, d.activeLastMonth)} />
          <BigStat value={d.entriesThisMonth.toLocaleString("en-ZA")} label="Draw entries so far" />
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_300px]">
        <Panel title="Summary">
          <div className="space-y-2.5">
            <SummaryRow href="/admin/requests" dot="bg-cool" label="Requests to review" n={d.pendingRequests} />
            <SummaryRow href="/admin/exceptions" dot="bg-hot" label="Open exceptions" n={d.openExceptions} />
            <SummaryRow href="/admin/zones" dot="bg-[#f0c674]" label="Waiting list" n={d.waitlist} />
          </div>
          <p className="mt-5 flex gap-2 text-[13px] leading-snug text-fog-3">
            <IconCalendar size={16} className="mt-0.5 shrink-0" />
            <span>{d.upcomingRuns.length} runs in the next 7 days, <span className="text-fog">{d.capacityUsedPct}% of capacity</span> booked.</span>
          </p>
        </Panel>

        <Panel title="Accepted kg per week" action={<Seg value={range} onChange={setRange} options={[{ value: "12", label: "12 weeks" }, { value: "8", label: "8 weeks" }, { value: "4", label: "4 weeks" }]} />}>
          <LineChart unit="kg" data={weeks.map((w) => ({ label: formatDay(w.weekStart, { day: "numeric", month: "short" }), sub: `Week of ${formatDay(w.weekStart, { day: "numeric", month: "long" })}`, value: w.acceptedKg }))} />
        </Panel>

        <DrawCard d={d.nextDraw} />
      </div>

      {/* Row 3 */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_300px_360px]">
        <Panel title="Upcoming runs" action={<Link href="/admin/runs" className="text-sm text-fog-2 hover:text-fog">All runs</Link>}>
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {d.upcomingRuns.map((r) => (
              <Link key={r.id} href={`/admin/runs/${r.id}`} className="inset-row flex w-[240px] shrink-0 flex-col gap-4 p-4 transition hover:border-white/15">
                <div className="flex items-start justify-between">
                  {r.driver ? <Tag tone="white">Assigned</Tag> : <Tag tone="electric">Needs driver</Tag>}
                  <div className="text-right text-xs text-fog-3">
                    <p>ZONE-{r.zone.code}</p>
                    <p>{formatDay(r.date, { weekday: "short", day: "numeric", month: "short" })}</p>
                  </div>
                </div>
                <p className="text-sm leading-snug text-fog">{r.zone.name}: {r.stopCount} of {r.zone.capacity} stops booked</p>
                <div className="mt-auto flex items-center gap-2.5">
                  {r.driver ? <Avatar name={r.driver.name} size={32} /> : <span className="grid size-8 place-items-center rounded-full border border-dashed border-white/25 text-fog-3"><IconTruck size={15} /></span>}
                  <div className="min-w-0 text-[13px]">
                    <p className="truncate text-fog">{r.driver?.name ?? "Unassigned"}</p>
                    <p className="text-fog-3">{WEEKDAYS[r.zone.collectionDay]} route</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Outcomes, 30 days" action={<Link href="/admin/exceptions" aria-label="Exceptions" className="grid size-9 place-items-center rounded-full border border-white/10"><IconArrowUpRight size={16} /></Link>}>
          <Bubbles items={[
            { label: "Collected", value: d.outcomes.collected, fill: "cool" },
            { label: "Rejected", value: d.outcomes.rejected, fill: "hot" },
            { label: "Missed", value: d.outcomes.missed, fill: "hatch" },
          ]} />
        </Panel>

        <Panel className="lg:col-span-2 xl:col-span-1" title={<span className="text-[22px] leading-tight">This month by zone</span>}>
          <div className="space-y-3">
            {d.zoneKg.map(({ zone, kg: k, customers }) => {
              const max = Math.max(...d.zoneKg.map((z) => z.kg), 1);
              return (
                <div key={zone.id}>
                  <div className="mb-1.5 flex justify-between text-[13px]"><span className="text-fog">Zone {zone.code} <span className="text-fog-3">· {customers} households</span></span><span className="tabular text-fog-2">{kg(k)}</span></div>
                  <div className="h-2 rounded-full bg-night-2"><div className="h-full rounded-full bg-cool" style={{ width: `${(k / max) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Quick href="/admin/requests" icon={<IconCalendar size={16} />} label="Review requests" />
            <Quick href="/admin/runs" icon={<IconTruck size={16} />} label="Assign drivers" />
            <Quick href="/admin/draw" icon={<IconGift size={16} />} label="Vouchers" />
            <Quick href="/admin/messages" icon={<IconMessage size={16} />} label="Sent messages" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function BigStat({ value, unit, label, delta }: { value: string; unit?: string; label: string; delta?: number }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        {delta !== undefined && (
          <span className={`relative grid size-12 place-items-center rounded-full border text-[12px] font-medium ${delta >= 0 ? "border-white/15 text-fog" : "border-hot/40 text-[#ff8db4]"}`}>
            <span className={`absolute -left-1 -top-1 grid size-5 place-items-center rounded-full text-[10px] ${delta >= 0 ? "bg-[#7fdca6] text-night" : "bg-hot text-white"}`}>{delta >= 0 ? "↗" : "↘"}</span>
            {delta > 0 ? "+" : ""}{delta}%
          </span>
        )}
        <p className="text-[52px] font-light leading-none tracking-tight tabular">{value}{unit && <span className="ml-1 text-xl text-fog-3">{unit}</span>}</p>
      </div>
      <p className="mt-2 text-sm text-fog-2">{label}</p>
      {delta !== undefined && <p className="text-xs text-fog-3">vs same day last month</p>}
    </div>
  );
}

function SummaryRow({ href, dot, label, n }: { href: string; dot: string; label: string; n: number }) {
  return (
    <Link href={href} className="inset-row flex items-center gap-3 px-3.5 py-3 transition hover:border-white/15">
      <span className={`size-2 rounded-full ${dot}`} />
      <span className="flex-1 text-sm">{label}</span>
      <Count n={n} tone={n ? "white" : "muted"} />
    </Link>
  );
}

function DrawCard({ d }: { d: { month: string; ready: boolean; done: boolean; vouchers: number; entries: number } }) {
  return (
    <div className="relative overflow-hidden rounded-xl3 bg-electric p-5 text-white lg:col-span-2 xl:col-span-1">
      <div className="flex items-start justify-between">
        <h2 className="text-[17px] font-medium">Monthly draw</h2>
        <Link href="/admin/draw" aria-label="Open draw" className="grid size-10 place-items-center rounded-full bg-white/20 transition hover:bg-white/30"><IconArrowUpRight size={18} /></Link>
      </div>
      <p className="mt-3 max-w-[240px] text-[15px] leading-snug text-white/85">
        {d.done ? `The ${formatMonth(d.month, { month: "long" })} draw is done. Track claims and redraws.` :
          d.ready ? `${formatMonth(d.month, { month: "long" })} has closed. The draw is ready to run.` :
          `Set up vouchers for ${formatMonth(d.month, { month: "long" })} before running the draw.`}
      </p>
      <div className="relative mt-6 h-[118px]">
        <div className="absolute inset-x-0 top-0 flex rotate-[-2deg] items-center justify-between rounded-2xl bg-white px-4 py-3 text-night shadow-lg">
          <span className="text-[15px]">Vouchers</span><Count n={d.vouchers} tone="white" />
        </div>
        <div className="absolute inset-x-2 top-[58px] flex rotate-[1.5deg] items-center justify-between rounded-2xl bg-[#dfe4ff] px-4 py-3 text-night shadow-lg">
          <span className="text-[15px]">Entries</span><span className="rounded-lg bg-night px-2 py-1 text-[13px] text-white tabular">{d.entries.toLocaleString("en-ZA")}</span>
        </div>
      </div>
    </div>
  );
}

function Quick({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="inset-row flex items-center gap-2 px-3 py-3 text-[13px] transition hover:border-white/15">
      <span className="grid size-7 place-items-center rounded-lg bg-night-3 text-fog-2">{icon}</span>{label}
    </Link>
  );
}
