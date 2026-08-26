import { t } from '../../intl';
import type { LocaleKey } from '../../intl';

// The user-facing label for a report — its translated `report-code.<code>`
// catalog entry, falling back to the server-supplied name when we haven't
// labelled that code (a custom report, or a future addition). Mirrors OMS's
// `t(\`report-code.${code}\`, name)` and this app's humanisePermission: t()
// returns the key on a miss, so an unchanged return means "no catalog label" →
// use the name. The cast is the one place we build this LocaleKey dynamically;
// unknown codes are handled by the fallback, so a raw `report-code.*` key can't
// reach the user.
export const reportLabel = (report: {
  code: string;
  name: string;
}): string => {
  const key = `report-code.${report.code}` as LocaleKey;
  const label = t(key);
  return label === key ? report.name : label;
};
