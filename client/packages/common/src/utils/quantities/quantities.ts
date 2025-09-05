import { NumUtils } from '../numbers';

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
};
