import { LocaleKey, TypedTFunction } from '@common/intl';
import { AssetCatalogueItemFragment } from './api';
import { Formatter } from '@common/utils';
import { ImportRow, LineNumber } from './ImportCatalogueItem';
import { AssetLogStatusInput, StatusType } from '@common/types';

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
  status: StatusType,
  t: TypedTFunction<LocaleKey>
) => {
  switch (status) {
    case StatusType.Decommissioned: {
      return t('status.decommissioned', { ns: 'coldchain' });
    }
    case StatusType.Functioning: {
      return t('status.functioning', { ns: 'coldchain' });
    }
    case StatusType.FunctioningButNeedsAttention: {
      return t('status.functioning-but-needs-attention', { ns: 'coldchain' });
    }
    case StatusType.NotFunctioning: {
      return t('status.not-functioning', { ns: 'coldchain' });
    }
    case StatusType.NotInUse: {
      return t('status.not-in-use', { ns: 'coldchain' });
    }
  }
};

const parseInputStatus = (
  status: AssetLogStatusInput,
  t: TypedTFunction<LocaleKey>
) => {
  switch (status) {
    case AssetLogStatusInput.Decommissioned: {
      return t('status.decommissioned', { ns: 'coldchain' });
    }
    case AssetLogStatusInput.Functioning: {
      return t('status.functioning', { ns: 'coldchain' });
    }
    case AssetLogStatusInput.FunctioningButNeedsAttention: {
      return t('status.functioning-but-needs-attention', { ns: 'coldchain' });
    }
    case AssetLogStatusInput.NotFunctioning: {
      return t('status.not-functioning', { ns: 'coldchain' });
    }
    case AssetLogStatusInput.NotInUse: {
      return t('status.not-in-use', { ns: 'coldchain' });
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
  includeErrors = true
) => {
  const fields = assetCatalogueItemFields(t);
  if (includeErrors) fields.push(t('label.error-message'));

  const data = catalogueItems.map(node => [
    node.subCatalogue,
    node.code,
    node.type,
    node.manufacturer,
    node.model,
    node.class,
    node.category,
    node.errorMessage,
  ]);

  return Formatter.csv({ fields, data });
};

export const getStatusInputOptions = (t: TypedTFunction<LocaleKey>) => {
  return Object.values(AssetLogStatusInput).map(status => ({
    label: parseInputStatus(status, t),
    value: status,
  }));
};

export const getStatusOptions = (t: TypedTFunction<LocaleKey>) => {
  return Object.values(StatusType).map(status => ({
    label: parseStatus(status, t),
    value: status,
  }));
};
