import { type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import { stripEmpty } from '@/typeHelpers';
import { Stocktakes } from '../stocktakes.generated';
import type { StocktakesVariables } from '../stocktakes.generated';
import type { StocktakeFilter } from '../listFilters';
import { stocktakesToCsv } from '../stocktakesToCsv';

// The stocktakes list Export action (spec/stocktakes S1 "Export CSV"): the
// shared CSV/Excel split button, fed this vertical's query. Exports EVERY
// stocktake matching the current filter, not just the page. Delivery, the busy
// state and the outcome report (in-place flash + an error dialog carrying the
// message) all live in ListExportAction — this file owns only the query.

export interface ExportStocktakesActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => StocktakeFilter;
}

export const ExportStocktakesAction: Component<
  ExportStocktakesActionProps
> = props => {
  // Fetch every matching stocktake (no page cap) and build the CSV. Returns
  // null when there's nothing to export.
  const buildCsv = async (): Promise<string | null> => {
    const variables: StocktakesVariables = {
      storeId: props.storeId,
      filter: stripEmpty(props.filter()),
      sort: [{ key: 'stocktakeNumber', desc: true }],
    };
    const result = await graphqlFetch(Stocktakes, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.stocktakes.nodes;
    return nodes.length ? stocktakesToCsv(nodes) : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.stocktakes')}
    />
  );
};
