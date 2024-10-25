import {
  CheckCell,
  Column,
  ColumnAlign,
  ColumnDescription,
  ExpiryDateCell,
  LocationCell,
  NumberCell,
  useColumns,
} from '@openmsupply-client/common';
import { DraftStockOutLine } from '../../../types';
import { PackQuantityCell, StockOutLineFragment } from '../../../StockOut';

export const usePrescriptionLineEditColumns = ({
  onChange,
  unit,
}: {
  onChange: (key: string, value: number, packSize: number) => void;
  unit: string;
}) => {
  const columns: ColumnDescription<DraftStockOutLine>[] = [
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
        width: 100,
        Cell: LocationCell,
      },
    ],
    {
      label: 'label.on-hold',
      key: 'onHold',
      Cell: CheckCell,
      accessor: ({ rowData }) => rowData.stockLine?.onHold,
      align: ColumnAlign.Center,
      width: 70,
    },
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
      width: 85,
      accessor: ({ rowData }) => rowData.stockLine?.availableNumberOfPacks,
    },
  ];

  columns.push(['packSize', { width: 90 }]);

  columns.push(
    [
      'unitQuantity',
      {
        label: 'label.unit-quantity-issued',
        labelProps: { unit },
        accessor: ({ rowData }) => rowData.numberOfPacks * rowData.packSize,
        width: 120,
      },
    ],
    [
      'numberOfPacks',
      {
        Cell: PackQuantityCell,
        width: 120,
        label: 'label.pack-quantity-issued',
        setter: ({ packSize, id, numberOfPacks }) =>
          onChange(id, numberOfPacks ?? 0, packSize ?? 1),
      },
    ]
  );

  return useColumns(columns, {}, [onChange]);
};

export const useExpansionColumns = (): Column<StockOutLineFragment>[] =>
  useColumns([
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
        accessor: ({ rowData }) => rowData.item?.unitName,
      },
    ],
    'numberOfPacks',
    'packSize',
    [
      'unitQuantity',
      {
        accessor: ({ rowData }) => rowData.packSize * rowData.numberOfPacks,
      },
    ],
  ]);
