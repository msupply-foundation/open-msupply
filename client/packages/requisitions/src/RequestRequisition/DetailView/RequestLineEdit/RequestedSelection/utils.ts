import {
  Representation,
  RepresentationValue,
  NumUtils,
} from '@openmsupply-client/common';

// Quantity Calculation
export const calculatePackQuantity = (
  requestedQuantity?: number,
  defaultPackSize?: number
): number => {
  const requested = requestedQuantity ?? 0;
  const defaultSize = defaultPackSize ?? 1;

  if (defaultSize === 0) return 0;

  return NumUtils.round(requested / defaultSize, 2);
};

// Value formatting for requestedQuantity based on Representation
export const getCurrentValue = (
  representation: RepresentationValue,
  requestedQuantity?: number,
  defaultPackSize?: number
): number => {
  if (representation === Representation.PACKS)
    return calculatePackQuantity(requestedQuantity, defaultPackSize);
  return Math.ceil(requestedQuantity ?? 0);
};

// Updated Request Calculation
interface UpdatedRequest {
  requestedQuantity: number;
  reason?: null;
}

export const getUpdatedRequest = (
  value: number | undefined,
  representation: RepresentationValue,
  defaultPackSize?: number,
  suggestedQuantity?: number
): UpdatedRequest => {
  const newValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const requestedQuantity =
    representation === Representation.PACKS
      ? newValue * (defaultPackSize ?? 0)
      : newValue;

  return suggestedQuantity === requestedQuantity
    ? { requestedQuantity, reason: null }
    : { requestedQuantity };
};
