import { createFileRoute } from '@tanstack/react-router';
import { getStoreId } from '@/app/session';
import { stocktakesQueryOptions } from '@/features/stocktake/queries';
import { StocktakeListPage } from '@/features/stocktake/StocktakeListPage';

export const Route = createFileRoute('/_authenticated/stocktake/')({
  loader: ({ context }) => {
    const storeId = getStoreId();
    if (storeId) {
      return context.queryClient.ensureQueryData(
        stocktakesQueryOptions(storeId),
      );
    }
  },
  component: StocktakeListPage,
});
