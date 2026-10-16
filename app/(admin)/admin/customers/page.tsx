"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CustomerForm } from "@/components/admin/CustomerForm";
import { download } from "@/components/admin/download";
import { ABtn, ATable, Avatar, PageHead, Panel, Seg, Tag, aInput } from "@/components/admin/ui";
import { IconPlus, IconSearch } from "@/components/Icons";
import { api, type CustomerRow } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { toCsv } from "@/lib/csv";
import { formatDay } from "@/lib/logic/dates";
import { kg } from "@/lib/format";

type F = "all" | "active" | "lapsed" | "waitlist" | "suspended";

const match = (r: CustomerRow, f: F) =>
  f === "all" ? r.user.status !== "erased" :
  f === "active" ? r.active :
  f === "lapsed" ? !r.active && !!r.zone && r.user.status !== "suspended" && r.user.status !== "erased" :
  f === "waitlist" ? !r.zone && r.user.status !== "erased" :
  r.user.status === "suspended" || r.user.status === "erased";

export default function Customers() {
  const router = useRouter();
  const { data } = useData(() => api.getCustomers());
  const [q, setQ] = useState("");
  const [f, setF] = useState<F>("all");
  const [creating, setCreating] = useState(false);
  const rows = (data ?? []).filter((r) => match(r, f) &&
    `${r.user.name} ${r.user.phone} ${r.address?.street} ${r.address?.suburb}`.toLowerCase().includes(q.toLowerCase()));

  const exportCsv = () => download(`kilo-customers-${api.today()}.csv`, toCsv(rows.map((r) => ({
    name: r.user.name, phone: r.user.phone, street: r.address?.street, suburb: r.address?.suburb, zone: r.zone?.code ?? "waitlist",
    weekly_pickup: r.plan ? r.plan.status : "off", status: r.user.status ?? "active", active_this_month: r.active ? "yes" : "no",
    kg_this_month: r.kgThisMonth, entries_this_month: r.entriesThisMonth, lifetime_kg: r.lifetimeKg, last_collection: r.lastCollection ?? "",
  }))));

  return (
    <div className="rise">
      <PageHead title="Customers" sub={data ? `${data.filter((r) => r.user.status !== "erased").length} households · ${data.filter((r) => r.active).length} active this month` : " "}
        right={<div className="flex gap-2"><ABtn variant="line" onClick={exportCsv}>Export CSV</ABtn><ABtn variant="white" onClick={() => setCreating(true)}><IconPlus size={16} /> New household</ABtn></div>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-3" />
          <input className={`${aInput} w-72 rounded-full pl-9`} placeholder="Search name, phone, street" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Seg value={f} onChange={setF} options={[
          { value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "lapsed", label: "Not active" },
          { value: "waitlist", label: "Waitlist" }, { value: "suspended", label: "Suspended" },
        ]} />
      </div>
      <Panel>
        {!data ? <div className="h-64 animate-pulse rounded-2xl bg-night-2" /> : (
          <ATable head={["Household", "Address", "Zone", "Pickup", "This month", "Entries", "All time", "Last collection"]}>
            {rows.map((r) => (
              <tr key={r.user.id} onClick={() => router.push(`/admin/customers/view?id=${r.user.id}`)} className="cursor-pointer [&:hover_td]:bg-night-3">
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={r.user.name} size={32} />
                    <div>
                      <p className="text-fog">{r.user.name} {r.user.status === "suspended" && <Tag tone="hot">suspended</Tag>}</p>
                      <p className="text-xs text-fog-3">{r.user.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="text-fog-2">{r.address?.street}, {r.address?.suburb}</td>
                <td>{r.zone ? `Zone ${r.zone.code}` : <Tag tone="warn">Waitlist</Tag>}</td>
                <td>{r.plan ? <Tag tone={r.plan.status === "active" ? "muted" : r.plan.status === "pending" ? "cool" : "hot"}>{r.plan.status === "active" ? "weekly" : r.plan.status}</Tag> : <span className="text-fog-3">Off</span>}</td>
                <td className="tabular">{kg(r.kgThisMonth)} {r.active && <span className="ml-1 inline-block size-1.5 rounded-full bg-[#7fdca6]" title="Active" />}</td>
                <td className="tabular">{r.entriesThisMonth}</td>
                <td className="tabular text-fog-2">{kg(r.lifetimeKg)}</td>
                <td className="text-fog-2">{r.lastCollection ? formatDay(r.lastCollection) : "–"}</td>
              </tr>
            ))}
          </ATable>
        )}
        {data && !rows.length && <p className="py-6 text-center text-sm text-fog-3">No households match.</p>}
      </Panel>
      {creating && <CustomerForm open onClose={() => setCreating(false)} onSaved={(id) => router.push(`/admin/customers/view?id=${id}`)} />}
    </div>
  );
}
