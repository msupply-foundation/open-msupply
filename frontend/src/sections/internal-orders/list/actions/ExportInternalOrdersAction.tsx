import { type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import { stripEmpty } from '@/typeHelpers';
import { InternalOrders } from '../internalOrders.generated';
import type { InternalOrdersVariables } from '../internalOrders.generated';
import type { InternalOrderFilter } from '../listFilters';
import { internalOrdersToCsv } from '../internalOrdersToCsv';

// The internal-orders list Export action (spec S1 / AC-X1): the shared
// CSV/Excel split button, fed this vertical's query. Exports EVERY order
// matching the current filter (not just the page), newest first ([D12]).
// Delivery, the busy state and the outcome report live in ListExportAction —
// this file owns only the query.
export interface ExportInternalOrdersActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => InternalOrderFilter;
  /** Whether the program columns are gated on — adds them to the CSV [D17]. */
  includeProgram: () => boolean;
}

export const ExportInternalOrdersAction: Component<
  ExportInternalOrdersActionProps
> = props => {
  // Fetch every matching order (no page cap) and build the CSV. `type` is
  // pinned to REQUEST exactly as the list read (contract › "Internal orders
  // only"). Returns null when there's nothing to export.
  const buildCsv = async (): Promise<string | null> => {
    const variables: InternalOrdersVariables = {
      storeId: props.storeId,
      filter: { ...stripEmpty(props.filter()), type: { equalTo: 'REQUEST' } },
      sort: [{ key: 'createdDatetime', desc: true }],
    };
    const result = await graphqlFetch(InternalOrders, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.requisitions.nodes;
    return nodes.length
      ? internalOrdersToCsv(nodes, props.includeProgram())
      : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.requests')}
    />
  );
};
