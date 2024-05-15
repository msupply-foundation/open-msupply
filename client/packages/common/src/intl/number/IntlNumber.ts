import { RegexUtils } from '../../utils/regex';
import { useCurrency } from '../currency';
import { MAX_FRACTION_DIGITS, SupportedLocales, useIntlUtils } from '../utils';

export const useFormatNumber = () => {
  const { currentLanguage } = useIntlUtils();
  const {
    options: { decimal },
  } = useCurrency();

  return {
    format: (
      value: number | undefined,
      options?: Intl.NumberFormatOptions & { locale?: SupportedLocales }
    ) => {
      if (value === undefined || value === null) return '';
      const locale = options?.locale ?? currentLanguage;
      return new Intl.NumberFormat(locale, {
        maximumFractionDigits: MAX_FRACTION_DIGITS,
        ...options,
      }).format(value);
    },
    round: (value?: number, dp?: number): string => {
      const intl = new Intl.NumberFormat(currentLanguage, {
        // not strictly necessary perhaps - but if you specify a minimumFractionDigits
        // outside of the range 0,20 then an error is thrown
        maximumFractionDigits: Math.max(
          0,
          Math.min(dp ?? 0, MAX_FRACTION_DIGITS)
        ),
      });
      return intl.format(value ?? 0);
    },
    parse: (numberString: string, decimalChar: string = decimal) => {
      const negative = numberString.startsWith('-') ? -1 : 1;
      const separatorRegex = new RegExp(
        `[${RegexUtils.escapeChars(decimalChar)}](\\d+)$`
      );

      const num = numberString
        // Convert separator to standard decimal point
        .replace(separatorRegex, '.$1')
        // Remove all other characters
        .replace(/[^\d\.]/g, '');

      if (num === '') return NaN;

      return Number(num) * negative;
    },
  };
};
