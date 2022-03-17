import { useTranslation as useTranslationNext } from 'react-i18next';

export const useFormatNumber = (): ((
  value: number | bigint,
  options?: Intl.NumberFormatOptions
) => string) => {
  const { t } = useTranslationNext('app');
  return (val, formatParams) => t('intl.number', { val, formatParams });
};
