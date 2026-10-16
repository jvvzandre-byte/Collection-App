"use client";

import type { ReactNode } from "react";
import { ABtn, AError, AField, Drawer, Seg, aInput } from "./ui";

/** Message composer drawer. Notifications are stubbed: sending logs to Messages. */
export function ComposeShell({ title, onClose, onSend, body, setBody, channel, setChannel, error, before, recipients }: {
  title: string; onClose: () => void; onSend: () => void; body: string; setBody: (s: string) => void;
  channel: "whatsapp" | "sms"; setChannel: (c: "whatsapp" | "sms") => void; error: string | null; before?: ReactNode; recipients?: number;
}) {
  const sms = Math.max(1, Math.ceil(body.length / 160));
  return (
    <Drawer open onClose={onClose} title={title}
      footer={<><ABtn variant="white" onClick={onSend} disabled={!body.trim() || recipients === 0}>Send{recipients != null ? ` to ${recipients}` : ""}</ABtn><ABtn variant="line" onClick={onClose}>Cancel</ABtn></>}>
      {before}
      <AField label="Channel">
        <Seg value={channel} onChange={setChannel} options={[{ value: "whatsapp", label: "WhatsApp" }, { value: "sms", label: "SMS" }]} />
      </AField>
      <AField label="Message">
        <textarea className={`${aInput} h-40 py-2`} value={body} onChange={(e) => setBody(e.target.value)} maxLength={640} autoFocus />
      </AField>
      <p className="text-xs text-fog-3">{body.length}/640{channel === "sms" ? ` · ${sms} SMS part${sms > 1 ? "s" : ""}` : ""}. Messages are stubbed for now: they&rsquo;re logged, not sent.</p>
      <AError>{error}</AError>
    </Drawer>
  );
}
