import { useCurrency } from '../currency';
import { useIntlUtils } from '../utils';

export const useFormatNumber = () => {
  const { currentLanguage } = useIntlUtils();
  const {
    options: { decimal },
  } = useCurrency();

  return {
    format: (
      value: number,
      options?: Intl.NumberFormatOptions & { locale?: string }
    ) => {
      const locale = options?.locale ?? currentLanguage;
      return new Intl.NumberFormat(locale, options).format(value);
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
        `[${decimalChar === '.' ? '\\.' : decimalChar}](\\d+)$`
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
