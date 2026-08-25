import { type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import { stripEmpty } from '@/typeHelpers';
import { StockLines, type StockLinesVariables } from '../stock.generated';
import type { StockFilter } from '../listFilters';
import { stockToCsv } from '../stockToCsv';

// The stock list Export action (spec/stock OMS-REG-INV-02.8): the shared
// CSV/Excel split
// button, fed this vertical's query. Exports EVERY stock line matching the
// current filter (all pages, packs-on-hand only) — not just the visible page,
// and the flat line list regardless of the grouped toggle. Delivery, the busy
// state and the outcome report live in ListExportAction — this file owns only
// the query.

export interface ExportStockActionProps {
  storeId: string;
  filter: () => StockFilter;
  sort: () => NonNullable<StockLinesVariables['sort']>;
}

const EXPORT_PAGE = 10000;

export const ExportStockAction: Component<ExportStockActionProps> = props => {
  const buildCsv = async (): Promise<string | null> => {
    const variables: StockLinesVariables = {
      storeId: props.storeId,
      filter: { ...stripEmpty(props.filter()), hasPacksInStore: true },
      sort: props.sort(),
      page: { first: EXPORT_PAGE, offset: 0 },
    };
    const result = await graphqlFetch(StockLines, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.stockLines.nodes;
    return nodes.length ? stockToCsv(nodes) : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.stock')}
    />
  );
};
