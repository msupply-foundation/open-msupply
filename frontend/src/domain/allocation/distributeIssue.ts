// The client-side FEFO distribution behind an issue editor's quantity field
// (spec/stock-allocation/rules.md § whole-pack arithmetic): fill usable
// batches oldest-expiry-first in WHOLE packs, biased to the exact requested
// quantity — the old app's three-pass allocate:
//
//   1. front-to-back, round each take DOWN to whole packs;
//   2. still short → front-to-back again, round the take UP (earliest stock
//      is preferred for the extra pack);
//   3. now over → walk BACKWARDS trimming whole packs from the latest-filled
//      batches, skipping any batch whose pack size exceeds the excess.
//
// Over-allocation survives only when no combination of whole packs can land
// on the request (AC-AL3), and the shortfall (what the consumer maps to its
// remainder concept, e.g. outbound's placeholder) plus every barred category
// passed over while holding stock are reported. Pure: the consuming editor
// owns its draft store; this owns the arithmetic so AC-AL1/AL3/AL4's client
// face is testable in isolation.
//
// The `partialPacks` option is the prescriptions variant
// (spec/prescriptions/rules.md § allocation, AC-A1): dispensing works in
// units, so packs may split — the take is the exact fraction needed, there
// is never over-allocation (passes 2–3 never run), and a shortfall only
// narrows (no placeholder concept).
//
// `requiredPackSize` is the packs lens (AC-AL11): distribution fills ONLY
// batches of the selected pack size; others are ineligible without being a
// reported skip (staying out of a differently-sized batch is what the lens
// asks for, not stock passed over).

import type { BarReason } from './policy';

export type DistributableLine = {
  id: string;
  packSize: number;
  availablePacks: number;
  /**
   * Why this batch may not be AUTO-allocated from — empty means fillable
   * (policy.ts autoAllocateBarReasons; spec/stock-allocation/rules.md §
   * barred batches › never auto-allocated).
   */
  barred: readonly BarReason[];
};

export type Distribution = {
  /** Packs to issue per line id (every input line gets an entry). */
  packsById: Map<string, number>;
  /** Units requested but not covered by usable stock (the consumer's remainder — e.g. outbound's placeholder). */
  shortfallUnits: number;
  /** Units issued beyond the request (whole-pack rounding, AC-AL3). */
  overAllocatedUnits: number;
  /**
   * The barred categories passed over on batches that held available stock
   * (AC-AL2 — each reported skip category). Empty when nothing was skipped.
   */
  skippedReasons: ReadonlySet<BarReason>;
  /**
   * Units short of rounding every fractional take up to whole packs — the
   * partial-pack warning's gap (AC-AL12): 0 in whole-pack mode; under
   * `partialPacks`, > 0 when the allocation split a pack.
   */
  wholePackGapUnits: number;
};

// `lines` must already be FEFO-ordered (earliest expiry first) — order is the
// caller's, so the same routine serves any tie-break policy (e.g. the
// VVM-then-expiry preference).
export const distributeIssue = (
  lines: readonly DistributableLine[],
  requestedUnits: number,
  options?: { partialPacks?: boolean; requiredPackSize?: number }
): Distribution => {
  const packsById = new Map<string, number>();
  // Non-finite requests (NaN/Infinity from unparsed input) distribute
  // nothing, exactly like a negative request (AC-AL6).
  let remaining = Number.isFinite(requestedUnits)
    ? Math.max(0, requestedUnits)
    : 0;
  const skippedReasons = new Set<BarReason>();

  const fillable: DistributableLine[] = [];
  for (const line of lines) {
    packsById.set(line.id, 0);
    if (line.barred.length > 0) {
      if (line.availablePacks > 0)
        for (const reason of line.barred) skippedReasons.add(reason);
      continue;
    }
    if (line.availablePacks <= 0 || line.packSize <= 0) continue;
    if (
      options?.requiredPackSize != null &&
      line.packSize !== options.requiredPackSize
    )
      continue;
    fillable.push(line);
  }

  // Pass 1 — front-to-back, whole packs rounded DOWN (exact fraction under
  // partialPacks). Whole-pack mode also floors the batch's own availability:
  // residual fractional packs (dust) are never issued by distribution.
  for (const line of fillable) {
    if (remaining <= 0) break;
    const allocatablePacks = options?.partialPacks
      ? line.availablePacks
      : Math.floor(line.availablePacks);
    const takeUnits = Math.min(remaining, allocatablePacks * line.packSize);
    const packs = options?.partialPacks
      ? takeUnits / line.packSize
      : Math.floor(takeUnits / line.packSize);
    packsById.set(line.id, packs);
    remaining -= packs * line.packSize;
  }

  // Pass 2 — still short: front-to-back again, rounding the take UP within
  // availability, so the earliest stock carries the extra pack.
  if (remaining > 0 && !options?.partialPacks) {
    for (const line of fillable) {
      if (remaining <= 0) break;
      const already = packsById.get(line.id) ?? 0;
      const headroomPacks = Math.floor(line.availablePacks) - already;
      if (headroomPacks <= 0) continue;
      const takeUnits = Math.min(remaining, headroomPacks * line.packSize);
      const packs = Math.ceil(takeUnits / line.packSize);
      packsById.set(line.id, already + packs);
      remaining -= packs * line.packSize;
    }
  }

  // Pass 3 — over-allocated: trim whole packs walking BACKWARDS (latest
  // stock trimmed first), skipping batches whose pack size exceeds the
  // excess — the old app's reduce step. What cannot be trimmed remains as
  // the reported over-allocation.
  if (remaining < 0) {
    let excess = -remaining;
    for (let i = fillable.length - 1; i >= 0 && excess > 0; i--) {
      const line = fillable[i]!;
      const allocated = packsById.get(line.id) ?? 0;
      if (allocated === 0) continue;
      if (line.packSize > excess) continue;
      const trimUnits = Math.min(excess, allocated * line.packSize);
      const trimPacks = Math.floor(trimUnits / line.packSize);
      packsById.set(line.id, allocated - trimPacks);
      excess -= trimPacks * line.packSize;
    }
    remaining = -excess;
  }

  // The gap to whole packs (AC-AL12): only fractional takes contribute. The
  // sum is rounded to kill float dust (0.7 packs of 10 must gap exactly 3 —
  // the figure surfaces to the user).
  let wholePackGapUnits = 0;
  if (options?.partialPacks) {
    for (const line of fillable) {
      const packs = packsById.get(line.id) ?? 0;
      wholePackGapUnits += (Math.ceil(packs) - packs) * line.packSize;
    }
    wholePackGapUnits = Math.round(wholePackGapUnits * 1e9) / 1e9;
  }

  return {
    packsById,
    shortfallUnits: Math.max(0, remaining),
    overAllocatedUnits: Math.max(0, -remaining),
    skippedReasons,
    wholePackGapUnits,
  };
};
