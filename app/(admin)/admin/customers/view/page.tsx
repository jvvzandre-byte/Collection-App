"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ComposeShell } from "@/components/admin/Compose";
import { CustomerForm } from "@/components/admin/CustomerForm";
import { ABtn, AError, ATable, Avatar, ConfirmBtn, Empty, PageHead, Panel, Seg, StatCard, Tag } from "@/components/admin/ui";
import { IconArrowLeft } from "@/components/Icons";
import { api } from "@/lib/data";
import { placeUrl } from "@/lib/maps/links";
import { useData } from "@/lib/data/hooks";
import { WEEKDAYS, formatDay, formatMonth } from "@/lib/logic/dates";
import { kg, rands } from "@/lib/format";

const OUTCOME = { pending: "muted", collected: "good", rejected: "hot", missed: "warn" } as const;

// Query-param route (/admin/customers/view?id=…) so the app can be statically exported.
export default function CustomerPage() {
  return <Suspense><CustomerDetailView /></Suspense>;
}

function CustomerDetailView() {
  const id = useSearchParams().get("id") ?? "";
  const { data: c, error: loadError } = useData(() => api.getCustomer(id), [id]);
  const [editing, setEditing] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loadError) return <Empty>{loadError.message}</Empty>;
  if (!c) return <div className="h-96 animate-pulse rounded-3xl bg-night-1" />;
  const { row } = c;
  const u = row.user;
  const erased = u.status === "erased";
  const act = async (fn: () => Promise<unknown>) => { try { await fn(); setError(null); } catch (e) { setError((e as Error).message); } };
  const plan: "on" | "off" = row.plan?.status === "active" ? "on" : "off";
  const maxKg = Math.max(...c.months.map((m) => m.kg), 1);

  return (
    <div className="rise">
      <Link href="/admin/customers" className="mb-4 inline-flex items-center gap-2 text-sm text-fog-2 hover:text-fog"><IconArrowLeft size={16} /> Customers</Link>
      <PageHead
        title={<span className="flex items-center gap-4"><Avatar name={u.name} size={52} />{u.name}</span>}
        sub={
          <span className="mt-2 flex flex-wrap items-center gap-2">
            {u.phone && <span className="mr-1">{u.phone}{u.phoneVerified ? " · verified" : " · not verified"}</span>}
            {row.zone ? <Tag tone="cool">Zone {row.zone.code} · {WEEKDAYS[row.zone.collectionDay]}</Tag> : !erased && <Tag tone="warn">Waiting list</Tag>}
            {u.status === "suspended" && <Tag tone="hot">Suspended</Tag>}
            {erased && <Tag tone="hot">Erased (POPIA)</Tag>}
            {row.active ? <Tag tone="good">Active this month</Tag> : !erased && <Tag>Not active this month</Tag>}
            {!u.consentAt && !erased && <Tag tone="warn">No consent yet</Tag>}
          </span>
        }
        right={!erased && (
          <div className="flex flex-wrap gap-2">
            <ABtn variant="white" onClick={() => setEditing(true)}>Edit</ABtn>
            <ABtn variant="line" onClick={() => setMessaging(true)}>Message</ABtn>
            {u.status === "suspended"
              ? <ABtn variant="line" onClick={() => act(() => api.setUserStatus(u.id, "active"))}>Reactivate</ABtn>
              : <ConfirmBtn size="md" label="Suspend" confirm="Suspend collections" onConfirm={() => act(() => api.setUserStatus(u.id, "suspended"))} />}
            <ConfirmBtn size="md" label="Erase" confirm="Erase personal data" onConfirm={() => act(() => api.eraseCustomer(u.id))} />
          </div>
        )} />
      {error && <div className="mb-4"><AError>{error}</AError></div>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="This month" value={kg(row.kgThisMonth)} sub={`${row.entriesThisMonth} draw entries`} />
        <StatCard label="All time" value={kg(row.lifetimeKg)} sub={`${c.collections.filter((x) => x.status === "collected").length} collections`} />
        <StatCard label="Last collection" value={row.lastCollection ? formatDay(row.lastCollection, { day: "numeric", month: "short" }) : "–"} sub={row.lastCollection ? formatDay(row.lastCollection, { weekday: "long" }) : "never"} />
        <StatCard label="Prizes won" value={c.wins.length} sub={c.wins.length ? c.wins.map((v) => rands(v.valueRands)).join(", ") : "none yet"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <Panel title="Collections">
            {c.collections.length ? (
              <ATable head={["Date", "Zone", "Outcome", "Weight", "Note"]}>
                {c.collections.map((x) => (
                  <tr key={x.id}>
                    <td className="whitespace-nowrap">{formatDay(x.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="text-fog-2">{x.zoneCode ? `Zone ${x.zoneCode}` : "–"}</td>
                    <td><Tag tone={OUTCOME[x.status]}>{x.status}</Tag></td>
                    <td className="tabular">{x.kg != null ? kg(x.kg) : "–"}</td>
                    <td className="text-fog-2">{x.reason ?? ""}</td>
                  </tr>
                ))}
              </ATable>
            ) : <Empty>No collections yet.</Empty>}
          </Panel>

          <Panel title="Last six months">
            <div className="grid grid-cols-6 items-end gap-3">
              {[...c.months].reverse().map((m) => (
                <div key={m.month} className="text-center">
                  <div className="flex h-32 items-end justify-center">
                    <div className="w-full max-w-10 rounded-t-lg bg-cool" style={{ height: `${Math.max(2, (m.kg / maxKg) * 100)}%` }} title={`${m.kg} kg`} />
                  </div>
                  <p className="mt-2 text-sm tabular">{m.entries}</p>
                  <p className="text-[11px] text-fog-3">{formatMonth(m.month, { month: "short" })}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-fog-3">Bar = accepted kg (after cap). Number = draw entries that month.</p>
          </Panel>

          <Panel title="Messages sent">
            {c.messages.length ? (
              <ul className="space-y-2">
                {c.messages.slice(0, 12).map((n) => (
                  <li key={n.id} className="inset-row p-3 text-sm">
                    <div className="mb-1 flex justify-between text-xs text-fog-3"><span>{n.channel === "sms" ? "SMS" : "WhatsApp"}</span><span>{new Date(n.sentAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</span></div>
                    <p className="text-fog-2">{n.body}</p>
                  </li>
                ))}
              </ul>
            ) : <Empty>No messages.</Empty>}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Address">
            <p className="text-fog">{c.row.address?.street}</p>
            <p className="text-fog-2">{c.row.address?.suburb}</p>
            {c.row.address && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {c.row.address.geo === "approximate" && <Tag tone="warn">Approximate location</Tag>}
                {c.row.address.geo === "exact" && <Tag tone="good">Exact location</Tag>}
                {!c.row.address.geo && <Tag>No location</Tag>}
                <a href={placeUrl(c.row.address)} target="_blank" rel="noopener" className="text-[#aab3ff] hover:underline">Open in Google Maps ↗</a>
              </p>
            )}
            {u.note && <p className="mt-3 rounded-xl bg-[#3a3326] px-3 py-2 text-sm text-[#f0c674]">{u.note}</p>}
            <p className="mt-3 text-xs text-fog-3">Joined {new Date(u.createdAt).toLocaleDateString("en-ZA", { dateStyle: "medium" })}{u.consentAt ? ` · consent ${new Date(u.consentAt).toLocaleDateString("en-ZA")}` : ""}</p>
          </Panel>

          {!erased && (
            <Panel title="Weekly pickup">
              {row.zone ? (
                <>
                  <Seg value={plan} onChange={(v) => act(() => api.adminSetPlan(u.id, v === "on" ? "weekly" : null))}
                    options={[{ value: "on", label: "Weekly: on" }, { value: "off", label: "Off" }]} />
                  {row.plan?.status === "pending" && <p className="mt-3 text-sm text-[#aab3ff]">They&rsquo;re waiting for approval. Approve it in Requests, or switch it on here.</p>}
                  <p className="mt-3 text-xs text-fog-3">Setting it here confirms it straight away and messages the customer.</p>
                </>
              ) : <p className="text-sm text-fog-2">Plans need a zone. Add {row.address?.suburb} to a zone first.</p>}
            </Panel>
          )}

          {row.zone && !erased && (
            <Panel title="Coming up">
              <ul className="space-y-1.5">
                {c.upcoming.map((d) => (
                  <li key={d.date} className="inset-row flex items-center justify-between px-3 py-2 text-sm">
                    <span>{formatDay(d.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                    {d.skipped ? <Tag>Skipped</Tag> : d.scheduled ? <Tag tone="good">Booked</Tag> : d.request?.status === "pending" ? <Tag tone="cool">Requested</Tag> : <span className="text-fog-3">–</span>}
                  </li>
                ))}
              </ul>
              {u.status === "suspended" && <p className="mt-3 text-xs text-[#ff8db4]">Suspended: they won&rsquo;t be put on any run.</p>}
            </Panel>
          )}

          {c.wins.length > 0 && (
            <Panel title="Prizes">
              <ul className="space-y-1.5">
                {c.wins.map((v) => (
                  <li key={v.id} className="inset-row flex items-center justify-between px-3 py-2 text-sm">
                    <span>{v.name} · {rands(v.valueRands)} <span className="text-fog-3">· {formatMonth(v.month, { month: "short", year: "numeric" })}</span></span>
                    <Tag tone={v.status === "claimed" ? "good" : v.status === "notified" ? "warn" : "muted"}>{v.status}</Tag>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>

      {editing && row.address && (
        <CustomerForm open onClose={() => setEditing(false)}
          initial={{ id: u.id, name: u.name, phone: u.phone, street: row.address.street, suburb: row.address.suburb, note: u.note ?? "" }} />
      )}
      {messaging && <ComposeDrawer onClose={() => setMessaging(false)} userId={u.id} name={u.name} />}
    </div>
  );
}

function ComposeDrawer({ onClose, userId, name }: { onClose: () => void; userId: string; name: string }) {
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    try { await api.sendBroadcast({ audience: "user", userId, channel, body }); onClose(); } catch (e) { setError((e as Error).message); }
  };
  return (
    <ComposeShell title={`Message ${name.split(" ")[0]}`} onClose={onClose} onSend={send} body={body} setBody={setBody} channel={channel} setChannel={setChannel} error={error} />
  );
}
