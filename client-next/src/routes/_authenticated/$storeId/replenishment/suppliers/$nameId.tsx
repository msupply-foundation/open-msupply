import { createFileRoute } from '@tanstack/react-router';
import { supplierByIdQueryOptions } from '@/features/names/supplierDetail.queries';
import { SupplierDetailPage } from '@/features/names/SupplierDetailPage';

export const Route = createFileRoute(
  '/_authenticated/$storeId/replenishment/suppliers/$nameId',
)({
  loader: ({ context, params }) => {
    const { storeId, nameId } = params;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        supplierByIdQueryOptions(storeId, nameId),
      );
    }
  },
  component: SupplierDetailPage,
});
