import React, { FC } from 'react';
import {
  DataTable,
  useColumns,
  TextInputCell,
  getLineLabelColumn,
  NumberInputCell,
  CurrencyInputCell,
} from '@openmsupply-client/common';
import { InboundShipmentRow } from '../../../../types';

export const BatchTable: FC<{ batches: InboundShipmentRow[] }> = ({
  batches,
}) => {
  const columns = useColumns<InboundShipmentRow>([
    getLineLabelColumn(),
    ['batch', { Cell: TextInputCell, width: 200 }],
    [
      'numberOfPacks',
      {
        Cell: NumberInputCell,
        width: 100,
        label: 'label.num-packs',
      },
    ],
    ['packSize', { Cell: NumberInputCell }],
    [
      'unitQuantity',
      { accessor: rowData => rowData.numberOfPacks * rowData.packSize },
    ],
    'expiryDate',
  ]);

  return (
    <DataTable
      columns={columns}
      data={batches}
      noDataMessage="Add a new line"
      dense
      noLines
    />
  );
};

export const PricingTable: FC<{ batches: InboundShipmentRow[] }> = ({
  batches,
}) => {
  const columns = useColumns<InboundShipmentRow>([
    getLineLabelColumn(),
    ['batch', { Cell: TextInputCell, width: 200 }],
    ['sellPricePerPack', { Cell: CurrencyInputCell, width: 100 }],
    ['costPricePerPack', { Cell: CurrencyInputCell, width: 100 }],
    [
      'unitQuantity',
      { accessor: rowData => rowData.numberOfPacks * rowData.packSize },
    ],
    [
      'lineTotal',
      {
        accessor: rowData =>
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
      noLines
    />
  );
};
