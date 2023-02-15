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
  QueryParamsProvider,
  createQueryParamsStore,
  NonNegativeIntegerCell,
  CellProps,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../types';
import {
  getLocationInputColumn,
  LocationRowFragment,
} from '@openmsupply-client/system';

interface TableProps {
  lines: DraftInboundLine[];
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void;
  isDisabled?: boolean;
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
    maxLength: 50,
    Cell: TextInputCell,
    setter: updateDraftLine,
    backgroundColor: alpha(theme.palette.background.menu, 0.4),
    // Remember previously entered batches for this item and suggest them in future shipments
    autocompleteProvider: data => `inboundshipment${data.item.id}`,
    accessor: ({ rowData }) => rowData.batch || '',
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

const NumberOfPacksCell: React.FC<CellProps<DraftInboundLine>> = ({
  rowData,
  ...props
}) => (
  <NonNegativeIntegerCell
    {...props}
    isRequired={rowData.numberOfPacks === 0}
    rowData={rowData}
  />
);

export const QuantityTableComponent: FC<TableProps> = ({
  lines,
  updateDraftLine,
  isDisabled = false,
}) => {
  const theme = useTheme();
  const columns = useColumns<DraftInboundLine>(
    [
      getBatchColumn(updateDraftLine, theme),
      getExpiryColumn(updateDraftLine, theme),
      [
        'numberOfPacks',
        {
          Cell: NumberOfPacksCell,
          width: 100,
          label: 'label.num-packs',
          setter: updateDraftLine,
        },
      ],
      ['packSize', { Cell: NonNegativeIntegerCell, setter: updateDraftLine }],
      [
        'unitQuantity',
        { accessor: ({ rowData }) => rowData.numberOfPacks * rowData.packSize },
      ],
    ],
    {},
    [updateDraftLine, lines]
  );

  return (
    <DataTable
      id="inbound-line-quantity"
      isDisabled={isDisabled}
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
  isDisabled = false,
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
    [updateDraftLine, lines]
  );

  return (
    <DataTable
      id="inbound-line-pricing"
      isDisabled={isDisabled}
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
  isDisabled,
}) => {
  const theme = useTheme();
  const columns = useColumns<DraftInboundLine>(
    [
      getBatchColumn(updateDraftLine, theme),
      getExpiryColumn(updateDraftLine, theme),
      [getLocationInputColumn(), { setter: updateDraftLine }],
    ],
    {},
    [updateDraftLine, lines]
  );

  return (
    <QueryParamsProvider
      createStore={() =>
        createQueryParamsStore<LocationRowFragment>({
          initialSortBy: { key: 'name' },
        })
      }
    >
      <DataTable
        id="inbound-line-location"
        columns={columns}
        data={lines}
        dense
        isDisabled={isDisabled}
      />
    </QueryParamsProvider>
  );
};

export const LocationTable = React.memo(LocationTableComponent);
