import {
  isValid,
  differenceInMonths,
  isPast,
  isThisWeek,
  isToday,
  isThisMonth,
  isAfter,
  isBefore,
  isEqual,
} from 'date-fns';

export const MINIMUM_EXPIRY_MONTHS = 3;

export const DateUtils = {
  getDateOrNull: (date: string | null): Date | null => {
    if (!date) return null;
    const maybeDate = new Date(date);
    return isValid(maybeDate) ? maybeDate : null;
  },
  isExpired: (expiryDate: Date): boolean => isPast(expiryDate),
  isAlmostExpired: (
    expiryDate: Date,
    threshold = MINIMUM_EXPIRY_MONTHS
  ): boolean => differenceInMonths(expiryDate, Date.now()) <= threshold,
  isThisWeek,
  isToday,
  isThisMonth,
  isAfter,
  isBefore,
  isEqual,
};
