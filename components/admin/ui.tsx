"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { initials } from "@/lib/format";

// Dark-theme primitives for the admin panel.

export function Panel({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel min-w-0 p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[17px] font-medium text-fog">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type V = "white" | "ghost" | "hot" | "cool" | "line";
const variants: Record<V, string> = {
  white: "bg-fog text-night hover:bg-white",
  ghost: "bg-night-2 text-fog hover:bg-night-3 border border-white/[.07]",
  hot: "bg-hot text-white hover:brightness-110",
  cool: "bg-electric text-white hover:brightness-110",
  line: "border border-white/15 text-fog hover:bg-white/5",
};

export function ABtn({ variant = "ghost", size = "md", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: V; size?: "sm" | "md" }) {
  return <button type="button" {...p} className={`inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition disabled:opacity-40 ${size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm"} ${variants[variant]} ${className}`} />;
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-full border border-white/[.07] bg-night-2 p-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={`h-8 rounded-full px-4 text-[13px] transition ${value === o.value ? "bg-night-3 text-fog shadow-[inset_0_0_0_1px_rgb(255_255_255/.08)]" : "text-fog-2 hover:text-fog"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const TONE = {
  white: "bg-fog text-night",
  hot: "bg-hot/15 text-[#ff8db4]",
  cool: "bg-cool/20 text-[#aab3ff]",
  electric: "bg-electric text-white",
  muted: "bg-night-3 text-fog-2",
  good: "bg-[#173a3a] text-[#7fdca6]",
  warn: "bg-[#3a3326] text-[#f0c674]",
} as const;

export function Tag({ tone = "muted", children }: { tone?: keyof typeof TONE; children: ReactNode }) {
  return <span className={`inline-flex h-7 items-center whitespace-nowrap rounded-full px-3 text-[12.5px] font-medium ${TONE[tone]}`}>{children}</span>;
}

export function Count({ n, tone = "muted" }: { n: number | string; tone?: "muted" | "hot" | "white" }) {
  return <span className={`inline-grid h-7 min-w-9 place-items-center rounded-lg px-2 text-[13px] font-medium tabular ${tone === "hot" ? "bg-hot text-white" : tone === "white" ? "bg-fog text-night" : "bg-night-3 text-fog"}`}>{n}</span>;
}

const AVATAR = ["#e6457f", "#6e7bf2", "#f0c674", "#7fdca6", "#c9a0ff"];
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const c = AVATAR[[...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % AVATAR.length];
  return (
    <span className="inline-grid shrink-0 place-items-center rounded-full text-[12px] font-semibold text-night" style={{ width: size, height: size, background: c }}>
      {initials(name)}
    </span>
  );
}

export const aInput = "h-10 w-full rounded-xl border border-white/10 bg-night-2 px-3 text-sm text-fog outline-none placeholder:text-fog-3 focus:border-cool";

export function AField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-fog-3">{label}</span>
      {children}
    </label>
  );
}

export function AError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="rounded-xl bg-hot/15 px-3 py-2 text-sm text-[#ff8db4]">{children}</p>;
}

export function PageHead({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[34px] font-light leading-tight tracking-tight text-fog">{title}</h1>
        {sub && <p className="mt-1 text-fog-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="inset-row p-6 text-center text-sm text-fog-2">{children}</div>;
}

/** Table wrapper: horizontal scroll on small screens. */
export function ATable({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[720px] border-separate border-spacing-y-1.5 text-left text-sm">
        <thead><tr>{head.map((h, i) => <th key={i} className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-fog-3">{h}</th>)}</tr></thead>
        <tbody className="[&_td]:bg-night-2 [&_td]:px-3 [&_td]:py-3 [&_td:first-child]:rounded-l-xl [&_td:last-child]:rounded-r-xl">{children}</tbody>
      </table>
    </div>
  );
}

/** Right-hand slide-over for forms. */
export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  if (!open || typeof document === "undefined") return null;
  // Portal to <body>: page wrappers animate transform, which would otherwise trap `fixed` inside them.
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end text-fog [color-scheme:dark]" role="dialog" aria-modal="true" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <button aria-label="Close" className="absolute inset-0 bg-night/70 backdrop-blur-sm" onClick={onClose} />
      <div className="rise relative flex h-full w-full max-w-[460px] flex-col border-l border-white/10 bg-night-1 text-fog shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[.06] px-6 py-5">
          <h2 className="text-xl font-light">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full border border-white/10 hover:bg-night-3">✕</button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex gap-2 border-t border-white/[.06] px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Two-step button for destructive actions: first click arms it, second confirms. */
export function ConfirmBtn({ label, confirm, onConfirm, variant = "line", size = "sm" }: { label: ReactNode; confirm: ReactNode; onConfirm: () => void; variant?: V; size?: "sm" | "md" }) {
  const [armed, setArmed] = useState(false);
  return armed ? (
    <span className="inline-flex gap-1.5">
      <ABtn size={size} variant="hot" onClick={() => { setArmed(false); onConfirm(); }}>{confirm}</ABtn>
      <ABtn size={size} variant="ghost" onClick={() => setArmed(false)}>Cancel</ABtn>
    </span>
  ) : <ABtn size={size} variant={variant} onClick={() => setArmed(true)}>{label}</ABtn>;
}

export function StatCard({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="panel min-w-0 p-4">
      <p className="text-xs uppercase tracking-wider text-fog-3">{label}</p>
      <p className="mt-1 text-[28px] font-light leading-tight tabular">{value}</p>
      {sub && <p className="text-xs text-fog-3">{sub}</p>}
    </div>
  );
}
