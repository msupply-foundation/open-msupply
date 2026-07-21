import { type Component } from 'solid-js';
import { t } from '../../../../intl';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import { getNumberCell } from '../../../../ui/elements/table/tableHelpers';
import type { InboundLineFragment } from '../inboundShipmentDetail.generated';

type Line = InboundLineFragment;

// The detail "Delivery" tab (spec S3 tabs → Delivery; PO-linked shipments
// only): per item — previous deliveries, this delivery, in transit, remaining,
// and the PO's requested quantity. Derived from the linked purchase-order
// line's unit figures. Header-level capture; the finer aggregation isn't fully
// specced.
export const InboundDeliveryPanel: Component<{ rows: Line[] }> = props => {
  const thisDelivery = (line: Line) => line.numberOfPacks * line.packSize;
  const remaining = (line: Line) => {
    const po = line.purchaseOrderLine;
    if (!po) return 0;
    return Math.max(
      0,
      po.requestedNumberOfUnits -
        po.receivedNumberOfUnits -
        po.inTransitNumberOfUnits
    );
  };

  const columns = (): Column<Line, never>[] => [
    {
      c: { accessor: line => line.itemName, id: 'itemName' },
      header: t('label.name'),
    },
    {
      c: {
        accessor: line => line.purchaseOrderLine?.requestedNumberOfUnits ?? '',
        id: 'requested',
      },
      header: t('label.requested-quantity'),
      ...getNumberCell(),
    },
    {
      c: {
        accessor: line => line.purchaseOrderLine?.receivedNumberOfUnits ?? '',
        id: 'previous',
      },
      header: t('label.previous-deliveries'),
      ...getNumberCell(),
    },
    {
      c: { accessor: line => thisDelivery(line), id: 'thisDelivery' },
      header: t('label.this-delivery'),
      ...getNumberCell(),
    },
    {
      c: {
        accessor: line => line.purchaseOrderLine?.inTransitNumberOfUnits ?? '',
        id: 'inTransit',
      },
      header: t('label.in-transit'),
      ...getNumberCell(),
    },
    {
      c: { accessor: line => remaining(line), id: 'remaining' },
      header: t('label.remaining'),
      ...getNumberCell(),
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={props.rows}
      rowKey={line => line.id}
      emptyMessage={t('error.no-inbound-items')}
    />
  );
};
