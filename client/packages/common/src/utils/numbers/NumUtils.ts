const constrain = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const NumUtils = {
  constrain,
  isPositive: (num: number): boolean => {
    return num > 0;
  },
  /**
   * Parses a string into a number, constraining it to the given min and max values.
   *
   * With the default `min` and `max` parameters this method will return a number >= 0.
   *
   * If the input `str` can't be parsed the min value is returned.
   */
  parseString(str: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
    const parsed = Number(str);
    if (Number.isNaN(parsed)) return min;

    return constrain(parsed, min, max);
  },
  round: (value: number, dp = 0): number => {
    if (dp === Infinity) return value;
    const multiplier = 10 ** dp;
    return Math.round(value * multiplier) / multiplier;
  },
  /**
   * This constant should be used for values that are potentially send to a backend API that expects
   * an unsigned 32 bit integer and thus would reject Number.MAX_SAFE_INTEGER.
   * For example, JS number max size is `2^53 - 1` while the Rust u32 size is `2^32 - 1`.
   */
  MAX_SAFE_API_INTEGER: 999999999,
};
