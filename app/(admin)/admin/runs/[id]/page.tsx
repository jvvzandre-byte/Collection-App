"use client";

import Link from "next/link";
import { use } from "react";
import { DriverSelect } from "@/components/admin/DriverSelect";
import { ATable, Empty, PageHead, Panel, Tag } from "@/components/admin/ui";
import { IconArrowLeft } from "@/components/Icons";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { formatDay } from "@/lib/logic/dates";
import { kg } from "@/lib/format";

const tone = { pending: "muted", collected: "good", rejected: "hot", missed: "warn" } as const;

export default function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = useData(async () => ({ run: await api.getRun(id), drivers: await api.getDrivers() }), [id]);
  if (error) return <Empty>{error.message}</Empty>;
  if (!data) return <div className="h-64 animate-pulse rounded-3xl bg-night-1" />;
  const { run, drivers } = data;
  const count = (s: string) => run.stops.filter((x) => x.status === s).length;

  return (
    <div className="rise">
      <Link href="/admin/runs" className="mb-4 inline-flex items-center gap-2 text-sm text-fog-2 hover:text-fog"><IconArrowLeft size={16} /> Runs</Link>
      <PageHead title={<>Zone {run.zone.code} <span className="text-fog-3">· {formatDay(run.date, { weekday: "long", day: "numeric", month: "long" })}</span></>}
        sub={run.zone.name}
        right={<DriverSelect runId={run.id} value={run.driverId} drivers={drivers} disabled={run.status === "completed"} />} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["Stops", `${run.stopCount}/${run.zone.capacity}`], ["Collected", count("collected")], ["Rejected", count("rejected")], ["Missed", count("missed")], ["Accepted", kg(run.collectedKg)]].map(([l, v]) => (
          <div key={l} className="panel p-4"><p className="text-xs uppercase tracking-wider text-fog-3">{l}</p><p className="mt-1 text-[28px] font-light tabular">{v}</p></div>
        ))}
      </div>
      <Panel title="Stops">
        {run.stops.length ? (
          <ATable head={["#", "Household", "Address", "Status", "Weight", "Note"]}>
            {run.stops.map((s) => (
              <tr key={s.id}>
                <td className="w-10 tabular text-fog-3">{s.order + 1}</td>
                <td className="text-fog">{s.customerName}</td>
                <td className="text-fog-2">{s.street}, {s.suburb}</td>
                <td><Tag tone={tone[s.status]}>{s.status === "pending" ? "To do" : s.status[0].toUpperCase() + s.status.slice(1)}</Tag></td>
                <td className="tabular">{s.kg != null ? kg(s.kg) : "–"}</td>
                <td className="text-fog-2">{s.reason ?? ""}</td>
              </tr>
            ))}
          </ATable>
        ) : <Empty>No households are booked on this run yet.</Empty>}
      </Panel>
    </div>
  );
}
