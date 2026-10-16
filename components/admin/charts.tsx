"use client";

import { useRef, useState, type CSSProperties } from "react";

// Hand-rolled SVG charts for the dark admin theme.
// Series colours validated for the dark surface: cool #6E7BF2, hot #E6457F.

export interface Point { label: string; sub: string; value: number }

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1] ?? pts[i];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const [x3, y3] = pts[i + 2] ?? pts[i + 1];
    const t = 0.18;
    d += ` C${x1 + (x2 - x0) * t},${y1 + (y2 - y0) * t} ${x2 - (x3 - x1) * t},${y2 - (y3 - y1) * t} ${x2},${y2}`;
  }
  return d;
}

/** Round a tick step up to 1, 2, 2.5 or 5 × 10ⁿ. */
function niceStep(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}

export function LineChart({ data, unit, color = "#6E7BF2", height = 240 }: { data: Point[]; unit: string; color?: string; height?: number }) {
  const W = 720;
  const H = height;
  const pad = { l: 40, r: 28, t: 16, b: 30 };
  const stepY = niceStep(Math.max(...data.map((d) => d.value)) / 4);
  const max = stepY * 4;
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, data.length - 1);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const pts = data.map((d, i) => [x(i), y(d.value)] as [number, number]);
  const line = smooth(pts);
  const area = `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const ticks = [0, 1, 2, 3, 4].map((i) => i * stepY);
  const step = Math.ceil(data.length / 6);

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  const h = hover != null ? data[hover] : null;
  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full touch-none select-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`${unit} per week`}>
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".28" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="rgb(255 255 255 / .06)" />
            <text x={pad.l - 10} y={y(t) + 4} textAnchor="end" className="fill-fog-3 text-[11px]">{Math.round(t)}</text>
          </g>
        ))}
        {data.map((d, i) => i % step === (data.length - 1) % step && (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-fog-3 text-[11px]">{d.label}</text>
        ))}
        {data.map((_, i) => <line key={i} x1={x(i)} x2={x(i)} y1={pad.t} y2={y(0)} stroke="rgb(255 255 255 / .035)" />)}
        <path d={area} fill="url(#area)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" />
        {h && hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke="rgb(255 255 255 / .25)" strokeDasharray="3 4" />
            <circle cx={x(hover)} cy={y(h.value)} r="10" fill={color} opacity=".25" />
            <circle cx={x(hover)} cy={y(h.value)} r="5.5" fill={color} stroke="var(--color-night-1)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && hover != null && (
        <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-xl border border-white/10 bg-night-3/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(h.value) / H) * 100}%`, marginTop: -14 }}>
          <p className="text-fog-2">{h.sub}</p>
          <p className="font-medium text-fog">{h.value.toLocaleString("en-ZA")} {unit}</p>
        </div>
      )}
    </div>
  );
}

/** Overlapping share bubbles, after the reference's "Statistics" card. Area ∝ share. */
export function Bubbles({ items }: { items: { label: string; value: number; fill: "hot" | "cool" | "hatch" }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const R = 92;
  const r = (v: number) => Math.max(26, Math.sqrt(v / total) * R);
  const pos: CSSProperties[] = [
    { left: "2%", top: "14%" },
    { right: "2%", bottom: "2%" },
    { right: "8%", top: "0%" },
  ];
  return (
    <div className="relative h-[240px]" role="list">
      {sorted.map((it, i) => {
        const pct = Math.round((it.value / total) * 100);
        const size = r(it.value) * 2;
        const cls = it.fill === "hot" ? "bg-hot" : it.fill === "cool" ? "bg-electric" : "hatch bg-night-3 border border-white/10";
        return (
          <div role="listitem" key={it.label} title={`${it.label}: ${it.value} (${pct}%)`}
            className={`absolute grid place-items-center rounded-full text-center ring-4 ring-night-1 ${cls}`}
            style={{ width: size, height: size, ...pos[i], zIndex: i + 1 }}>
            <div>
              <p className={`${i === 0 ? "text-[34px]" : "text-[22px]"} font-light leading-none tabular`}>{pct}%</p>
              <p className={`mt-1 ${i === 0 ? "text-sm" : "text-[11px]"} text-white/80`}>{it.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Pill-shaped proportion bar from the reference's header row. */
export function PillBar({ label, pct, tone }: { label: string; pct: number; tone: "hot" | "white" | "dark" | "hatch" }) {
  const fill = tone === "hot" ? "bg-hot text-white" : tone === "white" ? "bg-fog text-night" : tone === "dark" ? "bg-night-3 text-fog" : "hatch bg-night-2 text-fog";
  return (
    <div className="min-w-0">
      <p className="mb-2 truncate text-[13px] text-fog-2">{label}</p>
      <div className="relative h-10 w-full overflow-hidden rounded-full border border-white/[.07] bg-night-1">
        <div className={`flex h-full items-center rounded-full px-4 text-sm font-medium ${fill}`} style={{ width: `${Math.min(100, pct)}%`, minWidth: "4rem" }}>
          {Math.round(pct)}%
        </div>
      </div>
    </div>
  );
}
