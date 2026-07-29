import { type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import {
  SupplierReturns,
  type SupplierReturnsVariables,
} from '../supplierReturns.generated';
import { supplierReturnsToCsv } from '../supplierReturnsToCsv';

// The supplier-returns list Export action (spec/supplier-returns S1): the
// shared CSV/Excel split button, fed this vertical's query. Exports EVERY
// return matching the current filter (all pages, newest first). Delivery, the
// busy state and the outcome report live in ListExportAction — this file owns
// only the query.

export interface ExportSupplierReturnsActionProps {
  storeId: string;
  /** The list's current filter (type-pinned to SUPPLIER_RETURN) — the export
   *  matches it across all pages. */
  filter: () => SupplierReturnsVariables['filter'];
}

// The invoices resolver defaults to a bounded page when `page` is omitted, so
// the export passes an explicit page large enough to cover any realistic
// store's filtered set (ui-standards/list-views.md § regions: export covers
// every row matching the active filters, across all pages). If a store somehow
// exceeds the cap the export is truncated, so that's logged rather than
// silently shipped.
const EXPORT_PAGE_SIZE = 10000;

export const ExportSupplierReturnsAction: Component<
  ExportSupplierReturnsActionProps
> = props => {
  // Fetch every matching return (bounded by EXPORT_PAGE_SIZE above), newest
  // first, and build the CSV. Returns null when there's nothing to export.
  const buildCsv = async (): Promise<string | null> => {
    const result = await graphqlFetch(SupplierReturns, {
      storeId: props.storeId,
      filter: props.filter(),
      sort: [{ key: 'createdDatetime', desc: true }],
      page: { first: EXPORT_PAGE_SIZE },
    });
    if (result.kind !== 'success') return null;
    if (result.data.invoices.__typename !== 'InvoiceConnector') return null;
    const { nodes, totalCount } = result.data.invoices;
    if (totalCount > nodes.length) {
      console.warn(
        `supplier-returns export: truncated to ${nodes.length} of ${totalCount} matching rows (cap ${EXPORT_PAGE_SIZE}).`
      );
    }
    return nodes.length ? supplierReturnsToCsv(nodes) : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.supplier-returns')}
    />
  );
};
