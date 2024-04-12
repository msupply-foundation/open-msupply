import { LocaleKey, TypedTFunction } from '@common/intl';
import { AssetCatalogueItemFragment } from './api';
import { Formatter } from '@common/utils';
import { StatusType } from '@common/types';

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

export const mapIdNameToOptions = (items: { id: string; name: string }[]) =>
  items.map(item => ({
    label: item.name,
    value: item.id,
  }));
