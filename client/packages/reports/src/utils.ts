import { LocaleKey, useTranslation } from '@common/intl';

export const translateReportName = (
  t: ReturnType<typeof useTranslation>,
  reportName: string
) => {
  let key = `report.${reportName.replace(/ /g, '-').toLowerCase()}` as LocaleKey
  return (key == t(key)) ? reportName : t(key);
};
