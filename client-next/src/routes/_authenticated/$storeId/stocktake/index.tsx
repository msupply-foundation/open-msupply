import { createFileRoute } from '@tanstack/react-router';
import { stocktakesQueryOptions } from '@/features/stocktake/queries';
import { StocktakeListPage } from '@/features/stocktake/StocktakeListPage';

export const Route = createFileRoute('/_authenticated/$storeId/stocktake/')({
  loader: ({ context, params }) => {
    const storeId = params.storeId;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        stocktakesQueryOptions(storeId),
      );
    }
  },
  component: StocktakeListPage,
});
