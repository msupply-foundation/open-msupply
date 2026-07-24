// The client-side FEFO distribution behind an issue editor's quantity field
// (spec/stock-allocation/rules.md): fill usable batches oldest-expiry-first
// in WHOLE packs — never split a pack, round the last take UP within
// availability (over-allocation < 1 pack, reported) — and report the
// shortfall (what the consumer maps to its remainder concept, e.g. outbound's
// placeholder) plus every barred category passed over while holding stock.
// Pure: the consuming editor owns its draft store; this owns the arithmetic
// so AC-AL1/AL3/AL4's client face is testable in isolation.
//
// The `partialPacks` option is the prescriptions variant
// (spec/prescriptions/rules.md § allocation, AC-A1): dispensing works in
// units, so packs may split — the last take is the exact fraction needed,
// there is never over-allocation, and a shortfall only narrows (no
// placeholder concept).

import type { BarReason } from './policy';

export type DistributableLine = {
  id: string;
  packSize: number;
  availablePacks: number;
  /**
   * Why this batch may not be issued from — empty means usable
   * (policy.ts barReasons; spec/stock-allocation/rules.md § barred batches).
   */
  barred: readonly BarReason[];
};

export type Distribution = {
  /** Packs to issue per line id (every input line gets an entry). */
  packsById: Map<string, number>;
  /** Units requested but not covered by usable stock (the consumer's remainder — e.g. outbound's placeholder). */
  shortfallUnits: number;
  /** Units issued beyond the request (whole-pack rounding). */
  overAllocatedUnits: number;
  /**
   * The barred categories passed over on batches that held available stock
   * (AC-AL2 — each reported skip category). Empty when nothing was skipped.
   */
  skippedReasons: ReadonlySet<BarReason>;
};

// `lines` must already be FEFO-ordered (earliest expiry first) — order is the
// caller's, so the same routine serves any tie-break policy (e.g. the
// VVM-then-expiry preference).
export const distributeIssue = (
  lines: readonly DistributableLine[],
  requestedUnits: number,
  options?: { partialPacks?: boolean }
): Distribution => {
  const packsById = new Map<string, number>();
  // Non-finite requests (NaN/Infinity from unparsed input) distribute
  // nothing, exactly like a negative request (AC-AL6).
  let remaining = Number.isFinite(requestedUnits)
    ? Math.max(0, requestedUnits)
    : 0;
  let overAllocatedUnits = 0;
  const skippedReasons = new Set<BarReason>();

  for (const line of lines) {
    if (line.barred.length > 0) {
      if (line.availablePacks > 0)
        for (const reason of line.barred) skippedReasons.add(reason);
      packsById.set(line.id, 0);
      continue;
    }
    if (remaining <= 0 || line.availablePacks <= 0 || line.packSize <= 0) {
      packsById.set(line.id, 0);
      continue;
    }
    const maxUnits = line.availablePacks * line.packSize;
    let packs: number;
    if (remaining >= maxUnits) {
      packs = line.availablePacks;
    } else if (options?.partialPacks) {
      packs = remaining / line.packSize;
    } else {
      packs = Math.min(
        Math.ceil(remaining / line.packSize),
        line.availablePacks
      );
      overAllocatedUnits += Math.max(0, packs * line.packSize - remaining);
    }
    packsById.set(line.id, packs);
    remaining -= packs * line.packSize;
  }

  return {
    packsById,
    shortfallUnits: Math.max(0, remaining),
    overAllocatedUnits,
    skippedReasons,
  };
};
