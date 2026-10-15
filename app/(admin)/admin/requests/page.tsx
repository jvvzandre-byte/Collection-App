"use client";

import { useState } from "react";
import { ABtn, AError, Avatar, Empty, PageHead, Panel, Tag } from "@/components/admin/ui";
import { IconCheck, IconX } from "@/components/Icons";
import { api, type QueueItem } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { formatDay } from "@/lib/logic/dates";
import { timeAgo } from "@/lib/format";

export default function Requests() {
  const { data } = useData(() => api.getRequestQueue());
  const [error, setError] = useState<string | null>(null);

  const decide = async (q: QueueItem, approve: boolean) => {
    setError(null);
    try { await api.decideQueueItem(q.kind, q.id, approve); } catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="rise">
      <PageHead title="Request queue" sub="New standing pickups and one-off collection requests. Customers are notified of each decision." />
      {error && <div className="mb-4"><AError>{error}</AError></div>}
      <Panel>
        {!data ? <div className="h-48 animate-pulse rounded-2xl bg-night-2" /> : data.length === 0 ? <Empty>All caught up. Nothing waiting for review.</Empty> : (
          <ul className="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
            {data.map((q) => {
              const full = q.load.booked >= q.load.capacity;
              return (
                <li key={q.kind + q.id} className="inset-row flex flex-col gap-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    {q.kind === "plan" ? <Tag tone="cool">New {q.frequency} plan</Tag> : <Tag tone="white">One-off</Tag>}
                    <span className="text-xs text-fog-3">{timeAgo(q.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar name={q.user.name} />
                    <div className="min-w-0">
                      <p className="truncate text-fog">{q.user.name}</p>
                      <p className="truncate text-[13px] text-fog-3">{q.address?.street}, {q.address?.suburb}</p>
                    </div>
                  </div>
                  <div className="text-sm text-fog-2">
                    {q.kind === "plan" ? "Starts " : ""}{formatDay(q.date, { weekday: "long", day: "numeric", month: "short" })} · Zone {q.zone?.code}
                    <span className={`ml-2 tabular ${full ? "text-[#ff8db4]" : "text-fog-3"}`}>({q.load.booked}/{q.load.capacity} booked)</span>
                    {q.note && <p className="mt-1 italic text-fog-3">&ldquo;{q.note}&rdquo;</p>}
                  </div>
                  <div className="mt-auto flex gap-2">
                    <ABtn variant="white" size="sm" onClick={() => decide(q, true)} disabled={q.kind === "request" && full}><IconCheck size={15} /> Approve</ABtn>
                    <ABtn variant="line" size="sm" onClick={() => decide(q, false)}><IconX size={15} /> Decline</ABtn>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
