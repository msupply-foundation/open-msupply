import { differenceInMonths, isPast, isThisWeek, isToday } from 'date-fns';

export const MINIMUM_EXPIRY_MONTHS = 3;

export const isAlmostExpired = (expiryDate: Date): boolean =>
  differenceInMonths(expiryDate, Date.now()) <= MINIMUM_EXPIRY_MONTHS;

export const isExpired = (expiryDate: Date): boolean => isPast(expiryDate);

export { isThisWeek, isToday };
