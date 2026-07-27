import { type Component } from 'solid-js';
import { t } from '../../../../intl';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import { getNumberCell } from '../../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../../api/createTableConfig';
import type {
  InboundInfoFragment,
  InboundLineFragment,
} from '../inboundShipmentDetail.generated';

type Line = InboundLineFragment;

// One aggregated row per item — every figure in UNITS (contract → Financial &
// Delivery tab derivation).
type DeliveryRow = {
  itemId: string;
  code: string;
  name: string;
  previous: number;
  thisDelivery: number;
  inTransit: number;
  remaining: number;
  poQuantity: number;
};

// The detail "Delivery" tab (spec S3 tabs → Delivery; contract → Financial &
// Delivery tab derivation). Lines are aggregated into one row per item; three
// columns (previous deliveries, this delivery, in transit) shift with the
// shipment's status so that as it moves Shipped → Delivered → Received/Verified
// each unit is counted in exactly one column, never double-counted.
export const InboundDeliveryPanel: Component<{
  node: InboundInfoFragment;
  rows: Line[];
}> = props => {
  // Page-owned column config, matching the Details line table — surfaces the
  // column-settings and card-view controls in the toolbar.
  const tableConfig = createTableConfig({
    tableId: 'inbound-shipment-delivery',
  });

  // Aggregate the lines into per-item rows, then apply the status-dependent
  // shifts. `thisDelivery` sums this shipment's received units for the item (a
  // REJECTED line counts nothing); the PO-line figures (in transit, received,
  // ordered) are taken from the first line seen for the item.
  const deliveryRows = (): DeliveryRow[] => {
    const status = props.node.status;
    const byItem = new Map<
      string,
      {
        code: string;
        name: string;
        thisDelivery: number;
        received: number;
        inTransit: number;
        poQuantity: number;
      }
    >();

    for (const line of props.rows) {
      const existing = byItem.get(line.itemId);
      const contributes =
        line.status === 'REJECTED' ? 0 : line.numberOfPacks * line.packSize;
      const po = line.purchaseOrderLine;
      if (existing) {
        existing.thisDelivery += contributes;
      } else {
        byItem.set(line.itemId, {
          code: line.itemCode,
          name: line.itemName,
          thisDelivery: contributes,
          received: po?.receivedNumberOfUnits ?? 0,
          inTransit: po?.inTransitNumberOfUnits ?? 0,
          poQuantity:
            po?.adjustedNumberOfUnits ?? po?.requestedNumberOfUnits ?? 0,
        });
      }
    }

    return [...byItem.entries()].map(([itemId, agg]) => {
      // Previous deliveries: earlier deliveries only — once this shipment is
      // Received/Verified its units are already inside the PO received total,
      // so back them out.
      const previous =
        status === 'RECEIVED' || status === 'VERIFIED'
          ? agg.received - agg.thisDelivery
          : agg.received;
      // This delivery: nothing yet while merely Shipped.
      const thisDelivery = status === 'SHIPPED' ? 0 : agg.thisDelivery;
      // In transit: at Delivered the server still counts this shipment as
      // in-transit, so back it out.
      const inTransit =
        status === 'DELIVERED'
          ? agg.inTransit - agg.thisDelivery
          : agg.inTransit;
      // Remaining uses those same status-adjusted values (not independently
      // clamped ≥ 0).
      const remaining = agg.poQuantity - previous - thisDelivery - inTransit;
      return {
        itemId,
        code: agg.code,
        name: agg.name,
        previous,
        thisDelivery,
        inTransit,
        remaining,
        poQuantity: agg.poQuantity,
      };
    });
  };

  const columns = (): Column<DeliveryRow, never>[] => [
    {
      c: { key: 'code' },
      header: () => t('label.code'),
    },
    {
      c: { key: 'name' },
      header: () => t('label.name'),
    },
    {
      c: { key: 'previous' },
      header: () => t('label.previous-deliveries'),
      ...getNumberCell(),
    },
    {
      c: { key: 'thisDelivery' },
      header: () => t('label.this-delivery'),
      ...getNumberCell(),
    },
    {
      c: { key: 'inTransit' },
      header: () => t('label.in-transit'),
      ...getNumberCell(),
    },
    {
      c: { key: 'remaining' },
      header: () => t('label.remaining'),
      ...getNumberCell(),
    },
    {
      c: { key: 'poQuantity' },
      header: () => t('label.po-quantity'),
      ...getNumberCell(),
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={deliveryRows()}
      rowKey={row => row.itemId}
      config={tableConfig.config()}
      setConfig={tableConfig.setConfig}
      onSaveGlobalDefault={
        tableConfig.canSaveGlobalDefault()
          ? tableConfig.saveGlobalTableConfig
          : undefined
      }
      emptyMessage={t('error.no-inbound-items')}
    />
  );
};
