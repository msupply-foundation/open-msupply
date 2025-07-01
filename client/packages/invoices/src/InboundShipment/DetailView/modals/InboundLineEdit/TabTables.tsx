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
  useFormatNumber,
  NumUtils,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../types';
import {
  CurrencyRowFragment,
  getCampaignColumn,
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
  setPackRoundingMessage?: (value: React.SetStateAction<string>) => void;
}

export const QuantityTableComponent = ({
  lines,
  updateDraftLine,
  isDisabled = false,
  hasItemVariantsEnabled,
  hasVvmStatusesEnabled,
  item,
  setPackRoundingMessage,
}: TableProps) => {
  const t = useTranslation();
  const theme = useTheme();
  const { getPlural } = useIntlUtils();
  const { data: preferences } = usePreference(
    PreferenceKey.ManageVaccinesInDoses
  );
  const { format } = useFormatNumber();

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
      setter: patch => {
        setPackRoundingMessage?.('');
        updateDraftLine(patch);
      },
      label: 'label.pack-size',
      defaultHideOnMobile: true,
      align: ColumnAlign.Left,
    }),
    [
      'numberOfPacks',
      {
        label: 'label.packs-received',
        Cell: NumberOfPacksCell,
        cellProps: { decimalLimit: 0 },
        width: 100,
        align: ColumnAlign.Left,
        setter: patch => {
          const { packSize, numberOfPacks } = patch;

          if (packSize !== undefined && numberOfPacks !== undefined) {
            const packToUnits = packSize * numberOfPacks;
            setPackRoundingMessage?.('');

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
    cellProps: { debounce: 500 },
    Cell: NumberInputCell,
    align: ColumnAlign.Left,
    setter: patch => {
      const { unitsPerPack, packSize } = patch;

      if (packSize !== undefined && unitsPerPack !== undefined) {
        const unitToPacks = unitsPerPack / packSize;

        const roundedPacks = Math.ceil(unitToPacks);
        const actualUnits = roundedPacks * packSize;

        if (roundedPacks === unitToPacks || roundedPacks === 0) {
          setPackRoundingMessage?.('');
        } else {
          setPackRoundingMessage?.(
            t('messages.under-allocated', {
              receivedQuantity: format(NumUtils.round(unitsPerPack, 2)), // round the display value to 2dp
              quantity: format(actualUnits),
            })
          );
        }

        updateDraftLine({
          ...patch,
          unitsPerPack: actualUnits,
          numberOfPacks: roundedPacks,
        });
        return actualUnits;
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

  columnDescriptions.push(getCampaignColumn(patch => updateDraftLine(patch)));

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
