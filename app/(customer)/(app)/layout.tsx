"use client";

import { CustomerShell } from "@/components/CustomerShell";
import { RoleGate } from "@/components/Gate";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate role="customer">{() => <CustomerShell>{children}</CustomerShell>}</RoleGate>;
}
