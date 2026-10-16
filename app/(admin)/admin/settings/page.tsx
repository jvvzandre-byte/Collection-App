"use client";

import { useState } from "react";
import { download } from "@/components/admin/download";
import { ABtn, AField, ConfirmBtn, PageHead, Panel, Tag, aInput } from "@/components/admin/ui";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { toCsv } from "@/lib/csv";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const { data } = useData(() => api.getSettings());
  return (
    <div className="rise">
      <PageHead title="Settings" sub="Competition rules, exports and demo data." />
      <div className="grid gap-4 lg:grid-cols-2">
        {data && <RulesPanel s={data} />}
        <ExportsPanel />
        <DemoPanel />
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
    await api.updateSettings({ kgCapPerCollection: cap ? Math.max(1, Number(cap)) : null, redrawAfterDays: Math.max(1, Number(redraw) || 14), drawDay: Math.min(28, Math.max(1, Number(day) || 1)) });
    setMsg("Saved. The published rules page updates automatically.");
  };
  return (
    <Panel title="Competition rules" action={<Tag tone="warn">TBC values</Tag>}>
      <div className="grid grid-cols-3 gap-3">
        <AField label="Kg cap / collection"><input className={aInput} type="number" min={1} value={cap} onChange={(e) => setCap(e.target.value)} placeholder="no cap" /></AField>
        <AField label="Redraw after (days)"><input className={aInput} type="number" min={1} value={redraw} onChange={(e) => setRedraw(e.target.value)} /></AField>
        <AField label="Draw day (1–28)"><input className={aInput} type="number" min={1} max={28} value={day} onChange={(e) => setDay(e.target.value)} /></AField>
      </div>
      <ul className="mt-4 space-y-1 text-xs leading-relaxed text-fog-3">
        <li>Entries: accepted kg per month, summed, rounded down. 1 kg = 1 entry.</li>
        <li>Active customer: at least one accepted collection in the calendar month.</li>
        <li>Changing the cap changes entries for months that haven&rsquo;t been drawn yet.</li>
      </ul>
      <div className="mt-4 flex items-center gap-3"><ABtn variant="white" size="sm" onClick={save}>Save rules</ABtn>{msg && <span className="text-xs text-[#7fdca6]">{msg}</span>}</div>
    </Panel>
  );
}

function ExportsPanel() {
  const t = api.today();
  const exports = [
    { label: "Draw audit records", hint: "Every draw: seed, timestamp, entries snapshot, winners (JSON)", run: async () => download(`kilo-draws-${t}.json`, JSON.stringify(await api.getDraws(), null, 2), "application/json") },
    { label: "Audit log", hint: "Every admin action (CSV)", run: async () => {
      const names = await api.getUserNames();
      download(`kilo-audit-${t}.csv`, toCsv((await api.getAuditLog()).map((a) => ({ at: a.at, who: names[a.actorId] ?? a.actorId, action: a.action, detail: a.detail }))));
    } },
    { label: "Sent messages", hint: "All notifications (CSV)", run: async () => {
      const names = await api.getUserNames();
      download(`kilo-messages-${t}.csv`, toCsv((await api.getNotifications()).map((n) => ({ sent_at: n.sentAt, to: n.userId ? names[n.userId] : "", phone: n.phone, channel: n.channel, body: n.body }))));
    } },
  ];
  return (
    <Panel title="Exports">
      <ul className="space-y-2">
        {exports.map((x) => (
          <li key={x.label} className="inset-row flex items-center gap-3 px-4 py-3">
            <div className="flex-1"><p className="text-sm">{x.label}</p><p className="text-xs text-fog-3">{x.hint}</p></div>
            <ABtn size="sm" variant="line" onClick={x.run}>Download</ABtn>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-fog-3">Customers and runs export from their own pages.</p>
    </Panel>
  );
}

function DemoPanel() {
  return (
    <Panel title="Demo data" action={<Tag tone="cool">Development</Tag>}>
      <p className="text-sm text-fog-2">Data lives in this browser only until Supabase goes in. Resetting reloads the seed: 3 zones, 30 households, 2 drivers and about 10 weeks of history.</p>
      <div className="mt-4"><ConfirmBtn label="Reset demo data" confirm="Yes, reset everything" onConfirm={() => api.devReset()} /></div>
    </Panel>
  );
}
