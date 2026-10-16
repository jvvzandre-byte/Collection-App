"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@/lib/types";
import { api, type CustomerRow } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { IconBell, IconLogout, IconSearch, IconSettings } from "../Icons";
import { Logo } from "../Logo";
import { Avatar } from "./ui";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/runs", label: "Runs" },
  { href: "/admin/requests", label: "Requests", badge: "queue" },
  { href: "/admin/exceptions", label: "Exceptions", badge: "exceptions" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/zones", label: "Zones" },
  { href: "/admin/draw", label: "Draw" },
] as const;

export function AdminShell({ user, children }: { user: User; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { data: counts } = useData(async () => ({ queue: (await api.getRequestQueue()).length, exceptions: (await api.getExceptions()).length }));
  const iconBtn = (active: boolean) => `grid size-10 place-items-center rounded-full border border-white/[.07] transition hover:border-white/20 ${active ? "bg-night-3" : "bg-night-1"}`;

  return (
    <div className="min-h-dvh bg-night text-fog [color-scheme:dark]">
      <header className="sticky top-0 z-40 border-b border-white/[.05] bg-night/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-5 py-3 lg:px-8">
          <Link href="/admin" className="flex shrink-0 items-center gap-2" aria-label="Kilo admin home">
            <Logo size={28} />
            <span className="hidden rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wider text-fog-3 sm:inline">admin</span>
          </Link>
          <nav aria-label="Admin" className="no-scrollbar mx-auto flex min-w-0 overflow-x-auto rounded-full border border-white/[.07] bg-night-1 p-1">
            {NAV.map((n) => {
              const active = n.href === "/admin" ? path === "/admin" || path === "/admin/" : path.startsWith(n.href);
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
            <Search />
            <Link href="/admin/messages" aria-label="Messages" title="Messages" className={iconBtn(path.startsWith("/admin/messages"))}><IconBell size={18} /></Link>
            <Link href="/admin/settings" aria-label="Settings" title="Settings" className={iconBtn(path.startsWith("/admin/settings"))}><IconSettings size={18} /></Link>
            <button onClick={async () => { await api.signOut(); router.replace("/login"); }} aria-label="Sign out" title="Sign out" className={iconBtn(false)}><IconLogout size={18} /></button>
            <Avatar name={user.name} size={40} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-7 lg:px-8">{children}</main>
    </div>
  );
}

/** Find a household by name, phone or street. "/" focuses it. */
function Search() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [hi, setHi] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName);
      if (e.key === "/" && !typing) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    if (!rows) api.getCustomers().then(setRows);
  }, [open, rows]);

  const needle = q.trim().toLowerCase();
  // Phones are stored as +27…; let "082 123" match by comparing national digits.
  const digits = needle.replace(/\D/g, "").replace(/^0/, "");
  const hits = !needle || !rows ? [] : rows.filter((r) =>
    `${r.user.name} ${r.address?.street} ${r.address?.suburb}`.toLowerCase().includes(needle) ||
    (digits.length >= 3 && r.user.phone.replace(/\D/g, "").replace(/^27/, "").includes(digits))).slice(0, 8);

  const go = (id: string) => { setOpen(false); setQ(""); router.push(`/admin/customers/view?id=${id}`); };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} aria-label="Search customers" title="Search customers ( / )"
        className="grid size-10 place-items-center rounded-full border border-white/[.07] bg-night-1 transition hover:border-white/20 xl:flex xl:w-44 xl:justify-start xl:gap-2 xl:px-3 xl:text-sm xl:text-fog-3">
        <IconSearch size={17} /><span className="hidden xl:inline">Search</span><kbd className="ml-auto hidden rounded border border-white/10 px-1.5 text-[11px] xl:inline">/</kbd>
      </button>
    );
  }
  return (
    <div className="relative">
      <div className="flex h-10 w-64 items-center gap-2 rounded-full border border-cool/60 bg-night-1 px-3">
        <IconSearch size={17} className="text-fog-3" />
        <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setHi(0); }} placeholder="Name, phone or street"
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "ArrowDown") setHi((h) => Math.min(h + 1, hits.length - 1));
            if (e.key === "ArrowUp") setHi((h) => Math.max(h - 1, 0));
            if (e.key === "Enter" && hits[hi]) go(hits[hi].user.id);
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-fog outline-none placeholder:text-fog-3" aria-label="Search customers" />
      </div>
      {needle && (
        <ul className="absolute right-0 top-12 w-80 overflow-hidden rounded-2xl border border-white/10 bg-night-2 p-1.5 shadow-2xl">
          {hits.map((r, i) => (
            <li key={r.user.id}>
              <button onMouseDown={() => go(r.user.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${i === hi ? "bg-night-3" : ""}`}>
                <Avatar name={r.user.name} size={30} />
                <span className="min-w-0">
                  <span className="block truncate text-sm">{r.user.name}</span>
                  <span className="block truncate text-xs text-fog-3">{r.address?.street}, {r.address?.suburb}</span>
                </span>
              </button>
            </li>
          ))}
          {!hits.length && <li className="px-3 py-2 text-sm text-fog-3">No matches</li>}
        </ul>
      )}
    </div>
  );
}
