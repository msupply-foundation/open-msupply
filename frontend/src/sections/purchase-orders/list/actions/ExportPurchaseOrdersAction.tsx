import { type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import { stripEmpty } from '@/typeHelpers';
import { PurchaseOrders } from '../purchaseOrders.generated';
import type { PurchaseOrdersVariables } from '../purchaseOrders.generated';
import type { PurchaseOrderFilter } from '../listFilters';
import { purchaseOrdersToCsv } from '../purchaseOrdersToCsv';

// The purchase-orders list Export action (OMS-FUN-PO-10.1, OMS-FUN-PO-15.14):
// the shared CSV/Excel split button, fed this vertical's query. Exports EVERY
// order matching the current filter and in the current order, not just the
// page on screen (OMS-FUN-PO-10.3). Delivery, the busy state and the outcome
// report all live in ListExportAction — this file owns only the query.
export interface ExportPurchaseOrdersActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => PurchaseOrderFilter;
  /** The list's current ordering — the export carries it (OMS-FUN-PO-10.3). */
  sort: () => PurchaseOrdersVariables['sort'];
}

export const ExportPurchaseOrdersAction: Component<
  ExportPurchaseOrdersActionProps
> = props => {
  const buildCsv = async (): Promise<string | null> => {
    const variables: PurchaseOrdersVariables = {
      storeId: props.storeId,
      filter: stripEmpty(props.filter()),
      sort: props.sort(),
    };
    const result = await graphqlFetch(PurchaseOrders, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.purchaseOrders.nodes;
    return nodes.length ? purchaseOrdersToCsv(nodes) : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.purchase-order')}
    />
  );
};
