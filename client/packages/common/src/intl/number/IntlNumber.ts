import { useIntlUtils } from '../utils';

export const useFormatNumber = () => {
  const { currentLanguage } = useIntlUtils();

  return {
    format: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(currentLanguage, options).format(value),
    round: (value?: number, dp?: number): string => {
      const intl = new Intl.NumberFormat(currentLanguage, {
        maximumFractionDigits: dp ?? 0,
      });
      return intl.format(value ?? 0);
    },
  };
};
