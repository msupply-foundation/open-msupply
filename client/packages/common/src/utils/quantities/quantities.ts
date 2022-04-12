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
    const suggested = Math.round(total - Math.max(soh, 0));

    return Math.max(suggested, 0);
  },
};
