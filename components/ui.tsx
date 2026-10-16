"use client";

import Link from "next/link";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconArrowRight, IconX } from "./Icons";

// Light-theme primitives for the customer and driver views.

type BtnVariant = "ink" | "lilac" | "ghost" | "soft" | "danger";
const btn: Record<BtnVariant, string> = {
  ink: "bg-ink text-white hover:bg-black",
  lilac: "bg-lilac-deep text-white hover:brightness-95",
  ghost: "bg-transparent text-ink hover:bg-black/5",
  soft: "bg-card text-ink border border-line hover:bg-paper",
  danger: "bg-rose text-rose-deep hover:brightness-95",
};

export function Button({ variant = "ink", size = "md", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "h-14 px-6 text-[17px]" : size === "sm" ? "h-9 px-4 text-sm" : "h-12 px-5 text-[15px]";
  return <button {...p} className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition active:scale-[.98] disabled:opacity-40 ${s} ${btn[variant]} ${className}`} />;
}

/** The reference's signature CTA: black pill with a white circle arrow at the end. */
export function PillCta({ children, href, onClick, disabled, type = "button" }: { children: ReactNode; href?: string; onClick?: () => void; disabled?: boolean; type?: "button" | "submit" }) {
  const inner = (
    <>
      <span className="pl-6 text-[17px] font-medium">{children}</span>
      <span className="grid size-12 place-items-center rounded-full bg-white text-ink"><IconArrowRight size={22} /></span>
    </>
  );
  const cls = "flex h-16 w-full items-center justify-between rounded-full bg-ink p-2 text-white shadow-[0_10px_30px_-10px_rgb(0_0_0/.5)] transition active:scale-[.99] disabled:opacity-40";
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button type={type} onClick={onClick} disabled={disabled} className={cls}>{inner}</button>;
}

export function Chip({ active, children, onClick, className = "" }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`h-10 shrink-0 rounded-full px-4 text-[15px] transition ${active ? "bg-lilac-deep text-white" : "border border-line bg-card text-ink hover:bg-paper"} ${className}`}>
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl3 bg-card ${className}`}>{children}</div>;
}

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-end justify-between">
      <h2 className="text-[19px] font-semibold tracking-tight">{title}</h2>
      {action && <div className="text-sm text-ink-2">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

export const inputCls = "h-13 w-full rounded-2xl border border-line bg-card px-4 text-[16px] outline-none transition placeholder:text-ink-3 focus:border-lilac-deep focus:ring-4 focus:ring-lilac-soft";

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="rounded-2xl bg-rose px-4 py-3 text-sm text-rose-deep">{children}</p>;
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  // Portal to <body>: page wrappers animate transform, which would otherwise trap `fixed` inside them.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center text-ink" role="dialog" aria-modal="true">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="sheet-in relative max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[2rem] bg-paper px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/15" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="text-[22px] font-semibold leading-tight tracking-tight">{title}</div>
          <button onClick={onClose} aria-label="Close" className="grid size-10 shrink-0 place-items-center rounded-full bg-card"><IconX /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-black/[.06] ${className}`} />;
}

export function StatusBadge({ status }: { status: "pending" | "collected" | "rejected" | "missed" }) {
  const map = {
    pending: "bg-paper text-ink-2",
    collected: "bg-mint text-mint-deep",
    rejected: "bg-rose text-rose-deep",
    missed: "bg-butter text-[#8a6418]",
  } as const;
  const label = { pending: "To do", collected: "Collected", rejected: "Rejected", missed: "Missed" }[status];
  return <span className={`inline-flex h-7 items-center rounded-full px-3 text-[13px] font-medium ${map[status]}`}>{label}</span>;
}
