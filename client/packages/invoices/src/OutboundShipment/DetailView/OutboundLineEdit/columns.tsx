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
  useTranslation,
  TypedTFunction,
  LocaleKey,
} from '@openmsupply-client/common';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import { DraftStockOutLineFragment } from '../../api/operations.generated';
import { getPackQuantityCellId } from 'packages/invoices/src/utils';
import { AllocateIn } from './allocation/useAllocationContext';
import { DraftItem } from '../../..';
import { getDoseQuantity } from './allocation/utils';

export const useOutboundLineEditColumns = ({
  allocate,
  item,
  currency,
  isExternalSupplier,
  allocateIn,
}: {
  allocate: (key: string, value: number) => void;
  item: DraftItem;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
  allocateIn: AllocateIn;
}) => {
  const { store } = useAuthContext();
  const t = useTranslation();

  const unit = item.unitName ?? t('label.unit');

  const ForeignCurrencyCell = useCurrencyCell<DraftStockOutLineFragment>(
    currency?.code as Currencies
  );
  const columnDefinitions: ColumnDescription<DraftStockOutLineFragment>[] = [
    [
      'batch',
      {
        accessor: ({ rowData }) => rowData.batch,
      },
    ],
    [
      'expiryDate',
      {
        Cell: ExpiryDateCell,
        width: 100,
      },
    ],
    [
      'location',
      {
        accessor: ({ rowData }) => rowData.location?.code,
        width: 85,
        Cell: LocationCell,
      },
    ],
    [
      'sellPricePerPack',
      {
        Cell: CurrencyCell,
        width: 85,
      },
    ],
  ];
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
    });
  }

  columnDefinitions.push(['packSize', { width: 90 }]);

  if (allocateIn === AllocateIn.Doses) {
    columnDefinitions.push(...getAllocateInDosesColumns(t, allocate, unit));
  } else {
    columnDefinitions.push(...getAllocateInUnitsColumns(allocate, unit));
  }

  columnDefinitions.push({
    label: 'label.on-hold',
    key: 'onHold',
    Cell: CheckCell,
    accessor: ({ rowData }) =>
      rowData.stockLineOnHold || rowData.location?.onHold,
    align: ColumnAlign.Center,
    width: 70,
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
  allocatePacks: (key: string, numPacks: number) => void,
  unit: string
): ColumnDescription<DraftStockOutLineFragment>[] => [
  {
    Cell: NumberCell,
    label: 'label.in-store',
    key: 'totalNumberOfPacks',
    align: ColumnAlign.Right,
    width: 80,
    accessor: ({ rowData }) => rowData.inStorePacks,
  },
  {
    Cell: NumberCell,
    label: 'label.available-packs',
    key: 'availablePacks',
    align: ColumnAlign.Right,
    width: 90,
    accessor: ({ rowData }) =>
      rowData.location?.onHold || rowData.stockLineOnHold
        ? 0
        : rowData.availablePacks,
  },
  [
    'numberOfPacks',
    {
      Cell: PackQuantityCell,
      width: 100,
      label: 'label.pack-quantity-issued',
      setter: ({ id, numberOfPacks }) => allocatePacks(id, numberOfPacks ?? 0),
    },
  ],
  [
    'unitQuantity',
    {
      label: 'label.unit-quantity-issued',
      labelProps: { unit },
      accessor: ({ rowData }) => rowData.numberOfPacks * rowData.packSize,
      width: 90,
    },
  ],
];

const DoseQuantityCell = (props: CellProps<DraftStockOutLineFragment>) => (
  <NumberInputCell
    {...props}
    max={props.rowData.availablePacks}
    id={getPackQuantityCellId(props.rowData.batch)} // Used by when adding by barcode scanner
    decimalLimit={0}
    min={0}
    // bit longer debounce, as we might overwrite value to whole number of packs
    debounce={750}
  />
);

const getAllocateInDosesColumns = (
  t: TypedTFunction<LocaleKey>,
  allocateDoses: (key: string, numPacks: number) => void,
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
    },
    {
      Cell: NumberCell,
      label: 'label.in-store',
      key: 'totalNumberOfPacks',
      align: ColumnAlign.Right,
      width: 80,
      accessor: ({ rowData }) => rowData.inStorePacks,
    },
    {
      Cell: NumberCell,
      label: 'label.available-packs',
      key: 'availablePacks',
      align: ColumnAlign.Right,
      width: 90,
      accessor: ({ rowData }) =>
        rowData.location?.onHold || rowData.stockLineOnHold
          ? 0
          : rowData.availablePacks,
    },

    // // Designs had only in stock/available packs columns, but aren't I thinking in doses?
    // {
    //   key: 'availableDoses',
    //   Cell: NumberCell,
    //   label: 'label.doses-available',
    //   align: ColumnAlign.Right,
    //   width: 90,
    //   accessor: ({ rowData }) =>
    //     rowData.location?.onHold || rowData.stockLineOnHold
    //       ? 0
    //       : rowData.availablePacks *
    //         rowData.packSize *
    //         ((rowData.itemVariant?.dosesPerUnit ??
    //           rowData.defaultDosesPerUnit) ||
    //           1),
    // },
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
        allocateDoses(row.id, row.dosesIssued ?? 0);
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
      },
    ],
  ];
};
