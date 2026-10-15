"use client";

import { useState } from "react";
import { ABtn, AError, AField, Count, Empty, PageHead, Panel, Tag, aInput } from "@/components/admin/ui";
import { IconPlus } from "@/components/Icons";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { WEEKDAYS } from "@/lib/logic/dates";
import type { Settings, Weekday, Zone } from "@/lib/types";

type Draft = Omit<Zone, "id" | "suburbs"> & { id?: string; suburbs: string };
const blank: Draft = { code: "", name: "", suburbs: "", collectionDay: 2, capacity: 40, active: true };

export default function Zones() {
  const { data } = useData(async () => ({ zones: await api.getZones(), waitlist: await api.getWaitlist(), settings: await api.getSettings() }));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!draft) return;
    try {
      await api.saveZone({ ...draft, suburbs: draft.suburbs.split(",").map((s) => s.trim()) });
      setDraft(null);
      setError(null);
    } catch (e) { setError((e as Error).message); }
  };

  const demand = Object.entries((data?.waitlist ?? []).reduce<Record<string, number>>((m, w) => ({ ...m, [w.suburb]: (m[w.suburb] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rise">
      <PageHead title="Zones" sub="Suburbs map to a zone, and each zone has one collection day." right={<ABtn variant="white" onClick={() => setDraft({ ...blank })}><IconPlus size={16} /> New zone</ABtn>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {draft && (
            <Panel title={draft.id ? `Edit Zone ${draft.code}` : "New zone"}>
              <div className="grid gap-4 md:grid-cols-[100px_1fr_180px_120px]">
                <AField label="Code"><input className={aInput} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} maxLength={3} /></AField>
                <AField label="Name"><input className={aInput} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></AField>
                <AField label="Collection day">
                  <select className={aInput} value={draft.collectionDay} onChange={(e) => setDraft({ ...draft, collectionDay: Number(e.target.value) as Weekday })}>
                    {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </AField>
                <AField label="Capacity"><input className={aInput} type="number" min={1} value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) })} /></AField>
              </div>
              <div className="mt-4"><AField label="Suburbs (comma separated)"><input className={aInput} value={draft.suburbs} onChange={(e) => setDraft({ ...draft, suburbs: e.target.value })} placeholder="Muizenberg, Lakeside" /></AField></div>
              <label className="mt-4 flex items-center gap-2 text-sm text-fog-2"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="accent-[#6e7bf2]" /> Active. Waiting-list households in these suburbs are moved in and notified.</label>
              <div className="mt-4 space-y-3">
                <AError>{error}</AError>
                <div className="flex gap-2"><ABtn variant="white" onClick={save}>Save zone</ABtn><ABtn variant="line" onClick={() => { setDraft(null); setError(null); }}>Cancel</ABtn></div>
              </div>
            </Panel>
          )}
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {data?.zones.map((z) => (
              <Panel key={z.id} title={<span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-fog text-lg font-semibold text-night">{z.code}</span>{z.name}</span>}
                action={<ABtn size="sm" variant="line" onClick={() => setDraft({ ...z, suburbs: z.suburbs.join(", ") })}>Edit</ABtn>}>
                <div className="flex flex-wrap gap-1.5">{z.suburbs.map((s) => <Tag key={s}>{s}</Tag>)}</div>
                <div className="mt-5 flex items-center gap-6 text-sm">
                  <div><p className="text-fog-3">Day</p><p className="text-fog">{WEEKDAYS[z.collectionDay]}</p></div>
                  <div><p className="text-fog-3">Capacity</p><p className="text-fog">{z.capacity} stops</p></div>
                  <div className="ml-auto">{z.active ? <Tag tone="good">Active</Tag> : <Tag>Paused</Tag>}</div>
                </div>
              </Panel>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Panel title="Waiting-list demand" action={<Count n={data?.waitlist.length ?? 0} />}>
            {!demand.length ? <Empty>No one waiting.</Empty> : (
              <ul className="space-y-2">
                {demand.map(([suburb, n]) => (
                  <li key={suburb} className="inset-row flex items-center gap-3 px-3.5 py-2.5">
                    <span className="flex-1 text-sm">{suburb}</span>
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-night-3"><div className="h-full bg-[#f0c674]" style={{ width: `${(n / demand[0][1]) * 100}%` }} /></div>
                    <span className="w-6 text-right tabular text-sm">{n}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-fog-3">Add a suburb to a zone to open it. Everyone waiting there is notified.</p>
          </Panel>
          {data && <RulesPanel s={data.settings} />}
        </div>
      </div>
    </div>
  );
}

function RulesPanel({ s }: { s: Settings }) {
  const [cap, setCap] = useState(s.kgCapPerCollection?.toString() ?? "");
  const [redraw, setRedraw] = useState(String(s.redrawAfterDays));
  const [day, setDay] = useState(String(s.drawDay));
  const [msg, setMsg] = useState<string | null>(null);
  const save = async () => {
    await api.updateSettings({ kgCapPerCollection: cap ? Number(cap) : null, redrawAfterDays: Number(redraw) || 14, drawDay: Math.min(28, Math.max(1, Number(day) || 1)) });
    setMsg("Saved. The published rules update automatically.");
  };
  return (
    <Panel title="Draw rules" action={<Tag tone="warn">TBC values</Tag>}>
      <div className="grid grid-cols-3 gap-3">
        <AField label="Kg cap"><input className={aInput} type="number" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="none" /></AField>
        <AField label="Redraw after"><input className={aInput} type="number" value={redraw} onChange={(e) => setRedraw(e.target.value)} /></AField>
        <AField label="Draw day"><input className={aInput} type="number" value={day} onChange={(e) => setDay(e.target.value)} /></AField>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-fog-3">Active customer = at least one accepted collection in the calendar month. Kg cap applies per collection; leave empty for no cap.</p>
      <div className="mt-4 flex items-center gap-3"><ABtn variant="white" size="sm" onClick={save}>Save rules</ABtn>{msg && <span className="text-xs text-[#7fdca6]">{msg}</span>}</div>
    </Panel>
  );
}
