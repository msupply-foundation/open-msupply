// The allocate-in lens and unit arithmetic
// (spec/stock-allocation/rules.md § the allocate-in lens): entry happens in
// units or packs-of-a-size (doses is the manageVaccinesInDoses-gated
// extension, AC-AL7); the policy always distributes in units.

/** The quantity-entry lens (AC-AL7). Doses joins when a consumer needs it. */
export type AllocateUnit = { kind: 'units' } | { kind: 'packs'; size: number };

/**
 * Convert a lens-entered quantity to units (negative or non-finite —
 * NaN/Infinity from unparsed input — → undefined: AC-AL6).
 */
export const lensToUnits = (
  value: number | null | undefined,
  lens: AllocateUnit
): number | undefined => {
  if (value == null || !Number.isFinite(value) || value < 0) return undefined;
  return lens.kind === 'packs' ? value * lens.size : value;
};

/** The structural fields the unit sums read. */
export interface UnitCountableBatch {
  packSize: number;
  availablePacks: number;
  numberOfPacks: number;
  // On-hold batches (the stock line or its location) are excluded from the
  // available total — old-app parity (sumAvailableUnits skips on-hold stock;
  // expired / unusable-VVM batches are still counted). They stay visible in
  // the grid, disabled. Optional: callers that don't track hold omit them and
  // nothing is excluded.
  stockLineOnHold?: boolean;
  location?: { onHold: boolean } | null;
}

export const availableUnits = (
  batches: readonly UnitCountableBatch[]
): number =>
  batches.reduce(
    (sum, line) =>
      line.stockLineOnHold || line.location?.onHold
        ? sum
        : sum + line.availablePacks * line.packSize,
    0
  );

export const issuedUnits = (batches: readonly UnitCountableBatch[]): number =>
  batches.reduce((sum, line) => sum + line.numberOfPacks * line.packSize, 0);

/** The pack sizes present — the packs-of-‹size› lens options. */
export const distinctPackSizes = (
  batches: readonly { packSize: number }[]
): number[] => [...new Set(batches.map(line => line.packSize))];
