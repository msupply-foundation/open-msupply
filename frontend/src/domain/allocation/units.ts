// The allocate-in lens and unit arithmetic
// (spec/stock-allocation/rules.md § the allocate-in lens): entry happens in
// units or packs-of-a-size (doses is the manageVaccinesInDoses-gated
// extension, AC-AL7); the policy always distributes in units.

/**
 * The quantity-entry lens (AC-AL7): units, packs-of-a-size, or — for vaccine
 * items under _manage vaccines in doses_ — doses. `dosesPerUnit` is the
 * item's doses-per-unit (doses = units × dosesPerUnit).
 */
export type AllocateUnit =
  | { kind: 'units' }
  | { kind: 'packs'; size: number }
  | { kind: 'doses'; dosesPerUnit: number };

/**
 * Kill float dust before a figure reaches state or the user (0.7 packs of 10
 * must read as exactly 3 units short of whole packs). Applied by the lens
 * conversions below and distributeIssue's reported gap; consumers use it on
 * their own pack×size sums.
 */
export const round9 = (value: number): number => Math.round(value * 1e9) / 1e9;

/**
 * Convert a lens-entered quantity to units (negative or non-finite —
 * NaN/Infinity from unparsed input — → undefined: AC-AL6). A dose entry
 * divides by the item's doses-per-unit (a zero/missing rate falls back to 1,
 * the old app's `dosesPerUnit || 1`); the policy always distributes in units
 * (AC-AL7 — "lens converts, policy stays in units"). Rounded (round9) — the
 * ÷/× otherwise leaves IEEE dust in figures that surface to the user.
 */
export const lensToUnits = (
  value: number | null | undefined,
  lens: AllocateUnit
): number | undefined => {
  if (value == null || !Number.isFinite(value) || value < 0) return undefined;
  if (lens.kind === 'packs') return round9(value * lens.size);
  if (lens.kind === 'doses') return round9(value / (lens.dosesPerUnit || 1));
  return value;
};

/**
 * Units re-expressed in a lens — the display face of lensToUnits (rounded, as
 * above).
 */
export const unitsToLens = (units: number, lens: AllocateUnit): number => {
  if (lens.kind === 'packs') return round9(units / lens.size);
  if (lens.kind === 'doses') return round9(units * (lens.dosesPerUnit || 1));
  return units;
};

/**
 * Per-batch doses ⇄ packs conversion (old-app parity — QuantityUtils):
 * doses = packs × pack size × doses-per-unit. Unlike the lens conversions
 * above (one item-level lens for the whole grid), these take a SINGLE batch's
 * own `packSize`/`dosesPerUnit` — a variant may override the item's, so the
 * batch grid converts row by row. A zero/missing rate falls back to 1, as the
 * lens conversions do (the old app's `dosesPerUnit || 1`).
 *
 * `packsToDoses` rounds to whole doses — doses are shown and entered as whole
 * numbers. `dosesToPacks` returns the raw (possibly fractional) pack count for
 * `clampManualPacks` to round UP and clamp, so a doses entry that isn't a
 * whole number of packs is reported back as an adjustment (AC-AL13).
 */
export const packsToDoses = (
  packs: number,
  packSize: number,
  dosesPerUnit: number
): number => Math.round(packs * packSize * (dosesPerUnit || 1));

export const dosesToPacks = (
  doses: number,
  packSize: number,
  dosesPerUnit: number
): number => doses / (packSize * (dosesPerUnit || 1));

/**
 * Clamp a manual per-batch packs entry (rules.md § whole-pack arithmetic,
 * AC-AL6): never negative or non-finite. Whole-pack consumers round a
 * fractional entry UP to whole packs, and an entry beyond availability
 * clamps DOWN to the batch's whole-pack floor; partial-pack consumers keep
 * the exact fraction, bounded to the raw (fractional) availability.
 */
export const clampManualPacks = (
  value: number | null | undefined,
  availablePacks: number,
  options?: { partialPacks?: boolean }
): number => {
  if (value == null || !Number.isFinite(value) || value < 0) return 0;
  // Floored at 0: a server-computed negative availability (over-reserved
  // stock) must not round-trip a negative entry (rules.md § whole-pack
  // arithmetic — a negative quantity is never produced client-side).
  if (options?.partialPacks)
    return Math.max(0, Math.min(value, availablePacks));
  const wholePacks = Math.ceil(value);
  return wholePacks > availablePacks
    ? Math.max(0, Math.floor(availablePacks))
    : wholePacks;
};

/** The structural fields the unit sums read. The available total is not
 * summed here — it is policy (only auto-allocatable stock counts, AC-AL17):
 * policy.ts's autoAllocatableUnits. */
export interface UnitCountableBatch {
  packSize: number;
  availablePacks: number;
  numberOfPacks: number;
}

export const issuedUnits = (batches: readonly UnitCountableBatch[]): number =>
  batches.reduce((sum, line) => sum + line.numberOfPacks * line.packSize, 0);

/** The pack sizes present — the packs-of-‹size› lens options. */
export const distinctPackSizes = (
  batches: readonly { packSize: number }[]
): number[] => [...new Set(batches.map(line => line.packSize))];
