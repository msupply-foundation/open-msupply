import { TypedTFunction, LocaleKey } from '@common/intl';
import { Formatter } from '@common/utils';
import {
  ImportRow,
  LineNumber,
} from './ImportProperties/PropertiesImportModal';

export const importFacilitiesPropertiesToCsv = (
  facilities: Partial<ImportRow & LineNumber>[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [];
  fields.push(t('label.code'));
  fields.push(t('label.name'));

  const data = facilities.map(node => {
    const mapped: (string | number | null | undefined)[] = [
      node.code,
      node.name,
    ];
    return mapped;
  });
  return Formatter.csv({ fields, data });
};
