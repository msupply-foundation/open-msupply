import {
  ColumnDef,
  useTranslation,
  ColumnType,
  weightedAverage,
} from '@openmsupply-client/common';
import { SupplierReturnLineFragment } from '../api';
import { useMemo } from 'react';

export const useSupplierReturnColumns = () => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<SupplierReturnLineFragment>[] => [
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
        accessorKey: 'numberOfPacks',
        header: t('label.num-packs'),
        columnType: ColumnType.Number,
        aggregationFn: 'sum',
        enableSorting: true,
      },
      {
        id: 'totalQuantity',
        accessorFn: row => row.packSize * row.numberOfPacks,
        header: t('label.total-quantity'),
        columnType: ColumnType.Number,
        aggregationFn: 'sum',
        enableSorting: true,
      },
      {
        accessorKey: 'costPricePerPack',
        header: t('label.unit-price'),
        columnType: ColumnType.Currency,
        aggregationFn: weightedAverage,
        enableSorting: true,
      },
      {
        id: 'lineTotal',
        accessorFn: row => row.costPricePerPack * row.numberOfPacks,
        header: t('label.line-total'),
        columnType: ColumnType.Currency,
        aggregationFn: 'sum',
        enableSorting: true,
      },
    ],
    []
  );

  return columns;
};
