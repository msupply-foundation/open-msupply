import { RegexUtils } from '../../utils/regex';
import { useCurrency } from '../currency';
import { MAX_FRACTION_DIGITS, SupportedLocales, useIntlUtils } from '../utils';

const localeNumberOverrides: { [locale: string]: /* Override */ string } = {
  tet: 'en-US',
};

// This method needs to be used instead of Intl.NumberFormat directly
export const intlNumberFormat = (
  locale: string,
  params?: Intl.NumberFormatOptions
) => {
  return new Intl.NumberFormat(localeNumberOverrides[locale] ?? locale, params);
};

export const useFormatNumber = () => {
  const { currentLanguage } = useIntlUtils();
  const {
    options: { separator, decimal },
  } = useCurrency();

  return {
    format: (
      value: number | undefined,
      options?: Intl.NumberFormatOptions & { locale?: SupportedLocales }
    ) => {
      if (value === undefined || value === null) return '';
      const locale = options?.locale ?? currentLanguage;

      const {
        maximumFractionDigits = MAX_FRACTION_DIGITS,
        minimumFractionDigits,
        ...otherOptions
      } = options ?? {};

      return intlNumberFormat(locale, {
        ...otherOptions,
        minimumFractionDigits,
        maximumFractionDigits:
          // If the maximumFractionDigits is less than the
          // minimumFractionDigits, the browser throws an error, so we need
          // raise the maximum to match.
          minimumFractionDigits !== undefined &&
          maximumFractionDigits < minimumFractionDigits
            ? minimumFractionDigits
            : (maximumFractionDigits ?? MAX_FRACTION_DIGITS),
      }).format(value);
    },
    round: (value?: number, dp?: number): string => {
      if (value === undefined || value === null || typeof value !== 'number')
        return '';

      const newVal = dp !== undefined ? parseFloat(value.toFixed(dp)) : value;
      const intl = intlNumberFormat(currentLanguage, {
        // not strictly necessary perhaps - but if you specify a minimumFractionDigits
        // outside of the range 0,20 then an error is thrown
        maximumFractionDigits: Math.max(
          0,
          Math.min(dp ?? 0, MAX_FRACTION_DIGITS)
        ),
      });
      return intl.format(newVal ?? 0);
    },
    roundUpToWholeNumber: (value?: number): string => {
      if (value === undefined || value === null || typeof value !== 'number')
        return '';

      const newVal = Math.ceil(value);
      const intl = intlNumberFormat(currentLanguage, {
        maximumFractionDigits: 0,
      });
      return intl.format(newVal ?? 0);
    },
    parse: (numberString: string, decimalChar: string = decimal) => {
      const negative = numberString.startsWith('-') ? -1 : 1;

      const num = numberString
        // Remove separators
        .replace(new RegExp(`\\${separator}`, 'g'), '')
        // Convert decimal separator to standard decimal point
        .replace(RegexUtils.escapeChars(decimalChar), '.')
        // Remove all other characters
        .replace(/[^\d\.]/g, '');

      if (num === '') return NaN;

      return Number(num) * negative;
    },
  };
};
