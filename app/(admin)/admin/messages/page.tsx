"use client";

import { useState } from "react";
import { ComposeShell } from "@/components/admin/Compose";
import { ABtn, AField, PageHead, Panel, Seg, Tag, aInput } from "@/components/admin/ui";
import { IconPlus } from "@/components/Icons";
import type { Audience } from "@/lib/types";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";

type T = "messages" | "audit";

export default function Messages() {
  const [tab, setTab] = useState<T>("messages");
  const [composing, setComposing] = useState(false);
  const { data } = useData(async () => ({ notes: await api.getNotifications(), audit: await api.getAuditLog(), names: await api.getUserNames() }));
  const fmt = (iso: string) => new Date(iso).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rise">
      <PageHead title={tab === "messages" ? "Sent messages" : "Audit log"}
        sub={tab === "messages" ? "Notifications are stubbed. Nothing leaves the app yet; this is what would have been sent." : "Every admin action, draw and redraw."}
        right={<div className="flex items-center gap-2"><Seg value={tab} onChange={setTab} options={[{ value: "messages", label: "Messages" }, { value: "audit", label: "Audit log" }]} /><ABtn variant="white" onClick={() => setComposing(true)}><IconPlus size={16} /> New message</ABtn></div>} />
      {composing && <Broadcast onClose={() => setComposing(false)} />}
      <Panel>
        {!data ? <div className="h-64 animate-pulse rounded-2xl bg-night-2" /> : tab === "messages" ? (
          <ul className="space-y-2">
            {data.notes.slice(0, 200).map((n) => (
              <li key={n.id} className="inset-row grid gap-2 p-4 md:grid-cols-[180px_1fr_auto] md:items-center">
                <div>
                  <p className="text-sm text-fog">{n.userId ? data.names[n.userId] : n.phone}</p>
                  <p className="text-xs text-fog-3">{n.phone}</p>
                </div>
                <p className="text-sm text-fog-2">{n.body}</p>
                <div className="flex items-center gap-2 md:justify-end">
                  <Tag tone={n.channel === "sms" ? "cool" : "good"}>{n.channel === "sms" ? "SMS" : "WhatsApp"}</Tag>
                  <span className="whitespace-nowrap text-xs text-fog-3">{fmt(n.sentAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-white/5">
            {data.audit.map((a) => (
              <li key={a.id} className="grid gap-1 py-3 md:grid-cols-[150px_160px_1fr]">
                <span className="text-xs text-fog-3">{fmt(a.at)}</span>
                <span className="font-mono text-xs text-[#aab3ff]">{a.action}</span>
                <span className="text-sm text-fog-2">{a.detail} <span className="text-fog-3">· {data.names[a.actorId] ?? a.actorId}</span></span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Broadcast({ onClose }: { onClose: () => void }) {
  const [audience, setAudience] = useState<Exclude<Audience, "user">>("zone");
  const [zoneId, setZoneId] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [error, setError] = useState<string | null>(null);
  const { data: zones } = useData(() => api.getZones());
  const zone = zoneId || zones?.[0]?.id || "";
  const { data: count } = useData(() => api.previewAudience({ audience, zoneId: zone }), [audience, zone]);
  const send = async () => {
    try { await api.sendBroadcast({ audience, zoneId: zone, channel, body }); onClose(); } catch (e) { setError((e as Error).message); }
  };
  return (
    <ComposeShell title="New message" onClose={onClose} onSend={send} body={body} setBody={setBody} channel={channel} setChannel={setChannel} error={error} recipients={count ?? undefined}
      before={
        <>
          <AField label="To">
            <select className={aInput} value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}>
              <option value="zone">Everyone in a zone</option>
              <option value="all">All served households</option>
              <option value="active">Active this month</option>
              <option value="waitlist">Waiting list</option>
            </select>
          </AField>
          {audience === "zone" && (
            <AField label="Zone">
              <select className={aInput} value={zone} onChange={(e) => setZoneId(e.target.value)}>
                {zones?.map((z) => <option key={z.id} value={z.id}>Zone {z.code} · {z.name}</option>)}
              </select>
            </AField>
          )}
          <p className="text-sm text-fog-2">{count ?? "…"} recipient{count === 1 ? "" : "s"}</p>
        </>
      } />
  );
}
