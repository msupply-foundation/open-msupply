import {
  Representation,
  RepresentationValue,
  NumUtils,
} from '@openmsupply-client/common';

// Convert units to the selected representation (packs, doses, or units)
export const unitsToRepresentation = (
  units: number,
  representation: RepresentationValue,
  defaultPackSize?: number,
  dosesPerUnit?: number
): number => {
  if (representation === Representation.PACKS) {
    return NumUtils.round(units / (defaultPackSize || 1), 2);
  }
  if (representation === Representation.DOSES)
    return units * (dosesPerUnit || 1);
  return Math.ceil(units);
};

// Convert a value in the selected representation back to units
export const representationToUnits = (
  value: number,
  representation: RepresentationValue,
  defaultPackSize?: number,
  dosesPerUnit?: number
): number => {
  if (isNaN(value)) return 0;
  if (representation === Representation.PACKS)
    return value * (defaultPackSize || 0);
  if (representation === Representation.DOSES)
    return Math.ceil(value / (dosesPerUnit || 1));
  return value;
};

// Convert display value to update object with units
interface UpdatedRequest {
  requestedQuantity: number;
  reason?: null;
}

export const getUpdatedRequest = (
  value: number | undefined,
  representation: RepresentationValue,
  defaultPackSize?: number,
  suggestedQuantity?: number,
  dosesPerUnit?: number
): UpdatedRequest => {
  const requestedQuantity = representationToUnits(
    value ?? 0,
    representation,
    defaultPackSize,
    dosesPerUnit
  );

  return suggestedQuantity === requestedQuantity
    ? { requestedQuantity, reason: null }
    : { requestedQuantity };
};
