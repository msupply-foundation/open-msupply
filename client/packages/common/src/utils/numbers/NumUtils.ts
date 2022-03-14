export const NumUtils = {
  isPositive: (num: number): boolean => {
    return num > 0;
  },
  parseString(str: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
    const parsed = Number(str);
    if (Number.isNaN(parsed)) return min;

    return Math.min(Math.max(parsed, min), max);
  },
  taxAmount: (subtotal: number, total: number) => {
    return Math.max(total - subtotal, 0);
  },
  effectiveTax: (subtotal: number, total: number) => {
    const taxAmount = NumUtils.taxAmount(subtotal, total);
    return (taxAmount / Math.max(subtotal, 1)) * 100;
  },
};
