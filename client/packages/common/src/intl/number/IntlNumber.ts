import { RegexUtils } from '../../utils/regex';
import { useCurrency } from '../currency';
import { SupportedLocales, useIntlUtils } from '../utils';

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
      if (value === undefined) return '';
      const locale = options?.locale ?? currentLanguage;
      return new Intl.NumberFormat(locale, {
        maximumFractionDigits: 20, // maximum allowed
        ...options,
      }).format(value);
    },
    round: (value?: number, dp?: number): string => {
      const intl = new Intl.NumberFormat(currentLanguage, {
        maximumFractionDigits: dp ?? 0,
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
