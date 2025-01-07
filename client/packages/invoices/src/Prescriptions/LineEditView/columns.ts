import {
  ColumnAlign,
  ColumnDescription,
  ExpiryDateCell,
  NumberCell,
  NumUtils,
  useColumns,
} from '@openmsupply-client/common';
import { DraftStockOutLine } from '../../types';
import { UnitQuantityCell } from '../../StockOut';

export const usePrescriptionLineEditColumns = ({
  onChange,
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
    {
      Cell: UnitQuantityCell,
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
