"use client";

import { useState } from "react";
import { download } from "@/components/admin/download";
import { ABtn, AField, ConfirmBtn, PageHead, Panel, Tag, aInput } from "@/components/admin/ui";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { toCsv } from "@/lib/csv";
import { mapsConfigured } from "@/lib/config";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const { data } = useData(() => api.getSettings());
  return (
    <div className="rise">
      <PageHead title="Settings" sub="Competition rules, maps and routing, exports and demo data." />
      <div className="grid gap-4 lg:grid-cols-2">
        {data && <RulesPanel s={data} />}
        {data && <IntegrationsPanel s={data} />}
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

function IntegrationsPanel({ s }: { s: Settings }) {
  const [depot, setDepot] = useState({ label: s.depot.label, lat: String(s.depot.lat), lng: String(s.depot.lng) });
  const [msg, setMsg] = useState<string | null>(null);
  const keyed = mapsConfigured();
  const saveDepot = async () => {
    const lat = Number(depot.lat), lng = Number(depot.lng);
    if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) || !depot.label.trim()) return setMsg("Enter a name and valid coordinates.");
    await api.updateSettings({ depot: { label: depot.label.trim(), lat, lng } });
    setMsg("Depot saved. Route lengths and ordering use it from now on.");
  };
  const rows: [string, string, "good" | "warn" | "muted"][] = [
    ["Navigate buttons (Google Maps links)", "Live: no key needed", "good"],
    ["Route ordering: nearest stop next", "Live: built in", "good"],
    ["Run maps", keyed ? "Key found: live map not wired yet" : "Schematic until a key is added", "warn"],
    ["Address autocomplete + exact locations", keyed ? "Key found: not wired yet" : "Suburb-centre placeholder", "warn"],
    ["Route ordering: Google Routes", keyed ? "Key found: not wired yet" : "Needs a key", "warn"],
    ["Route ordering: Google Route Optimization", "Needs a server (Supabase)", "muted"],
  ];
  return (
    <Panel title="Maps & routing" action={<Tag tone={keyed ? "good" : "warn"}>{keyed ? "Google key found" : "Google not connected"}</Tag>}>
      <ul className="space-y-1.5">
        {rows.map(([name, status, tone]) => (
          <li key={name} className="inset-row flex items-center justify-between gap-3 px-3 py-2 text-sm"><span>{name}</span><Tag tone={tone}>{status}</Tag></li>
        ))}
      </ul>
      {!keyed && (
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-fog-3">
          <li>Google Cloud: create a project, attach billing, enable Maps JavaScript, Places, Geocoding and Routes APIs.</li>
          <li>Create an API key restricted to your site (HTTP referrers) and to those APIs.</li>
          <li>GitHub repo → Settings → Secrets and variables → Actions → add <code className="text-fog-2">GOOGLE_MAPS_KEY</code>.</li>
        </ol>
      )}
      <p className="mb-2 mt-5 text-xs uppercase tracking-wider text-fog-3">Depot (routes start and end here)</p>
      <div className="grid grid-cols-[1fr_110px_110px] gap-2">
        <input className={aInput} value={depot.label} onChange={(e) => setDepot({ ...depot, label: e.target.value })} aria-label="Depot name" />
        <input className={aInput} value={depot.lat} onChange={(e) => setDepot({ ...depot, lat: e.target.value })} aria-label="Latitude" inputMode="decimal" />
        <input className={aInput} value={depot.lng} onChange={(e) => setDepot({ ...depot, lng: e.target.value })} aria-label="Longitude" inputMode="decimal" />
      </div>
      <div className="mt-3 flex items-center gap-3"><ABtn size="sm" variant="white" onClick={saveDepot}>Save depot</ABtn>{msg && <span className="text-xs text-fog-2">{msg}</span>}</div>
    </Panel>
  );
}
