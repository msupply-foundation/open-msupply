import React from 'react';
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
  useTranslation,
  usePreferences,
  useIntlUtils,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../types';
import {
  CurrencyRowFragment,
  getLocationInputColumn,
  ItemRowFragment,
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
  item?: ItemRowFragment | null;
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

const NumberOfPacksCell = ({
  rowData,
  ...props
}: CellProps<DraftInboundLine>) => (
  <NumberInputCell
    {...props}
    isRequired={rowData.numberOfPacks === 0}
    rowData={rowData}
  />
);

export const QuantityTableComponent = ({
  lines,
  updateDraftLine,
  isDisabled = false,
  item,
}: TableProps) => {
  const t = useTranslation();
  const theme = useTheme();
  const { data: preferences } = usePreferences();
  const { getColumnLabelWithPackOrUnit } = useIntlUtils();
  const itemVariantsEnabled = useIsItemVariantsEnabled();
  const displayInDoses =
    !!preferences?.displayVaccineInDoses && !!item?.isVaccine;
  const itemUnitName = item?.unitName ? item.unitName : t('label.unit');

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

  if (displayInDoses) {
    columnDefinitions.push({
      key: 'dosesPerPack',
      label: `${t('label.doses-per')} ${itemUnitName}`,
      width: 120,
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.item?.doses,
    });
  }

  columnDefinitions.push(
    getColumnLookupWithOverrides('packSize', {
      Cell: PackSizeEntryCell<DraftInboundLine>,
      setter: updateDraftLine,
      label: 'label.pack-size',
    }),
    [
      'numberOfPacks',
      {
        label: 'label.packs',
        Cell: NumberOfPacksCell,
        width: 100,
        setter: patch => {
          const { packSize, numberOfPacks } = patch;

          if (!!packSize && !!numberOfPacks) {
            const packsToVials = packSize * numberOfPacks;

            updateDraftLine({
              ...patch,
              unitsPerPack: packsToVials,
              numberOfPacks: numberOfPacks,
            });
          }
        },
      },
    ]
  );

  if (displayInDoses) {
    columnDefinitions.push({
      key: 'unitsPerPack',
      label: getColumnLabelWithPackOrUnit({
        t,
        displayInDoses,
        displayDosesInUnitName: true,
        itemUnit: item?.unitName,
      }),
      Cell: NumberOfPacksCell,
      width: 100,
      align: ColumnAlign.Right,
      setter: patch => {
        const { unitsPerPack, packSize } = patch;

        if (!!packSize && !!unitsPerPack) {
          const vialsToPacks = unitsPerPack / packSize;

          updateDraftLine({
            ...patch,
            unitsPerPack,
            numberOfPacks: vialsToPacks,
          });
        }
      },
      accessor: ({ rowData }) => {
        return rowData.numberOfPacks * rowData.packSize;
      },
    });
  }

  columnDefinitions.push([
    'unitQuantity',
    {
      label: getColumnLabelWithPackOrUnit({
        t,
        displayInDoses,
        itemUnit: item?.unitName,
      }),
      width: 100,
      accessor: ({ rowData }) => {
        const total = rowData.numberOfPacks * rowData.packSize;
        return displayInDoses ? total * rowData.item.doses : total;
      },
    },
  ]);

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
      dense
    />
  );
};

export const QuantityTable = React.memo(QuantityTableComponent);

export const PricingTableComponent = ({
  lines,
  updateDraftLine,
  isDisabled = false,
  currency,
  isExternalSupplier,
}: TableProps) => {
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
      dense
    />
  );
};

export const PricingTable = React.memo(PricingTableComponent);

export const LocationTableComponent = ({
  lines,
  updateDraftLine,
  isDisabled,
}: TableProps) => {
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
