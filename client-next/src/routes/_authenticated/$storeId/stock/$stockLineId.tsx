import { createFileRoute } from '@tanstack/react-router';
import { stockLineQueryOptions } from '@/features/stock/queries';
import { StockDetailPage } from '@/features/stock/StockDetailPage';

export const Route = createFileRoute('/_authenticated/$storeId/stock/$stockLineId')({
  loader: ({ context, params }) => {
    const storeId = params.storeId;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        stockLineQueryOptions(storeId, params.stockLineId),
      );
    }
  },
  component: StockDetailPage,
});
