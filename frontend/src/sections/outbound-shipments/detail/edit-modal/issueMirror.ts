// The Issue field's mirror of a manual per-batch edit (AC-AL16,
// OMS-REG-DIST-03.40): the grid's new requested total — issued units +
// placeholder, the same total the field seeds with (D61) — re-expressed in
// the current allocate-in lens. Display-only by construction: the caller
// writes the returned value into the field without distributing.
import { unitsToLens, type AllocateUnit } from '../../../../domain/allocation';

// A units quantity re-expressed in the lens at 2 dp — the Issue field's
// display rounding, shared by the mirror below and the modal's lens switch. A
// units total that isn't whole packs of the lens size would otherwise carry
// repeating decimals into the field.
export const roundedLensValue = (units: number, lens: AllocateUnit): number =>
  Math.round(unitsToLens(units, lens) * 100) / 100;

export const mirroredIssueValue = (
  issuedUnits: number,
  placeholderUnits: number,
  lens: AllocateUnit
): number => roundedLensValue(issuedUnits + placeholderUnits, lens);
