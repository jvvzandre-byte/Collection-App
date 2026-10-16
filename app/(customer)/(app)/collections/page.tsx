"use client";

import { useState } from "react";
import { PageTitle } from "@/components/CustomerShell";
import { IconCalendar, IconCheck, IconSkip } from "@/components/Icons";
import { Button, Card, ErrorNote, SectionHead, Skeleton, StatusBadge } from "@/components/ui";
import { api, type UpcomingDay } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { WEEKDAYS, formatDay } from "@/lib/logic/dates";
import { kg } from "@/lib/format";

export default function Collections() {
  const { data: home } = useData(() => api.getMyHome());
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);

  if (!home) return <div className="space-y-4 pt-2"><Skeleton className="h-12 w-56" /><Skeleton className="h-40" /><Skeleton className="h-60" /></div>;

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const sub = home.subscription;
  const onPlan = sub?.status === "active";
  const day: UpcomingDay | undefined = home.upcoming.find((u) => u.date === selected) ?? home.upcoming[0];

  if (!home.zone) {
    return (
      <div className="rise">
        <PageTitle title="Collections" sub="Waiting list" />
        <Card className="mt-6 p-5 text-ink-2">We don&rsquo;t collect in {home.address?.suburb} yet. Once we do, you can start a weekly pickup here.</Card>
      </div>
    );
  }
  const weekday = WEEKDAYS[home.zone.collectionDay];

  return (
    <div className="rise">
      <PageTitle title="Collections" sub={`Zone ${home.zone.code} · every ${weekday}`} />

      <SectionHead title="Weekly pickup" />
      <Card className="flex items-center gap-4 p-4">
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${onPlan ? "bg-mint text-mint-deep" : "bg-paper text-ink-3"}`}><IconCalendar size={22} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{onPlan ? `On · every ${weekday}` : sub?.status === "pending" ? "Waiting for confirmation" : "Off"}</p>
          <p className="text-sm text-ink-2">
            {onPlan ? "Skip any week below." : sub?.status === "pending" ? "Our team confirms new pickups, usually within a day." :
              sub?.status === "declined" ? "We couldn't take you on just yet. Try again or contact us." : "Start it to be collected every week."}
          </p>
        </div>
        {onPlan || sub?.status === "pending" ? (
          stopping ? (
            <div className="flex shrink-0 gap-1.5">
              <Button size="sm" variant="danger" disabled={busy} onClick={() => act(async () => { await api.setPlan(null); setStopping(false); })}>Stop</Button>
              <Button size="sm" variant="ghost" onClick={() => setStopping(false)}>Keep</Button>
            </div>
          ) : <Button size="sm" variant="soft" className="shrink-0" onClick={() => setStopping(true)}>Stop</Button>
        ) : <Button size="sm" className="shrink-0" disabled={busy} onClick={() => act(() => api.setPlan("weekly"))}>Start</Button>}
      </Card>

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
                <span className={`size-1.5 rounded-full ${u.scheduled ? "bg-lilac-deep" : u.skipped ? "bg-ink/25" : "bg-transparent"}`} />
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
              day.scheduled ? (day.date === api.today() ? "Collection day. Bags out by 7am." : "We'll be there. Bags out by 7am.") :
              onPlan ? "Not on your plan yet." : "No pickup. Start your weekly pickup above."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {day.scheduled && !day.request && onPlan && day.date > api.today() && (
              <Button variant="soft" size="sm" disabled={busy} onClick={() => act(() => api.skipCollection(day.date, true))}><IconSkip size={16} /> Skip this week</Button>
            )}
            {day.skipped && day.date > api.today() && <Button size="sm" disabled={busy} onClick={() => act(() => api.skipCollection(day.date, false))}><IconCheck size={16} /> Collect after all</Button>}
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
