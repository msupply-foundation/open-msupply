import { NumUtils } from '@common/utils';

export type ItemType = 'packs' | 'units';

// Quantity Calculation
export const calculatePackQuantity = (
  precision: number,
  requestedQuantity?: number,
  defaultPackSize?: number
): number => {
  return NumUtils.round(
    (requestedQuantity ?? 0) / (defaultPackSize ?? 1),
    precision
  );
};

// Quantity conversion based on ItemType
export const getQuantity = (
  itemType: ItemType,
  requestedQuantity?: number,
  defaultPackSize?: number
): number => {
  if (itemType === 'packs') return Math.ceil(requestedQuantity ?? 0);
  return calculatePackQuantity(2, requestedQuantity, defaultPackSize);
};

// Value formatting for requestedQuantity based on ItemType
export const getCurrentValue = (
  itemType: ItemType,
  requestedQuantity?: number,
  defaultPackSize?: number
): number => {
  if (itemType === 'packs')
    return calculatePackQuantity(2, requestedQuantity, defaultPackSize);
  return Math.ceil(requestedQuantity ?? 0);
};

// Updated Request Calculation
interface UpdatedRequest {
  requestedQuantity: number;
  reason?: null;
}

export const getUpdatedRequest = (
  value: number | undefined,
  itemType: ItemType,
  defaultPackSize?: number,
  suggestedQuantity?: number
): UpdatedRequest => {
  const newValue = isNaN(Number(value)) ? 0 : (value ?? 0);
  const requestedQuantity =
    itemType === 'packs' ? newValue * (defaultPackSize ?? 0) : newValue;

  return suggestedQuantity === requestedQuantity
    ? { requestedQuantity, reason: null }
    : { requestedQuantity };
};
