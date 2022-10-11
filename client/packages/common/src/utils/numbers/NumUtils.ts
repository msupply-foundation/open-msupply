const constrain = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const NumUtils = {
  constrain,
  isPositive: (num: number): boolean => {
    return num > 0;
  },
  parseString(str: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
    const parsed = Number(str);
    if (Number.isNaN(parsed)) return min;

    return constrain(parsed, min, max);
  },
};
