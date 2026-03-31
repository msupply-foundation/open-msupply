import React, { useMemo } from 'react';
import {
  Box,
  ColumnDef,
  ColumnType,
  Currencies,
  CurrencyValueCell,
  MaterialTable,
  useAuthContext,
  useFormatCurrency,
  useNonPaginatedMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import { InboundLineFragment, useInboundShipment } from '../../api';

export const FinancialTab = () => {
  const t = useTranslation();
  const { store } = useAuthContext();
  const {
    query: { data, loading: isLoading },
    isExternal,
  } = useInboundShipment();

  const poCurrencyCode = data?.purchaseOrder?.currency?.code as
    | Currencies
    | undefined;
  const storeCurrencyCode = (store?.homeCurrencyCode ?? undefined) as
    | Currencies
    | undefined;
  const formatPoCurrency = useFormatCurrency(poCurrencyCode);
  const formatStoreCurrency = useFormatCurrency(storeCurrencyCode);
  const currencyRate = data?.currencyRate || 1;
  const isForeignCurrency =
    !!poCurrencyCode &&
    !!storeCurrencyCode &&
    poCurrencyCode !== storeCurrencyCode;

  const lines = data?.lines.nodes;

  const columns = useMemo(
    (): ColumnDef<InboundLineFragment>[] => [
      {
        accessorKey: 'item.name',
        header: t('label.name'),
        Footer: t('label.total'),
      },
      {
        accessorKey: 'purchaseOrderLine.lineNumber',
        header: t('label.purchase-order-line-number'),
        columnType: ColumnType.Number,
        size: 70,
      },
      {
        accessorKey: 'numberOfPacks',
        header: t('label.pack-quantity'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'item.unitName',
        header: t('label.unit-name'),
      },
      {
        accessorKey: 'purchaseOrderLine.pricePerPackAfterDiscount',
        header: `${t('label.po-price-per-pack')} (${poCurrencyCode ?? ''})`,
        columnType: ColumnType.Currency,
        Cell: ({ cell }) => (
          <CurrencyValueCell cell={cell} currencyCode={poCurrencyCode} />
        ),
      },
      {
        id: 'costPricePerPackLocal',
        header: `${t('label.pack-cost-price')} (${storeCurrencyCode ?? ''})`,
        description: t('description.po-price-converted-to-local'),
        columnType: ColumnType.Currency,
        includeColumn: isForeignCurrency,
        accessorFn: (row: InboundLineFragment) =>
          Math.round(
            ((row.purchaseOrderLine?.pricePerPackAfterDiscount ?? 0) * 100) /
              currencyRate
          ) / 100,
        Cell: ({ cell }) => (
          <CurrencyValueCell cell={cell} currencyCode={storeCurrencyCode} />
        ),
      },
      {
        accessorKey: 'sellPricePerPack',
        header: `${t('label.pack-sell-price')} (${storeCurrencyCode ?? ''})`,
        columnType: ColumnType.Currency,
        Cell: ({ cell }) => (
          <CurrencyValueCell cell={cell} currencyCode={storeCurrencyCode} />
        ),
      },
      {
        id: 'foreignCurrencyLineTotal',
        header: `${t('label.line-total')} (${poCurrencyCode ?? ''})`,
        description: t('description.line-total-in-po-currency'),
        columnType: ColumnType.Currency,
        includeColumn: isForeignCurrency,
        accessorFn: (row: InboundLineFragment) =>
          (row.purchaseOrderLine?.pricePerPackAfterDiscount ?? 0) *
          row.numberOfPacks,
        Cell: ({ cell }) => (
          <CurrencyValueCell cell={cell} currencyCode={poCurrencyCode} />
        ),
        Footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce(
              (sum, row) =>
                sum +
                (row.original.purchaseOrderLine?.pricePerPackAfterDiscount ??
                  0) *
                  row.original.numberOfPacks,
              0
            );
          return (
            <Box sx={{ textAlign: 'right', width: '100%' }}>
              {formatPoCurrency(total)}
            </Box>
          );
        },
      },
      {
        id: 'lineTotalLocal',
        header: `${t('label.line-total')} (${storeCurrencyCode ?? ''})`,
        description: t('description.line-total-in-local-currency'),
        columnType: ColumnType.Currency,
        accessorFn: (row: InboundLineFragment) =>
          Math.round(
            ((row.purchaseOrderLine?.pricePerPackAfterDiscount ?? 0) *
              row.numberOfPacks * 100) /
              currencyRate
          ) / 100,
        Cell: ({ cell }) => (
          <CurrencyValueCell cell={cell} currencyCode={storeCurrencyCode} />
        ),
        Footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce(
              (sum, row) =>
                sum +
                ((row.original.purchaseOrderLine?.pricePerPackAfterDiscount ??
                  0) *
                  row.original.numberOfPacks) /
                  currencyRate,
              0
            );
          return (
            <Box sx={{ textAlign: 'right', width: '100%' }}>
              {formatStoreCurrency(total)}
            </Box>
          );
        },
      },
      {
        id: 'adjustedLineTotal',
        header: `${t('label.adjusted-line-total')} (${storeCurrencyCode ?? ''})`,
        description: t('description.adjusted-line-total'),
        columnType: ColumnType.Currency,
        accessorFn: (row: InboundLineFragment) =>
          Math.round(row.costPricePerPack * row.numberOfPacks * 100) / 100,
        Cell: ({ cell }) => (
          <CurrencyValueCell cell={cell} currencyCode={storeCurrencyCode} />
        ),
        Footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce(
              (sum, row) =>
                sum +
                row.original.costPricePerPack * row.original.numberOfPacks,
              0
            );
          return (
            <Box sx={{ textAlign: 'right', width: '100%' }}>
              {formatStoreCurrency(total)}
            </Box>
          );
        },
      },
    ],
    [
      currencyRate,
      formatPoCurrency,
      formatStoreCurrency,
      isForeignCurrency,
      poCurrencyCode,
      storeCurrencyCode,
      t,
    ]
  );

  const { table } = useNonPaginatedMaterialTable<InboundLineFragment>({
    tableId: 'inbound-shipment-financial-tab-table',
    data: lines,
    columns,
    isLoading,
    grouping: isExternal
      ? {
          field: 'purchaseOrderLine.lineNumber',
          label: t('label.group-by-po-line'),
        }
      : { field: 'item.code' },
    enableRowSelection: false,
  });

  return <MaterialTable table={table} />;
};
