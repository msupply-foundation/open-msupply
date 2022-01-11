import React, { FC } from 'react';
import {
  RecordPatch,
  DataTable,
  useColumns,
  NumberInputCell,
  CurrencyInputCell,
  useTranslation,
} from '@openmsupply-client/common';
import { StocktakeLine } from '../../../../types';
import { DraftStocktakeLine } from './hooks';
interface StocktakeLineEditTableProps {
  batches: DraftStocktakeLine[];
  update: (patch: RecordPatch<DraftStocktakeLine>) => void;
}

export const BatchTable: FC<StocktakeLineEditTableProps> = ({
  batches,
  update,
}) => {
  const t = useTranslation('inventory');

  const columns = useColumns<StocktakeLine>([
    {
      key: 'snapshotNumPacks',
      label: 'label.num-packs',
      width: 100,
      setter: update,
    },
    {
      key: 'snapshotPackSize',
      label: 'label.pack-size',
      width: 100,
      setter: update,
    },
    {
      key: 'countedNumPacks',
      label: 'label.counted-num-of-packs',
      width: 100,
      Cell: NumberInputCell,
      setter: update,
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

export const PricingTable: FC<StocktakeLineEditTableProps> = ({
  batches,
  update,
}) => {
  const t = useTranslation('inventory');
  const columns = useColumns<StocktakeLine>([
    [
      'sellPricePerPack',
      { Cell: CurrencyInputCell, width: 200, setter: update },
    ],
    [
      'costPricePerPack',
      { Cell: CurrencyInputCell, width: 200, setter: update },
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
