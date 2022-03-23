import { useTranslation as useTranslationNext } from 'react-i18next';

export const useFormatDate = (): ((
  value: number | Date,
  options?: Intl.DateTimeFormatOptions & { format?: string } & {
    val: { month?: string; day?: string; year?: string; weekday?: string };
  }
) => string) => {
  const { t } = useTranslationNext('app');
  return (val, formatParams) => t('intl.datetime', { val, formatParams });
};
