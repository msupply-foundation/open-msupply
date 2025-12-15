import { useMemo } from 'react';
import {
  ColumnDef,
  useTranslation,
  ColumnType,
  Groupable,
} from '@openmsupply-client/common';
import { CustomerReturnLineFragment } from '../api';

export const useCustomerReturnColumns = () => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<Groupable<CustomerReturnLineFragment>>[] => [
      {
        accessorKey: 'itemCode',
        header: t('label.code'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'itemName',
        header: t('label.name'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'expiryDate',
        accessorFn: row => (row.expiryDate ? new Date(row.expiryDate) : null),
        header: t('label.expiry'),
        columnType: ColumnType.Date,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'item.unitName',
        header: t('label.unit'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        columnType: ColumnType.Number,
        enableSorting: true,
      },
      {
        id: 'numberOfPacks',
        accessorFn: row => {
          if (row.subRows)
            return row.subRows.reduce((total, line) => total + line.numberOfPacks, 0);
          return row.numberOfPacks;
        },
        header: t('label.num-packs'),
        columnType: ColumnType.Number,
        enableSorting: true,
      },
      {
        id: 'totalQuantity',
        accessorFn: row => {
          if (row.subRows)
            return row.subRows.reduce((total, line) => total + line.packSize * line.numberOfPacks, 0);
          return row.packSize * row.numberOfPacks;
        },
        header: t('label.total-quantity'),
        columnType: ColumnType.Number,
        enableSorting: true,
      }
    ],
    [],
  );

  return columns;
};
