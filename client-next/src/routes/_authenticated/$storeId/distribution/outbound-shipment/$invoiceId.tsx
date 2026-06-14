import { createFileRoute } from '@tanstack/react-router';
import { outboundShipmentQueryOptions } from '@/features/invoices/outboundDetail.queries';
import { OutboundShipmentDetailPage } from '@/features/invoices/OutboundShipmentDetailPage';

export const Route = createFileRoute(
  '/_authenticated/$storeId/distribution/outbound-shipment/$invoiceId',
)({
  loader: ({ context, params }) => {
    const { storeId, invoiceId } = params;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        outboundShipmentQueryOptions(storeId, invoiceId),
      );
    }
  },
  component: OutboundShipmentDetailPage,
});
