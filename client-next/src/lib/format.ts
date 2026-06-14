import { format } from 'date-fns';

/** dd/MM/yyyy, or '' for null/empty — matches the stock list date format. */
export const formatDate = (value: string | null | undefined): string =>
  value ? format(new Date(value), 'dd/MM/yyyy') : '';

/** Thousands-separated amount with 2 decimals (e.g. 1,234.50). */
export const formatCurrency = (value: number | null | undefined): string =>
  value == null
    ? ''
    : value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
