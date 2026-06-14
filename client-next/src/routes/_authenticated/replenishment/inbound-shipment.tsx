import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { getStoreId } from '@/app/session';
import { InvoiceNodeType } from '@/gql/schema';
import { invoiceListQueryOptions } from '@/features/invoices/queries';
import { InboundShipmentListPage } from '@/features/invoices/InboundShipmentListPage';

const searchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(500).catch(50),
  sortKey: z.string().catch('invoiceNumber'),
  sortDesc: z.boolean().catch(true),
});

export const Route = createFileRoute('/_authenticated/replenishment/inbound-shipment')({
  validateSearch: search => searchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    const storeId = getStoreId();
    if (storeId) {
      return context.queryClient.ensureQueryData(
        invoiceListQueryOptions(storeId, 'inbound-shipment', { type: { equalTo: InvoiceNodeType.InboundShipment } }, deps),
      );
    }
  },
  component: InboundShipmentListPage,
});
