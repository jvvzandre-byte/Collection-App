"use client";

import { useEffect, useRef, useState } from "react";
import { mapsConfigured } from "@/lib/config";
import type { StopView } from "@/lib/data";
import type { Settings } from "@/lib/types";

// Run map. PLACEHOLDER: until the Google Maps JavaScript API is connected this draws a schematic
// from the stored coordinates: depot, numbered stops in run order, straight lines between them.
// When a key is configured, swap the <Schematic> for a <GoogleMap> with the same props.

type Tone = "dark" | "light";
const STATUS: Record<StopView["status"], { fill: string; label: string }> = {
  pending: { fill: "#8F98F7", label: "To do" },
  collected: { fill: "#4FBF84", label: "Collected" },
  rejected: { fill: "#E6457F", label: "Rejected" },
  missed: { fill: "#E2B04A", label: "Missed" },
};

export function RunMap({ stops, depot, tone = "dark", height = 320, onSelect }: {
  stops: StopView[]; depot: Settings["depot"]; tone?: Tone; height?: number; onSelect?: (id: string) => void;
}) {
  const dark = tone === "dark";
  const located = stops.filter((s) => s.lat != null && s.lng != null);
  const missing = stops.length - located.length;
  return (
    <div>
      <Schematic stops={located} depot={depot} dark={dark} height={height} onSelect={onSelect} />
      <div className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${dark ? "text-fog-3" : "text-ink-3"}`}>
        {Object.entries(STATUS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: v.fill }} />{v.label}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className={`size-2.5 rounded-sm ${dark ? "bg-fog" : "bg-ink"}`} />Depot</span>
        <span className="ml-auto">
          {mapsConfigured() ? "Google key found · live map not wired yet" : "Schematic · approximate locations · Google Maps not connected"}
          {missing > 0 && ` · ${missing} stop${missing > 1 ? "s" : ""} without a location`}
        </span>
      </div>
    </div>
  );
}

function Schematic({ stops, depot, dark, height, onSelect }: { stops: StopView[]; depot: Settings["depot"]; dark: boolean; height: number; onSelect?: (id: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const [W, setW] = useState(640);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;

  // Fit the view to the stops (the depot can be far away); fall back to the depot alone.
  const fit = stops.length ? stops.map((s) => ({ lat: s.lat!, lng: s.lng! })) : [{ lat: depot.lat, lng: depot.lng }];
  const lat0 = Math.min(...fit.map((p) => p.lat)), lat1 = Math.max(...fit.map((p) => p.lat));
  const lng0 = Math.min(...fit.map((p) => p.lng)), lng1 = Math.max(...fit.map((p) => p.lng));
  // Equirectangular with cos(lat) correction, equal scale on both axes, centred.
  const k = Math.cos(((lat0 + lat1) / 2) * (Math.PI / 180));
  const spanX = Math.max((lng1 - lng0) * k, 0.004), spanY = Math.max(lat1 - lat0, 0.004);
  const pad = 40;
  const scale = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
  const cx = (lng0 + lng1) / 2, cy = (lat0 + lat1) / 2;
  const x = (lng: number) => W / 2 + (lng - cx) * k * scale;
  const y = (lat: number) => H / 2 - (lat - cy) * scale;

  // Depot: drawn in place if visible, otherwise pinned to the edge in its direction.
  let dx = x(depot.lng), dy = y(depot.lat);
  const offMap = dx < 14 || dx > W - 14 || dy < 14 || dy > H - 14;
  if (offMap) {
    const vx = dx - W / 2, vy = dy - H / 2;
    const t = Math.min((W / 2 - 16) / Math.abs(vx || 1e-9), (H / 2 - 16) / Math.abs(vy || 1e-9));
    dx = W / 2 + vx * t; dy = H / 2 + vy * t;
  }
  const line = [[dx, dy], ...stops.map((s) => [x(s.lng!), y(s.lat!)]), [dx, dy]].map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
  const grid = dark ? "rgb(255 255 255 / .05)" : "rgb(18 18 20 / .06)";
  const h = stops.find((s) => s.id === hover);
  const ink = dark ? "#F2F5FC" : "#121214";

  return (
    <div ref={box} className={`relative overflow-hidden rounded-2xl ${dark ? "bg-night-2" : "bg-card"}`} style={{ height }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label={`Schematic map of ${stops.length} stops`}>
        {Array.from({ length: Math.ceil(W / 64) + 1 }, (_, i) => <line key={`v${i}`} x1={i * 64} x2={i * 64} y1={0} y2={H} stroke={grid} />)}
        {Array.from({ length: Math.ceil(H / 64) + 1 }, (_, i) => <line key={`h${i}`} y1={i * 64} y2={i * 64} x1={0} x2={W} stroke={grid} />)}
        {stops.length > 0 && <polyline points={line} fill="none" stroke={dark ? "rgb(143 152 247 / .55)" : "rgb(113 121 230 / .55)"} strokeWidth={2} strokeDasharray="5 5" strokeLinejoin="round" />}
        <g transform={`translate(${dx} ${dy})`}>
          <rect x={-8} y={-8} width={16} height={16} rx={3} fill={offMap ? "none" : ink} stroke={ink} strokeWidth={2} strokeDasharray={offMap ? "3 2" : undefined} />
          <text x={dx > W / 2 ? -14 : 14} dy="4" textAnchor={dx > W / 2 ? "end" : "start"} fontSize="11" fill={ink} opacity={0.8}>{offMap ? `${depot.label} (off map)` : depot.label}</text>
        </g>
        {stops.map((s) => (
          <g key={s.id} transform={`translate(${x(s.lng!)} ${y(s.lat!)})`} className={onSelect ? "cursor-pointer" : ""}
            onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} onClick={() => onSelect?.(s.id)}>
            <circle r={hover === s.id ? 14 : 12} fill={STATUS[s.status].fill} stroke={dark ? "#16223F" : "#fff"} strokeWidth={2.5} />
            <text textAnchor="middle" dy="4" fontSize="11" fontWeight={600} fill={s.status === "pending" ? "#0A1226" : "#fff"}>{s.order + 1}</text>
          </g>
        ))}
      </svg>
      {h && (
        <div className={`pointer-events-none absolute left-3 top-3 rounded-xl px-3 py-2 text-xs shadow-lg ${dark ? "bg-night-3 text-fog" : "bg-ink text-white"}`}>
          <p className="font-medium">{h.order + 1}. {h.street}</p>
          <p className="opacity-70">{h.customerName} · {STATUS[h.status].label}</p>
        </div>
      )}
      {!stops.length && <p className={`absolute inset-0 grid place-items-center text-sm ${dark ? "text-fog-3" : "text-ink-3"}`}>No stops with a location yet.</p>}
    </div>
  );
}
