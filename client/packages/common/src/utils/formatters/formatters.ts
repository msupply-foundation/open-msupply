import { LocaleKey } from '@common/intl';
import format from 'date-fns/format';
import isValid from 'date-fns/isValid';
import Papa, { UnparseConfig, UnparseObject } from 'papaparse';

export const Formatter = {
  // tax as a number like 12 for 12%
  // TODO: Do something better than naively rounding to 2 decimal places
  tax: (tax: number, withParens = true) =>
    `${withParens ? '(' : ''}${(tax ?? 0).toFixed(2)}%${withParens ? ')' : ''}`,
  naiveDate: (date?: Date | null): string | null => {
    if (date && isValid(date)) return format(date, 'yyyy-MM-dd');
    else return null;
  },
  toIsoString: (date?: Date | null): string | null => {
    if (date && isValid(date)) return date.toISOString();
    else return null;
  },
  dateTime: (date?: Date | null): string =>
    date && isValid(date)
      ? format(date, "dd/MM/yyyy' 'HH:mm:ss")
      : '--/--/---- --:--:--',
  expiryDate: (date?: Date | null): string | null => {
    if (date && isValid(date)) return format(date, 'MM/yyyy');
    else return null;
  },
  expiryDateString: (date?: string | null | undefined): string => {
    const expiryDate = date ? Formatter.expiryDate(new Date(date)) : null;
    return expiryDate ?? '';
  },
  csv: (
    data: unknown[] | UnparseObject<unknown>,
    config?: UnparseConfig
  ): string => Papa.unparse(data, config),
  csvDateTimeString: (dateString?: string | null | undefined): string => {
    const date = dateString ? new Date(dateString) : null;
    return date && isValid(date) ? format(date, "dd/MM/yyyy' 'HH:mm:ss") : '';
  },
  csvDateString: (dateString?: string | null | undefined): string => {
    const date = dateString ? new Date(dateString) : null;
    return date && isValid(date) ? format(date, 'dd/MM/yyyy') : '';
  },
  milliseconds: (milliseconds: number): string => {
    const minute = Math.floor((milliseconds % 3600000) / 60000);
    const second = Math.floor(((milliseconds % 360000) % 60000) / 1000);
    return `${minute}:${second}`;
  },
  sentenceCase: (str: string): string =>
    str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' '),
  enumCase: (str: string): string =>
    str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' '),
  logTypeTranslation: (logType: string): LocaleKey =>
    `log.${logType.toLowerCase().replace(/_/g, '-')}` as LocaleKey,
  fromCamelCase: (str: string): string => {
    const _str = str
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim();
    return _str.substring(0, 1).toUpperCase() + _str.substring(1);
  },
};
