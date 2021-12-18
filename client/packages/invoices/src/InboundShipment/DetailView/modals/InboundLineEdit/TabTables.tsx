import React, { FC } from 'react';
import {
  DataTable,
  useColumns,
  TextInputCell,
  getLineLabelColumn,
  NumberInputCell,
  CurrencyInputCell,
} from '@openmsupply-client/common';
import { DraftInboundLine } from './InboundLineEdit';

export const BatchTable: FC<{
  batches: DraftInboundLine[];
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void;
}> = ({ batches, updateDraftLine }) => {
  const columns = useColumns<DraftInboundLine>([
    getLineLabelColumn(),
    ['batch', { Cell: TextInputCell, width: 200, setter: updateDraftLine }],
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
    'expiryDate',
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

export const PricingTable: FC<{
  batches: DraftInboundLine[];
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void;
}> = ({ batches, updateDraftLine }) => {
  const columns = useColumns<DraftInboundLine>([
    getLineLabelColumn(),
    ['batch', { Cell: TextInputCell, width: 200, setter: updateDraftLine }],
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
