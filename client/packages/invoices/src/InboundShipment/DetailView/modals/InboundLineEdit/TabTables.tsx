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
  useIntlUtils,
  NumberInputCell,
  getDosesPerUnitColumn,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../types';
import {
  CurrencyRowFragment,
  getDonorColumn,
  getLocationInputColumn,
  ItemRowFragment,
  LocationRowFragment,
  PackSizeEntryCell,
} from '@openmsupply-client/system';
import {
  getBatchExpiryColumns,
  getInboundDosesColumns,
  itemVariantColumn,
  NumberOfPacksCell,
  vvmStatusesColumn,
} from './utils';

interface TableProps {
  lines: DraftInboundLine[];
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void;
  isDisabled?: boolean;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier?: boolean;
  hasItemVariantsEnabled?: boolean;
  hasVvmStatusesEnabled?: boolean;
  item?: ItemRowFragment | null;
}

export const QuantityTableComponent = ({
  lines,
  updateDraftLine,
  isDisabled = false,
  hasItemVariantsEnabled,
  hasVvmStatusesEnabled,
  item,
}: TableProps) => {
  const t = useTranslation();
  const theme = useTheme();
  const { getPlural } = useIntlUtils();
  const { data: preferences } = usePreference(
    PreferenceKey.ManageVaccinesInDoses
  );

  const displayInDoses =
    !!preferences?.manageVaccinesInDoses && !!item?.isVaccine;

  const unitName = Formatter.sentenceCase(
    item?.unitName ? item.unitName : t('label.unit')
  );
  const pluralisedUnitName = getPlural(unitName, 2);

  const columnDefinitions: ColumnDescription<DraftInboundLine>[] = [
    ...getBatchExpiryColumns(updateDraftLine, theme),
  ];

  if (hasItemVariantsEnabled) {
    columnDefinitions.push(itemVariantColumn(updateDraftLine, displayInDoses));
  }

  if (displayInDoses) {
    columnDefinitions.push(getDosesPerUnitColumn(t, unitName));
  }

  if (!!hasVvmStatusesEnabled && item?.isVaccine) {
    columnDefinitions.push(vvmStatusesColumn(updateDraftLine));
  }

  columnDefinitions.push(
    getColumnLookupWithOverrides('packSize', {
      Cell: PackSizeEntryCell<DraftInboundLine>,
      setter: updateDraftLine,
      label: 'label.pack-size',
      defaultHideOnMobile: true,
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
            const packToUnits = packSize * numberOfPacks;

            updateDraftLine({
              ...patch,
              unitsPerPack: packToUnits,
            });
          }
        },
      },
    ]
  );

  columnDefinitions.push({
    key: 'unitsPerPack',
    label: t('label.units-received', {
      unit: pluralisedUnitName,
    }),
    width: 100,
    Cell: NumberInputCell,
    align: ColumnAlign.Right,
    setter: patch => {
      const { unitsPerPack, packSize } = patch;

      if (packSize !== undefined && unitsPerPack !== undefined) {
        const unitToPacks = unitsPerPack / packSize;

        updateDraftLine({
          ...patch,
          unitsPerPack,
          numberOfPacks: unitToPacks,
        });
      }
    },
    accessor: ({ rowData }) => {
      return rowData.numberOfPacks * rowData.packSize;
    },
    defaultHideOnMobile: true,
  });

  if (displayInDoses) {
    columnDefinitions.push(...getInboundDosesColumns());
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
  const { data: preferences } = usePreference(
    PreferenceKey.AllowTrackingOfStockByDonor
  );

  const columnDescriptions: ColumnDescription<DraftInboundLine>[] = [
    [
      'batch',
      {
        accessor: ({ rowData }) => rowData.batch || '',
      },
    ],
    [getLocationInputColumn(), { setter: updateDraftLine, width: 550 }],
  ];

  if (preferences?.allowTrackingOfStockByDonor) {
    columnDescriptions.push([
      getDonorColumn((id, donor) => updateDraftLine({ id, donor })),
      { accessor: ({ rowData }) => rowData.donor?.id },
    ] as ColumnDescription<DraftInboundLine>);
  }

  const columns = useColumns(columnDescriptions, {}, [updateDraftLine, lines]);

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
