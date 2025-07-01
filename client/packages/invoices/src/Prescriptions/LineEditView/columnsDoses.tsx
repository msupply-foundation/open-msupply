import React from 'react';
import {
  CellProps,
  ColumnAlign,
  ColumnDescription,
  NumberCell,
  NumberInputCell,
} from '@openmsupply-client/common';
import {
  getDoseQuantity,
  packsToDoses,
  DraftStockOutLineFragment,
} from '../../StockOut';

export const getPrescriptionLineDosesColumns = (
  allocate: (key: string, numPacks: number) => void
): ColumnDescription<DraftStockOutLineFragment>[] => [
  {
    Cell: NumberCell,
    label: 'label.doses-available',
    key: 'availableDoses',
    align: ColumnAlign.Right,
    width: 85,
    accessor: ({ rowData }) => packsToDoses(rowData.availablePacks, rowData),
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
      allocate(row.id, row.dosesIssued ?? 0);
    },
    accessor: ({ rowData }) => getDoseQuantity(rowData),
  },
];

const DoseQuantityCell = (props: CellProps<DraftStockOutLineFragment>) => (
  <NumberInputCell
    {...props}
    max={packsToDoses(props.rowData.availablePacks, props.rowData)}
    slotProps={{ htmlInput: { sx: { backgroundColor: 'white' } } }}
    decimalLimit={0}
    min={0}
  />
);
