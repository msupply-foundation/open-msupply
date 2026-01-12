import React, { useMemo } from 'react';
import {
  ArrayUtils,
  InvoiceLineNodeType,
  useTranslation,
  usePreferences,
  ColumnDef,
  Groupable,
  ColumnType,
  Box,
} from '@openmsupply-client/common';
import { StockOutLineFragment } from '../../StockOut';

const isDefaultPlaceholderRow = (row: StockOutLineFragment) =>
  row.type === InvoiceLineNodeType.UnallocatedStock && !row.numberOfPacks;

export const useOutboundColumns = () => {
  const t = useTranslation();
  const { manageVaccinesInDoses, manageVvmStatusForStock } = usePreferences();

  const columns = useMemo(() => {
    const cols: ColumnDef<Groupable<StockOutLineFragment>>[] = [
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
        enableSorting: true,
        defaultHideOnMobile: true,
      },
      {
        id: 'expiryDate',
        // expiryDate is a string - use accessorFn to convert to Date object for sort and filtering
        accessorFn: row => (row.expiryDate ? new Date(row.expiryDate) : null),
        header: t('label.expiry-date'),
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
        enableColumnFilter: true,
        enableSorting: true,
        defaultHideOnMobile: true,
      },
      {
        id: 'itemUnit',
        accessorKey: 'item.unitName',
        header: t('label.unit-name'),
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
        header: t('label.doses-per-unit'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        includeColumn: manageVaccinesInDoses,
        accessorFn: row => (row.item.isVaccine ? row.item.doses : undefined),
      },
      {
        accessorKey: 'numberOfPacks',
        header: t('label.pack-quantity'),
        columnType: ColumnType.Number,
        accessorFn: row => {
          if ('subRows' in row)
            return ArrayUtils.getSum(row.subRows ?? [], 'numberOfPacks');

          return row.numberOfPacks;
        },
      },
      {
        id: 'unitQuantity',
        header: t('label.unit-quantity'),
        description: t('description.unit-quantity'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        accessorFn: row => {
          if ('subRows' in row)
            return ArrayUtils.getUnitQuantity(row.subRows ?? []);

          return row.packSize * row.numberOfPacks;
        },
      },
      {
        id: 'doseQuantity',
        header: t('label.doses'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        includeColumn: manageVaccinesInDoses,
        accessorFn: row => {
          if (!row.item.isVaccine) return null;
          if ('subRows' in row)
            return (
              ArrayUtils.getUnitQuantity(row.subRows ?? []) *
              (row.item.doses ?? 1)
            );

          return row.packSize * row.numberOfPacks * (row.item.doses ?? 1);
        },
      },
      {
        id: 'unitSellPrice',
        header: t('label.unit-sell-price'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
        accessorFn: rowData => {
          if ('subRows' in rowData) {
            return ArrayUtils.getAveragePrice(
              rowData.subRows ?? [],
              'sellPricePerPack'
            );
          } else {
            if (isDefaultPlaceholderRow(rowData)) return undefined;
            return (rowData.sellPricePerPack ?? 0) / rowData.packSize;
          }
        },
      },
      {
        id: 'total',
        header: t('label.total'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
        accessorFn: rowData => {
          if ('subRows' in rowData) {
            return Object.values(rowData.subRows ?? []).reduce(
              (sum, batch) =>
                sum + batch.sellPricePerPack * batch.numberOfPacks,
              0
            );
          } else {
            if (isDefaultPlaceholderRow(rowData)) return '';

            const x = rowData.sellPricePerPack * rowData.numberOfPacks;
            return x;
          }
        },
      },
      {
        id: 'volume',
        header: t('label.volume'),
        size: 100,
        columnType: ColumnType.Number,
        accessorFn: rowData => {
          if ('subRows' in rowData) {
            return (rowData.subRows ?? []).reduce(
              (sum, batch) =>
                sum +
                (batch.stockLine?.volumePerPack ?? 0) * batch.numberOfPacks,
              0
            );
          } else {
            return (
              (rowData.stockLine?.volumePerPack ?? 0) * rowData.numberOfPacks
            );
          }
        },
        Footer: ({ table }) => {
          const totalVolume = table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => {
              const rowVolume = row.original.subRows
                ? row.original.subRows.reduce(
                    (subSum, subRow) =>
                      subSum +
                      (subRow.stockLine?.volumePerPack ?? 0) *
                        subRow.numberOfPacks,
                    0
                  )
                : (row.original.stockLine?.volumePerPack ?? 0) *
                  row.original.numberOfPacks;
              return sum + rowVolume;
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
  }, [manageVvmStatusForStock, manageVaccinesInDoses]);

  return columns;
};
