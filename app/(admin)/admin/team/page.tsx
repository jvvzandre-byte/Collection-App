"use client";

import Link from "next/link";
import { useState } from "react";
import { ABtn, AError, AField, Avatar, ConfirmBtn, Drawer, PageHead, Panel, Seg, Tag, aInput } from "@/components/admin/ui";
import { IconPlus, IconTruck } from "@/components/Icons";
import { api, type StaffRow } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { formatDay } from "@/lib/logic/dates";
import { kg } from "@/lib/format";

type Draft = { id?: string; role: "driver" | "admin"; name: string; phone: string };

export default function Team() {
  const { data } = useData(async () => ({ team: await api.getTeam(), me: await api.getCurrentUser() }));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const act = async (fn: () => Promise<unknown>) => { try { await fn(); setError(null); } catch (e) { setError((e as Error).message); } };

  const drivers = data?.team.filter((t) => t.user.role === "driver") ?? [];
  const admins = data?.team.filter((t) => t.user.role === "admin") ?? [];

  const card = (t: StaffRow) => {
    const suspended = t.user.status === "suspended";
    return (
      <Panel key={t.user.id} className={suspended ? "opacity-60" : ""}
        title={<span className="flex items-center gap-3"><Avatar name={t.user.name} size={40} /><span><span className="block">{t.user.name}</span><span className="block text-xs font-normal text-fog-3">{t.user.phone}</span></span></span>}
        action={suspended ? <Tag tone="hot">Suspended</Tag> : t.user.id === data?.me?.id ? <Tag tone="cool">You</Tag> : undefined}>
        {t.user.role === "driver" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="inset-row px-3 py-2"><p className="text-xs text-fog-3">Runs this month</p><p className="text-xl font-light tabular">{t.runsThisMonth}</p></div>
              <div className="inset-row px-3 py-2"><p className="text-xs text-fog-3">Accepted this month</p><p className="text-xl font-light tabular">{kg(t.kgThisMonth)}</p></div>
            </div>
            <p className="mb-2 mt-4 text-xs uppercase tracking-wider text-fog-3">Next two weeks</p>
            <div className="flex flex-wrap gap-1.5">
              {t.upcoming.length ? t.upcoming.map((r) => (
                <Link key={r.id} href={`/admin/runs/view?id=${r.id}`} className="rounded-full bg-night-3 px-3 py-1 text-[13px] hover:bg-night-2">
                  {formatDay(r.date, { weekday: "short", day: "numeric" })} · {r.zoneCode}
                </Link>
              )) : <span className="text-sm text-fog-3">No runs assigned</span>}
            </div>
          </>
        )}
        <div className="mt-4 flex gap-2">
          <ABtn size="sm" variant="line" onClick={() => setDraft({ id: t.user.id, role: t.user.role as Draft["role"], name: t.user.name, phone: t.user.phone })}>Edit</ABtn>
          {t.user.id !== data?.me?.id && (suspended
            ? <ABtn size="sm" variant="line" onClick={() => act(() => api.setUserStatus(t.user.id, "active"))}>Reactivate</ABtn>
            : <ConfirmBtn label="Suspend" confirm={t.user.role === "driver" ? "Suspend & unassign runs" : "Suspend"} onConfirm={() => act(() => api.setUserStatus(t.user.id, "suspended"))} />)}
        </div>
      </Panel>
    );
  };

  return (
    <div className="rise">
      <PageHead title="Team" sub="Drivers and admins. Suspending a driver takes them off their upcoming runs, which then show up in Exceptions."
        right={<ABtn variant="white" onClick={() => setDraft({ role: "driver", name: "", phone: "" })}><IconPlus size={16} /> Add person</ABtn>} />
      {error && <div className="mb-4"><AError>{error}</AError></div>}

      <h2 className="mb-3 flex items-center gap-2 text-sm uppercase tracking-wider text-fog-3"><IconTruck size={16} /> Drivers · {drivers.length}</h2>
      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{drivers.map(card)}</div>
      <h2 className="mb-3 text-sm uppercase tracking-wider text-fog-3">Admins · {admins.length}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{admins.map(card)}</div>

      {draft && <StaffDrawer draft={draft} onClose={() => setDraft(null)} />}
    </div>
  );
}

function StaffDrawer({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const [f, setF] = useState(draft);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try { await api.saveStaff(f); onClose(); } catch (e) { setError((e as Error).message); }
  };
  return (
    <Drawer open onClose={onClose} title={f.id ? `Edit ${f.role}` : "Add person"}
      footer={<><ABtn variant="white" onClick={save}>{f.id ? "Save" : "Add"}</ABtn><ABtn variant="line" onClick={onClose}>Cancel</ABtn></>}>
      {!f.id && <AField label="Role"><Seg value={f.role} onChange={(role) => setF({ ...f, role })} options={[{ value: "driver", label: "Driver" }, { value: "admin", label: "Admin" }]} /></AField>}
      <AField label="Name"><input className={aInput} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></AField>
      <AField label="Cellphone"><input className={aInput} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" /></AField>
      <p className="text-xs text-fog-3">They sign in with this number. {f.role === "admin" ? "Admins can see and change everything, including the draw." : "Drivers only see runs assigned to them."}</p>
      <AError>{error}</AError>
    </Drawer>
  );
}
