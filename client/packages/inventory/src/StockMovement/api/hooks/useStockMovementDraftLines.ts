import {
  StockRelocationDraftLinesInput,
  useQuery,
} from '@openmsupply-client/common';
import { STOCK_MOVEMENT_DRAFT_LINES } from './keys';
import { useStockMovementGraphQL } from '../useStockMovementGraphQL';
import { StockMovementDraftLineFragment } from '../operations.generated';

export const useStockMovementDraftLines = (
  input: StockRelocationDraftLinesInput,
  enabled: boolean
) => {
  const { stockMovementApi, storeId } = useStockMovementGraphQL();

  const queryKey = [
    STOCK_MOVEMENT_DRAFT_LINES,
    storeId,
    input.fromLocationId,
    input.itemId,
    input.stockRelocationId,
  ];

  const queryFn = async (): Promise<StockMovementDraftLineFragment[]> => {
    const result = await stockMovementApi.stockRelocationDraftLines({
      storeId,
      input,
    });
    return result?.stockRelocationDraftLines ?? [];
  };

  return useQuery({ queryKey, queryFn, enabled });
};
