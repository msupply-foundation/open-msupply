import { LocaleKey, TypedTFunction } from '@common/intl';
import { AssetFragment } from './api';
import { Formatter } from '@common/utils';

export const assetCategoryListItemsToCsv = (
  items: AssetFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.code'),
    t('label.created-datetime'),
    t('label.modified-datetime'),
    t('label.replacement-date'),
    t('label.serial'),
  ];

  const data = items.map(node => [
    node.id,
    node.code,
    node.createdDatetime,
    node.modifiedDatetime,
    node.replacementDate,
    node.serialNumber,
  ]);
  return Formatter.csv({ fields, data });
};
