import { type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import {
  OutboundShipments,
  type OutboundShipmentsVariables,
} from '../outboundShipments.generated';
import { shipmentsToCsv } from '../shipmentsToCsv';

// The outbound-shipments list Export action (spec/outbound-shipments S1): the
// shared CSV/Excel split button, fed this vertical's query. Exports EVERY
// shipment matching the current filter (all pages, newest first). Delivery, the
// busy state and the outcome report live in ListExportAction — this file owns
// only the query.

export interface ExportShipmentsActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => OutboundShipmentsVariables['filter'];
}

// The invoices resolver defaults to a bounded page when `page` is omitted, so
// the export passes an explicit page large enough to cover any realistic
// store's filtered set (ui-standards/list-views.md § regions, D12: export
// covers every row matching the active filters, across all pages). If a
// store somehow exceeds the cap the export is still (very largely)
// truncated, so that's logged rather than silently shipped.
const EXPORT_PAGE_SIZE = 10000;

export const ExportShipmentsAction: Component<
  ExportShipmentsActionProps
> = props => {
  // Fetch every matching shipment (bounded by EXPORT_PAGE_SIZE above), newest
  // first, and build the CSV. Returns null when there's nothing to export.
  const buildCsv = async (): Promise<string | null> => {
    const result = await graphqlFetch(OutboundShipments, {
      storeId: props.storeId,
      filter: props.filter(),
      sort: [{ key: 'createdDatetime', desc: true }],
      page: { first: EXPORT_PAGE_SIZE },
    });
    if (result.kind !== 'success') return null;
    const { nodes, totalCount } = result.data.invoices;
    if (totalCount > nodes.length) {
      console.warn(
        `outbound-shipments export: truncated to ${nodes.length} of ${totalCount} matching rows (cap ${EXPORT_PAGE_SIZE}).`
      );
    }
    return nodes.length ? shipmentsToCsv(nodes) : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.outbounds')}
    />
  );
};
