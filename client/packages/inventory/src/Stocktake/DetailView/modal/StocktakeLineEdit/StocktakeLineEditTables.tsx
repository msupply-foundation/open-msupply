import React, { FC } from 'react';
import {
  DataTable,
  useColumns,
  TextInputCell,
  getLineLabelColumn,
  NumberInputCell,
  CurrencyInputCell,
  useTranslation,
  getCheckboxSelectionColumn,
  ColumnDefinition,
} from '@openmsupply-client/common';
import { StocktakeLine } from '../../../../types';

export const BatchTable: FC<{ batches: StocktakeLine[] }> = ({ batches }) => {
  const t = useTranslation('inventory');

  const columns = useColumns<StocktakeLine>([
    {
      key: 'snapshotNumPacks',
      label: 'label.num-packs',
      width: 100,
    },
    {
      key: 'snapshotPackSize',
      label: 'label.pack-size',
      width: 100,
    },
    {
      key: 'countedNumPacks',
      label: 'label.counted-num-of-packs',
      width: 100,
      Cell: NumberInputCell,
    },
    'expiryDate',
  ]);

  return (
    <DataTable
      columns={columns}
      data={batches}
      noDataMessage={t('label.add-new-line')}
      dense
    />
  );
};

export const PricingTable: FC<{ batches: StocktakeLine[] }> = ({ batches }) => {
  const t = useTranslation('inventory');
  const columns = useColumns<StocktakeLine>([
    ['sellPricePerPack', { Cell: CurrencyInputCell, width: 200 }],
    ['costPricePerPack', { Cell: CurrencyInputCell, width: 200 }],
  ]);

  return (
    <DataTable
      columns={columns}
      data={batches}
      noDataMessage={t('label.add-new-line')}
      dense
    />
  );
};
