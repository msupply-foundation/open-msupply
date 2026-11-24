// Date of birth as a search term (#631 spike): dispensers often know only the
// year a patient was born, or the month and year, so the patient search takes
// any of the three and searches the range of dates it covers.
//
//   "1984"        → 1984-01-01 … 1984-12-31
//   "3/1984"      → 1984-03-01 … 1984-03-31
//   "14/03/1984"  → that day (day/month order from the locale's date format)
//
// Digits only, any separator. Month names aren't read: they'd need every
// language's month names, and a number is what's on an ID card.

export type DobRange = { from: string; to: string; exact: boolean };

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

const plausibleYear = (y: number) => y >= 1880 && y <= 2200;

/**
 * Read a typed date of birth. `undefined` for blank text, `'invalid'` for
 * text that isn't a year, a month and year, or a full date. `format` is the
 * locale's date format (localeDateFormat), used for the day/month order of a
 * full date and whether the year comes first.
 */
export const parseDobSearch = (
  text: string,
  format: string
): DobRange | 'invalid' | undefined => {
  const trimmed = text.trim();
  if (trimmed === '') return undefined;
  const parts = trimmed.split(/\D+/).filter(Boolean);
  if (parts.some(p => p.length > 4)) return 'invalid';
  const nums = parts.map(Number);
  const yearFirst = /^\W*y/i.test(format);

  if (nums.length === 1) {
    const [y] = nums;
    if (parts[0].length !== 4 || !plausibleYear(y)) return 'invalid';
    return { from: iso(y, 1, 1), to: iso(y, 12, 31), exact: false };
  }

  if (nums.length === 2) {
    const [y, m] = yearFirst ? nums : [nums[1], nums[0]];
    const yearPart = yearFirst ? parts[0] : parts[1];
    if (yearPart.length !== 4 || !plausibleYear(y) || m < 1 || m > 12)
      return 'invalid';
    return {
      from: iso(y, m, 1),
      to: iso(y, m, daysInMonth(y, m)),
      exact: false,
    };
  }

  if (nums.length === 3) {
    // The order of d, M and y in the locale's format.
    const order = (format.match(/[dMy]/g) ?? [])
      .filter((c, i, all) => all.indexOf(c) === i)
      .join('');
    const at = (c: string) => order.indexOf(c);
    if (order.length !== 3) return 'invalid';
    const d = nums[at('d')];
    const m = nums[at('M')];
    const y = nums[at('y')];
    if (parts[at('y')].length !== 4 || !plausibleYear(y)) return 'invalid';
    if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return 'invalid';
    const day = iso(y, m, d);
    return { from: day, to: day, exact: true };
  }

  return 'invalid';
};
