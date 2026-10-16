"use client";

import { useState } from "react";
import type { User } from "@/lib/types";
import { api } from "@/lib/data";

export function DriverSelect({ runId, value, drivers, disabled }: { runId: string; value: string | null; drivers: User[]; disabled?: boolean }) {
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
      <select
        aria-label="Driver"
        disabled={disabled}
        value={value ?? ""}
        onChange={async (e) => {
          try { await api.assignDriver(runId, e.target.value || null); setErr(null); } catch (x) { setErr((x as Error).message); }
        }}
        className={`h-9 rounded-full border px-3 pr-8 text-[13px] outline-none ${value ? "border-white/10 bg-night-3 text-fog" : "border-electric bg-electric/15 text-[#aab3ff]"}`}
      >
        <option value="">Unassigned</option>
        {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      {err && <span className="mt-1 text-xs text-[#ff8db4]">{err}</span>}
    </span>
  );
}
