import type { EntrySnapshotRow } from "@/lib/types";

// Winner selection (README "Rules → The draw"):
// - one winner per voucher, chosen at random weighted by entries
// - winners are distinct: a customer wins at most one voucher per draw
// - deterministic for a given seed, so the audit record can be replayed

/** 32-bit FNV-1a hash of the seed string. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG → floats in [0, 1). */
export function rng(seed: string): () => number {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface WinnerPick {
  voucherId: string;
  userId: string;
}

/**
 * Pick one distinct winner per voucher. Customers in `exclude` (e.g. earlier winners
 * when redrawing) can't be picked. If there are fewer eligible customers than vouchers,
 * the remaining vouchers get no winner.
 */
export function selectWinners(
  snapshot: EntrySnapshotRow[],
  voucherIds: string[],
  seed: string,
  exclude: Iterable<string> = [],
): WinnerPick[] {
  const random = rng(seed);
  const excluded = new Set(exclude);
  // Stable order so the same seed always gives the same result.
  let pool = snapshot
    .filter((r) => r.entries > 0 && !excluded.has(r.userId))
    .sort((a, b) => a.userId.localeCompare(b.userId));

  const picks: WinnerPick[] = [];
  for (const voucherId of voucherIds) {
    const total = pool.reduce((s, r) => s + r.entries, 0);
    if (total === 0) break;
    let ticket = Math.floor(random() * total);
    const winner = pool.find((r) => (ticket -= r.entries) < 0)!;
    picks.push({ voucherId, userId: winner.userId });
    pool = pool.filter((r) => r.userId !== winner.userId);
  }
  return picks;
}

export function generateSeed(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
