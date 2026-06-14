import { createFileRoute } from '@tanstack/react-router';
import { customerReturnQueryOptions } from '@/features/invoices/customerReturnDetail.queries';
import { CustomerReturnDetailPage } from '@/features/invoices/CustomerReturnDetailPage';

export const Route = createFileRoute(
  '/_authenticated/$storeId/distribution/customer-return/$invoiceId',
)({
  loader: ({ context, params }) => {
    const { storeId, invoiceId } = params;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        customerReturnQueryOptions(storeId, invoiceId),
      );
    }
  },
  component: CustomerReturnDetailPage,
});
