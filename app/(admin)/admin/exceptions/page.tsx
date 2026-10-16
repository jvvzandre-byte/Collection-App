"use client";

import Link from "next/link";
import { useState } from "react";
import { ABtn, AError, Empty, PageHead, Panel, Seg, Tag } from "@/components/admin/ui";
import { api, type ExceptionItem } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { formatDay } from "@/lib/logic/dates";

type F = "all" | "stops" | "runs";
const LABEL: Record<ExceptionItem["kind"], [string, "hot" | "warn" | "electric" | "cool"]> = {
  rejected: ["Rejected", "hot"],
  missed: ["Missed", "warn"],
  unassigned: ["No driver", "electric"],
  over_capacity: ["Over capacity", "cool"],
};

export default function Exceptions() {
  const { data } = useData(() => api.getExceptions());
  const [f, setF] = useState<F>("all");
  const [error, setError] = useState<string | null>(null);
  const items = (data ?? []).filter((e) => f === "all" || (f === "stops" ? !!e.collectionId : !e.collectionId));

  const act = async (id: string, action: "resolve" | "reschedule") => {
    try { await api.resolveException(id, action); setError(null); } catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="rise">
      <PageHead title="Exceptions" sub="Rejected and missed stops, runs without a driver, and runs over capacity."
        right={<Seg value={f} onChange={setF} options={[{ value: "all", label: "All" }, { value: "stops", label: "Stops" }, { value: "runs", label: "Runs" }]} />} />
      {error && <div className="mb-4"><AError>{error}</AError></div>}
      <Panel>
        {!data ? <div className="h-48 animate-pulse rounded-2xl bg-night-2" /> : !items.length ? <Empty>No open exceptions.</Empty> : (
          <ul className="space-y-2">
            {items.map((e) => (
              <li key={e.id} className="inset-row flex flex-wrap items-center gap-4 p-4">
                <div className="w-28 shrink-0"><Tag tone={LABEL[e.kind][1]}>{LABEL[e.kind][0]}</Tag></div>
                <div className="min-w-[200px] flex-1">
                  <p className="text-fog">{e.title}</p>
                  <p className="text-[13px] text-fog-3">{e.detail} · {formatDay(e.date)}{e.zone ? ` · Zone ${e.zone.code}` : ""}</p>
                </div>
                <div className="flex gap-2">
                  {e.collectionId ? (
                    <>
                      <ABtn size="sm" variant="white" onClick={() => act(e.collectionId!, "reschedule")}>Book next run</ABtn>
                      <ABtn size="sm" variant="line" onClick={() => act(e.collectionId!, "resolve")}>Mark resolved</ABtn>
                    </>
                  ) : (
                    <Link href={`/admin/runs/view?id=${e.runId}`} className="inline-flex h-8 items-center rounded-full bg-fog px-3 text-[13px] font-medium text-night">Open run</Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
