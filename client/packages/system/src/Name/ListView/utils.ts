import { TypedTFunction, LocaleKey } from '@common/intl';
import { Formatter } from '@common/utils';
import {
  ImportRow,
  LineNumber,
} from './ImportProperties/PropertiesImportModal';

export const exportFacilitiesPropertiesToCsv = (
  facilities: Partial<ImportRow & LineNumber>[],
  t: TypedTFunction<LocaleKey>,
  properties: string[]
) => {
  const props = properties;
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
