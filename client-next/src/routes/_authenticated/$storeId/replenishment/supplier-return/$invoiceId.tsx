import { createFileRoute } from '@tanstack/react-router';
import { supplierReturnQueryOptions } from '@/features/invoices/supplierReturnDetail.queries';
import { SupplierReturnDetailPage } from '@/features/invoices/SupplierReturnDetailPage';

export const Route = createFileRoute(
  '/_authenticated/$storeId/replenishment/supplier-return/$invoiceId',
)({
  loader: ({ context, params }) => {
    const { storeId, invoiceId } = params;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        supplierReturnQueryOptions(storeId, invoiceId),
      );
    }
  },
  component: SupplierReturnDetailPage,
});
