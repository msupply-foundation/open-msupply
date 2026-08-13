// The Issue field's mirror of a manual per-batch edit (AC-AL16,
// OMS-REG-DIST-03.40): the grid's new requested total — issued units +
// placeholder, the same total the field seeds with (D61) — re-expressed in
// the current allocate-in lens. Display-only by construction: the caller
// writes the returned value into the field without distributing.
import { unitsToLens, type AllocateUnit } from '../../../../domain/allocation';

export const mirroredIssueValue = (
  issuedUnits: number,
  placeholderUnits: number,
  lens: AllocateUnit
): number =>
  // 2 dp display rounding, as the lens switch applies — a units total that
  // isn't whole packs of the lens size would otherwise carry repeating
  // decimals into the field.
  Math.round(unitsToLens(issuedUnits + placeholderUnits, lens) * 100) / 100;
