import React, { useMemo } from 'react';
import {
  ColumnDef,
  ColumnType,
  Groupable,
  MaterialTable,
  useNonPaginatedMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import { InboundLineFragment, useInboundShipment } from '../../api';

export const FinancialTab = () => {
  const t = useTranslation();
  const {
    query: { data, loading: isLoading },
  } = useInboundShipment();

  const columns = useMemo(
    (): ColumnDef<Groupable<InboundLineFragment>>[] => [
      {
        accessorKey: 'item.name',
        header: t('label.name'),
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
        header: t('label.po-price-per-pack'),
        columnType: ColumnType.Currency,
      },
      {
        accessorKey: 'costPricePerPack',
        header: t('label.pack-cost-price'),
        columnType: ColumnType.Currency,
      },
      {
        accessorKey: 'totalAfterTax',
        header: t('label.line-total'),
        columnType: ColumnType.Currency,
      },
      // TODO: calculate these
      // {
      //   accessorKey: 'lineTotalLocal',
      //   header: t('label.line-total-local'),
      //   columnType: ColumnType.Currency,
      // },
      // {
      //   accessorKey: 'adjustedTotalLocal',
      //   header: t('label.adjusted-total-local'),
      //   columnType: ColumnType.Currency,
      // },
      // {
      //   accessorKey: 'sellPricePerPack',
      //   header: t('label.pack-sell-price'),
      //   columnType: ColumnType.Currency,
      // },
    ],
    []
  );

  const { table } = useNonPaginatedMaterialTable<
    Groupable<InboundLineFragment>
  >({
    tableId: 'inbound-shipment-financial-tab-table',
    data: data?.lines.nodes,
    columns,
    isLoading,
    grouping: { enabled: true },
    enableRowSelection: false,
  });

  return <MaterialTable table={table} />;
};
