import { useMemo } from 'react';
import { NumUtils } from '../numbers';

export const Representation = {
  PACKS: 'packs',
  UNITS: 'units',
} as const;

export type RepresentationValue =
  (typeof Representation)[keyof typeof Representation];

export const QuantityUtils = {
  suggestedQuantity: (amc: number, soh: number, mos: number) => {
    // If there is no consumption, don't suggest any
    if (!NumUtils.isPositive(amc)) return 0;
    // If there is no months of stock to order to, don't suggest stock to be ordered
    if (!NumUtils.isPositive(mos)) return 0;

    // Total amount to potentially order
    const total = amc * mos;

    // Subtract the available stock on hand
    // always round up when ordering, otherwise we could under-order by a fraction
    const suggested = Math.ceil(total - Math.max(soh, 0));

    return Math.max(suggested, 0);
  },

  /** Converts a number of packs to dose quantity */
  packsToDoses: (
    numPacks: number,
    line: { packSize: number; dosesPerUnit: number | undefined }
  ) => {
    return NumUtils.round(numPacks * line.packSize * (line.dosesPerUnit || 1));
  },

  /** Converts a dose quantity to number of packs */
  dosesToPacks: (
    doses: number,
    line: { packSize: number; dosesPerUnit?: number }
  ) => {
    return doses / line.packSize / (line.dosesPerUnit || 1);
  },

  calculateValueInUnitsOrPacks: (
    representation: RepresentationValue,
    defaultPackSize: number,
    value?: number | null
  ): number => {
    if (!value) return 0;
    return representation === Representation.PACKS
      ? value / defaultPackSize
      : value;
  },

  useValueInUnitsOrPacks: (
    // check usage
    representation: RepresentationValue,
    defaultPackSize: number,
    value?: number | null
  ): number =>
    useMemo(
      () =>
        QuantityUtils.calculateValueInUnitsOrPacks(
          representation,
          defaultPackSize,
          value
        ),
      [representation, defaultPackSize, value]
    ),

  /**
   * Calculates the value in doses.
   * Does NOT round or format the result.
   * Rounding/formatting to 0 decimal places should be done in the component with useFormatNumber().
   */
  calculateValueInDoses: (
    representation: RepresentationValue,
    defaultPackSize: number,
    dosesPerUnit: number,
    value?: number | null
  ): number => {
    if (!value) return 0;
    if (representation === Representation.PACKS) {
      return value * defaultPackSize * dosesPerUnit;
    }
    return value * dosesPerUnit;
  },

  useValueInDoses: (
    displayVaccinesInDoses: boolean,
    representation: RepresentationValue,
    defaultPackSize: number,
    dosesPerUnit: number,
    value?: number | null
  ): number | undefined =>
    useMemo(
      () =>
        displayVaccinesInDoses
          ? QuantityUtils.calculateValueInDoses(
              representation,
              defaultPackSize || 1,
              dosesPerUnit,
              value
            )
          : undefined,
      [
        displayVaccinesInDoses,
        representation,
        defaultPackSize,
        dosesPerUnit,
        value,
      ]
    ),
};
