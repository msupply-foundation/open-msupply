import React, { useMemo } from 'react';
import {
  Box,
  ColumnDef,
  ColumnType,
  getLinesFromRow,
  TextWithTooltipCell,
  useFormatCurrency,
  useTranslation,
} from '@openmsupply-client/common';
import { PurchaseOrderLineFragment } from '../api';
import { usePurchaseOrderLineErrorContext } from '../context';

export const usePurchaseOrderColumns = () => {
  const t = useTranslation();
  const formatCurrency = useFormatCurrency();
  const { getError } = usePurchaseOrderLineErrorContext();

  return useMemo((): ColumnDef<PurchaseOrderLineFragment>[] => {
    return [
      {
        accessorKey: 'lineNumber',
        header: t('label.line-number'),
        columnType: ColumnType.Number,
        size: 60,
        enableSorting: true,
      },
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        size: 130,
        getIsError: row =>
          getLinesFromRow(row).some(
            r => getError(r)?.__typename === 'ItemCannotBeOrdered'
          ),
        enableColumnFilter: true,
        enableSorting: true,
        Footer: t('label.total'),
      },
      {
        accessorKey: 'item.name',
        header: t('label.item-name'),
        Cell: TextWithTooltipCell,
        size: 350,
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        accessorKey: 'numberOfPacks',
        header: t('label.num-packs'),
        columnType: ColumnType.Number,
        accessorFn: row => {
          const numUnits =
            row.adjustedNumberOfUnits ?? row.requestedNumberOfUnits;
          return Math.ceil(numUnits / row.requestedPackSize);
        },
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        accessorFn: row => row.requestedPackSize,
        size: 90,
      },
      {
        accessorKey: 'requestedNumberOfUnits',
        header: t('label.requested-units'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'adjustedNumberOfUnits',
        header: t('label.adjusted-units'),
        columnType: ColumnType.Number,
      },
      {
        // TODO: Goods received calculation
        accessorKey: 'totalReceived',
        header: t('label.total-received'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'stockOnHand',
        header: t('label.soh'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        accessorFn: row => row.item.stats.stockOnHand ?? 0,
      },
      {
        accessorKey: 'unitsOrderedInOthers',
        header: t('label.on-order'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'totalCost',
        header: t('label.total-cost'),
        columnType: ColumnType.Currency,
        accessorFn: row => {
          const units =
            row.adjustedNumberOfUnits ?? row.requestedNumberOfUnits ?? 0;
          const packSize = row.requestedPackSize || 1;
          return (row.pricePerPackAfterDiscount ?? 0) * (units / packSize);
        },
        Footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => {
              const { original } = row;
              const units =
                original.adjustedNumberOfUnits ??
                original.requestedNumberOfUnits ??
                0;
              const packSize = original.requestedPackSize || 1;
              return (
                sum +
                (original.pricePerPackAfterDiscount ?? 0) *
                  (units / packSize)
              );
            }, 0);
          return (
            <Box sx={{ textAlign: 'right', width: '100%' }}>
              {formatCurrency(total)}
            </Box>
          );
        },
      },
      {
        accessorKey: 'requestedDeliveryDate',
        header: t('label.requested-delivery-date'),
        columnType: ColumnType.Date,
      },
      {
        accessorKey: 'expectedDeliveryDate',
        header: t('label.expected-delivery-date'),
        columnType: ColumnType.Date,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getError]);
};
