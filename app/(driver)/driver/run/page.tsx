"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { IconArrowLeft, IconArrowRight, IconCheck, IconMapPin, IconPhone, IconUndo, IconX } from "@/components/Icons";
import { RunMap } from "@/components/maps/RunMap";
import { directionsUrl } from "@/lib/maps/links";
import { Button, Chip, ErrorNote, Sheet, Skeleton, StatusBadge } from "@/components/ui";
import { api, type StopView } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { formatDay } from "@/lib/logic/dates";
import { kg } from "@/lib/format";

const REJECT = ["Wet cardboard", "Mixed with garden waste", "Rubble in bags", "Food contamination", "Not recyclable"];
const MISS = ["Bags not out", "Gate locked", "Couldn't find address", "Road blocked"];

type Filter = "todo" | "done" | "all";

// Query-param route (/driver/run?id=…) so the app can be statically exported.
export default function RunPageWrapper() {
  return <Suspense><RunPage /></Suspense>;
}

function RunPage() {
  const id = useSearchParams().get("id") ?? "";
  const { data: run, error } = useData(() => api.getRun(id), [id]);
  const [filter, setFilter] = useState<Filter>("todo");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const stops = useMemo(() => run?.stops ?? [], [run]);
  const shown = stops.filter((s) => filter === "all" || (filter === "todo" ? s.status === "pending" : s.status !== "pending"));
  const open = stops.find((s) => s.id === openId) ?? null;

  if (error) return <div className="pt-6"><ErrorNote>{error.message}</ErrorNote></div>;
  if (!run) return <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-96" /></div>;

  const done = stops.filter((s) => s.status !== "pending").length;
  const nextStop = stops.find((s) => s.status === "pending");
  const remaining = stops.length - done;
  const readOnly = run.status === "completed";
  const nextAfter = (stopId: string) => {
    const i = stops.findIndex((s) => s.id === stopId);
    return [...stops.slice(i + 1), ...stops.slice(0, i)].find((s) => s.status === "pending")?.id ?? null;
  };

  return (
    <div className="rise">
      <header className="sticky top-0 z-30 -mx-4 bg-paper/90 px-4 pb-3 pt-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/driver" aria-label="Back" className="grid size-12 shrink-0 place-items-center rounded-full bg-card"><IconArrowLeft /></Link>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink-2">{formatDay(run.date, { weekday: "long", day: "numeric", month: "short" })}</p>
            <p className="truncate text-[19px] font-semibold">Zone {run.zone.code} · {run.zone.name}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/[.07]">
            <div className="h-full rounded-full bg-lilac-deep transition-all" style={{ width: `${stops.length ? (done / stops.length) * 100 : 0}%` }} />
          </div>
          <span className="tabular text-sm font-medium">{done}/{stops.length}</span>
          <span className="tabular text-sm text-ink-2">{kg(run.collectedKg)}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <Chip active={filter === "todo"} onClick={() => setFilter("todo")}>To do · {remaining}</Chip>
          <Chip active={filter === "done"} onClick={() => setFilter("done")}>Done · {done}</Chip>
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
          <Chip active={showMap} onClick={() => setShowMap((m) => !m)} className="ml-auto"><IconMapPin size={16} className="-ml-1 mr-1 inline" />Map</Chip>
        </div>
      </header>

      {showMap && <div className="mt-2"><RunMap stops={stops} depot={run.depot} tone="light" height={260} onSelect={setOpenId} /></div>}

      {!readOnly && nextStop && (
        <a href={directionsUrl(nextStop)} target="_blank" rel="noopener" className="mt-2 flex items-center gap-3 rounded-3xl bg-lilac-deep p-4 text-white">
          <IconArrowRight size={20} />
          <span className="min-w-0 flex-1"><span className="block text-xs opacity-80">Next stop · {nextStop.order + 1}</span><span className="block truncate font-medium">{nextStop.street}, {nextStop.suburb}</span></span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm">Navigate</span>
        </a>
      )}

      <ol className="mt-2 space-y-2">
        {shown.map((s) => (
          <li key={s.id}>
            <button onClick={() => setOpenId(s.id)} className="flex w-full items-center gap-4 rounded-3xl bg-card p-4 text-left active:scale-[.99]">
              <span className={`grid size-12 shrink-0 place-items-center rounded-full text-lg font-semibold ${s.status === "pending" ? "bg-lilac-soft text-lilac-deep" : "bg-paper text-ink-3"}`}>{s.order + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-semibold">{s.street}</span>
                <span className="block truncate text-[15px] text-ink-2">{s.customerName} · {s.suburb}</span>
              </span>
              {s.status === "pending" ? null : (
                <span className="text-right">
                  <StatusBadge status={s.status} />
                  {s.kg != null && <span className="mt-1 block text-sm font-medium tabular">{kg(s.kg)}</span>}
                </span>
              )}
            </button>
          </li>
        ))}
        {!shown.length && (
          <li className="rounded-3xl bg-card p-6 text-center text-ink-2">{filter === "todo" ? "All stops done. Nice work." : "Nothing here yet."}</li>
        )}
      </ol>

      {!readOnly && stops.length > 0 && (
        <Button size="lg" variant={remaining ? "soft" : "ink"} className="mt-6 w-full" onClick={() => setConfirmFinish(true)}>
          Finish run
        </Button>
      )}
      {readOnly && <p className="mt-6 text-center text-sm text-ink-2">This run is completed.</p>}

      <StopSheet
        stop={open}
        readOnly={readOnly}
        onClose={() => setOpenId(null)}
        onDone={(id) => setOpenId(nextAfter(id))}
      />

      <Sheet open={confirmFinish} onClose={() => setConfirmFinish(false)} title="Finish this run?">
        <p className="text-ink-2">
          {remaining ? `${remaining} stop${remaining === 1 ? " is" : "s are"} still open and will be marked missed ("Not reached").` : "All stops are recorded."}
        </p>
        <div className="mt-6 grid gap-2">
          <Button size="lg" onClick={async () => { await api.completeRun(run.id); setConfirmFinish(false); }}>Finish run</Button>
          <Button size="lg" variant="ghost" onClick={() => setConfirmFinish(false)}>Keep going</Button>
        </div>
      </Sheet>
    </div>
  );
}

function StopSheet({ stop, readOnly, onClose, onDone }: { stop: StopView | null; readOnly: boolean; onClose: () => void; onDone: (id: string) => void }) {
  const [mode, setMode] = useState<"kg" | "reject" | "miss">("kg");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  // Reset local state when a different stop opens.
  if (stop && stop.id !== lastId) {
    setLastId(stop.id);
    setMode("kg");
    setValue(stop.kg != null ? String(stop.kg) : "");
    setError(null);
  }
  if (!stop) return null;

  const press = (k: string) => {
    setError(null);
    setValue((v) => {
      if (k === "del") return v.slice(0, -1);
      if (k === ".") return v.includes(".") ? v : (v || "0") + ".";
      if (v.includes(".") && v.split(".")[1].length >= 1) return v; // one decimal place
      if (v.replace(".", "").length >= 4) return v;
      return v === "0" ? k : v + k;
    });
  };

  const run = async (fn: () => Promise<void>) => {
    try { await fn(); onDone(stop.id); } catch (e) { setError((e as Error).message); }
  };

  return (
    <Sheet open onClose={onClose} title={<>{stop.street}<span className="block text-[15px] font-normal text-ink-2">{stop.customerName} · {stop.suburb}</span></>}>
      <div className="mb-4 flex gap-2">
        <a href={`tel:${stop.phone.replace(/\s/g, "")}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-card px-4 text-sm"><IconPhone size={16} /> Call</a>
        <a href={directionsUrl(stop)} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-full bg-card px-4 text-sm"><IconMapPin size={16} /> Navigate</a>
        <StatusBadge status={stop.status} />
      </div>

      {readOnly ? (
        <p className="rounded-2xl bg-card p-4 text-ink-2">{stop.status === "collected" ? `${kg(stop.kg ?? 0)} collected.` : stop.reason ?? "Recorded."}</p>
      ) : stop.status !== "pending" ? (
        <div className="space-y-3">
          <p className="rounded-2xl bg-card p-4">{stop.status === "collected" ? `${kg(stop.kg ?? 0)} recorded.` : `${stop.status === "rejected" ? "Rejected" : "Missed"}: ${stop.reason}`}</p>
          <Button size="lg" variant="soft" className="w-full" onClick={() => api.resetStop(stop.id)}><IconUndo size={18} /> Undo and re-record</Button>
        </div>
      ) : mode === "kg" ? (
        <>
          <div className="rounded-3xl bg-card px-5 py-4 text-center">
            <p className="text-sm text-ink-2">Accepted weight</p>
            <p className="font-display text-[64px] leading-none tabular">{value || "0"}<span className="ml-1 text-3xl text-ink-3">kg</span></p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((k) => (
              <button key={k} onClick={() => press(k)} aria-label={k === "del" ? "Delete" : k}
                className="h-16 rounded-2xl bg-card text-2xl font-medium active:bg-lilac-soft">
                {k === "del" ? "⌫" : k}
              </button>
            ))}
          </div>
          {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
          <Button size="lg" className="mt-3 h-16 w-full text-lg" disabled={!parseFloat(value)} onClick={() => run(() => api.markCollected(stop.id, parseFloat(value)))}>
            <IconCheck /> Collected{parseFloat(value) ? ` · ${value} kg` : ""}
          </Button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button size="lg" variant="danger" onClick={() => setMode("reject")}><IconX size={18} /> Reject</Button>
            <Button size="lg" variant="soft" onClick={() => setMode("miss")}>Not out</Button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 font-medium">{mode === "reject" ? "Why was it rejected?" : "What happened?"}</p>
          <div className="grid gap-2">
            {(mode === "reject" ? REJECT : MISS).map((r) => (
              <Button key={r} size="lg" variant={mode === "reject" ? "danger" : "soft"} className="justify-start"
                onClick={() => run(() => (mode === "reject" ? api.markRejected(stop.id, r) : api.markMissed(stop.id, r)))}>
                {r}
              </Button>
            ))}
            <Button size="lg" variant="ghost" onClick={() => setMode("kg")}>Back to weight</Button>
          </div>
          {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
        </>
      )}
    </Sheet>
  );
}
