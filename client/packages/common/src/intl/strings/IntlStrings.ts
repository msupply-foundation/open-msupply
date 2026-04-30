import { TOptions } from 'i18next';
import { useTranslation as useTranslationNext } from 'react-i18next';
import { LocaleKey } from '../locales';

export { UseTranslationResponse } from 'react-i18next';

export interface TypedTFunction<Keys> {
  // basic usage
  (key: Keys, options?: TOptions<Record<string, unknown>> | string): string;
}

export const useTranslation = (): TypedTFunction<LocaleKey> => {
  const { t } = useTranslationNext();
  return t as TypedTFunction<LocaleKey>;
};

export const useTranslationAdvanced = useTranslationNext;
