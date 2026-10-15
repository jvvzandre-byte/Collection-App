// "Bundle": a soft bag of recycling with a face. Our version of the reference's blob character.
// Mood changes the mouth/eyes; keep it simple and hand-drawn rather than detailed.

type Mood = "happy" | "wink" | "sleepy" | "surprised";

export function Mascot({ size = 180, mood = "happy", className = "" }: { size?: number; mood?: Mood; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} aria-hidden>
      {/* knot */}
      <path d="M86 40c-6-14 4-24 14-16 10-8 20 2 14 16" fill="#F6E2AE" stroke="#fff" strokeWidth="6" strokeLinejoin="round" />
      {/* body */}
      <path d="M100 38c-34 0-62 22-70 62-7 36 8 74 70 74s77-38 70-74c-8-40-36-62-70-62z" fill="#F6E2AE" stroke="#fff" strokeWidth="7" />
      {/* tie band */}
      <path d="M78 46c14 6 30 6 44 0" stroke="#7179E6" strokeWidth="9" strokeLinecap="round" fill="none" />
      {/* cheeks */}
      <ellipse cx="56" cy="122" rx="10" ry="6" fill="#F4B9C9" opacity=".7" />
      <ellipse cx="144" cy="122" rx="10" ry="6" fill="#F4B9C9" opacity=".7" />
      {/* eyes */}
      {mood === "sleepy" ? (
        <>
          <path d="M66 104c6 5 16 5 22 0M112 104c6 5 16 5 22 0" stroke="#1A1A1E" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <ellipse cx="78" cy="102" rx="13" ry="16" fill="#fff" stroke="#1A1A1E" strokeWidth="3" />
          <circle cx="81" cy="104" r={mood === "surprised" ? 6 : 8} fill="#1A1A1E" />
          <circle cx="84" cy="100" r="2.5" fill="#fff" />
          {mood === "wink" ? (
            <path d="M110 104c6-6 16-6 22 0" stroke="#1A1A1E" strokeWidth="5" strokeLinecap="round" fill="none" />
          ) : (
            <>
              <ellipse cx="122" cy="102" rx="13" ry="16" fill="#fff" stroke="#1A1A1E" strokeWidth="3" />
              <circle cx="125" cy="104" r={mood === "surprised" ? 6 : 8} fill="#1A1A1E" />
              <circle cx="128" cy="100" r="2.5" fill="#fff" />
            </>
          )}
        </>
      )}
      {/* mouth */}
      {mood === "surprised" ? (
        <ellipse cx="100" cy="138" rx="7" ry="8" fill="#C98B4E" />
      ) : (
        <path d="M86 134c6 7 22 8 30 0" stroke="#C98B4E" strokeWidth="5" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}
