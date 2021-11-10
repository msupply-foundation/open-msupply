import {
  isValid,
  differenceInMonths,
  isPast,
  isThisWeek,
  isToday,
} from 'date-fns';

export const MINIMUM_EXPIRY_MONTHS = 3;

export const isAlmostExpired = (expiryDate: Date): boolean =>
  differenceInMonths(expiryDate, Date.now()) <= MINIMUM_EXPIRY_MONTHS;

export const isExpired = (expiryDate: Date): boolean => isPast(expiryDate);

export const getDateOrNull = (date: string): Date | null => {
  const maybeDate = new Date(date);
  return isValid(maybeDate) ? maybeDate : null;
};

export { isThisWeek, isToday };
