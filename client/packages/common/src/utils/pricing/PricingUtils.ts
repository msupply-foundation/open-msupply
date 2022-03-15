export const PricingUtils = {
  taxAmount: (subtotal: number, total: number) => {
    return Math.max(total - subtotal, 0);
  },
  effectiveTax: (subtotal: number, total: number) => {
    const taxAmount = PricingUtils.taxAmount(subtotal, total);
    return (taxAmount / Math.max(subtotal, 1)) * 100;
  },
};
