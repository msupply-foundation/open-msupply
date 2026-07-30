import { type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import { stripEmpty } from '@/typeHelpers';
import { Requisitions } from '../requisitions.generated';
import type { RequisitionsVariables } from '../requisitions.generated';
import type { RequisitionFilter } from '../listFilters';
import { requisitionsToCsv } from '../requisitionsToCsv';

// The requisitions list Export action (spec S1 / OMS-REG-DIST-05.3): the
// shared CSV/Excel split button, fed this vertical's query. Exports EVERY
// requisition matching the current filter (not just the page), newest first
// ([D12]). Delivery, the busy state and the outcome report live in
// ListExportAction — this file owns only the query.
export interface ExportRequisitionsActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => RequisitionFilter;
  /** Whether the program columns are gated on — adds them to the CSV [D17]. */
  includeProgram: () => boolean;
}

export const ExportRequisitionsAction: Component<
  ExportRequisitionsActionProps
> = props => {
  // Fetch every matching requisition (no page cap) and build the CSV. `type`
  // is pinned to RESPONSE exactly as the list read (contract › "Requisitions
  // only"). Returns null when there's nothing to export.
  const buildCsv = async (): Promise<string | null> => {
    const variables: RequisitionsVariables = {
      storeId: props.storeId,
      filter: { ...stripEmpty(props.filter()), type: { equalTo: 'RESPONSE' } },
      sort: [{ key: 'createdDatetime', desc: true }],
    };
    const result = await graphqlFetch(Requisitions, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.requisitions.nodes;
    return nodes.length
      ? requisitionsToCsv(nodes, props.includeProgram())
      : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.requisitions')}
    />
  );
};
