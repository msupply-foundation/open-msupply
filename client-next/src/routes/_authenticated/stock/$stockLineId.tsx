import { createFileRoute } from '@tanstack/react-router';
import { getStoreId } from '@/app/session';
import { stockLineQueryOptions } from '@/features/stock/queries';
import { StockDetailPage } from '@/features/stock/StockDetailPage';

export const Route = createFileRoute('/_authenticated/stock/$stockLineId')({
  loader: ({ context, params }) => {
    const storeId = getStoreId();
    if (storeId) {
      return context.queryClient.ensureQueryData(
        stockLineQueryOptions(storeId, params.stockLineId),
      );
    }
  },
  component: StockDetailPage,
});
