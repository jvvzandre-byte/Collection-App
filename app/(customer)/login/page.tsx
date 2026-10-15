"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { homeFor } from "@/components/Gate";
import { IconArrowLeft } from "@/components/Icons";
import { Mascot } from "@/components/Mascot";
import { ErrorNote, Field, PillCta, inputCls } from "@/components/ui";
import { api } from "@/lib/data";

export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!devCode) {
        if (phone.replace(/\D/g, "").length < 9) throw new Error("Enter your cellphone number.");
        setDevCode((await api.requestOtp(phone)).devCode);
      } else {
        const user = await api.signIn(phone, code);
        router.replace(homeFor(user.role));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[460px] flex-col bg-paper px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Link href="/welcome" aria-label="Back" className="grid size-11 place-items-center rounded-full bg-card"><IconArrowLeft /></Link>
      <form onSubmit={submit} className="rise mt-6 flex flex-1 flex-col">
        <Mascot size={110} mood="wink" />
        <h1 className="mt-4 font-display text-[44px] leading-none">Welcome back</h1>
        <p className="mt-3 text-ink-2">Sign in with the number you registered with.</p>
        <div className="mt-8 space-y-4">
          <Field label="Cellphone">
            <input className={inputCls} value={phone} onChange={(e) => { setPhone(e.target.value); setDevCode(null); }} inputMode="tel" autoComplete="tel" placeholder="082 123 4567" />
          </Field>
          {devCode && (
            <Field label="Code" hint={<button type="button" onClick={() => setCode(devCode)} className="underline">Dev: code is {devCode}. Tap to fill.</button>}>
              <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={4} autoFocus />
            </Field>
          )}
        </div>
        <div className="mt-auto space-y-3 pt-8">
          <ErrorNote>{error}</ErrorNote>
          <PillCta type="submit" disabled={busy}>{devCode ? "Sign in" : "Send code"}</PillCta>
          <p className="text-center text-[15px] text-ink-2">New here? <Link href="/signup" className="font-medium text-ink underline underline-offset-4">Create an account</Link></p>
        </div>
      </form>
    </main>
  );
}
