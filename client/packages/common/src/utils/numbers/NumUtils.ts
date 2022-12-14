const constrain = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

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

  /** Number of milliseconds in one second, i.e. SECOND = 1000*/
  SECOND,
  /** Number of milliseconds in one minute */
  MINUTE,
  /** Number of milliseconds in one hour */
  HOUR,
  /** Number of milliseconds in one day */
  DAY,
};
