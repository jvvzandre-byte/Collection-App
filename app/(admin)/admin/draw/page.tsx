"use client";

import { useState } from "react";
import { ABtn, AError, AField, ATable, Avatar, Count, Empty, PageHead, Panel, Seg, Tag, aInput } from "@/components/admin/ui";
import { IconCheck, IconGift, IconPlus, IconX } from "@/components/Icons";
import { api, type DrawPreview } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { formatMonth, monthOf, shiftMonth } from "@/lib/logic/dates";
import { selectWinners } from "@/lib/logic/draw";
import { kg, rands } from "@/lib/format";
import type { Voucher } from "@/lib/types";

const STATUS_TONE = { available: "muted", drawn: "cool", notified: "warn", claimed: "good", expired: "hot" } as const;

export default function DrawPage() {
  const current = monthOf(api.today());
  const months = [-2, -1, 0, 1].map((d) => shiftMonth(current, d));
  const [month, setMonth] = useState(shiftMonth(current, -1));
  const { data } = useData(async () => ({ p: await api.getDrawPreview(month), names: await api.getUserNames(), settings: await api.getSettings() }), [month]);

  return (
    <div className="rise">
      <PageHead title="Draw & vouchers" sub="5 vouchers, 5 different winners, weighted by entries. Each draw keeps its seed and entry snapshot."
        right={<Seg value={month} onChange={setMonth} options={months.map((m) => ({ value: m, label: formatMonth(m, { month: "short", year: "2-digit" }) }))} />} />
      {!data ? <div className="h-96 animate-pulse rounded-3xl bg-night-1" /> : (
        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            {data.p.draw ? <DrawResult p={data.p} names={data.names} redrawDays={data.settings.redrawAfterDays} /> : <RunPanel p={data.p} />}
            <Panel title="Entries snapshot" action={<Count n={data.p.totalEntries.toLocaleString("en-ZA")} />}>
              {data.p.snapshot.length ? (
                <ATable head={["Household", "Suburb", "Accepted kg", "Entries", "Share"]}>
                  {data.p.snapshot.map((r) => (
                    <tr key={r.userId}>
                      <td className="text-fog">{r.name}</td>
                      <td className="text-fog-2">{r.suburb}</td>
                      <td className="tabular">{kg(r.kg)}</td>
                      <td className="tabular">{r.entries}</td>
                      <td className="w-40">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-night-3"><div className="h-full rounded-full bg-cool" style={{ width: `${(r.entries / data.p.snapshot[0].entries) * 100}%` }} /></div>
                          <span className="w-10 text-right text-xs tabular text-fog-3">{((r.entries / data.p.totalEntries) * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </ATable>
              ) : <Empty>No entries for {formatMonth(month)}.</Empty>}
            </Panel>
          </div>
          <Vouchers month={month} vouchers={data.p.vouchers} locked={!!data.p.draw} />
        </div>
      )}
    </div>
  );
}

function RunPanel({ p }: { p: DrawPreview }) {
  const [seed, setSeed] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    try { await api.runDraw(p.month, seed || undefined); setError(null); } catch (e) { setError((e as Error).message); }
    setConfirm(false);
  };
  return (
    <section className="relative overflow-hidden rounded-xl3 bg-electric p-6 text-white">
      <p className="text-sm text-white/70">Draw for</p>
      <h2 className="text-[40px] font-light leading-tight">{formatMonth(p.month)}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm">{p.totalEntries.toLocaleString("en-ZA")} entries</span>
        <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm">{p.snapshot.length} households</span>
        <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm">{p.vouchers.length} vouchers</span>
      </div>
      {p.blockers.length > 0 ? (
        <ul className="mt-5 space-y-1.5 text-sm">{p.blockers.map((b) => <li key={b} className="flex items-center gap-2"><IconX size={15} /> {b}</li>)}</ul>
      ) : (
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-white/60">Seed (optional)</span>
            <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="random" className="h-11 w-56 rounded-full border border-white/25 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-white/50" />
          </label>
          {confirm ? (
            <>
              <button onClick={run} className="h-11 rounded-full bg-white px-5 font-medium text-night">Yes, run it now</button>
              <button onClick={() => setConfirm(false)} className="h-11 rounded-full border border-white/30 px-5">Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirm(true)} className="h-11 rounded-full bg-white px-5 font-medium text-night">Run draw</button>
          )}
        </div>
      )}
      {p.vouchers.length > 0 && p.vouchers.length < 5 && !p.blockers.length && <p className="mt-3 text-sm text-white/75">Only {p.vouchers.length} of 5 vouchers set up.</p>}
      {error && <p className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-sm">{error}</p>}
      <p className="mt-6 text-xs text-white/55">Dev build: the draw runs in the browser. It moves server-side with Supabase.</p>
    </section>
  );
}

function DrawResult({ p, names, redrawDays }: { p: DrawPreview; names: Record<string, string>; redrawDays: number }) {
  const draw = p.draw!;
  const [error, setError] = useState<string | null>(null);
  // Replay the original picks from the stored seed + snapshot to prove the record is consistent.
  const originals = draw.winners.filter((w) => w.kind === "draw");
  const replay = selectWinners(draw.snapshot, originals.map((w) => w.voucherId), draw.seed);
  const verified = replay.length === originals.length && replay.every((r, i) => r.userId === originals[i].userId);
  const act = async (fn: () => Promise<void>) => { try { await fn(); setError(null); } catch (e) { setError((e as Error).message); } };

  return (
    <Panel title={<>{formatMonth(draw.month)} draw <span className="ml-2 text-sm text-fog-3">{new Date(draw.runAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</span></>}
      action={verified ? <Tag tone="good"><IconCheck size={13} /> Replay matches</Tag> : <Tag tone="hot">Replay mismatch</Tag>}>
      <div className="mb-4 grid gap-2 text-[13px] text-fog-2 md:grid-cols-3">
        <div className="inset-row px-3 py-2">Seed <span className="ml-1 font-mono text-fog">{draw.seed}</span></div>
        <div className="inset-row px-3 py-2">Entries <span className="ml-1 text-fog tabular">{draw.totalEntries.toLocaleString("en-ZA")}</span></div>
        <div className="inset-row px-3 py-2">Run by <span className="ml-1 text-fog">{names[draw.runBy]}</span></div>
      </div>
      {error && <div className="mb-3"><AError>{error}</AError></div>}
      <ul className="space-y-2">
        {p.vouchers.map((v) => {
          const winner = v.winnerId ? names[v.winnerId] : null;
          const age = v.notifiedAt ? Math.floor((Date.now() - new Date(v.notifiedAt).getTime()) / 86_400_000) : 0;
          const redraws = draw.winners.filter((w) => w.voucherId === v.id && w.kind === "redraw").length;
          return (
            <li key={v.id} className="inset-row flex flex-wrap items-center gap-4 p-3.5">
              <span className="grid size-10 place-items-center rounded-xl bg-night-3 text-fog-2"><IconGift size={18} /></span>
              <div className="min-w-[160px] flex-1">
                <p className="text-fog">{v.name} <span className="text-fog-3">· {rands(v.valueRands)}</span></p>
                <p className="text-xs text-fog-3">{v.sponsor}{redraws ? ` · redrawn ${redraws}×` : ""}</p>
              </div>
              {winner ? <span className="flex items-center gap-2 text-sm"><Avatar name={winner} size={28} />{winner}</span> : <span className="text-sm text-fog-3">No winner</span>}
              <Tag tone={STATUS_TONE[v.status]}>{v.status}</Tag>
              {v.status === "notified" && (
                <div className="flex gap-1.5">
                  <ABtn size="sm" variant="white" onClick={() => act(() => api.setVoucherStatus(v.id, "claimed"))}>Claimed</ABtn>
                  <ABtn size="sm" variant="line" disabled={age < redrawDays} title={age < redrawDays ? `Redraw allowed after ${redrawDays} days (${redrawDays - age} to go)` : undefined}
                    onClick={() => act(() => api.redrawVoucher(v.id))}>Redraw</ABtn>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

const TONES: Voucher["tone"][] = ["butter", "rose", "mint", "sky", "lilac"];
const SWATCH: Record<Voucher["tone"], string> = { butter: "#f6e2ae", rose: "#f9d6e0", mint: "#cfeedb", sky: "#d5e8fb", lilac: "#e8eafd" };

function Vouchers({ month, vouchers, locked }: { month: string; vouchers: Voucher[]; locked: boolean }) {
  const blank = { name: "", sponsor: "", valueRands: 500, tone: TONES[vouchers.length % 5], expiry: `${shiftMonth(month, 4)}-01` };
  const [draft, setDraft] = useState<typeof blank | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!draft) return;
    try { await api.saveVoucher({ ...draft, month }); setDraft(null); setError(null); } catch (e) { setError((e as Error).message); }
  };
  return (
    <Panel title={`Vouchers · ${formatMonth(month, { month: "long" })}`} action={<Count n={`${vouchers.length}/5`} tone={vouchers.length === 5 ? "white" : "muted"} />}>
      <ul className="space-y-2">
        {vouchers.map((v) => (
          <li key={v.id} className="flex items-center gap-3 rounded-2xl p-3 text-night" style={{ background: SWATCH[v.tone] }}>
            <span className="grid size-10 place-items-center rounded-xl bg-white/70"><IconGift size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{v.name}</p>
              <p className="truncate text-xs text-night/60">{v.sponsor} · expires {v.expiry}</p>
            </div>
            <span className="text-lg font-semibold tabular">{rands(v.valueRands)}</span>
            {!locked && v.status === "available" && (
              <button aria-label="Remove voucher" onClick={() => api.deleteVoucher(v.id).catch((e) => setError(e.message))} className="grid size-8 place-items-center rounded-full hover:bg-black/10"><IconX size={15} /></button>
            )}
          </li>
        ))}
        {!vouchers.length && <Empty>No vouchers yet.</Empty>}
      </ul>
      {!locked && vouchers.length < 5 && (draft ? (
        <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
          <AField label="Voucher"><input className={aInput} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Grocery voucher" /></AField>
          <div className="grid grid-cols-2 gap-3">
            <AField label="Sponsor"><input className={aInput} value={draft.sponsor} onChange={(e) => setDraft({ ...draft, sponsor: e.target.value })} /></AField>
            <AField label="Value (R)"><input className={aInput} type="number" value={draft.valueRands} onChange={(e) => setDraft({ ...draft, valueRands: Number(e.target.value) })} /></AField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <AField label="Expiry"><input className={aInput} type="date" value={draft.expiry} onChange={(e) => setDraft({ ...draft, expiry: e.target.value })} /></AField>
            <AField label="Card colour">
              <div className="flex h-10 items-center gap-1.5">
                {TONES.map((t) => <button key={t} aria-label={t} onClick={() => setDraft({ ...draft, tone: t })} className={`size-7 rounded-full ${draft.tone === t ? "ring-2 ring-fog ring-offset-2 ring-offset-night-1" : ""}`} style={{ background: SWATCH[t] }} />)}
              </div>
            </AField>
          </div>
          <AError>{error}</AError>
          <div className="flex gap-2"><ABtn variant="white" size="sm" onClick={save}>Add voucher</ABtn><ABtn variant="line" size="sm" onClick={() => setDraft(null)}>Cancel</ABtn></div>
        </div>
      ) : (
        <ABtn variant="line" className="mt-4 w-full" onClick={() => setDraft(blank)}><IconPlus size={16} /> Add voucher</ABtn>
      ))}
      {locked && <p className="mt-3 text-xs text-fog-3">Vouchers are locked once the draw has run.</p>}
      {error && !draft && <div className="mt-3"><AError>{error}</AError></div>}
    </Panel>
  );
}
