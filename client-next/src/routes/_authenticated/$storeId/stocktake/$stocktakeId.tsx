import { createFileRoute } from '@tanstack/react-router';
import {
  stocktakeLinesQueryOptions,
  stocktakeQueryOptions,
} from '@/features/stocktake/queries';
import { StocktakeDetailPage } from '@/features/stocktake/StocktakeDetailPage';

export const Route = createFileRoute('/_authenticated/$storeId/stocktake/$stocktakeId')({
  loader: ({ context, params }) => {
    const storeId = params.storeId;
    if (storeId) {
      void context.queryClient.ensureQueryData(
        stocktakeQueryOptions(storeId, params.stocktakeId),
      );
      // Return the lines prefetch so navigation waits for the heavy payload.
      return context.queryClient.ensureQueryData(
        stocktakeLinesQueryOptions(storeId, params.stocktakeId),
      );
    }
  },
  component: StocktakeDetailPage,
});
