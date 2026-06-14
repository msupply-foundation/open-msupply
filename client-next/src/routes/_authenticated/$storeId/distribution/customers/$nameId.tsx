import { createFileRoute } from '@tanstack/react-router';
import { customerByIdQueryOptions } from '@/features/names/customerDetail.queries';
import { CustomerDetailPage } from '@/features/names/CustomerDetailPage';

export const Route = createFileRoute(
  '/_authenticated/$storeId/distribution/customers/$nameId',
)({
  loader: ({ context, params }) => {
    const { storeId, nameId } = params;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        customerByIdQueryOptions(storeId, nameId),
      );
    }
  },
  component: CustomerDetailPage,
});
