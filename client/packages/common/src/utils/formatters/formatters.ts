import format from 'date-fns/format';
import isValid from 'date-fns/isValid';

export const Formatter = {
  // tax as a number like 12 for 12%
  // TODO: Do something better than naively rounding to 2 decimal places
  tax: (tax: number, withParens = true) =>
    `${withParens ? '(' : ''}${(tax ?? 0).toFixed(2)}%${withParens ? ')' : ''}`,
  date: (date: Date): string =>
    `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`,
  naiveDate: (date?: Date | null): string | null => {
    if (date && isValid(date)) return format(date, 'yyyy-MM-dd');
    else return null;
  },
  naiveDateTime: (date?: Date | null): string | null => {
    if (date && isValid(date)) return format(date, "yyyy-MM-dd'T'HH:mm:ss");
    else return null;
  },
  expiryDate: (date?: Date | null): string | null => {
    if (date && isValid(date)) return format(date, 'MM/yyyy');
    else return null;
  },
  expiryDateString: (date?: string | null | undefined): string => {
    const expiryDate = date ? Formatter.expiryDate(new Date(date)) : null;
    return expiryDate ?? '';
  },
};
