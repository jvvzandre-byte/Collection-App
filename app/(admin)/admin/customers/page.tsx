"use client";

import { useState } from "react";
import { ATable, Avatar, PageHead, Panel, Seg, Tag, aInput } from "@/components/admin/ui";
import { IconSearch } from "@/components/Icons";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { formatDay } from "@/lib/logic/dates";
import { kg } from "@/lib/format";

type F = "all" | "active" | "lapsed";

export default function Customers() {
  const { data } = useData(() => api.getCustomers());
  const [q, setQ] = useState("");
  const [f, setF] = useState<F>("all");
  const rows = (data ?? []).filter((r) =>
    (f === "all" || (f === "active" ? r.active : !r.active)) &&
    `${r.user.name} ${r.user.phone} ${r.address?.street} ${r.address?.suburb}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="rise">
      <PageHead title="Customers" sub={data ? `${data.length} households · ${data.filter((r) => r.active).length} active this month` : " "}
        right={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-3" />
              <input className={`${aInput} w-64 rounded-full pl-9`} placeholder="Search name, phone, street" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Seg value={f} onChange={setF} options={[{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "lapsed", label: "Not active" }]} />
          </div>
        } />
      <Panel>
        {!data ? <div className="h-64 animate-pulse rounded-2xl bg-night-2" /> : (
          <ATable head={["Household", "Address", "Zone", "Plan", "This month", "Entries", "All time", "Last collection"]}>
            {rows.map((r) => (
              <tr key={r.user.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={r.user.name} size={32} />
                    <div><p className="text-fog">{r.user.name}</p><p className="text-xs text-fog-3">{r.user.phone}</p></div>
                  </div>
                </td>
                <td className="text-fog-2">{r.address?.street}, {r.address?.suburb}</td>
                <td>{r.zone ? `Zone ${r.zone.code}` : <Tag tone="warn">Waitlist</Tag>}</td>
                <td>{r.plan ? <Tag tone={r.plan.status === "active" ? "muted" : r.plan.status === "pending" ? "cool" : "hot"}>{r.plan.frequency}{r.plan.status !== "active" ? ` · ${r.plan.status}` : ""}</Tag> : <span className="text-fog-3">One-offs</span>}</td>
                <td className="tabular">{kg(r.kgThisMonth)} {r.active && <span className="ml-1 inline-block size-1.5 rounded-full bg-[#7fdca6]" title="Active" />}</td>
                <td className="tabular">{r.entriesThisMonth}</td>
                <td className="tabular text-fog-2">{kg(r.lifetimeKg)}</td>
                <td className="text-fog-2">{r.lastCollection ? formatDay(r.lastCollection) : "–"}</td>
              </tr>
            ))}
          </ATable>
        )}
      </Panel>
    </div>
  );
}
