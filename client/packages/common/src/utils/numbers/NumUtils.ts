export const NumUtils = {
  isPositive: (num: number): boolean => {
    return num > 0;
  },
  parseString(str: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
    const parsed = Number(str);
    if (Number.isNaN(parsed)) return min;

    return Math.min(Math.max(parsed, min), max);
  },
  parseStringAsInt(
    str: string,
    min = 0,
    max = Number.MAX_SAFE_INTEGER
  ): number {
    const parsed = Number(str);
    if (Number.isNaN(parsed)) return min;
    const rounded = Math.round(parsed);

    return Math.min(Math.max(rounded, min), max);
  },
};
