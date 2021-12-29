import React, { FC } from 'react';
import {
  DataTable,
  useColumns,
  NumberInputCell,
  CurrencyInputCell,
} from '@openmsupply-client/common';
import { DraftInboundLine } from './InboundLineEdit';
import { getLocationInputColumn } from '@openmsupply-client/system';

interface TableProps {
  lines: DraftInboundLine[];
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void;
}

export const QuantityTableComponent: FC<TableProps> = ({
  lines,
  updateDraftLine,
}) => {
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
      data={lines}
      noDataMessage="Add a new line"
      dense
    />
  );
};

export const QuantityTable = React.memo(QuantityTableComponent);

export const PricingTableComponent: FC<TableProps> = ({
  lines,
  updateDraftLine,
}) => {
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
      data={lines}
      noDataMessage="Add a new line"
      dense
    />
  );
};

export const PricingTable = React.memo(PricingTableComponent);

export const LocationTableComponent: FC<TableProps> = ({
  lines,
  updateDraftLine,
}) => {
  console.log('lines', lines);
  const columns = useColumns(
    [[getLocationInputColumn(), { setter: updateDraftLine }]],
    {},
    [updateDraftLine]
  );

  return <DataTable columns={columns} data={lines} dense />;
};

export const LocationTable = React.memo(LocationTableComponent);
