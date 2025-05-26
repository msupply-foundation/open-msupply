import React from 'react';
import {
  useColumns,
  ColumnAlign,
  ExpiryDateCell,
  CheckCell,
  LocationCell,
  NumberCell,
  ColumnDescription,
  useAuthContext,
  useCurrencyCell,
  Currencies,
  CurrencyCell,
  CellProps,
  NumberInputCell,
  usePreference,
  PreferenceKey,
  useTranslation,
  TypedTFunction,
  LocaleKey,
  useIntlUtils,
  Formatter,
  useSimplifiedTabletUI,
} from '@openmsupply-client/common';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import { DraftStockOutLineFragment } from '../../api/operations.generated';
import { getPackQuantityCellId } from 'packages/invoices/src/utils';
import {
  AllocateInOption,
  AllocateInType,
} from './allocation/useAllocationContext';
import { DraftItem } from '../../..';
import {
  canAutoAllocate,
  getDoseQuantity,
  packsToDoses,
} from './allocation/utils';

export const useOutboundLineEditColumns = ({
  allocate,
  item,
  currency,
  isExternalSupplier,
  allocateIn,
}: {
  allocate: (key: string, value: number) => number;
  item: DraftItem | null;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
  allocateIn: AllocateInOption;
}) => {
  const { store } = useAuthContext();
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const simplifiedTabletView = useSimplifiedTabletUI();

  const unit = Formatter.sentenceCase(item?.unitName ?? t('label.unit'));
  const pluralisedUnitName = getPlural(unit, 2);

  const { data: prefs } = usePreference(
    PreferenceKey.SortByVvmStatusThenExpiry,
    PreferenceKey.ManageVvmStatusForStock
  );

  const packSize =
    allocateIn.type === AllocateInType.Packs ? allocateIn.packSize : undefined;

  const ForeignCurrencyCell = useCurrencyCell<DraftStockOutLineFragment>(
    currency?.code as Currencies
  );

  const columnDefinitions: ColumnDescription<DraftStockOutLineFragment>[] = [
    {
      label: '',
      key: 'canAllocate',
      Cell: CheckCell,
      cellProps: {
        tooltipText: t('description.used-in-auto-allocation'),
      },
      accessor: ({ rowData }) => canAutoAllocate(rowData, packSize),
      align: ColumnAlign.Center,
      width: 35,
      defaultHideOnMobile: true,
    },
    [
      'batch',
      {
        accessor: ({ rowData }) => rowData.batch,
        width: simplifiedTabletView ? 190 : 100,
      },
    ],
  ];

  if (prefs?.manageVvmStatusForStock || prefs?.sortByVvmStatusThenExpiry) {
    columnDefinitions.push({
      key: 'vvmStatus',
      label: 'label.vvm-status',
      accessor: ({ rowData }) => {
        if (!rowData.vvmStatus) return '';
        // TODO: Show unusable VVM status somehow?
        return `${rowData.vvmStatus?.description} (${rowData.vvmStatus?.level})`;
      },
      width: 85,
      defaultHideOnMobile: true,
    });
  }

  columnDefinitions.push(
    [
      'expiryDate',
      {
        Cell: ExpiryDateCell,
        width: simplifiedTabletView ? 190 : 100,
      },
    ],
    [
      'location',
      {
        accessor: ({ rowData }) => rowData.location?.code,
        width: 85,
        Cell: LocationCell,
        defaultHideOnMobile: true,
      },
    ],
    [
      'sellPricePerPack',
      {
        Cell: CurrencyCell,
        width: 85,
        defaultHideOnMobile: true,
      },
    ]
  );

  if (isExternalSupplier && !!store?.preferences.issueInForeignCurrency) {
    columnDefinitions.push({
      key: 'foreignCurrencySellPricePerPack',
      label: 'label.fc-sell-price',
      description: 'description.fc-sell-price',
      width: 85,
      align: ColumnAlign.Right,
      Cell: ForeignCurrencyCell,
      accessor: ({ rowData }) => {
        if (currency) {
          return rowData.sellPricePerPack / currency.rate;
        }
      },
      defaultHideOnMobile: true,
    });
  }

  columnDefinitions.push([
    'packSize',
    { width: 90, defaultHideOnMobile: true },
  ]);

  if (allocateIn.type === AllocateInType.Doses) {
    columnDefinitions.push(...getAllocateInDosesColumns(t, allocate, unit));
  } else {
    columnDefinitions.push(
      ...getAllocateInUnitsColumns(
        allocate,
        pluralisedUnitName,
        simplifiedTabletView
      )
    );
  }

  columnDefinitions.push({
    label: 'label.on-hold',
    key: 'onHold',
    Cell: CheckCell,
    accessor: ({ rowData }) =>
      rowData.stockLineOnHold || rowData.location?.onHold,
    align: ColumnAlign.Center,
    width: 70,
    defaultHideOnMobile: true,
  });

  const columns = useColumns<DraftStockOutLineFragment>(columnDefinitions, {}, [
    allocate,
  ]);

  return columns;
};

const PackQuantityCell = (props: CellProps<DraftStockOutLineFragment>) => (
  <NumberInputCell
    {...props}
    max={props.rowData.availablePacks}
    id={getPackQuantityCellId(props.rowData.batch)} // Used by when adding by barcode scanner
    decimalLimit={2}
    min={0}
  />
);

const getAllocateInUnitsColumns = (
  allocate: (key: string, numPacks: number) => void,
  pluralisedUnitName: string,
  simplifiedTabletView: boolean
): ColumnDescription<DraftStockOutLineFragment>[] => [
  {
    Cell: NumberCell,
    label: 'label.in-store',
    key: 'totalNumberOfPacks',
    align: ColumnAlign.Right,
    width: 80,
    accessor: ({ rowData }) => rowData.inStorePacks,
    defaultHideOnMobile: true,
  },
  {
    Cell: NumberCell,
    label: 'label.available-packs',
    key: 'availablePacks',
    align: ColumnAlign.Right,
    width: simplifiedTabletView ? 190 : 90,
    accessor: ({ rowData }) =>
      rowData.location?.onHold || rowData.stockLineOnHold
        ? 0
        : rowData.availablePacks,
  },
  [
    'numberOfPacks',
    {
      Cell: PackQuantityCell,
      width: simplifiedTabletView ? 190 : 100,
      label: 'label.pack-quantity-issued',
      setter: ({ id, numberOfPacks }) => allocate(id, numberOfPacks ?? 0),
    },
  ],
  [
    'unitQuantity',
    {
      label: 'label.units-issued',
      labelProps: { unit: pluralisedUnitName },
      accessor: ({ rowData }) => rowData.numberOfPacks * rowData.packSize,
      width: 90,
      defaultHideOnMobile: true,
    },
  ],
];

const DoseQuantityCell = (props: CellProps<DraftStockOutLineFragment>) => (
  <NumberInputCell
    {...props}
    max={packsToDoses(props.rowData.availablePacks, props.rowData)}
    id={getPackQuantityCellId(props.rowData.batch)} // Used by when adding by barcode scanner
    decimalLimit={0}
    min={0}
    // bit longer debounce, as we might overwrite value to whole number of packs
    debounce={750}
  />
);

const getAllocateInDosesColumns = (
  t: TypedTFunction<LocaleKey>,
  allocate: (key: string, numPacks: number) => void,
  unit: string
): ColumnDescription<DraftStockOutLineFragment>[] => {
  return [
    {
      key: 'dosesPerUnit',
      label: unit
        ? t('label.doses-per-unit-name', {
            unit,
          })
        : 'label.doses-per-unit',
      width: 80,
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => {
        return (
          rowData?.itemVariant?.dosesPerUnit ?? rowData.defaultDosesPerUnit
        );
      },
      defaultHideOnMobile: true,
    },
    {
      label: 'label.in-store-doses',
      Cell: NumberCell,
      key: 'inStorePacks',
      align: ColumnAlign.Right,
      width: 80,
      accessor: ({ rowData }) => packsToDoses(rowData.inStorePacks, rowData),
      defaultHideOnMobile: true,
    },
    {
      label: 'label.available-doses',
      Cell: NumberCell,
      key: 'availablePacks',
      align: ColumnAlign.Right,
      width: 90,
      accessor: ({ rowData }) =>
        rowData.location?.onHold || rowData.stockLineOnHold
          ? 0
          : packsToDoses(rowData.availablePacks, rowData),
    },
    {
      key: 'dosesIssued',
      Cell: DoseQuantityCell,
      width: 100,
      label: 'label.doses-issued',
      setter: (
        row: Partial<DraftStockOutLineFragment> & {
          id: string;
          // Extra field only in the context of this setter, based on key above
          dosesIssued?: number;
        }
      ) => {
        const allocatedQuantity = allocate(row.id, row.dosesIssued ?? 0);
        return allocatedQuantity; // return to NumberInputCell to ensure value is correct
      },
      accessor: ({ rowData }) => getDoseQuantity(rowData),
    },
    // Can only issue in whole packs in Outbound Shipment, so we'll show the user
    [
      'numberOfPacks',
      {
        label: 'label.pack-quantity-issued',
        labelProps: { unit },
        accessor: ({ rowData }) => rowData.numberOfPacks,
        width: 90,
        defaultHideOnMobile: true,
      },
    ],
  ];
};
