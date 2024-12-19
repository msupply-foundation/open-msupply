import {
  // CheckCell,
  // Column,
  ColumnAlign,
  ColumnDescription,
  ExpiryDateCell,
  // LocationCell,
  NumberCell,
  NumUtils,
  useColumns,
} from '@openmsupply-client/common';
import { DraftStockOutLine } from '../../types';
import { PackQuantityCell } from '../../StockOut';

export const usePrescriptionLineEditColumns = ({
  onChange,
  // unit,
}: {
  onChange: (key: string, numPacks: number) => void;
  unit: string;
}) => {
  const columns: ColumnDescription<
    DraftStockOutLine & { unitQuantity?: number }
  >[] = [
    [
      'expiryDate',
      {
        Cell: ExpiryDateCell,
        width: 80,
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
    ['packSize', { width: 90 }],
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
      setter: ({ packSize, id, unitQuantity }) =>
        onChange(id, (unitQuantity ?? 0) / (packSize ?? 1)),
      accessor: ({ rowData }) =>
        NumUtils.round(
          (rowData.numberOfPacks ?? 0) * (rowData.packSize ?? 1),
          3
        ),
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
//         accessor: ({ rowData }) => rowData. rowData.numberOfPacks,
//       },
//     ],
//   ]);
