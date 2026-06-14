import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { stockListQueryOptions } from '@/features/stock/queries';
import { StockListPage } from '@/features/stock/StockListPage';

// Typed, validated search params: list state lives in the URL (not component state).
const stockSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(500).catch(50),
  sortKey: z.string().catch('name'),
  sortDesc: z.boolean().catch(false),
});

export const Route = createFileRoute('/_authenticated/$storeId/stock/')({
  validateSearch: search => stockSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  // Loader fetches at navigation start, prefetching into react-query (the cache
  // stays the single source of truth; the page reads it via useQuery).
  loader: ({ context, deps, params }) => {
    const storeId = params.storeId;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        stockListQueryOptions(storeId, deps),
      );
    }
  },
  component: StockListPage,
});
