import {
  LedgerSortFieldInput,
  SortBy,
  useQuery,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../../..';
import { STOCK_LINE } from './keys';
import { useStockGraphQL } from '../useStockGraphQL';
import { LedgerRowFragment } from '../operations.generated';
import { ColumnKey } from '../../Components/Ledger/useLedgerColumns';

export function useStockLedger(
  stockLine: StockLineRowFragment,
  sortBy: SortBy<LedgerRowFragment>
) {
  const { stockApi, storeId } = useStockGraphQL();

  const queryKey = [STOCK_LINE, stockLine.id, sortBy];
  const queryFn = async (): Promise<{
    nodes: LedgerRowFragment[];
    totalCount: number;
  }> => {
    const filter = { stockLineId: { equalTo: stockLine.id } };

    const query = await stockApi.ledger({
      storeId,
      key: getSortKey(sortBy.key),
      desc: sortBy.direction === 'desc',
      filter,
    });
    const { nodes, totalCount } = query?.ledger;
    return { nodes, totalCount };
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
}

const getSortKey = (sortBy: string): LedgerSortFieldInput => {
  switch (sortBy) {
    case ColumnKey.DateTime:
      return LedgerSortFieldInput.Datetime;
    case ColumnKey.Name:
      return LedgerSortFieldInput.Name;
    case ColumnKey.Quantity:
      return LedgerSortFieldInput.Quantity;
    case ColumnKey.Type:
      return LedgerSortFieldInput.InvoiceType;
    default:
      return LedgerSortFieldInput.StockLineId;
  }
};
