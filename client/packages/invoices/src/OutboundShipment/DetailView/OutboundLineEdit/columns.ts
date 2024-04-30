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
import {
  getPackVariantCell,
  usePackVariantsEnabled,
} from '@openmsupply-client/system';
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
  const packVariantsEnabled = usePackVariantsEnabled();

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
        width: 80,
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

  if (packVariantsEnabled) {
    columnDefinitions.push({
      key: 'packUnit',
      label: 'label.pack',
      sortable: false,
      width: 90,
      Cell: getPackVariantCell({
        getItemId: row => row?.item.id,
        getPackSizes: row => [row.packSize ?? 1],
        getUnitName: row => row?.item.unitName ?? null,
      }),
    });
  } else {
    columnDefinitions.push(['packSize', { width: 90 }]);
  }

  columnDefinitions.push(
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
  const packVariantsEnabled = usePackVariantsEnabled();

  const columns: ColumnDescription<StockOutLineFragment>[] = [
    'batch',
    'expiryDate',
    [
      'location',
      {
        accessor: ({ rowData }) => rowData.location?.code,
      },
    ],
  ];

  if (packVariantsEnabled) {
    columns.push({
      key: 'packUnit',
      label: 'label.pack',
      sortable: false,
      width: 90,
      Cell: getPackVariantCell({
        getItemId: row => row?.item.id,
        getPackSizes: row => [row.packSize ?? 1],
        getUnitName: row => row?.item.unitName ?? null,
      }),
    });
  } else {
    columns.push(
      [
        'itemUnit',
        {
          accessor: ({ rowData }) => rowData.item.unitName,
        },
      ],
      'packSize'
    );
  }

  columns.push(
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
        accessor: ({ rowData }) => rowData.sellPricePerPack,
      },
    ]
  );
  return useColumns(columns);
};
