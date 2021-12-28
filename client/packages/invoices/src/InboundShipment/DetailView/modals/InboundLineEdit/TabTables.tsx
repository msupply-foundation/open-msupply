import React, { FC } from 'react';
import {
  DataTable,
  useColumns,
  NumberInputCell,
  CurrencyInputCell,
} from '@openmsupply-client/common';
import { DraftInboundLine } from './InboundLineEdit';

export const QuantityTableComponent: FC<{
  batches: DraftInboundLine[];
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void;
}> = ({ batches, updateDraftLine }) => {
  const columns = useColumns<DraftInboundLine>([
    [
      'numberOfPacks',
      {
        Cell: NumberInputCell,
        width: 100,
        label: 'label.num-packs',
        setter: updateDraftLine,
      },
    ],
    ['packSize', { Cell: NumberInputCell, setter: updateDraftLine }],
    [
      'unitQuantity',
      { accessor: ({ rowData }) => rowData.numberOfPacks * rowData.packSize },
    ],
  ]);

  return (
    <DataTable
      columns={columns}
      data={batches}
      noDataMessage="Add a new line"
      dense
    />
  );
};

export const QuantityTable = React.memo(QuantityTableComponent);

export const PricingTableComponent: FC<{
  batches: DraftInboundLine[];
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void;
}> = ({ batches, updateDraftLine }) => {
  console.log('render');
  const columns = useColumns<DraftInboundLine>([
    [
      'sellPricePerPack',
      { Cell: CurrencyInputCell, width: 100, setter: updateDraftLine },
    ],
    [
      'costPricePerPack',
      { Cell: CurrencyInputCell, width: 100, setter: updateDraftLine },
    ],
    [
      'unitQuantity',
      { accessor: ({ rowData }) => rowData.numberOfPacks * rowData.packSize },
    ],
    [
      'lineTotal',
      {
        accessor: ({ rowData }) =>
          rowData.numberOfPacks * rowData.packSize * rowData.costPricePerPack,
      },
    ],
  ]);

  return (
    <DataTable
      columns={columns}
      data={batches}
      noDataMessage="Add a new line"
      dense
    />
  );
};

export const PricingTable = React.memo(PricingTableComponent);
