import React, { FC } from 'react';
import {
  DataTable,
  useColumns,
  CurrencyInputCell,
  getExpiryDateInputColumn,
  TextInputCell,
  ColumnDescription,
  useTheme,
  Theme,
  alpha,
  PositiveNumberInputCell,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../types';
import { getLocationInputColumn } from '@openmsupply-client/system';

interface TableProps {
  lines: DraftInboundLine[];
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void;
}

const expiryInputColumn = getExpiryDateInputColumn<DraftInboundLine>();
const getBatchColumn = (
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void,
  theme: Theme
): ColumnDescription<DraftInboundLine> => [
  'batch',
  {
    width: 150,
    maxWidth: 150,
    Cell: TextInputCell,
    setter: updateDraftLine,
    backgroundColor: alpha(theme.palette.background.menu, 0.4),
  },
];
const getExpiryColumn = (
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void,
  theme: Theme
): ColumnDescription<DraftInboundLine> => [
  expiryInputColumn,
  {
    width: 150,
    maxWidth: 150,
    setter: updateDraftLine,
    backgroundColor: alpha(theme.palette.background.menu, 0.4),
  },
];

export const QuantityTableComponent: FC<TableProps> = ({
  lines,
  updateDraftLine,
}) => {
  const theme = useTheme();
  const columns = useColumns<DraftInboundLine>(
    [
      getBatchColumn(updateDraftLine, theme),
      getExpiryColumn(updateDraftLine, theme),
      [
        'numberOfPacks',
        {
          Cell: PositiveNumberInputCell,
          width: 100,
          label: 'label.num-packs',
          setter: updateDraftLine,
        },
      ],
      ['packSize', { Cell: PositiveNumberInputCell, setter: updateDraftLine }],
      [
        'unitQuantity',
        { accessor: ({ rowData }) => rowData.numberOfPacks * rowData.packSize },
      ],
    ],
    {},
    [updateDraftLine]
  );

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
  const theme = useTheme();
  const columns = useColumns<DraftInboundLine>(
    [
      getBatchColumn(updateDraftLine, theme),
      getExpiryColumn(updateDraftLine, theme),
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
    ],
    {},
    [updateDraftLine]
  );

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
  const theme = useTheme();
  const columns = useColumns<DraftInboundLine>(
    [
      getBatchColumn(updateDraftLine, theme),
      getExpiryColumn(updateDraftLine, theme),
      [getLocationInputColumn(), { setter: updateDraftLine }],
    ],
    {},
    [updateDraftLine]
  );

  return <DataTable columns={columns} data={lines} dense />;
};

export const LocationTable = React.memo(LocationTableComponent);
