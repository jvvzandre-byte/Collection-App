"use client";

import { useState } from "react";
import { PageTitle } from "@/components/CustomerShell";
import { IconCheck, IconSkip } from "@/components/Icons";
import { Button, Card, Chip, ErrorNote, SectionHead, Skeleton, StatusBadge } from "@/components/ui";
import { api, type UpcomingDay } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { WEEKDAYS, formatDay } from "@/lib/logic/dates";
import { kg } from "@/lib/format";
import type { Frequency } from "@/lib/types";

export default function Collections() {
  const { data: home } = useData(() => api.getMyHome());
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!home) return <div className="space-y-4 pt-2"><Skeleton className="h-12 w-56" /><Skeleton className="h-40" /><Skeleton className="h-60" /></div>;

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const sub = home.subscription;
  const plan: Frequency | "none" = sub && sub.status !== "declined" ? sub.frequency : "none";
  const day: UpcomingDay | undefined = home.upcoming.find((u) => u.date === selected) ?? home.upcoming[0];

  if (!home.zone) {
    return (
      <div className="rise">
        <PageTitle title="Collections" sub="Waiting list" />
        <Card className="mt-6 p-5 text-ink-2">We don&rsquo;t collect in {home.address?.suburb} yet. Once we do, you can choose a plan here.</Card>
      </div>
    );
  }

  return (
    <div className="rise">
      <PageTitle title="Collections" sub={`Zone ${home.zone.code} · every ${WEEKDAYS[home.zone.collectionDay]}`} />

      <SectionHead title="Your plan" />
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {(["weekly", "fortnightly", "none"] as const).map((f) => (
          <Chip key={f} active={plan === f} onClick={() => act(() => api.setPlan(f === "none" ? null : f))}>
            {f === "weekly" ? "Weekly" : f === "fortnightly" ? "Fortnightly" : "One-offs only"}
          </Chip>
        ))}
      </div>
      {sub?.status === "pending" && <p className="mt-2 text-sm text-ink-2">Waiting for our team to confirm your {sub.frequency} plan.</p>}
      {sub?.status === "declined" && <p className="mt-2 text-sm text-rose-deep">We couldn&rsquo;t take on a standing plan right now. You can still book one-offs.</p>}

      <SectionHead title="Collection days" />
      {/* Week strip, after the reference's appointment slot picker */}
      <div className="rounded-3xl bg-lilac-soft p-3">
        <div className="grid grid-cols-6 gap-1">
          {home.upcoming.map((u) => {
            const isSel = u.date === day?.date;
            return (
              <button key={u.date} onClick={() => setSelected(u.date)} aria-pressed={isSel}
                className="flex flex-col items-center gap-1.5 rounded-2xl py-2">
                <span className="text-[11px] uppercase tracking-wide text-ink-2">{formatDay(u.date, { month: "short" })}</span>
                <span className={`grid size-11 place-items-center rounded-full text-[17px] font-medium transition ${isSel ? "bg-lilac-deep text-white shadow-[0_0_0_4px_white]" : "text-ink"}`}>
                  {formatDay(u.date, { day: "numeric" })}
                </span>
                <span className={`size-1.5 rounded-full ${u.scheduled ? "bg-lilac-deep" : u.request ? "bg-[#d9a520]" : u.skipped ? "bg-ink/25" : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
      </div>

      {day && (
        <Card className="mt-3 p-5">
          <p className="text-sm text-ink-2">{formatDay(day.date, { weekday: "long" })}</p>
          <p className="font-display text-[30px] leading-tight">{formatDay(day.date, { day: "numeric", month: "long" })}</p>
          <p className="mt-2 text-[15px] text-ink-2">
            {day.skipped ? "You've skipped this one." :
              day.request?.status === "pending" ? "Requested. We'll confirm soon." :
              day.scheduled ? "We'll be there. Bags out by 7am." :
              day.date === api.today() ? "Nothing booked today. Requests close the day before." :
              "Nothing booked for this day."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {day.scheduled && !day.request && sub?.status === "active" && (
              <Button variant="soft" size="sm" disabled={busy} onClick={() => act(() => api.skipCollection(day.date, true))}><IconSkip size={16} /> Skip</Button>
            )}
            {day.skipped && <Button size="sm" disabled={busy} onClick={() => act(() => api.skipCollection(day.date, false))}><IconCheck size={16} /> Collect after all</Button>}
            {!day.scheduled && !day.skipped && !day.request && day.date > api.today() && (
              <Button size="sm" disabled={busy} onClick={() => act(() => api.createCollectionRequest({ date: day.date }))}>Request this date</Button>
            )}
            {day.request && <Button variant="soft" size="sm" disabled={busy} onClick={() => act(() => api.cancelCollectionRequest(day.request!.id))}>Cancel request</Button>}
          </div>
          {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
        </Card>
      )}

      <SectionHead title="History" action={`${home.collectionsCount} collected`} />
      <Card className="divide-y divide-line px-4">
        {home.history.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 py-3.5">
            <div>
              <p className="font-medium">{formatDay(c.date, { weekday: "short", day: "numeric", month: "short" })}</p>
              <p className="text-sm text-ink-2">{c.status === "collected" ? kg(c.kg ?? 0) : c.reason}</p>
            </div>
            <StatusBadge status={c.status} />
          </div>
        ))}
        {!home.history.length && <p className="py-4 text-sm text-ink-2">No collections yet.</p>}
      </Card>
    </div>
  );
}
