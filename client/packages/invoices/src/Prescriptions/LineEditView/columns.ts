import {
  // CheckCell,
  // Column,
  ColumnAlign,
  ColumnDescription,
  ExpiryDateCell,
  // LocationCell,
  NumberCell,
  useColumns,
} from '@openmsupply-client/common';
import { DraftStockOutLine } from '../../types';
import { PackQuantityCell } from '../../StockOut';

export const usePrescriptionLineEditColumns = ({
  onChange,
  // unit,
}: {
  onChange: (key: string, quantity: number) => void;
  unit: string;
}) => {
  const columns: ColumnDescription<DraftStockOutLine>[] = [
    [
      'expiryDate',
      {
        Cell: ExpiryDateCell,
        width: 100,
      },
    ],
    [
      'batch',
      {
        accessor: ({ rowData }) => rowData.stockLine?.batch,
      },
    ],
    // [
    //   'location',
    //   {
    //     accessor: ({ rowData }) => rowData.location?.code,
    //     width: 100,
    //     Cell: LocationCell,
    //   },
    // ],
    // {
    //   label: 'label.on-hold',
    //   key: 'onHold',
    //   Cell: CheckCell,
    //   accessor: ({ rowData }) => rowData.stockLine?.onHold,
    //   align: ColumnAlign.Center,
    //   width: 70,
    // },
    // {
    //   Cell: NumberCell,
    //   label: 'label.in-store',
    //   key: 'totalNumberOfPacks',
    //   align: ColumnAlign.Right,
    //   width: 80,
    //   accessor: ({ rowData }) => rowData.stockLine?.totalNumberOfPacks,
    // },
    // {
    //   Cell: NumberCell,
    //   label: 'label.available-packs',
    //   key: 'availableNumberOfPacks',
    //   align: ColumnAlign.Right,
    //   width: 85,
    //   accessor: ({ rowData }) => rowData.stockLine?.availableNumberOfPacks,
    // },
    {
      Cell: NumberCell,
      label: 'label.in-stock-units',
      key: 'totalUnits',
      align: ColumnAlign.Right,
      width: 80,
      accessor: ({ rowData }) =>
        (rowData.stockLine?.totalNumberOfPacks ?? 0) *
        (rowData.stockLine?.packSize ?? 1),
    },
    {
      Cell: NumberCell,
      label: 'label.available-units',
      key: 'availableUnits',
      align: ColumnAlign.Right,
      width: 85,
      accessor: ({ rowData }) =>
        (rowData.stockLine?.availableNumberOfPacks ?? 0) *
        (rowData.stockLine?.packSize ?? 1),
    },
    // ['packSize', { width: 90 }],
    // [
    //   'unitQuantity',
    //   {
    //     label: 'label.unit-quantity-issued',
    //     labelProps: { unit },
    //     accessor: ({ rowData }) => rowData.numberOfPacks * rowData.packSize,
    //     width: 120,
    //   },
    // ],
    {
      Cell: PackQuantityCell,
      label: 'label.units-issued',
      key: 'unitQuantity',
      align: ColumnAlign.Right,
      width: 120,
      setter: ({ packSize, id, numberOfPacks }) =>
        onChange(id, (numberOfPacks ?? 0) * (packSize ?? 1)),
      accessor: ({ rowData }) =>
        (rowData.numberOfPacks ?? 0) * (rowData.packSize ?? 1),
    },
  ];

  return useColumns(columns, {}, [onChange]);
};

// export const useExpansionColumns = (): Column<StockOutLineFragment>[] =>
//   useColumns([
//     'batch',
//     'expiryDate',
//     [
//       'location',
//       {
//         accessor: ({ rowData }) => rowData.location?.code,
//       },
//     ],
//     [
//       'itemUnit',
//       {
//         accessor: ({ rowData }) => rowData.item?.unitName,
//       },
//     ],
//     'numberOfPacks',
//     'packSize',
//     [
//       'unitQuantity',
//       {
//         accessor: ({ rowData }) => rowData.packSize * rowData.numberOfPacks,
//       },
//     ],
//   ]);
