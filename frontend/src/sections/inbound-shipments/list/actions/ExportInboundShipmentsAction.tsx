import { type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import { InboundShipments } from '../inboundShipments.generated';
import type { InboundShipmentsVariables } from '../inboundShipments.generated';
import { inboundQueryInputs, type InboundListFilter } from '../listFilters';
import { inboundShipmentsToCsv } from '../inboundShipmentsToCsv';
import { heldInboundQueryScopes } from '../../inboundShipmentScope';

// The inbound-shipments list Export action (spec S1 / AC-L6): the shared
// CSV/Excel split button, fed this vertical's query. Exports EVERY shipment
// matching the current filter, not just the page. Delivery, the busy state and
// the outcome report live in ListExportAction — this file owns only the query.
export interface ExportInboundShipmentsActionProps {
  storeId: string;
  filter: () => InboundListFilter;
}

export const ExportInboundShipmentsAction: Component<
  ExportInboundShipmentsActionProps
> = props => {
  const buildCsv = async (): Promise<string | null> => {
    // Same inputs as the list (spec/inbound-shipments › contract →
    // permissions): the Type filter's scope + requisitionId consequences and
    // the held query scopes, so the export spans exactly the inbound shipments
    // the current filter shows — never a scopeless (generic-permission) request
    // that would pull in other invoice types.
    const { filter, type } = inboundQueryInputs(
      props.filter(),
      heldInboundQueryScopes()
    );
    if (type.length === 0) return null;
    const variables: InboundShipmentsVariables = {
      storeId: props.storeId,
      filter,
      sort: [{ key: 'invoiceNumber', desc: true }],
      type,
    };
    const result = await graphqlFetch(InboundShipments, variables);
    if (result.kind !== 'success') return null;
    if (result.data.invoices.__typename !== 'InvoiceConnector') return null;
    const nodes = result.data.invoices.nodes;
    return nodes.length ? inboundShipmentsToCsv(nodes) : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.inbounds')}
    />
  );
};
