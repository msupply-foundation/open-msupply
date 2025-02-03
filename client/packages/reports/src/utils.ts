import { LocaleKey, useTranslation } from '@common/intl';

export const translateReportName = (
  t: ReturnType<typeof useTranslation>,
  reportName: string
) => {
  return t(`report.${reportName.replace(' ', '-').toLowerCase()}` as LocaleKey);
};
