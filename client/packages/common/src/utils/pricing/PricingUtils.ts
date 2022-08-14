const ROUNDING_PRECISION = Math.pow(10, 12);

export const PricingUtils = {
  taxAmount: (subtotal: number, total: number) => {
    return Math.max(total - subtotal, 0);
  },
  effectiveTax: (subtotal: number, total: number) => {
    const taxAmount = PricingUtils.taxAmount(subtotal, total);
    const x =
      Math.round(
        (taxAmount / Math.max(subtotal, 1)) * 100 * ROUNDING_PRECISION
      ) / ROUNDING_PRECISION;
    return x;
  },
};
