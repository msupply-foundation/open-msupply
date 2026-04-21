import React, { useCallback, useMemo } from 'react';
import {
  Box,
  ColumnDef,
  ColumnType,
  CurrencyValueCell,
  Currencies,
  NumUtils,
  PurchaseOrderLineStatusNode,
  getLinesFromRow,
  TextWithTooltipCell,
  useCurrency,
  useFormatCurrency,
  useTranslation,
} from '@openmsupply-client/common';
import { PurchaseOrderLineFragment } from '../api';
import { usePurchaseOrderLineErrorContext } from '../context';
import { getPurchaseOrderLineStatusTranslator } from '../../utils';

export const usePurchaseOrderColumns = (currencyCode?: string) => {
  const t = useTranslation();
  const currency = currencyCode as Currencies | undefined;
  const formatCurrency = useFormatCurrency(currency);
  const { options: currencyOptions } = useCurrency(currency);
  const { getError } = usePurchaseOrderLineErrorContext();
  const lineStatusTranslator = useCallback(
    (status: PurchaseOrderLineStatusNode) =>
      getPurchaseOrderLineStatusTranslator(t)(status),
    [t]
  );

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
        accessorKey: 'status',
        header: t('label.status'),
        size: 100,
        accessorFn: row => lineStatusTranslator(row.status),
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
        accessorKey: 'shippedNumberOfUnits',
        header: t('label.shipped-units'),
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
        header: t('label.line-cost'),
        columnType: ColumnType.Currency,
        Cell: props => <CurrencyValueCell {...props} currencyCode={currency} />,
        accessorFn: row => row.lineTotal ?? 0,
        Footer: ({ table }) => {
          const total = NumUtils.round(
            table.getFilteredRowModel().rows.reduce((sum, row) => {
              return sum + (row.original.lineTotal ?? 0);
            }, 0),
            currencyOptions.precision
          );
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
  }, [
    getError,
    lineStatusTranslator,
    currencyCode,
    formatCurrency,
    currencyOptions,
  ]);
};
