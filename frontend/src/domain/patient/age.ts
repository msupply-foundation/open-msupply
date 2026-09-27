import { getDisplayAge } from '../../intl';
import { isoDateToDate } from '../../ui/elements/inputs/dateTimeConvert';

// A patient's age and date of birth (spec/patients rules › age), shared by
// the plain-path patient form and the document-path patient fields.

// Age in COMPLETED CALENDAR YEARS derived from date of birth (AC-M3). Undefined
// when there is no (or a future) dob.
//
// Compares CALENDAR FIELDS, not instants: subtract the years, then take one
// back if this year's birthday hasn't come round yet. Elapsed-time arithmetic
// gets this wrong twice over — floor(days / 365) overcounts once leap days
// accumulate (a 1 January dob three years back reads a year high late in
// December), and even a real `differenceInYears` measures instants, so a zone
// that has CHANGED offset since the birth year (Asia/Kathmandu moved +05:30 →
// +05:45 in 1986) comes up 15 minutes short of the birthday and reads a year
// low. Integer comparison on local y/m/d has neither failure mode.
export const ageFromDob = (dob: string | null): number | undefined => {
  if (!dob) return undefined;
  const birth = isoDateToDate(dob);
  if (!birth) return undefined;
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  const age = beforeBirthday ? years - 1 : years;
  return age < 0 ? undefined : age;
};

/**
 * The form's age readout for a date of birth under a year old — months and days
 * ("5 months, 18 days", days alone under a month), the same string the summary
 * header shows (spec/patients rules › age). Whole years cannot express an
 * infant's age: `ageFromDob` completes no year and reads a bare `0`.
 *
 * Undefined at a year and over, and for a missing or future date of birth —
 * those are the years entry box's business.
 */
export const ageMonthsAndDays = (dob: string | null): string | undefined => {
  const years = ageFromDob(dob);
  if (!dob || years === undefined || years >= 1) return undefined;
  return getDisplayAge(dob) || undefined;
};

/**
 * The inverse: an age entered IN PLACE of a date of birth back-fills the START
 * OF THAT YEAR (spec/patients rules › age) — i.e. the birth year is exact and
 * the day within it is not, which is what makes the resulting date "estimated".
 * The estimated-ness is a property of the value, not a stored flag: the plain
 * path has nowhere to put one (the wire input carries no such field) and the
 * spec keeps it out of the saved record.
 *
 * Round-trips through ageFromDob exactly, in every timezone: the birthday is
 * 1 January, so by any later day of the current local year that many calendar
 * years are complete.
 */
export const dobFromAge = (age: number): string =>
  `${new Date().getFullYear() - age}-01-01`;
