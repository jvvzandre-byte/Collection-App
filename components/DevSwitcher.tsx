"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { homeFor } from "./Gate";

// Dev-only role switcher (README: "A dev-only role switcher flips between customer, driver and admin").
// Hidden when NEXT_PUBLIC_DEV_TOOLS=off.

export function DevSwitcher() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data } = useData(async () => ({ me: await api.getCurrentUser(), users: await api.devListUsers() }));
  if (process.env.NEXT_PUBLIC_DEV_TOOLS === "off" || !data) return null;
  const { me, users } = data;

  const go = async (id: string | null) => {
    await api.devSwitchUser(id);
    const u = users.find((x) => x.id === id);
    setOpen(false);
    router.push(u ? homeFor(u.role) : "/welcome");
  };

  const group = (role: string) => users.filter((u) => u.role === role);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed right-0 top-1/2 z-[60] -translate-y-1/2 rounded-l-xl bg-[#ff6b3d] px-1.5 py-3 text-[10px] font-bold tracking-[.2em] text-black shadow-lg [writing-mode:vertical-rl]"
        aria-expanded={open}
      >
        DEV · {me ? me.role.toUpperCase() : "GUEST"}
      </button>
      {open && (
        <div className="fixed right-8 top-1/2 z-[60] w-72 -translate-y-1/2 rounded-2xl border border-black/10 bg-white p-3 text-sm text-ink shadow-2xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <strong>Switch role</strong>
            <span className="text-xs text-ink-3">mock data</span>
          </div>
          <div className="grid gap-1">
            {[...group("admin"), ...group("driver")].map((u) => (
              <button key={u.id} onClick={() => go(u.id)} className={`flex justify-between rounded-lg px-2 py-1.5 text-left hover:bg-paper ${me?.id === u.id ? "bg-lilac-soft" : ""}`}>
                <span>{u.name}</span><span className="text-xs text-ink-3">{u.role}</span>
              </button>
            ))}
            <select
              className="mt-1 h-9 rounded-lg border border-line px-2"
              value={me?.role === "customer" ? me.id : ""}
              onChange={(e) => e.target.value && go(e.target.value)}
            >
              <option value="">Customer…</option>
              {group("customer").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="mt-3 flex gap-2 border-t border-line pt-3">
            <button onClick={() => go(null)} className="flex-1 rounded-lg bg-paper px-2 py-1.5">Sign out</button>
            <button
              onClick={async () => { if (confirm("Reset all demo data?")) { await api.devReset(); setOpen(false); } }}
              className="flex-1 rounded-lg bg-rose px-2 py-1.5 text-rose-deep"
            >Reset data</button>
          </div>
        </div>
      )}
    </>
  );
}
