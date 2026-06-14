import { createFileRoute } from '@tanstack/react-router';
import { requestRequisitionQueryOptions } from '@/features/requisitions/requestDetail.queries';
import { InternalOrderDetailPage } from '@/features/requisitions/InternalOrderDetailPage';

export const Route = createFileRoute(
  '/_authenticated/$storeId/replenishment/internal-order/$requisitionId',
)({
  loader: ({ context, params }) => {
    const { storeId, requisitionId } = params;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        requestRequisitionQueryOptions(storeId, requisitionId),
      );
    }
  },
  component: InternalOrderDetailPage,
});
