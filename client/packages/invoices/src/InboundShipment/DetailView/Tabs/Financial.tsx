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
  } = useInboundShipment();

  const poCurrencyCode = data?.purchaseOrder?.currency?.code as
    | Currencies
    | undefined;
  const storeCurrencyCode = (store?.homeCurrencyCode ?? undefined) as
    | Currencies
    | undefined;
  const formatPoCurrency = useFormatCurrency(poCurrencyCode);
  const formatStoreCurrency = useFormatCurrency(storeCurrencyCode);

  const lines = data?.lines.nodes;

  const columns = useMemo(
    (): ColumnDef<InboundLineFragment>[] => [
      {
        accessorKey: 'item.name',
        header: t('label.name'),
        Footer: t('label.total'),
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
        accessorKey: 'costPricePerPack',
        header: `${t('label.pack-cost-price')} (${storeCurrencyCode ?? ''})`,
        columnType: ColumnType.Currency,
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
        accessorKey: 'foreignCurrencyPriceBeforeTax',
        header: `${t('label.line-total')} (${poCurrencyCode ?? ''})`,
        columnType: ColumnType.Currency,
        Cell: ({ cell }) => (
          <CurrencyValueCell cell={cell} currencyCode={poCurrencyCode} />
        ),
        Footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce(
              (sum, row) =>
                sum + (row.original.foreignCurrencyPriceBeforeTax ?? 0),
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
        accessorKey: 'totalAfterTax',
        header: `${t('label.line-total')} (${storeCurrencyCode ?? ''})`,
        columnType: ColumnType.Currency,
        Cell: ({ cell }) => (
          <CurrencyValueCell cell={cell} currencyCode={storeCurrencyCode} />
        ),
        Footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce(
              (sum, row) => sum + (row.original.totalAfterTax ?? 0),
              0
            );
          return (
            <Box sx={{ textAlign: 'right', width: '100%' }}>
              {formatStoreCurrency(total)}
            </Box>
          );
        },
      },
      // TODO: calculate these
      //  accessorKey: 'adjustedTotalLocal',
      //   header: t('label.adjusted-total-local'),
      //   columnType: ColumnType.Currency,
      // },
    ],
    [formatPoCurrency, formatStoreCurrency, poCurrencyCode, storeCurrencyCode]
  );

  const { table } = useNonPaginatedMaterialTable<InboundLineFragment>({
    tableId: 'inbound-shipment-financial-tab-table',
    data: lines,
    columns,
    isLoading,
    grouping: { field: 'item.code' },
    enableRowSelection: false,
  });

  return <MaterialTable table={table} />;
};
