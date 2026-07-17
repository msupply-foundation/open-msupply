// The client-side FEFO distribution behind an issue editor's quantity field
// (spec/stock-allocation/rules.md): fill usable batches oldest-expiry-first
// in WHOLE packs — never split a pack, round the last take UP within
// availability (over-allocation < 1 pack, reported) — and report the
// shortfall (what the consumer maps to its remainder concept, e.g. outbound's
// placeholder) plus whether any usable-looking stock was skipped as barred.
// Pure: the consuming editor owns its draft store; this owns the arithmetic
// so AC-AL1/AL3/AL4's client face is testable in isolation.

export type DistributableLine = {
  id: string;
  packSize: number;
  availablePacks: number;
  /** On hold / expired-within-threshold / unusable VVM — never issued from. */
  barred: boolean;
};

export type Distribution = {
  /** Packs to issue per line id (every input line gets an entry). */
  packsById: Map<string, number>;
  /** Units requested but not covered by usable stock (the consumer's remainder — e.g. outbound's placeholder). */
  shortfallUnits: number;
  /** Units issued beyond the request (whole-pack rounding). */
  overAllocatedUnits: number;
  /** A barred line with available stock was passed over. */
  skippedBarred: boolean;
};

// `lines` must already be FEFO-ordered (earliest expiry first) — order is the
// caller's, so the same routine serves any tie-break policy (e.g. the
// VVM-then-expiry preference).
export const distributeIssue = (
  lines: readonly DistributableLine[],
  requestedUnits: number
): Distribution => {
  const packsById = new Map<string, number>();
  let remaining = Math.max(0, requestedUnits);
  let overAllocatedUnits = 0;
  let skippedBarred = false;

  for (const line of lines) {
    if (line.barred) {
      if (line.availablePacks > 0) skippedBarred = true;
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
    skippedBarred,
  };
};
