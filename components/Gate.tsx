"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { Role, User } from "@/lib/types";
import { api } from "@/lib/data";
import { useData } from "@/lib/data/hooks";
import { Mascot } from "./Mascot";

export const homeFor = (role: Role) => (role === "admin" ? "/admin" : role === "driver" ? "/driver" : "/home");

/** Route gating. Every role area wraps its pages in this; the data layer checks roles again. */
export function RoleGate({ role, children, dark = false }: { role: Role; children: (user: User) => ReactNode; dark?: boolean }) {
  const { data: user, loading } = useData(() => api.getCurrentUser());
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && role === "customer") router.replace("/welcome");
  }, [loading, user, role, router]);

  if (loading || (!user && role === "customer")) {
    return <div className={`min-h-dvh ${dark ? "bg-night" : "bg-paper"}`} />;
  }
  if (!user || user.role !== role) {
    return (
      <div className={`grid min-h-dvh place-items-center px-6 ${dark ? "bg-night text-fog" : "bg-paper"}`}>
        <div className="max-w-sm text-center">
          <Mascot size={120} mood="surprised" className="mx-auto" />
          <h1 className="mt-4 font-display text-4xl">Not your door</h1>
          <p className={`mt-2 ${dark ? "text-fog-2" : "text-ink-2"}`}>
            This area is for {role === "admin" ? "admins" : role === "driver" ? "drivers" : "customers"}.
            {user ? ` You're signed in as ${user.name} (${user.role}).` : " Please sign in."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {user ? (
              <Link href={homeFor(user.role)} className="rounded-full bg-lilac-deep px-5 py-3 text-white">Go to my area</Link>
            ) : (
              <Link href="/login" className="rounded-full bg-lilac-deep px-5 py-3 text-white">Sign in</Link>
            )}
          </div>
          <p className={`mt-6 text-xs ${dark ? "text-fog-3" : "text-ink-3"}`}>Dev: use the role switcher in the corner.</p>
        </div>
      </div>
    );
  }
  return <>{children(user)}</>;
}
