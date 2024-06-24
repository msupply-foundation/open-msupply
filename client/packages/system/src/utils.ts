import { LocaleKey, TypedTFunction } from '@common/intl';
import { Formatter } from '@common/utils';
import { MasterListRowFragment } from '.';
import { LocationRowFragment } from './Location/api';
import { StockLineRowFragment } from './Stock/api';

export const locationsToCsv = (
  invoices: LocationRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.code'),
    t('label.name'),
    t('label.on-hold'),
  ];

  const data = invoices.map(node => [
    node.id,
    node.code,
    node.name,
    node.onHold,
  ]);
  return Formatter.csv({ fields, data });
};

export const masterListsToCsv = (
  invoices: MasterListRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.code'),
    t('label.name'),
    t('heading.description'),
  ];

  const data = invoices.map(node => [
    node.id,
    node.code,
    node.name,
    node.description,
  ]);
  return Formatter.csv({ fields, data });
};

export const stockLinesToCsv = (
  stockLines: StockLineRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.code'),
    t('label.name'),
    t('label.batch'),
    t('label.expiry'),
    t('label.location'),
    t('label.unit'),
    t('label.pack-size'),
    t('label.num-packs'),
    t('label.available-packs'),
    t('label.supplier'),
  ];

  const data = stockLines.map(node => [
    node.id,
    node.item.code,
    node.item.name,
    node.batch,
    Formatter.csvDateString(node.expiryDate),
    node.location?.code,
    node.item.unitName,
    node.packSize,
    node.totalNumberOfPacks,
    node.availableNumberOfPacks,
    node.supplierName,
  ]);
  return Formatter.csv({ fields, data });
};
