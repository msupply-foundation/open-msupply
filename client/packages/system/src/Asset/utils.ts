import { LocaleKey, TypedTFunction } from '@common/intl';
import { AssetCatalogueItemFragment } from './api';
import { Formatter } from '@common/utils';
import { ImportRow, LineNumber } from './ImportCatalogueItem';

function assetCatalogueItemFields(t: TypedTFunction<LocaleKey>) {
  return [
    'id',
    t('label.sub-catalogue'),
    t('label.code'),
    t('label.type'),
    t('label.manufacturer'),
    t('label.model'),
    t('label.class'),
    t('label.category'),
  ];
}

export const assetCatalogueItemsListToCsv = (
  items: AssetCatalogueItemFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields = assetCatalogueItemFields(t);

  const data = items.map(node => [
    node.id,
    node.subCatalogue,
    node.code,
    node.manufacturer,
    node.model,
    node.assetClass?.name,
    node.assetCategory?.name,
  ]);
  return Formatter.csv({ fields, data });
};

export const mapIdNameToOptions = (items: { id: string; name: string }[]) =>
  items.map(item => ({
    label: item.name,
    value: item.id,
  }));

export const importRowToCsv = (
  catalogueItems: Partial<ImportRow & LineNumber>[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields = assetCatalogueItemFields(t);
  fields.push(t('label.error-message'));

  const data = catalogueItems.map(node => [
    node.subCatalogue,
    node.code,
    node.manufacturer,
    node.model,
    node.class,
    node.category,
    node.type,
    node.errorMessage,
  ]);

  return Formatter.csv({ fields, data });
};
