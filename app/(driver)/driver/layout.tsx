"use client";

import { RoleGate } from "@/components/Gate";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate role="driver">
      {() => <div className="mx-auto min-h-dvh max-w-[520px] bg-paper px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">{children}</div>}
    </RoleGate>
  );
}
