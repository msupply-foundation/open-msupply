import { LocaleKey, TypedTFunction } from '@common/intl';
import { AssetFragment } from './api';
import { Formatter } from '@common/utils';

// the reference data is loaded in migrations so the id here is hardcoded
export const CCE_CLASS_ID = 'fad280b6-8384-41af-84cf-c7b6b4526ef0';

export const assetsToCsv = (
  items: AssetFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.code'),
    t('label.name'),
    t('label.created-datetime'),
    t('label.modified-datetime'),
    t('label.installation-date'),
    t('label.replacement-date'),
    t('label.serial'),
  ];

  const data = items.map(node => [
    node.id,
    node.code,
    node.name,
    Formatter.csvDateTimeString(node.createdDatetime),
    Formatter.csvDateTimeString(node.modifiedDatetime),
    Formatter.csvDateString(node.installationDate),
    Formatter.csvDateString(node.replacementDate),
    node.serialNumber,
  ]);
  return Formatter.csv({ fields, data });
};
