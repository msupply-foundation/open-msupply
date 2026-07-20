import { t } from '../../intl';
import type { LocaleKey } from '../../intl';

// AC-U3: a report's display name is the translation of `report-code.<code>`
// when the catalog holds it, otherwise the stored name. The catalog can't
// enumerate every installed report code, so — as translateServerError does for
// server keys — the dynamic key is cast to LocaleKey and compared against
// itself to detect a miss (t() falls back to the key it was given).
//
// Reads t() so it must be called inside a tracking scope (a JSX expression) to
// re-translate on a language switch.
export const reportName = (report: { code: string; name: string }): string => {
  const key = `report-code.${report.code}` as LocaleKey;
  const translated = t(key);
  return translated === key ? report.name : translated;
};
