"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconCalendar, IconHome, IconTicket, IconUser } from "./Icons";

const NAV = [
  { href: "/home", label: "Home", Icon: IconHome },
  { href: "/collections", label: "Collections", Icon: IconCalendar },
  { href: "/draw", label: "Draw", Icon: IconTicket },
  { href: "/profile", label: "Profile", Icon: IconUser },
];

/** Phone-width column on every screen size, floating black tab bar like the reference. */
export function CustomerShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="mx-auto min-h-dvh max-w-[460px] bg-paper px-5 pb-32 pt-[max(1.25rem,env(safe-area-inset-top))] md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[2.5rem] md:shadow-[0_30px_80px_-40px_rgb(0_0_0/.35)] md:ring-1 md:ring-black/5">
      {children}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto flex w-fit items-center gap-1 rounded-full bg-ink p-1.5 shadow-[0_16px_40px_-12px_rgb(0_0_0/.55)]">
        {NAV.map(({ href, label, Icon }) => {
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href} aria-label={label} aria-current={active ? "page" : undefined}
              className={`flex h-12 items-center gap-2 rounded-full transition-all ${active ? "bg-white px-4 text-ink" : "w-14 justify-center text-white/75 hover:text-white"}`}>
              <Icon size={21} />
              {active && <span className="text-sm font-medium">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageTitle({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4 pt-2">
      <div>
        <h1 className="font-display text-[40px] leading-[1.02]">{title}</h1>
        {sub && <p className="mt-1.5 text-[15px] text-ink-2">{sub}</p>}
      </div>
      {right}
    </header>
  );
}
