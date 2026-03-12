import {
  Representation,
  RepresentationValue,
  NumUtils,
} from '@openmsupply-client/common';

// Calculate stored units to selected representation for display
export const unitsToRepresentation = (
  units: number,
  representation: RepresentationValue,
  defaultPackSize?: number,
  dosesPerUnit?: number
): number => {
  if (representation === Representation.PACKS) {
    const defaultSize = defaultPackSize ?? 1;
    if (defaultSize === 0) return 0;
    return NumUtils.round(units / defaultSize, 2);
  }
  if (representation === Representation.DOSES)
    return units * (dosesPerUnit || 1);
  return units;
};

// Calculate input value in selected representation to units for saving
export const representationToUnits = (
  value: number,
  representation: RepresentationValue,
  defaultPackSize?: number,
  dosesPerUnit?: number
): number => {
  if (representation === Representation.PACKS)
    return value * (defaultPackSize ?? 0);
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
  const newValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const requestedQuantity = representationToUnits(
    newValue,
    representation,
    defaultPackSize,
    dosesPerUnit
  );

  return suggestedQuantity === requestedQuantity
    ? { requestedQuantity, reason: null }
    : { requestedQuantity };
};
