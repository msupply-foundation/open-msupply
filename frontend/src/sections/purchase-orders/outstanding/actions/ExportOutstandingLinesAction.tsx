import { type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import { OutstandingLines } from '../outstandingLines.generated';
import type { OutstandingLinesVariables } from '../outstandingLines.generated';
import { outstandingLinesToCsv } from '../outstandingLinesToCsv';

// The outstanding-lines Export action (OMS-FUN-PO-14.11): the shared CSV/Excel
// split button, fed this screen's query. Exports EVERY line matching the
// current filter and in the current order, not just the page on screen — the
// `page` variable is left off, and the server then returns the whole filtered
// set. Delivery, the busy state and the outcome report all live in
// ListExportAction — this file owns only the query.
//
// The screen's own row set (a sent line, still owed) is part of the variables
// it is handed, so the export cannot widen it.
export interface ExportOutstandingLinesActionProps {
  storeId: string;
  /** The list's current variables, minus pagination — the export matches the
   *  filter and carries the ordering, over all pages. */
  variables: () => Omit<OutstandingLinesVariables, 'page'>;
}

export const ExportOutstandingLinesAction: Component<
  ExportOutstandingLinesActionProps
> = props => {
  const buildCsv = async (): Promise<string | null> => {
    const result = await graphqlFetch(OutstandingLines, props.variables());
    if (result.kind !== 'success') return null;
    const nodes = result.data.purchaseOrderLines.nodes;
    return nodes.length ? outstandingLinesToCsv(nodes) : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.outstanding-purchase-order-lines')}
    />
  );
};
