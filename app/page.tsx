"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { homeFor } from "@/components/Gate";
import { api } from "@/lib/data";

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    api.getCurrentUser().then((u) => router.replace(u ? homeFor(u.role) : "/welcome"));
  }, [router]);
  return <div className="min-h-dvh bg-paper" />;
}
