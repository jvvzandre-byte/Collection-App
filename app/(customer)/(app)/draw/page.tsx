"use client";

import Link from "next/link";
import { PageTitle } from "@/components/CustomerShell";
import { Mascot } from "@/components/Mascot";
import { VoucherCard } from "@/components/VoucherCard";
import { Card, SectionHead, Skeleton } from "@/components/ui";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { formatMonth, shiftMonth } from "@/lib/logic/dates";
import { kg, rands } from "@/lib/format";

export default function DrawPage() {
  const { data } = useData(() => api.getMyDraw());
  if (!data) return <div className="space-y-4 pt-2"><Skeleton className="h-12 w-56" /><Skeleton className="h-56" /></div>;

  const toNext = Math.max(0, Math.round((Math.floor(data.myKg) + 1 - data.myKg) * 10) / 10);
  const frac = data.myKg - Math.floor(data.myKg);
  const drawDate = `${data.settings.drawDay} ${formatMonth(shiftMonth(data.month, 1), { month: "long" })}`;

  return (
    <div className="rise">
      <PageTitle title="Monthly draw" sub={`${formatMonth(data.month)} · drawn on ${drawDate}`} />

      <Card className="relative mt-6 overflow-hidden bg-butter p-6">
        <p className="text-sm font-medium text-ink/60">Your entries</p>
        <p className="font-display text-[88px] leading-[.9] tabular">{data.myEntries}</p>
        <p className="mt-2 max-w-[60%] text-[15px] text-ink/75">from {kg(data.myKg)} recycled this month</p>
        <div className="mt-5 max-w-[62%]">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-white/60">
            <div className="rounded-full bg-ink" style={{ width: `${Math.max(4, frac * 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink/65">{toNext ? `${kg(toNext)} to your next entry` : "Every kilogram is one entry"}</p>
        </div>
        <Mascot size={140} mood="wink" className="absolute -bottom-4 -right-4" />
      </Card>
      <p className="mt-3 px-1 text-sm text-ink-2">
        {data.totalEntries.toLocaleString("en-ZA")} entries in the draw so far. Entries are counted at month end and start fresh after each draw.
      </p>

      <SectionHead title="This month's prizes" action={`${data.prizes.length} winners`} />
      <div className="grid grid-cols-2 gap-2.5">
        {data.prizes.map((v) => <VoucherCard key={v.id} v={v} />)}
      </div>

      <SectionHead title="Past winners" />
      <div className="space-y-3">
        {data.pastDraws.map((d) => (
          <Card key={d.month} className="p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="font-display text-[24px]">{formatMonth(d.month)}</p>
              {d.mine && <span className="rounded-full bg-mint px-3 py-1 text-xs font-medium text-mint-deep">You won!</span>}
            </div>
            <ul className="divide-y divide-line">
              {d.winners.map((w) => (
                <li key={w.voucher.id} className="flex items-center justify-between py-2.5 text-[15px]">
                  <span>{w.displayName} <span className="text-ink-3">· {w.suburb}</span></span>
                  <span className="text-ink-2">{rands(w.voucher.valueRands)} {w.voucher.sponsor}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
        {!data.pastDraws.length && <Card className="p-4 text-sm text-ink-2">The first draw hasn&rsquo;t happened yet.</Card>}
      </div>

      <Link href="/rules" className="mt-6 block rounded-3xl border border-line bg-card p-4 text-center text-[15px] font-medium">Read the draw rules</Link>
    </div>
  );
}
