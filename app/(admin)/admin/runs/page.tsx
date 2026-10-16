"use client";

import Link from "next/link";
import { useState } from "react";
import { DriverSelect } from "@/components/admin/DriverSelect";
import { ATable, PageHead, Panel, Seg, Tag } from "@/components/admin/ui";
import { IconChevronRight } from "@/components/Icons";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { addDays, formatDay } from "@/lib/logic/dates";
import { kg } from "@/lib/format";

type Range = "next" | "past";

export default function Runs() {
  const [range, setRange] = useState<Range>("next");
  const t = api.today();
  const [from, to] = range === "next" ? [t, addDays(t, 20)] : [addDays(t, -28), addDays(t, -1)];
  const { data } = useData(async () => ({ runs: await api.getRuns(from, to), drivers: await api.getDrivers() }), [from, to]);

  return (
    <div className="rise">
      <PageHead title="Runs" sub="One run per zone per collection day. Assign a driver and watch the load against capacity."
        right={<Seg value={range} onChange={setRange} options={[{ value: "next", label: "Next 3 weeks" }, { value: "past", label: "Last 4 weeks" }]} />} />
      <Panel>
        {!data ? <div className="h-64 animate-pulse rounded-2xl bg-night-2" /> : (
          <ATable head={["Date", "Zone", "Driver", "Load", "Status", "Accepted", ""]}>
            {(range === "past" ? [...data.runs].reverse() : data.runs).map((r) => {
              const pct = (r.stopCount / r.zone.capacity) * 100;
              const done = r.stops.filter((s) => s.status !== "pending").length;
              return (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">
                    <p className="text-fog">{formatDay(r.date, { weekday: "short", day: "numeric", month: "short" })}</p>
                    {r.date === t && <p className="text-xs text-hot">Today</p>}
                  </td>
                  <td><p className="text-fog">Zone {r.zone.code}</p><p className="text-xs text-fog-3">{r.zone.name}</p></td>
                  <td><DriverSelect runId={r.id} value={r.driverId} drivers={data.drivers} disabled={r.status === "completed"} /></td>
                  <td className="min-w-[160px]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-night-3"><div className={`h-full rounded-full ${pct > 100 ? "bg-hot" : "bg-cool"}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                      <span className="tabular text-xs text-fog-2">{r.stopCount}/{r.zone.capacity}</span>
                    </div>
                  </td>
                  <td>
                    {r.status === "completed" ? <Tag tone="muted">Completed</Tag> : r.status === "in_progress" ? <Tag tone="hot">On route · {done}/{r.stopCount}</Tag> : <Tag tone="white">Planned</Tag>}
                  </td>
                  <td className="tabular text-fog-2">{r.collectedKg ? kg(r.collectedKg) : "–"}</td>
                  <td className="w-10"><Link href={`/admin/runs/view?id=${r.id}`} aria-label="Open run" className="grid size-8 place-items-center rounded-full hover:bg-night-3"><IconChevronRight size={16} /></Link></td>
                </tr>
              );
            })}
          </ATable>
        )}
      </Panel>
    </div>
  );
}
