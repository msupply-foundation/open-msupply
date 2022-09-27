import { IntlUtils } from '../utils';

export const useFormatNumber = () => {
  const language = IntlUtils.useCurrentLanguage();

  return {
    format: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(language, options).format(value),
    round: (value?: number, dp?: number): string => {
      const intl = new Intl.NumberFormat(language, {
        maximumFractionDigits: dp ?? 0,
      });
      return intl.format(value ?? 0);
    },
  };
};
