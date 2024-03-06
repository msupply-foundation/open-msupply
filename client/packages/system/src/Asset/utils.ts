import { LocaleKey, TypedTFunction } from '@common/intl';
import { AssetCatalogueItemFragment } from './api';
import { Formatter } from '@common/utils';

export const assetCategoryListItemsToCsv = (
  items: AssetCatalogueItemFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.code'),
    t('label.manufacturer'),
    t('label.model'),
  ];

  const data = items.map(node => [
    node.id,
    node.code,
    node.manufacturer,
    node.model,
  ]);
  return Formatter.csv({ fields, data });
};

export const mapIdNameToOptions = (items: { id: string; name: string }[]) =>
  items.map(item => ({
    label: item.name,
    value: item.id,
  }));
