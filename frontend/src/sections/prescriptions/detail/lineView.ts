import { round9 } from '@/domain/allocation';

/**
 * What the read-only line view reads off a prescription's already-loaded
 * lines (spec/prescriptions/ui-surface.md S4 § read-only face,
 * OMS-REG-DIS-03.73). Pure and structural: the view needs no fetch of its
 * own — the detail read already carries every field it shows.
 */
export interface ViewableLine {
  type: string;
  packSize: number;
  numberOfPacks: number;
  prescribedQuantity: number | null;
  note: string | null;
}

/**
 * The units this item was dispensed with — summed over its lines, one per
 * batch. Rounded like every other pack×size sum (fractional packs are normal
 * here — rules § stock effects).
 */
export const issuedUnitsOf = (lines: readonly ViewableLine[]): number =>
  round9(
    lines.reduce((sum, line) => sum + line.numberOfPacks * line.packSize, 0)
  );

/**
 * The prescribed quantity as recorded. It is set-saved across the item's
 * lines, and may sit on a carrier line that never renders as a row
 * (rules § prescribed quantity) — so read it from ANY of the item's lines,
 * not just the ones the batch table shows.
 */
export const recordedPrescribedQuantity = (
  lines: readonly ViewableLine[]
): number | undefined =>
  lines.find(line => line.prescribedQuantity != null)?.prescribedQuantity ??
  undefined;

/** The directions as saved — same set-save/carrier reasoning as above. */
export const recordedDirections = (
  lines: readonly ViewableLine[]
): string | undefined =>
  lines.find(line => (line.note ?? '') !== '')?.note ?? undefined;
