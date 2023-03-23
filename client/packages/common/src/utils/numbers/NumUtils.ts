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
  /**
   * This constant should be used for values that are potentially send to a backend API that expects
   * an unsigned 32 bit integer and thus would reject Number.MAX_SAFE_INTEGER.
   * For example, JS number max size is `2^53 - 1` while the Rust u32 size is `2^32 - 1`.
   */
  MAX_SAFE_API_INTEGER: 999999999,

  round: (value: number, dp = 0): number => {
    const multiplier = 10 ** dp;
    return Math.round(value * multiplier) / multiplier;
  },
};
