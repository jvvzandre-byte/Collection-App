"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { User } from "@/lib/types";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { IconBell, IconLogout } from "../Icons";
import { Avatar } from "./ui";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/runs", label: "Runs" },
  { href: "/admin/requests", label: "Requests", badge: "queue" },
  { href: "/admin/exceptions", label: "Exceptions", badge: "exceptions" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/zones", label: "Zones" },
  { href: "/admin/draw", label: "Draw" },
] as const;

export function AdminShell({ user, children }: { user: User; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { data: counts } = useData(async () => ({ queue: (await api.getRequestQueue()).length, exceptions: (await api.getExceptions()).length }));

  return (
    <div className="min-h-dvh bg-night text-fog [color-scheme:dark]">
      <header className="sticky top-0 z-40 border-b border-white/[.04] bg-night/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-5 py-3 lg:px-8">
          <Link href="/admin" className="shrink-0 text-[22px] font-semibold tracking-tight">
            Kerbside<span className="text-hot">.</span><span className="ml-1 text-sm font-normal text-fog-3">admin</span>
          </Link>
          <nav aria-label="Admin" className="no-scrollbar mx-auto flex min-w-0 overflow-x-auto rounded-full border border-white/[.07] bg-night-1 p-1">
            {NAV.map((n) => {
              const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
              const badge = "badge" in n && counts ? counts[n.badge] : 0;
              return (
                <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm transition ${active ? "bg-night-3 text-fog shadow-[inset_0_0_0_1px_rgb(255_255_255/.1)]" : "text-fog-2 hover:text-fog"}`}>
                  {n.label}
                  {badge ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-hot px-1.5 text-[11px] font-semibold text-white">{badge}</span> : null}
                </Link>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/admin/messages" aria-label="Sent messages" className={`grid size-10 place-items-center rounded-full border border-white/[.07] ${path.startsWith("/admin/messages") ? "bg-night-3" : "bg-night-1"}`}><IconBell size={18} /></Link>
            <button onClick={async () => { await api.signOut(); router.replace("/login"); }} aria-label="Sign out" className="grid size-10 place-items-center rounded-full border border-white/[.07] bg-night-1"><IconLogout size={18} /></button>
            <Avatar name={user.name} size={40} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-7 lg:px-8">{children}</main>
    </div>
  );
}
