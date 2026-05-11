import React, { useMemo } from 'react';
import {
  InvoiceLineNodeType,
  useTranslation,
  usePreferences,
  ColumnDef,
  ColumnType,
  Box,
  weightedAverageByUnits,
} from '@openmsupply-client/common';
import { StockOutLineFragment } from '../../StockOut';

const isDefaultPlaceholderRow = (row: StockOutLineFragment) =>
  row.type === InvoiceLineNodeType.UnallocatedStock && !row.numberOfPacks;

export const useOutboundColumns = () => {
  const t = useTranslation();
  const { manageVaccinesInDoses, manageVvmStatusForStock } = usePreferences();

  const columns = useMemo(() => {
    const cols: ColumnDef<StockOutLineFragment>[] = [
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        size: 120,
        pin: 'left',
        enableColumnFilter: true,
        enableSorting: true,
        Footer: t('label.total'),
      },
      {
        accessorKey: 'itemName',
        header: t('label.name'),
        size: 400,
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 110,
        enableSorting: true,
        defaultHideOnMobile: true,
      },
      {
        id: 'expiryDate',
        // expiryDate is a string - use accessorFn to convert to Date object for sort and filtering
        accessorFn: row => (row.expiryDate ? new Date(row.expiryDate) : null),
        header: t('label.expiry-date'),
        size: 110,
        columnType: ColumnType.Date,
        defaultHideOnMobile: true,
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        id: 'vvmStatus',
        accessorFn: row => row.vvmStatus?.description ?? '',
        header: t('label.vvm-status'),
        includeColumn: manageVvmStatusForStock,
        // TO-DO: Handle "null" values in filter - see issue #9398
        // enableColumnFilter: true,
        // filterVariant: 'select',
        defaultHideOnMobile: true,
        enableSorting: true,
      },
      {
        id: 'locationCode',
        accessorFn: row => row.location?.code ?? '',
        header: t('label.location'),
        size: 120,
        enableColumnFilter: true,
        enableSorting: true,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'item.unitName',
        header: t('label.unit-name'),
        size: 100,
        enableColumnFilter: true,
        filterVariant: 'select',
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        enableSorting: true,
      },
      {
        id: 'itemDoses',
        accessorFn: row => (row.item.isVaccine ? row.item.doses : undefined),
        header: t('label.doses-per-unit'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        includeColumn: manageVaccinesInDoses,
      },
      {
        accessorKey: 'numberOfPacks',
        header: t('label.pack-quantity'),
        columnType: ColumnType.Number,
        aggregationFn: 'sum',
        enableSorting: true,
      },
      {
        id: 'unitQuantity',
        header: t('label.unit-quantity'),
        description: t('description.unit-quantity'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        accessorFn: row => row.packSize * row.numberOfPacks,
        aggregationFn: 'sum',
      },
      {
        id: 'doseQuantity',
        header: t('label.doses'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        includeColumn: manageVaccinesInDoses,
        accessorFn: row => {
          if (!row.item.isVaccine) return null;
          return row.packSize * row.numberOfPacks * (row.item.doses ?? 1);
        },
        aggregationFn: 'sum',
      },
      {
        id: 'unitSellPrice',
        header: t('label.unit-sell-price'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
        accessorFn: row => {
          if (isDefaultPlaceholderRow(row)) return undefined;
          return (row.sellPricePerPack ?? 0) / row.packSize;
        },
        aggregationFn: weightedAverageByUnits(),
      },
      {
        id: 'total',
        header: t('label.total'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
        accessorFn: row => {
          if (isDefaultPlaceholderRow(row)) return '';
          return row.sellPricePerPack * row.numberOfPacks;
        },
        aggregationFn: 'sum',
      },
      {
        id: 'volume',
        header: t('label.volume'),
        size: 100,
        columnType: ColumnType.Number,
        accessorFn: row =>
          (row.stockLine?.volumePerPack ?? 0) * row.numberOfPacks,
        aggregationFn: 'sum',
        Footer: ({ table }) => {
          const totalVolume = table
            .getFilteredRowModel()
            .flatRows.reduce((sum, row) => {
              return (
                sum +
                (row.original.stockLine?.volumePerPack ?? 0) *
                  row.original.numberOfPacks
              );
            }, 0);
          return (
            <Box
              sx={{
                textAlign: 'right',
                width: '100%',
              }}
            >
              {totalVolume}
            </Box>
          );
        },
      },
    ];

    return cols;
  }, [t, manageVvmStatusForStock, manageVaccinesInDoses]);

  return columns;
};
