import { useMemo } from 'react';
import {
  useTranslation,
  ColumnDef,
  ColumnType,
} from '@openmsupply-client/common';
import { StockMovementLineFragment } from '../api';

export const useStockMovementColumns = () => {
  const t = useTranslation();

  return useMemo((): ColumnDef<StockMovementLineFragment>[] => {
    return [
      {
        accessorKey: 'stockLine.item.code',
        header: t('label.code'),
        pin: 'left',
        size: 120,
        enableSorting: true,
      },
      {
        accessorKey: 'stockLine.item.name',
        header: t('label.name'),
        size: 300,
        enableSorting: true,
      },
      {
        accessorKey: 'stockLine.batch',
        header: t('label.batch'),
        size: 110,
        enableSorting: true,
      },
      {
        id: 'expiryDate',
        accessorFn: row =>
          row.stockLine?.expiryDate ? new Date(row.stockLine.expiryDate) : null,
        header: t('label.expiry-date'),
        size: 110,
        columnType: ColumnType.Date,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'stockLine.totalNumberOfPacks',
        header: t('label.packs-in-stock'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'stockLine.packSize',
        header: t('label.pack-size'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
      },
      {
        id: 'sourceLocation',
        accessorFn: row => row.sourceLocation?.code ?? '',
        header: t('label.source-location'),
        size: 120,
      },
      {
        id: 'destinationLocation',
        accessorFn: row => row.destinationLocation?.code ?? '',
        header: t('label.destination-location'),
        size: 120,
      },
      {
        accessorKey: 'numberOfPacks',
        header: t('label.packs-to-move'),
        columnType: ColumnType.Number,
        aggregationFn: 'sum',
      },
    ];
  }, [t]);
};
