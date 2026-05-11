import {
  Representation,
  RepresentationValue,
  NumUtils,
} from '@openmsupply-client/common';

// Quantity Calculation
export const calculatePackQuantity = (
  supplyQuantity?: number,
  defaultPackSize?: number
): number => {
  const supply = supplyQuantity ?? 0;
  const defaultSize = defaultPackSize ?? 1;

  if (defaultSize === 0) return 0;

  return NumUtils.round(supply / defaultSize, 2);
};

// Value formatting for supplyQuantity based on Representation
export const getCurrentValue = (
  representation: RepresentationValue,
  supplyQuantity?: number,
  defaultPackSize?: number
): number => {
  if (representation === Representation.PACKS)
    return calculatePackQuantity(supplyQuantity, defaultPackSize);
  return Math.ceil(supplyQuantity ?? 0);
};

export const getUpdatedSupply = (
  value: number | undefined,
  representation: RepresentationValue,
  defaultPackSize?: number
) => {
  const newValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const supplyQuantity =
    representation === Representation.PACKS
      ? newValue * (defaultPackSize ?? 1)
      : newValue;

  return {
    supplyQuantity,
  };
};
