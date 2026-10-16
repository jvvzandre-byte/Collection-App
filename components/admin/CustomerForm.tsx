"use client";

import { useState } from "react";
import { api, type CustomerInput } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { ABtn, AError, AField, Drawer, aInput } from "./ui";

/** Create or edit a household. Changing the suburb re-matches the zone (or moves them to the waiting list). */
export function CustomerForm({ open, onClose, initial, onSaved }: { open: boolean; onClose: () => void; initial?: CustomerInput; onSaved?: (id: string) => void }) {
  const [f, setF] = useState<CustomerInput>(initial ?? { name: "", phone: "", street: "", suburb: "", note: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: suburbs } = useData(() => api.getServedSuburbs());
  const zone = suburbs?.find((s) => s.suburb.toLowerCase() === f.suburb.trim().toLowerCase())?.zone;
  const set = (k: keyof CustomerInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    setBusy(true);
    try {
      const u = await api.saveCustomer(f);
      setError(null);
      onSaved?.(u.id);
      onClose();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Drawer open={open} onClose={onClose} title={initial?.id ? "Edit household" : "New household"}
      footer={<><ABtn variant="white" onClick={save} disabled={busy}>{initial?.id ? "Save changes" : "Create household"}</ABtn><ABtn variant="line" onClick={onClose}>Cancel</ABtn></>}>
      <AField label="Name"><input className={aInput} value={f.name} onChange={set("name")} autoFocus /></AField>
      <AField label="Cellphone"><input className={aInput} value={f.phone} onChange={set("phone")} inputMode="tel" placeholder="082 123 4567" /></AField>
      <AField label="Street address"><input className={aInput} value={f.street} onChange={set("street")} /></AField>
      <AField label="Suburb">
        <input className={aInput} value={f.suburb} onChange={set("suburb")} list="admin-suburbs" />
        <datalist id="admin-suburbs">{suburbs?.map((s) => <option key={s.suburb} value={s.suburb} />)}</datalist>
      </AField>
      <p className="text-sm text-fog-2">
        {!f.suburb.trim() ? "Pick a suburb to see the zone." : zone ? <>Zone {zone.code} · {zone.name}</> : <span className="text-[#f0c674]">Not served yet: they&rsquo;ll go on the waiting list.</span>}
      </p>
      <AField label="Internal note"><textarea className={`${aInput} h-24 py-2`} value={f.note ?? ""} onChange={set("note")} placeholder="Gate code, dog, where bags are left…" /></AField>
      {!initial?.id && <p className="text-xs text-fog-3">They&rsquo;ll get an SMS to verify their number and accept the privacy notice in the app.</p>}
      <AError>{error}</AError>
    </Drawer>
  );
}
