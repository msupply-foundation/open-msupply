import { createFileRoute } from '@tanstack/react-router';
import { responseRequisitionQueryOptions } from '@/features/requisitions/responseDetail.queries';
import { CustomerRequisitionDetailPage } from '@/features/requisitions/CustomerRequisitionDetailPage';

export const Route = createFileRoute(
  '/_authenticated/$storeId/distribution/customer-requisition/$requisitionId',
)({
  loader: ({ context, params }) => {
    const { storeId, requisitionId } = params;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        responseRequisitionQueryOptions(storeId, requisitionId),
      );
    }
  },
  component: CustomerRequisitionDetailPage,
});
