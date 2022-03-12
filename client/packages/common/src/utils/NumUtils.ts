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
    const tax = NumUtils.taxAmount(subtotal, total);
    if (!tax) return tax;
    return tax / Math.min(subtotal, 1);
  },
};
