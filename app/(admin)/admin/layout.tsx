"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { RoleGate } from "@/components/Gate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate role="admin" dark>{(user) => <AdminShell user={user}>{children}</AdminShell>}</RoleGate>;
}
