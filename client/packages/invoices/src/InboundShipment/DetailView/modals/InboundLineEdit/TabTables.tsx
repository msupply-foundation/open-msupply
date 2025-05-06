import React from 'react';
import {
  DataTable,
  useColumns,
  CurrencyInputCell,
  ColumnDescription,
  useTheme,
  QueryParamsProvider,
  createQueryParamsStore,
  getColumnLookupWithOverrides,
  ColumnAlign,
  Currencies,
  useCurrencyCell,
  useAuthContext,
  useTranslation,
  usePreference,
  PreferenceKey,
  Formatter,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../types';
import {
  CurrencyRowFragment,
  getLocationInputColumn,
  ItemRowFragment,
  LocationRowFragment,
  PackSizeEntryCell,
  useIsItemVariantsEnabled,
} from '@openmsupply-client/system';
import {
  getBatchExpiryColumns,
  itemVariantColumn,
  NumberOfPacksCell,
} from './columns/utils';
import {
  getDosesPerPackColumn,
  getInboundDosesColumns,
} from './columns/dosesColumns';

interface TableProps {
  lines: DraftInboundLine[];
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void;
  isDisabled?: boolean;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier?: boolean;
  item?: ItemRowFragment | null;
}

export const QuantityTableComponent = ({
  lines,
  updateDraftLine,
  isDisabled = false,
  item,
}: TableProps) => {
  const t = useTranslation();
  const theme = useTheme();
  const { data: preferences } = usePreference(
    PreferenceKey.DisplayVaccineInDoses
  );
  const itemVariantsEnabled = useIsItemVariantsEnabled();
  const displayInDoses =
    !!preferences?.displayVaccineInDoses && !!item?.isVaccine;
  const unitName = Formatter.sentenceCase(
    item?.unitName ? item.unitName : t('label.unit')
  );

  const columnDefinitions: ColumnDescription<DraftInboundLine>[] = [
    ...getBatchExpiryColumns(updateDraftLine, theme),
  ];

  if (itemVariantsEnabled) {
    columnDefinitions.push(itemVariantColumn(updateDraftLine));
  }

  if (displayInDoses) {
    getDosesPerPackColumn(t, unitName);
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
        label: 'label.packs-received',
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
    columnDefinitions.push(
      ...getInboundDosesColumns(t, updateDraftLine, unitName)
    );
  } else {
    columnDefinitions.push([
      'unitQuantity',
      {
        label: t('label.units-received', {
          unit: unitName,
        }),
        width: 100,
        accessor: ({ rowData }) => {
          return rowData.numberOfPacks * rowData.packSize;
        },
      },
    ]);
  }

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
