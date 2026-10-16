"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconArrowLeft, IconShield } from "@/components/Icons";
import { Mascot } from "@/components/Mascot";
import { ErrorNote, Field, PillCta, inputCls } from "@/components/ui";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { WEEKDAYS, formatDay } from "@/lib/logic/dates";
import { upcomingCollectionDays } from "@/lib/logic/schedule";
import type { Zone } from "@/lib/types";

type Step = "details" | "code" | "address" | "plan" | "waitlist";
type PlanChoice = "weekly" | "fortnightly" | "once";

export default function SignUp() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState({ name: "", phone: "", consent: false, code: "", street: "", suburb: "" });
  const [devCode, setDevCode] = useState<string | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [plan, setPlan] = useState<PlanChoice>("weekly");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: suburbs } = useData(() => api.getServedSuburbs());
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const attempt = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const sendCode = () => attempt(async () => {
    if (!form.name.trim()) throw new Error("Please enter your name.");
    if (form.phone.replace(/\D/g, "").length < 9) throw new Error("Enter a valid cellphone number.");
    if (!form.consent) throw new Error("Please accept the privacy notice to continue.");
    const { devCode } = await api.requestOtp(form.phone);
    setDevCode(devCode);
    setStep("code");
  });

  const submitAddress = () => attempt(async () => {
    if (!form.street.trim() || !form.suburb.trim()) throw new Error("Enter your street address and suburb.");
    const res = await api.signUp({ ...form });
    setZone(res.zone);
    setStep(res.zone ? "plan" : "waitlist");
  });

  const choosePlan = () => attempt(async () => {
    if (!zone) return;
    if (plan === "once") await api.createCollectionRequest({ date: upcomingCollectionDays(zone, api.today(), 1)[0] });
    else await api.setPlan(plan);
    router.replace("/home");
  });

  const checkCode = () => {
    if (form.code.length !== 4) return setError("Enter the 4-digit code.");
    setError(null);
    setStep("address");
  };
  const onSubmit: Partial<Record<Step, () => void>> = { details: sendCode, code: checkCode, address: submitAddress, plan: choosePlan };

  const steps: Step[] = ["details", "code", "address", "plan"];
  const idx = step === "waitlist" ? 3 : steps.indexOf(step);
  const back = () => setStep(steps[Math.max(0, idx - 1)]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[460px] flex-col bg-paper px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        {idx > 0 && idx < 3 ? (
          <button onClick={back} aria-label="Back" className="grid size-11 place-items-center rounded-full bg-card"><IconArrowLeft /></button>
        ) : idx === 0 ? (
          <Link href="/welcome" aria-label="Back" className="grid size-11 place-items-center rounded-full bg-card"><IconArrowLeft /></Link>
        ) : <span className="size-11" />}
        <div className="flex gap-1.5" aria-label={`Step ${idx + 1} of 4`}>
          {steps.map((s, i) => <span key={s} className={`h-1.5 rounded-full transition-all ${i <= idx ? "w-6 bg-ink" : "w-1.5 bg-ink/15"}`} />)}
        </div>
        <span className="size-11" />
      </div>

      <form className="rise mt-8 flex flex-1 flex-col" key={step} onSubmit={(e) => { e.preventDefault(); onSubmit[step]?.(); }}>
        {step === "details" && (
          <>
            <h1 className="font-display text-[42px] leading-none">Let&rsquo;s get you<br />on the route</h1>
            <p className="mt-3 text-ink-2">We&rsquo;ll text you a code to check your number.</p>
            <div className="mt-8 space-y-4">
              <Field label="Your name"><input className={inputCls} value={form.name} onChange={set("name")} autoComplete="name" placeholder="Lerato Mahlangu" /></Field>
              <Field label="Cellphone"><input className={inputCls} value={form.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" placeholder="082 123 4567" /></Field>
              <label className="flex gap-3 rounded-2xl bg-card p-4 text-sm leading-relaxed text-ink-2">
                <input type="checkbox" checked={form.consent} onChange={set("consent")} className="mt-0.5 size-5 shrink-0 accent-[#7179e6]" />
                <span>
                  I agree that Kerbside may store my name, number and address to run collections and the draw, as set out in the{" "}
                  <Link href="/rules#privacy" className="text-ink underline underline-offset-2">privacy notice</Link> (POPIA).
                </span>
              </label>
            </div>
            <div className="mt-auto space-y-3 pt-8">
              <ErrorNote>{error}</ErrorNote>
              <PillCta type="submit" disabled={busy}>Send my code</PillCta>
            </div>
          </>
        )}

        {step === "code" && (
          <>
            <h1 className="font-display text-[42px] leading-none">Check your<br />messages</h1>
            <p className="mt-3 text-ink-2">Enter the 4-digit code we sent to {form.phone}.</p>
            <input
              className="mt-8 h-20 w-full rounded-3xl border border-line bg-card text-center font-display text-5xl tracking-[.5em] outline-none focus:border-lilac-deep"
              value={form.code} onChange={set("code")} inputMode="numeric" autoComplete="one-time-code" maxLength={4} autoFocus aria-label="Verification code"
            />
            {devCode && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, code: devCode }))} className="mt-3 self-center rounded-full bg-butter-soft px-4 py-2 text-sm text-[#7a5a14]">
                Dev: SMS is stubbed. Code is <strong>{devCode}</strong>. Tap to fill.
              </button>
            )}
            <div className="mt-auto space-y-3 pt-8">
              <ErrorNote>{error}</ErrorNote>
              <PillCta type="submit">Continue</PillCta>
            </div>
          </>
        )}

        {step === "address" && (
          <>
            <h1 className="font-display text-[42px] leading-none">Where do we<br />collect from?</h1>
            <p className="mt-3 text-ink-2">One account per household, so we only ask once.</p>
            <div className="mt-8 space-y-4">
              <Field label="Street address"><input className={inputCls} value={form.street} onChange={set("street")} autoComplete="address-line1" placeholder="14 Lynton Rd" /></Field>
              <Field label="Suburb" hint="Not on the list? Type it anyway and we'll add you to the waiting list.">
                <input className={inputCls} value={form.suburb} onChange={set("suburb")} list="suburbs" autoComplete="address-level3" placeholder="Start typing…" />
                <datalist id="suburbs">{suburbs?.map((s) => <option key={s.suburb} value={s.suburb} />)}</datalist>
              </Field>
            </div>
            <div className="mt-auto space-y-3 pt-8">
              <ErrorNote>{error}</ErrorNote>
              <PillCta type="submit" disabled={busy}>Find my collection day</PillCta>
            </div>
          </>
        )}

        {step === "plan" && zone && (
          <>
            <div className="rounded-xl4 bg-lilac p-6 text-ink">
              <p className="text-sm font-medium opacity-70">You&rsquo;re in Zone {zone.code}</p>
              <h1 className="mt-1 font-display text-[44px] leading-none">{WEEKDAYS[zone.collectionDay]}s</h1>
              <p className="mt-2 text-[15px] opacity-80">{zone.name}. Bags out by 7am.</p>
              <div className="mt-5 flex gap-2">
                {upcomingCollectionDays(zone, api.today(), 3).map((d) => (
                  <span key={d} className="rounded-full bg-white/70 px-3 py-1.5 text-sm">{formatDay(d, { day: "numeric", month: "short" })}</span>
                ))}
              </div>
            </div>
            <h2 className="mt-8 text-[19px] font-semibold">How often should we come?</h2>
            <div className="mt-3 grid gap-2.5" role="radiogroup">
              {([
                ["weekly", "Every week", "Best for busy households"],
                ["fortnightly", "Every second week", "A lighter rhythm"],
                ["once", "Just the next one", "Try it once, decide later"],
              ] as const).map(([value, title, sub]) => (
                <button type="button" role="radio" aria-checked={plan === value} key={value} onClick={() => setPlan(value)}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${plan === value ? "border-lilac-deep bg-lilac-soft" : "border-line bg-card"}`}>
                  <span><span className="block font-medium">{title}</span><span className="text-sm text-ink-2">{sub}</span></span>
                  <span className={`grid size-6 place-items-center rounded-full border-2 ${plan === value ? "border-lilac-deep" : "border-ink/20"}`}>
                    {plan === value && <span className="size-3 rounded-full bg-lilac-deep" />}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-3">New plans are confirmed by our team, usually within a day. You can skip any week.</p>
            <div className="mt-auto space-y-3 pt-8">
              <ErrorNote>{error}</ErrorNote>
              <PillCta type="submit" disabled={busy}>Start collecting</PillCta>
            </div>
          </>
        )}

        {step === "waitlist" && (
          <div className="flex flex-1 flex-col text-center">
            <Mascot size={170} mood="sleepy" className="mx-auto mt-4" />
            <h1 className="mt-4 font-display text-[42px] leading-none">Not in {form.suburb} yet</h1>
            <p className="mx-auto mt-3 max-w-[300px] text-ink-2">
              You&rsquo;re on the waiting list. The more neighbours who sign up, the sooner we open your area. We&rsquo;ll message you the day we do.
            </p>
            <div className="mt-auto pt-8"><PillCta href="/home">Go to my account</PillCta></div>
          </div>
        )}
      </form>
    </main>
  );
}
