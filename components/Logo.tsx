// Kilo brand. The mark is a scale weight (what drivers hang the bags on) with a "k" cut out of it;
// the butter handle ties it to the mascot. Wordmark is the display serif, lowercase.

export function LogoMark({ size = 32, body = "#8F98F7", handle = "#F6E2AE", cut = "#0A1226", className = "" }: {
  size?: number; body?: string; handle?: string; cut?: string; className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="14" r="8" fill="none" stroke={handle} strokeWidth="6" />
      <path d="M15 22h34a5 5 0 0 1 4.9 4l5.4 24.6A5 5 0 0 1 54.4 57H9.6a5 5 0 0 1-4.9-6.4L10.1 26A5 5 0 0 1 15 22z" fill={body} />
      <path d="M26 31v18M38.5 31.5 27 41l12 8" fill="none" stroke={cut} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ tone = "dark", size = 30, className = "" }: { tone?: "dark" | "light"; size?: number; className?: string }) {
  const dark = tone === "dark";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} body={dark ? "#8F98F7" : "#7179E6"} cut={dark ? "#0A1226" : "#F3F2F7"} />
      <span className={`font-display leading-none ${dark ? "text-fog" : "text-ink"}`} style={{ fontSize: size * 1.05 }}>kilo</span>
    </span>
  );
}

export const BRAND = { name: "Kilo", tagline: "Every kilo counts" } as const;
