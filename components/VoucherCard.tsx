import type { Voucher } from "@/lib/types";
import { rands } from "@/lib/format";
import { IconGift } from "./Icons";

const TONES: Record<Voucher["tone"], string> = {
  lilac: "bg-lilac-soft",
  butter: "bg-butter-soft",
  mint: "bg-mint",
  rose: "bg-rose",
  sky: "bg-sky",
};

export function VoucherCard({ v, compact = false }: { v: Voucher; compact?: boolean }) {
  return (
    <div className={`relative flex shrink-0 flex-col justify-between overflow-hidden rounded-3xl p-4 ${TONES[v.tone]} ${compact ? "h-36 w-36" : "h-40 w-full"}`}>
      <span className="grid size-10 place-items-center rounded-2xl bg-white/70 text-ink"><IconGift size={20} /></span>
      <div>
        <p className="font-display text-[26px] leading-none">{rands(v.valueRands)}</p>
        <p className="mt-1 line-clamp-1 text-[14px] font-medium">{v.name}</p>
        <p className="line-clamp-1 text-[12px] text-ink-2">{v.sponsor}</p>
      </div>
      <span className="absolute -right-6 -top-6 size-20 rounded-full bg-white/35" />
    </div>
  );
}
