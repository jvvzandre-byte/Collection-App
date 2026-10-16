import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Mascot } from "@/components/Mascot";
import { PillCta } from "@/components/ui";

export default function Welcome() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-[460px] flex-col overflow-hidden bg-[linear-gradient(180deg,#dfe1fb_0%,#eceaf6_38%,#f7e7c0_100%)] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-16 md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[2.5rem]">
      <div className="rise text-center">
        <Logo tone="light" size={30} className="justify-center" />
        <h1 className="mt-4 font-display text-[52px] leading-[.98]">Recycling,<br /><em>collected.</em></h1>
        <p className="mx-auto mt-5 max-w-[300px] text-[16px] leading-relaxed text-ink-2">
          Put your bags out on collection day. We weigh them at the kerb, and every kilogram is an entry into the monthly voucher draw.
        </p>
      </div>

      <div className="relative mt-auto grid place-items-center">
        <div className="absolute bottom-6 h-40 w-[130%] rounded-[50%] bg-butter/80 blur-2xl" />
        <Mascot size={250} className="rise relative [animation-delay:120ms]" />
        <div className="absolute left-1 top-6 rotate-[-8deg] rounded-full bg-white px-3 py-1.5 text-sm font-medium shadow-sm">Free pickup</div>
        <div className="absolute right-0 top-16 rotate-[6deg] rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-white">1 kg = 1 entry</div>
      </div>

      <div className="relative mt-6 space-y-4">
        <PillCta href="/signup">Get started</PillCta>
        <p className="text-center text-[15px] text-ink-2">
          Already signed up? <Link href="/login" className="font-medium text-ink underline underline-offset-4">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
