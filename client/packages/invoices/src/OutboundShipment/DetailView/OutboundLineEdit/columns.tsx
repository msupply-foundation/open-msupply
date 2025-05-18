import React from 'react';
import {
  useColumns,
  ColumnAlign,
  ExpiryDateCell,
  CheckCell,
  LocationCell,
  Column,
  NumberCell,
  ColumnDescription,
  useAuthContext,
  useCurrencyCell,
  Currencies,
  CurrencyCell,
  CellProps,
  NumberInputCell,
} from '@openmsupply-client/common';
import { StockOutLineFragment } from '../../../StockOut';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import { DraftStockOutLineFragment } from '../../api/operations.generated';
import { getPackQuantityCellId } from 'packages/invoices/src/utils';

export const useOutboundLineEditColumns = ({
  onChange,
  unit,
  currency,
  isExternalSupplier,
}: {
  onChange: (key: string, value: number) => void;
  unit: string;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
}) => {
  const { store } = useAuthContext();

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

  columnDefinitions.push(
    ['packSize', { width: 90 }],
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
      key: 'availableNumberOfPacks',
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
        setter: ({ id, numberOfPacks }) => onChange(id, numberOfPacks ?? 0),
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
    {
      label: 'label.on-hold',
      key: 'onHold',
      Cell: CheckCell,
      accessor: ({ rowData }) =>
        rowData.stockLineOnHold || rowData.location?.onHold,
      align: ColumnAlign.Center,
      width: 70,
    }
  );

  const columns = useColumns<DraftStockOutLineFragment>(columnDefinitions, {}, [
    onChange,
  ]);

  return columns;
};

export const useExpansionColumns = (): Column<StockOutLineFragment>[] => {
  const columns: ColumnDescription<StockOutLineFragment>[] = [
    'batch',
    'expiryDate',
    [
      'location',
      {
        accessor: ({ rowData }) => rowData.location?.code,
      },
    ],
    [
      'itemUnit',
      {
        accessor: ({ rowData }) => rowData.item.unitName,
      },
    ],
    ['packSize', { Cell: NumberCell }],
    'numberOfPacks',
    [
      'unitQuantity',
      {
        accessor: ({ rowData }) => rowData.packSize * rowData.numberOfPacks,
      },
    ],
    [
      'sellPricePerUnit',
      {
        accessor: ({ rowData }) => rowData.sellPricePerPack / rowData.packSize,
      },
    ],
  ];

  return useColumns(columns);
};

const PackQuantityCell = (props: CellProps<DraftStockOutLineFragment>) => (
  <NumberInputCell
    {...props}
    max={props.rowData.availablePacks}
    id={getPackQuantityCellId(props.rowData.batch)}
    decimalLimit={2}
    min={0}
  />
);
