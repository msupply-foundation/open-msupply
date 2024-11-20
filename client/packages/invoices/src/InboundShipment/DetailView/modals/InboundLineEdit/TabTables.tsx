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
  CellProps,
  getColumnLookupWithOverrides,
  ColumnAlign,
  NumberInputCell,
  Currencies,
  useCurrencyCell,
  useAuthContext,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../types';
import {
  CurrencyRowFragment,
  getLocationInputColumn,
  ItemVariantInputCell,
  LocationRowFragment,
  PackSizeEntryCell,
  useIsItemVariantsEnabled,
} from '@openmsupply-client/system';

interface TableProps {
  lines: DraftInboundLine[];
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void;
  isDisabled?: boolean;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier?: boolean;
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
  <NumberInputCell
    {...props}
    isRequired={rowData.numberOfPacks === 0}
    rowData={rowData}
  />
);

// If this is not extracted to it's own component and used directly in Cell:
// cell will be re rendered anytime rowData changes, which causes it to loose focus
// if number of packs is changed and tab is pressed (in quick succession)
const PackUnitEntryCell = PackSizeEntryCell<DraftInboundLine>({});

export const QuantityTableComponent: FC<TableProps> = ({
  lines,
  updateDraftLine,
  isDisabled = false,
}) => {
  const theme = useTheme();
  const itemVariantsEnabled = useIsItemVariantsEnabled();

  const columnDefinitions: ColumnDescription<DraftInboundLine>[] = [
    getBatchColumn(updateDraftLine, theme),
    getExpiryColumn(updateDraftLine, theme),
  ];

  if (itemVariantsEnabled) {
    columnDefinitions.push({
      key: 'itemVariantId',
      label: 'label.item-variant',
      width: 170,
      Cell: props => (
        <ItemVariantInputCell {...props} itemId={props.rowData.item.id} />
      ),
      setter: updateDraftLine,
    });
  }
  columnDefinitions.push(
    [
      'numberOfPacks',
      {
        Cell: NumberOfPacksCell,
        width: 100,
        label: 'label.num-packs',
        setter: updateDraftLine,
      },
    ],
    getColumnLookupWithOverrides('packSize', {
      Cell: PackUnitEntryCell,
      setter: updateDraftLine,
      label: 'label.pack-size',
    }),
    [
      'unitQuantity',
      {
        accessor: ({ rowData }) => rowData.packSize * rowData.numberOfPacks,
      },
    ]
  );

  const columns = useColumns<DraftInboundLine>(columnDefinitions, {}, [
    updateDraftLine,
    lines,
    columnDefinitions,
  ]);

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
  currency,
  isExternalSupplier,
}) => {
  const { store } = useAuthContext();

  const CurrencyCell = useCurrencyCell<DraftInboundLine>(
    currency?.code as Currencies
  );

  const columnDefinitions: ColumnDescription<DraftInboundLine>[] = [
    [
      'batch',
      {
        accessor: ({ rowData }) => rowData.batch || '',
      },
    ],
  ];

  columnDefinitions.push(
    getColumnLookupWithOverrides('packSize', {
      label: 'label.pack-size',
    }),
    [
      'numberOfPacks',
      {
        width: 100,
        label: 'label.num-packs',
      },
    ],
    [
      'costPricePerPack',
      {
        Cell: CurrencyInputCell,
        width: 100,
        setter: updateDraftLine,
      },
    ]
  );

  if (isExternalSupplier && !!store?.preferences.issueInForeignCurrency) {
    columnDefinitions.push({
      key: 'foreignCurrencyCostPricePerPack',
      label: 'label.fc-cost-price',
      description: 'description.fc-cost-price',
      width: 100,
      align: ColumnAlign.Right,
      Cell: CurrencyCell,
      accessor: ({ rowData }) => {
        if (currency) {
          return rowData.costPricePerPack / currency.rate;
        }
      },
    });
  }

  columnDefinitions.push([
    'sellPricePerPack',
    {
      Cell: CurrencyInputCell,
      width: 100,
      setter: updateDraftLine,
    },
  ]);

  if (isExternalSupplier && !!store?.preferences.issueInForeignCurrency) {
    columnDefinitions.push({
      key: 'foreignCurrencySellPricePerPack',
      label: 'label.fc-sell-price',
      description: 'description.fc-sell-price',
      width: 100,
      align: ColumnAlign.Right,
      Cell: CurrencyCell,
      accessor: ({ rowData }) => {
        if (currency) {
          return rowData.sellPricePerPack / currency.rate;
        }
      },
    });
  }

  columnDefinitions.push([
    'lineTotal',
    {
      accessor: ({ rowData }) =>
        rowData.numberOfPacks * rowData.costPricePerPack,
    },
  ]);

  if (isExternalSupplier && !!store?.preferences.issueInForeignCurrency) {
    columnDefinitions.push({
      key: 'foreignCurrencyLineTotal',
      label: 'label.fc-line-total',
      description: 'description.fc-line-total',
      width: 100,
      Cell: CurrencyCell,
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => {
        if (currency) {
          return (
            (rowData.numberOfPacks * rowData.costPricePerPack) / currency.rate
          );
        }
      },
    });
  }

  const columns = useColumns<DraftInboundLine>(columnDefinitions, {}, [
    updateDraftLine,
    lines,
  ]);

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
  const columns = useColumns<DraftInboundLine>(
    [
      [
        'batch',
        {
          accessor: ({ rowData }) => rowData.batch || '',
        },
      ],
      [getLocationInputColumn(), { setter: updateDraftLine, width: 800 }],
    ],
    {},
    [updateDraftLine, lines]
  );

  return (
    <QueryParamsProvider
      createStore={createQueryParamsStore<LocationRowFragment>({
        initialSortBy: { key: 'name' },
      })}
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
