import React, { FC } from 'react';
import {
  RecordPatch,
  DataTable,
  useColumns,
  NumberInputCell,
  CurrencyInputCell,
  useTranslation,
  getExpiryDateInputColumn,
} from '@openmsupply-client/common';
import { DraftStocktakeLine } from './hooks';
interface StocktakeLineEditTableProps {
  batches: DraftStocktakeLine[];
  update: (patch: RecordPatch<DraftStocktakeLine>) => void;
}

const expiryDateColumn = getExpiryDateInputColumn<DraftStocktakeLine>();

export const BatchTable: FC<StocktakeLineEditTableProps> = ({
  batches,
  update,
}) => {
  const t = useTranslation('inventory');

  const columns = useColumns<DraftStocktakeLine>([
    {
      key: 'snapshotNumberOfPacks',
      label: 'label.num-packs',
      width: 100,
      setter: update,
    },
    {
      key: 'packSize',
      label: 'label.pack-size',
      width: 100,
      Cell: NumberInputCell,
      setter: update,
    },
    {
      key: 'countedNumberOfPacks',
      label: 'label.counted-num-of-packs',
      width: 100,
      Cell: NumberInputCell,
      setter: update,
    },
    [expiryDateColumn, { setter: update, width: 100 }],
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
  const columns = useColumns<DraftStocktakeLine>([
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
