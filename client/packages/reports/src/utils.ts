import { LocaleKey, useTranslation } from '@common/intl';

export const translateReportName = (
  t: ReturnType<typeof useTranslation>,
  reportName: String
) => {
  let key = `report.${reportName.replace(/ /g, '-').toLowerCase()}` as LocaleKey
  return (key == t(key)) ? reportName.toString() : t(key);
};
