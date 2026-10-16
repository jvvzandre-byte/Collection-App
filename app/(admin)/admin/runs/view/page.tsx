"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { DriverSelect } from "@/components/admin/DriverSelect";
import { download } from "@/components/admin/download";
import { ABtn, AError, ConfirmBtn, Empty, PageHead, Panel, StatCard, Tag, aInput } from "@/components/admin/ui";
import { IconArrowLeft, IconChevronDown, IconUndo, IconX } from "@/components/Icons";
import { api, type StopView } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { toCsv } from "@/lib/csv";
import { formatDay } from "@/lib/logic/dates";
import { kg } from "@/lib/format";

const TONE = { pending: "muted", collected: "good", rejected: "hot", missed: "warn" } as const;
const REJECT = ["Wet cardboard", "Mixed with garden waste", "Rubble in bags", "Food contamination", "Not recyclable"];
const MISS = ["Bags not out", "Gate locked", "Couldn't find address", "Road blocked", "Not reached"];

// Query-param route (/admin/runs/view?id=…) so the app can be statically exported.
export default function RunDetailPage() {
  return <Suspense><RunDetail /></Suspense>;
}

function RunDetail() {
  const id = useSearchParams().get("id") ?? "";
  const { data, error: loadError } = useData(async () => ({ run: await api.getRun(id), drivers: await api.getDrivers(), customers: await api.getCustomers() }), [id]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState("");
  if (loadError) return <Empty>{loadError.message}</Empty>;
  if (!data) return <div className="h-64 animate-pulse rounded-3xl bg-night-1" />;
  const { run, drivers, customers } = data;
  const act = async (fn: () => Promise<unknown>) => { try { await fn(); setError(null); } catch (e) { setError((e as Error).message); } };
  const count = (s: string) => run.stops.filter((x) => x.status === s).length;
  const done = run.status === "completed";
  const onRun = new Set(run.stops.map((s) => s.userId));
  const addable = customers.filter((c) => c.zone?.id === run.zoneId && !onRun.has(c.user.id) && c.user.status !== "suspended" && c.user.status !== "erased");

  const exportSheet = () => download(`kilo-run-${run.zone.code}-${run.date}.csv`, toCsv(run.stops.map((s) => ({
    stop: s.order + 1, name: s.customerName, phone: s.phone, street: s.street, suburb: s.suburb, status: s.status, kg: s.kg ?? "", note: s.reason ?? "",
  }))));

  return (
    <div className="rise">
      <Link href="/admin/runs" className="mb-4 inline-flex items-center gap-2 text-sm text-fog-2 hover:text-fog"><IconArrowLeft size={16} /> Runs</Link>
      <PageHead title={<>Zone {run.zone.code} <span className="text-fog-3">· {formatDay(run.date, { weekday: "long", day: "numeric", month: "long" })}</span></>}
        sub={<span className="flex flex-wrap items-center gap-2">{run.zone.name} {done ? <Tag>Completed</Tag> : run.status === "in_progress" ? <Tag tone="hot">On route</Tag> : <Tag tone="white">Planned</Tag>}</span>}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <DriverSelect runId={run.id} value={run.driverId} drivers={drivers} disabled={done} />
            <ABtn variant="line" onClick={exportSheet}>Run sheet CSV</ABtn>
            {done ? <ABtn variant="line" onClick={() => act(() => api.reopenRun(run.id))}>Reopen run</ABtn>
              : run.stops.length > 0 && <ConfirmBtn size="md" label="Complete run" confirm={count("pending") ? `Complete, ${count("pending")} missed` : "Complete run"} onConfirm={() => act(() => api.completeRun(run.id))} />}
          </div>
        } />
      {error && <div className="mb-4"><AError>{error}</AError></div>}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Stops" value={`${run.stopCount}/${run.zone.capacity}`} sub={run.stopCount > run.zone.capacity ? "over capacity" : `${run.zone.capacity - run.stopCount} spaces`} />
        <StatCard label="Collected" value={count("collected")} />
        <StatCard label="Rejected" value={count("rejected")} />
        <StatCard label="Missed" value={count("missed")} />
        <StatCard label="Accepted" value={kg(run.collectedKg)} />
      </div>

      <Panel title="Stops" action={!done && (
        <div className="flex items-center gap-2">
          <select className={`${aInput} w-64`} value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Household to add">
            <option value="">Add a household…</option>
            {addable.map((c) => <option key={c.user.id} value={c.user.id}>{c.user.name} · {c.address?.street}</option>)}
          </select>
          <ABtn variant="white" disabled={!adding} onClick={() => act(async () => { await api.addStopToRun(run.id, adding); setAdding(""); })}>Add</ABtn>
        </div>
      )}>
        {run.stops.length ? (
          <ol className="space-y-1.5">
            {run.stops.map((s, i) => <StopRow key={s.id} s={s} first={i === 0} last={i === run.stops.length - 1} locked={done} act={act} />)}
          </ol>
        ) : <Empty>No households are booked on this run yet.</Empty>}
        {done && <p className="mt-3 text-xs text-fog-3">Completed runs are locked. Reopen to correct an outcome.</p>}
      </Panel>
    </div>
  );
}

function StopRow({ s, first, last, locked, act }: { s: StopView; first: boolean; last: boolean; locked: boolean; act: (fn: () => Promise<unknown>) => void }) {
  const [weight, setWeight] = useState("");
  const [menu, setMenu] = useState<"reject" | "miss" | null>(null);
  return (
    <li className="inset-row flex flex-wrap items-center gap-3 p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-night-3 text-sm tabular text-fog-2">{s.order + 1}</span>
      <div className="min-w-[180px] flex-1">
        <Link href={`/admin/customers/view?id=${s.userId}`} className="text-fog hover:underline">{s.customerName}</Link>
        <p className="text-xs text-fog-3">{s.street}, {s.suburb} · {s.phone}</p>
      </div>

      {s.status !== "pending" ? (
        <div className="flex items-center gap-2">
          <Tag tone={TONE[s.status]}>{s.status}{s.kg != null ? ` · ${kg(s.kg)}` : ""}</Tag>
          {s.reason && <span className="text-xs text-fog-3">{s.reason}</span>}
          {!locked && <ABtn size="sm" variant="ghost" onClick={() => act(() => api.resetStop(s.id))} title="Undo outcome"><IconUndo size={14} /> Undo</ABtn>}
        </div>
      ) : locked ? <Tag>Open</Tag> : menu ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {(menu === "reject" ? REJECT : MISS).map((r) => (
            <ABtn key={r} size="sm" variant={menu === "reject" ? "hot" : "ghost"} onClick={() => act(() => (menu === "reject" ? api.markRejected(s.id, r) : api.markMissed(s.id, r)))}>{r}</ABtn>
          ))}
          <ABtn size="sm" variant="line" onClick={() => setMenu(null)}>Back</ABtn>
        </div>
      ) : (
        <form className="flex items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); act(() => api.markCollected(s.id, parseFloat(weight))); }}>
          <input className={`${aInput} w-24 text-right`} inputMode="decimal" placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))} aria-label={`Weight for ${s.customerName}`} />
          <ABtn size="sm" variant="white" type="submit" disabled={!parseFloat(weight)}>Collected</ABtn>
          <ABtn size="sm" variant="line" onClick={() => setMenu("reject")}>Reject</ABtn>
          <ABtn size="sm" variant="line" onClick={() => setMenu("miss")}>Missed</ABtn>
        </form>
      )}

      {!locked && (
        <div className="flex items-center gap-1">
          <button className="grid size-8 place-items-center rounded-full hover:bg-night-3 disabled:opacity-25" disabled={first} onClick={() => act(() => api.moveStop(s.id, -1))} aria-label="Move up"><IconChevronDown size={16} className="rotate-180" /></button>
          <button className="grid size-8 place-items-center rounded-full hover:bg-night-3 disabled:opacity-25" disabled={last} onClick={() => act(() => api.moveStop(s.id, 1))} aria-label="Move down"><IconChevronDown size={16} /></button>
          {s.status === "pending" && <RemoveBtn onConfirm={() => act(() => api.removeStop(s.id))} />}
        </div>
      )}
    </li>
  );
}

function RemoveBtn({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return armed
    ? <ABtn size="sm" variant="hot" onClick={onConfirm} onBlur={() => setArmed(false)} autoFocus>Remove &amp; notify</ABtn>
    : <button className="grid size-8 place-items-center rounded-full text-fog-3 hover:bg-night-3 hover:text-[#ff8db4]" onClick={() => setArmed(true)} aria-label="Remove stop"><IconX size={15} /></button>;
}
