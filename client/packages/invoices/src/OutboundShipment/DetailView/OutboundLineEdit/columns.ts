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
} from '@openmsupply-client/common';
import { DraftStockOutLine } from '../../../types';
import { PackQuantityCell, StockOutLineFragment } from '../../../StockOut';
import { CurrencyRowFragment } from '@openmsupply-client/system';

export const useOutboundLineEditColumns = ({
  onChange,
  unit,
  currency,
  isExternalSupplier,
}: {
  onChange: (key: string, value: number, packSize: number) => void;
  unit: string;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
}) => {
  const { store } = useAuthContext();

  const ForeignCurrencyCell = useCurrencyCell<DraftStockOutLine>(
    currency?.code as Currencies
  );
  const columnDefinitions: ColumnDescription<DraftStockOutLine>[] = [
    [
      'batch',
      {
        accessor: ({ rowData }) => rowData.stockLine?.batch,
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
      accessor: ({ rowData }) => rowData.stockLine?.totalNumberOfPacks,
    },
    {
      Cell: NumberCell,
      label: 'label.available-packs',
      key: 'availableNumberOfPacks',
      align: ColumnAlign.Right,
      width: 90,
      accessor: ({ rowData }) => rowData.stockLine?.availableNumberOfPacks,
    },
    [
      'numberOfPacks',
      {
        Cell: PackQuantityCell,
        width: 100,
        label: 'label.pack-quantity-issued',
        setter: ({ packSize, id, numberOfPacks }) =>
          onChange(id, numberOfPacks ?? 0, packSize ?? 1),
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
      accessor: ({ rowData }) => rowData.stockLine?.onHold,
      align: ColumnAlign.Center,
      width: 70,
    }
  );

  const columns = useColumns<DraftStockOutLine>(columnDefinitions, {}, [
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
    'packSize',
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
