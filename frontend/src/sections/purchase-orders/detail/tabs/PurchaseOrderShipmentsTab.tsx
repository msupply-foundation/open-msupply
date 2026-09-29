import { createResource, type Component } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { createTableConfig } from '@/api/createTableConfig';
import { DataTable, type Column } from '@/ui/elements/table/DataTable';
import { getCellDefinition } from '@/ui/elements/table/tableHelpers';
import { PurchaseOrderShipments } from '../purchaseOrderDetail.generated';
import type { PurchaseOrderShipmentsResult } from '../purchaseOrderDetail.generated';
import { inboundShipmentHref } from '../../../inbound-shipments/inboundShipmentScope';

type Shipment = Extract<
  PurchaseOrderShipmentsResult['invoices'],
  { __typename: 'InvoiceConnector' }
>['nodes'][number];

export interface PurchaseOrderShipmentsTabProps {
  storeId: string;
  orderId: string;
}

/*
 * The Inbound shipment tab (spec/purchase-orders S11): every shipment raised
 * against this order, newest first, and the way to one.
 *
 * READ-ONLY and owned elsewhere: this vertical NAMES a shipment, it does not
 * own one (rules § receipt against an order), so there is no selection column,
 * no footer row and no action — a row click leaves for that shipment's own
 * screen. It holds every linked shipment at once: the set is bounded by the
 * order (a handful of deliveries), which is the bounded-working-set case in
 * ui-standards/tables.md § pagination & scale, so no pager.
 */
export const PurchaseOrderShipmentsTab: Component<
  PurchaseOrderShipmentsTabProps
> = props => {
  const navigate = useNavigate();

  const tableConfig = createTableConfig({
    tableId: 'purchase-order-shipments',
  });

  // Its own read, independent of the order's other resources, so switching to
  // the tab fetches it once (kdd/state-management). Read non-suspending: it
  // first fetches on an INTERACTION — selecting this tab, under the already-
  // open screen's Suspense boundary (kdd/solid-reactivity-pitfalls › No
  // remounts on interaction).
  const [data] = createResource(
    () => ({ storeId: props.storeId, orderId: props.orderId }),
    async variables => {
      const result = await graphqlFetch(PurchaseOrderShipments, variables);
      return result.kind === 'success' &&
        result.data.invoices.__typename === 'InvoiceConnector'
        ? result.data.invoices.nodes
        : [];
    }
  );
  const rows = (): Shipment[] => gated(data) ?? [];

  const columns = (): Column<Shipment, never>[] => [
    {
      c: { key: 'invoiceNumber' },
      header: () => t('label.number'),
      ...getCellDefinition('invoiceNumber'),
    },
    {
      c: { accessor: row => row.otherPartyName, id: 'supplier' },
      header: () => t('label.supplier'),
      ...getCellDefinition('otherPartyName', { headerPosition: 'primary' }),
    },
    {
      // The SHIPMENT's own states, not the order's.
      c: { key: 'status' },
      header: () => t('label.status'),
      // No `status` preset in the shared registry — the shipment's state is a
      // short text value, so it takes the shortText sink at the registry's
      // own width rather than a new global row for one read-only column.
      ...getCellDefinition('unit'),
    },
    {
      c: { accessor: row => row.theirReference ?? '', id: 'theirReference' },
      header: () => t('label.supplier-reference'),
      ...getCellDefinition('theirReference'),
    },
    {
      c: { key: 'createdDatetime' },
      header: () => t('label.created'),
      ...getCellDefinition('createdDatetime'),
    },
    {
      c: { key: 'receivedDatetime' },
      header: () => t('label.received'),
      ...getCellDefinition('datetime'),
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={rows()}
      rowKey={row => row.id}
      loading={data.loading}
      // Leaves this vertical for the shipment's own screen. The href helper is
      // the inbound vertical's, so the scope param a shipment's screen needs
      // is put there by the vertical that owns it — a PO-linked shipment is
      // always the EXTERNAL scope.
      onRowClick={row =>
        navigate(
          inboundShipmentHref(props.storeId, row.id, 'INBOUND_SHIPMENT_EXTERNAL')
        )
      }
      emptyMessage={t('error.no-inbound-shipments-linked')}
      config={tableConfig.config()}
      setConfig={tableConfig.setConfig}
    />
  );
};
