"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageTitle } from "@/components/CustomerShell";
import { IconChevronRight, IconLogout, IconMapPin, IconPhone, IconShield, IconTicket } from "@/components/Icons";
import { Button, Card, ErrorNote, SectionHead, Skeleton, inputCls } from "@/components/ui";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { WEEKDAYS } from "@/lib/logic/dates";
import { initials } from "@/lib/format";

export default function Profile() {
  const router = useRouter();
  const { data: home } = useData(() => api.getMyHome());
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!home) return <Skeleton className="mt-2 h-60" />;
  const editing = name !== null;

  const save = async () => {
    try { await api.updateProfile({ name: name ?? "" }); setName(null); setError(null); } catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="rise">
      <PageTitle title="Profile" />
      <Card className="mt-6 flex items-center gap-4 p-5">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-lilac text-xl font-semibold">{initials(home.user.name)}</span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-label="Name" />
          ) : (
            <>
              <p className="truncate text-xl font-semibold">{home.user.name}</p>
              <p className="text-sm text-ink-2">Member since {new Date(home.user.createdAt).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}</p>
            </>
          )}
        </div>
        {editing ? <Button size="sm" onClick={save}>Save</Button> : <Button size="sm" variant="soft" onClick={() => setName(home.user.name)}>Edit</Button>}
      </Card>
      {error && <div className="mt-2"><ErrorNote>{error}</ErrorNote></div>}

      <SectionHead title="Household" />
      <Card className="divide-y divide-line px-4">
        <Row icon={<IconPhone size={19} />} label="Cellphone" value={`${home.user.phone}${home.user.phoneVerified ? " · verified" : ""}`} />
        <Row icon={<IconMapPin size={19} />} label="Address" value={`${home.address?.street}, ${home.address?.suburb}`} />
        <Row icon={<IconTicket size={19} />} label="Zone" value={home.zone ? `Zone ${home.zone.code} · ${WEEKDAYS[home.zone.collectionDay]}s` : "Waiting list"} />
      </Card>
      <p className="mt-2 px-1 text-xs text-ink-3">Moving house? Contact us. Addresses are fixed to keep it one account per household.</p>

      <SectionHead title="Privacy & rules" />
      <Card className="divide-y divide-line px-4">
        <Link href="/rules" className="flex items-center gap-3 py-4"><IconTicket size={19} /><span className="flex-1">Draw rules</span><IconChevronRight size={18} /></Link>
        <Link href="/rules#privacy" className="flex items-center gap-3 py-4"><IconShield size={19} /><span className="flex-1">Privacy notice</span><IconChevronRight size={18} /></Link>
        <div className="flex items-center gap-3 py-4 text-sm text-ink-2"><IconShield size={19} />Consent given {home.user.consentAt ? new Date(home.user.consentAt).toLocaleDateString("en-ZA") : "n/a"}</div>
      </Card>

      <Button variant="soft" className="mt-6 w-full" onClick={async () => { await api.signOut(); router.replace("/welcome"); }}>
        <IconLogout size={18} /> Sign out
      </Button>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <span className="text-ink-2">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-ink-3">{label}</p>
        <p className="truncate">{value}</p>
      </div>
    </div>
  );
}
