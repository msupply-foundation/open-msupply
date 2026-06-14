import { createFileRoute } from '@tanstack/react-router';
import { inboundShipmentQueryOptions } from '@/features/invoices/inboundDetail.queries';
import { InboundShipmentDetailPage } from '@/features/invoices/InboundShipmentDetailPage';

export const Route = createFileRoute(
  '/_authenticated/$storeId/replenishment/inbound-shipment/$invoiceId',
)({
  loader: ({ context, params }) => {
    const { storeId, invoiceId } = params;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        inboundShipmentQueryOptions(storeId, invoiceId),
      );
    }
  },
  component: InboundShipmentDetailPage,
});
