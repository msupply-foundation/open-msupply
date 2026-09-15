import {
  AssetLogStatusNodeType,
  LocaleKey,
  TypedTFunction,
  ArrayUtils,
  Formatter,
} from '@openmsupply-client/common';
import { AssetCatalogueItemFragment } from './api';
import { ImportRow, LineNumber } from './ImportCatalogueItem';

function assetCatalogueItemFields(t: TypedTFunction<LocaleKey>) {
  return [
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
    node.subCatalogue,
    node.code,
    node.assetType?.name,
    node.manufacturer,
    node.model,
    node.assetClass?.name,
    node.assetCategory?.name,
  ]);
  return Formatter.csv({ fields, data });
};
export const parseStatus = (
  status: AssetLogStatusNodeType,
  t: TypedTFunction<LocaleKey>
) => {
  switch (status) {
    case AssetLogStatusNodeType.Decommissioned: {
      return t('status.decommissioned');
    }
    case AssetLogStatusNodeType.Functioning: {
      return t('status.functioning');
    }
    case AssetLogStatusNodeType.FunctioningButNeedsAttention: {
      return t('status.functioning-but-needs-attention');
    }
    case AssetLogStatusNodeType.NotFunctioning: {
      return t('status.not-functioning');
    }
    case AssetLogStatusNodeType.NotInUse: {
      return t('status.not-in-use');
    }
    case AssetLogStatusNodeType.Unserviceable: {
      return t('status.unserviceable');
    }
  }
};

export const mapIdNameToOptions = (items: { id: string; name: string }[]) =>
  items.map(item => ({
    label: item.name,
    value: item.id,
  }));

export const importRowToCsv = (
  catalogueItems: Partial<ImportRow & LineNumber>[],
  t: TypedTFunction<LocaleKey>,
  includeErrors = true,
  properties?: string[]
) => {
  const props =
    properties ??
    ArrayUtils.dedupe(Object.keys(catalogueItems[0]?.properties ?? {}));
  const fields = assetCatalogueItemFields(t).concat(props);
  if (includeErrors) fields.push(t('label.error-message'));

  const data = catalogueItems.map(node => {
    const row = [
      node.subCatalogue,
      node.code,
      node.type,
      node.manufacturer,
      node.model,
      node.class,
      node.category,
    ].concat(props.map(key => String(node.properties?.[key] ?? '')));
    row.push(node.errorMessage);
    return row;
  });

  return Formatter.csv({ fields, data });
};

export const getStatusOptions = (t: TypedTFunction<LocaleKey>) => {
  return Object.values(AssetLogStatusNodeType).map(status => ({
    label: parseStatus(status, t),
    value: status,
  }));
};
