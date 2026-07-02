import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import {
  stocktakeLinesQueryOptions,
  stocktakeQueryOptions,
} from '@/features/stocktake/queries';
import { StocktakeDetailPage } from '@/features/stocktake/StocktakeDetailPage';

// `editItemId` drives the per-item line-edit modal: set it to open the editor
// for that item, clear it to close. Keeps the modal deep-linkable and lets the
// browser back button close it.
const searchSchema = z.object({
  editItemId: z.string().optional().catch(undefined),
});

export const Route = createFileRoute(
  '/_authenticated/$storeId/stocktake/$stocktakeId',
)({
  validateSearch: search => searchSchema.parse(search),
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
