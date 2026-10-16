"use client";

import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@/components/Icons";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";

// Published draw rules + privacy notice. Values come from Settings so the app and the rules can't drift.
// DRAFT: must be reviewed under the Consumer Protection Act and POPIA before launch.

export default function Rules() {
  const router = useRouter();
  const { data: s } = useData(() => api.getSettings());
  return (
    <main className="mx-auto min-h-dvh max-w-[460px] bg-paper px-6 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <button onClick={() => router.back()} aria-label="Back" className="grid size-11 place-items-center rounded-full bg-card"><IconArrowLeft /></button>
      <p className="mt-6 inline-block rounded-full bg-butter px-3 py-1 text-xs font-medium">Draft, pending legal review</p>
      <h1 className="mt-3 font-display text-[44px] leading-none">Draw rules</h1>

      <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-ink-2 [&_h2]:mb-1 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h2]:text-ink">
        <section>
          <h2>Entries</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your driver weighs your recycling at the kerb, to one decimal place.</li>
            <li>Only accepted material counts. Wet, contaminated or mixed loads (e.g. with rubble) can be rejected.</li>
            {s?.kgCapPerCollection != null && <li>Up to {s.kgCapPerCollection} kg per collection counts toward the draw.</li>}
            <li>At month end your accepted kilograms are added up and rounded down to whole entries: 1 kg = 1 entry.</li>
            <li>Entries start again from zero after each draw.</li>
          </ul>
        </section>
        <section>
          <h2>The draw</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Held once a month{s ? ` on the ${s.drawDay}${s.drawDay === 1 ? "st" : "th"}` : ""}, for the previous month.</li>
            <li>Five different vouchers go to five different households. You can win at most one voucher per draw.</li>
            <li>Winners are chosen at random, weighted by entries. Every draw is recorded with its random seed so it can be checked.</li>
            <li>Winners are notified by message{s ? ` and have ${s.redrawAfterDays} days to claim` : ""}. Unclaimed vouchers are redrawn.</li>
            <li>One account per household address. Households only, no businesses.</li>
          </ul>
        </section>
        <section id="privacy">
          <h2>Privacy notice (POPIA)</h2>
          <p>
            We collect your name, cellphone number and address to schedule collections, record weights and run the draw.
            We store an approximate map location for your address so drivers can plan the route; only our team and drivers see it.
            We only message you about collections and prizes. Your details are stored securely and are never sold.
            Winners are shown publicly by first name, surname initial and suburb only.
            You can ask us to see, correct or delete your information at any time.
          </p>
        </section>
      </div>
    </main>
  );
}
