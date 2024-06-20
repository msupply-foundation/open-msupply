import { TypedTFunction, LocaleKey } from '@common/intl';
import { ArrayUtils, Formatter } from '@common/utils';
import {
  ImportRow,
  LineNumber,
} from './ImportProperties/PropertiesImportModal';

export const importFacilitiesPropertiesToCsv = (
  facilities: Partial<ImportRow & LineNumber>[],
  t: TypedTFunction<LocaleKey>,
  properties?: string[]
) => {
  // TODO maybe don't need the facilities[0] fallback.
  const props =
    properties ??
    ArrayUtils.dedupe(Object.keys(facilities[0]?.properties ?? {}));
  const fields: string[] = [t('label.code'), t('label.name')].concat(props);

  const data = facilities.map(node => {
    const mapped: (string | number | null | undefined)[] = [
      node.code,
      node.name,
    ].concat(props.map(key => node.properties?.[key] ?? ''));
    return mapped;
  });
  return Formatter.csv({ fields, data });
};
