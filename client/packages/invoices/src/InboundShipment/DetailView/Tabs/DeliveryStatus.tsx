import React, { useMemo } from 'react';
import {
  ColumnDef,
  ColumnType,
  Groupable,
  InvoiceNodeStatus,
  MaterialTable,
  StatusCell,
  useNonPaginatedMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import { InboundLineFragment, useInboundShipment } from '../../api';
import { useInvoiceLineStatusMap } from '..';

export const DeliveryTab = ({
  showLineStatus,
}: {
  showLineStatus: boolean;
}) => {
  const t = useTranslation();
  const {
    query: { data, loading: isLoading },
  } = useInboundShipment();
  const statusMap = useInvoiceLineStatusMap();

  const previousDeliveries = (row: InboundLineFragment) => {
    const received = row.purchaseOrderLine?.receivedNumberOfUnits ?? 0;
    return data?.status === InvoiceNodeStatus.Received ||
      data?.status === InvoiceNodeStatus.Verified
      ? received - row.numberOfPacks * row.packSize
      : received;
  };

  const inTransit = (row: InboundLineFragment) => {
    const inTransit = row.purchaseOrderLine?.inTransitNumberOfUnits ?? 0;
    return data?.status === InvoiceNodeStatus.Delivered
      ? inTransit - row.numberOfPacks * row.packSize
      : inTransit;
  };

  const columns = useMemo(
    (): ColumnDef<Groupable<InboundLineFragment>>[] => [
      {
        accessorKey: 'status',
        header: t('label.auth-status'),
        enableColumnFilter: true,
        filterVariant: 'select',
        includeColumn: showLineStatus,
        Cell: ({ cell }) => <StatusCell cell={cell} statusMap={statusMap} />,
      },
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        size: 120,
      },
      {
        accessorKey: 'item.name',
        header: t('label.name'),
        size: 200,
      },
      {
        id: 'previousDeliveries',
        accessorFn: previousDeliveries,
        header: t('label.previous-deliveries'),
        description: t('description.previous-deliveries'),
        columnType: ColumnType.Number,
      },
      {
        id: 'thisDelivery',
        accessorFn: row => row.numberOfPacks * row.packSize,
        header: t('label.this-delivery'),
        columnType: ColumnType.Number,
      },
      // confusing name and not very useful?
      // {
      //   id: 'totalDelivered',
      //   accessorFn: row => (row.purchaseOrderLine?.receivedNumberOfUnits ?? 0) + (row.numberOfPacks * row.packSize),
      //   header: t('label.total-delivered'),
      //   columnType: ColumnType.Number,
      // },
      {
        id: 'inTransit',
        accessorFn: inTransit,
        header: t('label.in-transit'),
        columnType: ColumnType.Number,
      },
      {
        id: 'poQuantity',
        accessorFn: row =>
          row.purchaseOrderLine?.adjustedNumberOfUnits ??
          row.purchaseOrderLine?.requestedNumberOfUnits,
        header: t('label.po-quantity'),
        columnType: ColumnType.Number,
      },
      {
        id: 'remainingToDeliver',
        accessorFn: row =>
          (row.purchaseOrderLine?.adjustedNumberOfUnits ??
            row.purchaseOrderLine?.requestedNumberOfUnits ??
            0) -
          (row.purchaseOrderLine?.receivedNumberOfUnits ?? 0) -
          (row.purchaseOrderLine?.inTransitNumberOfUnits ?? 0),
        header: t('label.remaining'),
        description: t('description.remaining-to-deliver'),
        columnType: ColumnType.Number,
      },
    ],
    [inTransit, previousDeliveries, statusMap]
  );

  const { table } = useNonPaginatedMaterialTable<
    Groupable<InboundLineFragment>
  >({
    tableId: 'inbound-shipment-delivery-tab-table',
    data: data?.lines.nodes,
    columns,
    isLoading,
    grouping: { enabled: true },
    enableRowSelection: false,
  });

  return <MaterialTable table={table} />;
};
