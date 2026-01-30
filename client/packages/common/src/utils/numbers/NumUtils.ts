const constrain = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// Treat floating point rounding noise as zero, so values like `4.40000000000006`
// don't incorrectly display as having extra decimals.
const isNearlyInteger = (value: number): boolean => {
  if (!Number.isFinite(value)) return false;

  const rounded = Math.round(value);
  const delta = Math.abs(value - rounded);
  const tolerance = Math.max(1e-8, Number.EPSILON * Math.abs(value) * 10);
  return delta < tolerance;
};

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
  /**
   * Round a value to a given precision.
   *
   * For example, round(10.232, 2) gives 10.23
   */
  round: (value: number, dp = 0): number => {
    if (dp === Infinity) return value;
    const multiplier = 10 ** dp;
    return Math.round(value * multiplier) / multiplier;
  },
  /**
   * Checks if precision is greater than 2. Some numbers have floating precision
   * errors e.g. 2.05 * 100 = 204.99999999999997 so using 1000 for a more reliable result...
   */
  hasMoreThanTwoDp: (value: number): boolean => {
    return NumUtils.hasMoreThanDp(value, 2);
  },
  /**
   * Checks if precision is greater than provided dp.
   */
  hasMoreThanDp: (value: number, dp: number): boolean => {
    if (dp === Infinity) return false;
    if (!Number.isFinite(value)) return false;

    const multiplier = 10 ** dp;
    // For very large values, `value * multiplier` can lose the fractional part due to IEEE-754
    // precision limits (e.g. `1e15 + 0.12` becomes `1e15 + 0.125`). Only inspect the fraction.
    const abs = Math.abs(value);
    const fraction = abs - Math.trunc(abs);
    return !isNearlyInteger(fraction * multiplier);
  },
  /**
   * This constant should be used for values that are potentially send to a backend API that expects
   * an unsigned 32 bit integer and thus would reject Number.MAX_SAFE_INTEGER.
   * For example, JS number max size is `2^53 - 1` while the Rust u32 size is `2^32 - 1`.
   */
  MAX_SAFE_API_INTEGER: 999999999,
};
