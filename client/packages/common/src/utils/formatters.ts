import format from 'date-fns/format';
import isValid from 'date-fns/isValid';

// tax as a number like 0.12 for 12%
// TODO: Do something better than naively rounding to 2 decimal places
export const formatTax = (tax: number, withParens = true) =>
  `${withParens ? '(' : ''}${((tax ?? 0) * 100).toFixed(2)}%${
    withParens ? ')' : ''
  }`;

export const formatDate = (date: Date): string =>
  `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

export const formatNaiveDate = (date?: Date | null): string | null => {
  if (date && isValid(date)) return format(date, 'yyyy-MM-dd');
  else return null;
};

export const formatNaiveDateTime = (date?: Date | null): string | null => {
  if (date && isValid(date)) return format(date, "yyyy-MM-dd'T'HH:mm:ss");
  else return null;
};

export const formatExpiryDate = (date?: Date | null): string | null => {
  if (date && isValid(date)) return format(date, 'MM/yyyy');
  else return null;
};

// Date needs to be in the format yyyy-MM-dd
export const formatExpiryDateString = (
  date?: string | null | undefined
): string => {
  const expiryDate = date ? formatExpiryDate(new Date(date)) : null;
  return expiryDate ?? '';
};

export class RouteBuilder {
  parts: string[];

  constructor(part: string) {
    this.parts = [part];
  }

  static create(part: string): RouteBuilder {
    return new RouteBuilder(part);
  }

  addPart(part: string): RouteBuilder {
    this.parts.push(part);
    return this;
  }

  addWildCard(): RouteBuilder {
    this.parts.push('*');
    return this;
  }

  build(): string {
    return `/${this.parts.join('/')}`;
  }
}
