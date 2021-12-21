import React, { FC } from 'react';
import {
  DataTable,
  useColumns,
  NumberInputCell,
  CurrencyInputCell,
  useTranslation,
} from '@openmsupply-client/common';
import { StocktakeLine } from '../../../../types';

export const BatchTable: FC<{ batches: StocktakeLine[] }> = ({ batches }) => {
  const t = useTranslation('inventory');

  const columns = useColumns<StocktakeLine>([
    {
      key: 'snapshotNumPacks',
      label: 'label.num-packs',
      width: 100,
      setter: () => {},
    },
    {
      key: 'snapshotPackSize',
      label: 'label.pack-size',
      width: 100,
      setter: () => {},
    },
    {
      key: 'countedNumPacks',
      label: 'label.counted-num-of-packs',
      width: 100,
      Cell: NumberInputCell,
      setter: () => {},
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
    [
      'sellPricePerPack',
      { Cell: CurrencyInputCell, width: 200, setter: () => {} },
    ],
    [
      'costPricePerPack',
      { Cell: CurrencyInputCell, width: 200, setter: () => {} },
    ],
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
