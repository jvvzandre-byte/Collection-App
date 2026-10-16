"use client";

import Link from "next/link";
import { useState } from "react";
import { PageTitle } from "@/components/CustomerShell";
import { IconCalendar, IconRecycle, IconScale, IconTicket, IconUndo } from "@/components/Icons";
import { Mascot } from "@/components/Mascot";
import { VoucherCard } from "@/components/VoucherCard";
import { Button, Card, ErrorNote, SectionHead, Skeleton, StatusBadge } from "@/components/ui";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { WEEKDAYS, daysBetween, formatDay } from "@/lib/logic/dates";
import { initials, kg } from "@/lib/format";

export default function Home() {
  const { data } = useData(async () => ({ home: await api.getMyHome(), draw: await api.getMyDraw() }));
  const [error, setError] = useState<string | null>(null);
  if (!data) return <HomeSkeleton />;
  const { home, draw } = data;
  const first = home.user.name.split(" ")[0];
  const next = home.next;
  const pendingPlan = home.subscription?.status === "pending";

  const toggleSkip = async (date: string, skip: boolean) => {
    setError(null);
    try { await api.skipCollection(date, skip); } catch (e) { setError((e as Error).message); }
  };

  const inDays = next ? daysBetween(api.today(), next.date) : 0;
  const when = inDays === 0 ? "Today" : inDays === 1 ? "Tomorrow" : `In ${inDays} days`;

  return (
    <div className="rise">
      <PageTitle
        title={<>Hi {first}</>}
        sub={home.zone ? `Zone ${home.zone.code} · ${WEEKDAYS[home.zone.collectionDay]} collections` : "You're on the waiting list"}
        right={<Link href="/profile" className="grid size-12 place-items-center rounded-full bg-card text-sm font-semibold" aria-label="Profile">{initials(home.user.name)}</Link>}
      />

      {/* Next collection banner */}
      {!home.zone ? (
        <Card className="relative mt-6 overflow-hidden bg-lilac p-6">
          <p className="max-w-[60%] font-display text-[30px] leading-[1.05]">Not in {home.address?.suburb} yet</p>
          <p className="mt-2 max-w-[62%] text-sm text-ink/70">We&rsquo;ll message you the day we start collecting in your area.</p>
          <Mascot size={150} mood="sleepy" className="absolute -bottom-6 -right-6" />
        </Card>
      ) : (
        <Card className="relative mt-6 overflow-hidden bg-lilac p-6">
          <p className="max-w-[64%] text-sm font-medium text-ink/65">{next?.skipped ? "Skipped" : next?.scheduled ? `Next collection · ${when}` : pendingPlan ? "Weekly pickup awaiting approval" : "Weekly pickup is off"}</p>
          <p className="mt-1 max-w-[62%] font-display text-[34px] leading-[1.02]">
            {next ? formatDay(next.date, { weekday: "long", day: "numeric", month: "long" }) : "Start your weekly pickup"}
          </p>
          <div className="relative z-10 mt-5 flex flex-wrap gap-2">
            {next?.scheduled && home.subscription?.status === "active" && !next.request && (
              <Button size="sm" onClick={() => toggleSkip(next.date, true)}>Skip this one</Button>
            )}
            {next?.skipped && <Button size="sm" onClick={() => toggleSkip(next.date, false)}><IconUndo size={16} /> Undo skip</Button>}
            {!next?.scheduled && !next?.skipped && !pendingPlan && <Link href="/collections" className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm font-medium text-white">Start weekly pickup</Link>}
          </div>
          {next?.scheduled && <p className="relative z-10 mt-3 text-sm text-ink/60">Bags out by 7am</p>}
          <Mascot size={130} mood={next?.skipped ? "sleepy" : "happy"} className="absolute -bottom-6 -right-6" />
        </Card>
      )}
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}

      {/* Numbers, laid out like the reference's category tiles */}
      <SectionHead title="This month" action={<Link href="/draw">How entries work</Link>} />
      <div className="grid grid-cols-3 gap-2.5">
        <Tile icon={<IconScale size={20} />} value={kg(home.monthKg).replace(" kg", "")} unit="kg" label="Recycled" />
        <Tile icon={<IconTicket size={20} />} value={String(home.monthEntries)} label="Draw entries" tone="butter" />
        <Tile icon={<IconRecycle size={20} />} value={kg(home.lifetimeKg).replace(" kg", "")} unit="kg" label="All time" />
      </div>

      <SectionHead title="Up for grabs" action={<Link href="/draw">View all</Link>} />
      {draw.prizes.length ? (
        <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1">
          {draw.prizes.map((v) => <VoucherCard key={v.id} v={v} compact />)}
        </div>
      ) : <p className="text-sm text-ink-2">Prizes for this month are being lined up.</p>}

      <SectionHead title="Recent collections" action={home.history.length > 4 ? <Link href="/collections">See all</Link> : undefined} />
      <div className="space-y-2">
        {home.history.slice(0, 4).map((c) => (
          <Card key={c.id} className="flex items-center gap-4 p-3 pr-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-paper text-center leading-none">
              <span className="text-lg font-semibold">{formatDay(c.date, { day: "numeric" })}</span>
              <span className="text-[11px] uppercase text-ink-3">{formatDay(c.date, { month: "short" })}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{c.status === "collected" ? kg(c.kg ?? 0) : c.status === "rejected" ? "Not accepted" : "Missed"}</p>
              <p className="truncate text-sm text-ink-2">{c.reason ?? `${Math.floor(c.kg ?? 0)} entries earned`}</p>
            </div>
            <StatusBadge status={c.status} />
          </Card>
        ))}
        {!home.history.length && (
          <Card className="flex items-center gap-3 p-4 text-sm text-ink-2"><IconCalendar /> Your first collection will show up here.</Card>
        )}
      </div>
    </div>
  );
}

function Tile({ icon, value, unit, label, tone = "lilac" }: { icon: React.ReactNode; value: string; unit?: string; label: string; tone?: "lilac" | "butter" }) {
  return (
    <div className={`flex h-32 flex-col justify-between rounded-3xl p-3.5 ${tone === "butter" ? "bg-butter-soft" : "bg-lilac-soft"}`}>
      <span className={tone === "butter" ? "text-[#a07a1c]" : "text-lilac-deep"}>{icon}</span>
      <div>
        <p className="whitespace-nowrap font-display text-[30px] leading-none tabular">{value}{unit && <span className="ml-0.5 font-sans text-[13px] text-ink-2">{unit}</span>}</p>
        <p className="text-[13px] text-ink-2">{label}</p>
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-4 pt-2">
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-48" />
      <div className="grid grid-cols-3 gap-2.5"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
    </div>
  );
}
