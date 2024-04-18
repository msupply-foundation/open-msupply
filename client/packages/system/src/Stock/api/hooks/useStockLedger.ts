import { LedgerSortFieldInput, useQuery } from '@openmsupply-client/common';
import { StockLineRowFragment } from '../../..';
import { LEDGER } from './keys';
import { useStockGraphQL } from '../useStockGraphQL';

// TO-DO:Replace with auto-gen type from graphql codegen
export interface LedgerLine {
  id: string;
  itemId: string;
  storeId: string;
  quantity: number;
  datetime: Date;
  name: string;
  type: string;
  reason: string | null;
}

export function useStockLedger(stockLine: StockLineRowFragment) {
  const { stockApi, storeId } = useStockGraphQL();

  const queryKey = [LEDGER, stockLine.id];
  const queryFn = async (): Promise<{
    nodes: LedgerLine[];
    totalCount: number;
  }> => {
    const filter = { stockLineId: { equalTo: stockLine.id } };

    const query = await stockApi.ledger({
      storeId,
      key: LedgerSortFieldInput.Datetime,
      desc: true,
      filter,
    });
    const { nodes, totalCount } = query?.ledger;
    return { nodes, totalCount };
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
}
