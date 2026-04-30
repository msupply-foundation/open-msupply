import React, { useMemo } from 'react';
import {
  ColumnDef,
  ColumnType,
  InvoiceLineStatusType,
  InvoiceNodeStatus,
  MaterialTable,
  useNonPaginatedMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import { useInboundShipment } from '../../api';

interface DeliveryStatusRow {
  itemCode: string;
  itemName: string;
  poLineNumber?: number;
  thisDeliveryUnits: number;
  inTransitNumberOfUnits: number;
  receivedNumberOfUnits: number;
  adjustedNumberOfUnits?: number | null;
  requestedNumberOfUnits: number;
}

export const DeliveryTab = () => {
  const t = useTranslation();
  const {
    query: { data, loading: isLoading },
  } = useInboundShipment();

  const rows = useMemo((): DeliveryStatusRow[] => {
    if (!data?.lines.nodes) return [];

    // Aggregate by item
    const grouped = new Map<string, DeliveryStatusRow>();

    for (const line of data.lines.nodes) {
      const key = line.item.id;
      const isRejected = line.status === InvoiceLineStatusType.Rejected;

      const existing = grouped.get(key);
      const units = isRejected ? 0 : line.numberOfPacks * line.packSize;

      if (existing) {
        existing.thisDeliveryUnits += units;
      } else {
        const pol = line.purchaseOrderLine;
        grouped.set(key, {
          itemCode: line.item.code,
          itemName: line.item.name,
          poLineNumber: pol?.lineNumber,
          thisDeliveryUnits: units,
          inTransitNumberOfUnits: pol?.inTransitNumberOfUnits ?? 0,
          receivedNumberOfUnits: pol?.receivedNumberOfUnits ?? 0,
          adjustedNumberOfUnits: pol?.adjustedNumberOfUnits,
          requestedNumberOfUnits: pol?.requestedNumberOfUnits ?? 0,
        });
      }
    }

    return Array.from(grouped.values());
  }, [data?.lines.nodes]);

  const isShipped = data?.status === InvoiceNodeStatus.Shipped;
  const isReceivedOrVerified =
    data?.status === InvoiceNodeStatus.Received ||
    data?.status === InvoiceNodeStatus.Verified;

  const columns = useMemo(
    (): ColumnDef<DeliveryStatusRow>[] => [
      {
        accessorKey: 'itemCode',
        header: t('label.code'),
        size: 120,
      },
      {
        accessorKey: 'itemName',
        header: t('label.name'),
        size: 200,
      },
      {
        id: 'previousDeliveries',
        accessorFn: row => {
          const received = row.receivedNumberOfUnits;
          return isReceivedOrVerified
            ? received - row.thisDeliveryUnits
            : received;
        },
        header: t('label.previous-deliveries'),
        description: t('description.previous-deliveries'),
        columnType: ColumnType.Number,
      },
      {
        id: 'thisDelivery',
        accessorFn: row => (isShipped ? 0 : row.thisDeliveryUnits),
        header: t('label.this-delivery'),
        columnType: ColumnType.Number,
      },
      {
        id: 'inTransit',
        accessorFn: row => {
          const inTransit = row.inTransitNumberOfUnits;
          // When delivered, this shipment is counted in in_transit by the DB
          // but should show as "this delivery" instead
          return data?.status === InvoiceNodeStatus.Delivered
            ? inTransit - row.thisDeliveryUnits
            : inTransit;
        },
        header: t('label.in-transit'),
        columnType: ColumnType.Number,
      },
      {
        id: 'remainingToDeliver',
        accessorFn: row => {
          const poQuantity =
            row.adjustedNumberOfUnits ?? row.requestedNumberOfUnits;
          const thisDelivery = isShipped ? 0 : row.thisDeliveryUnits;
          const previousDeliveries = isReceivedOrVerified
            ? row.receivedNumberOfUnits - row.thisDeliveryUnits
            : row.receivedNumberOfUnits;
          const inTransit =
            data?.status === InvoiceNodeStatus.Delivered
              ? row.inTransitNumberOfUnits - row.thisDeliveryUnits
              : row.inTransitNumberOfUnits;
          return poQuantity - previousDeliveries - thisDelivery - inTransit;
        },
        header: t('label.remaining'),
        description: t('description.remaining-to-deliver'),
        columnType: ColumnType.Number,
      },
      {
        id: 'poQuantity',
        accessorFn: row =>
          row.adjustedNumberOfUnits ?? row.requestedNumberOfUnits,
        header: t('label.po-quantity'),
        columnType: ColumnType.Number,
      },
    ],
    [data?.status, isShipped, isReceivedOrVerified, t]
  );

  const { table } = useNonPaginatedMaterialTable<DeliveryStatusRow>({
    tableId: 'inbound-shipment-delivery-tab-table',
    data: rows,
    columns,
    isLoading,
    enableRowSelection: false,
  });

  return <MaterialTable table={table} />;
};
