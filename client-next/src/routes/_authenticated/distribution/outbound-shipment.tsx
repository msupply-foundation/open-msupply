import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { getStoreId } from '@/app/session';
import { InvoiceNodeStatus } from '@/gql/schema';
import { invoiceListQueryOptions } from '@/features/invoices/queries';
import { outboundFilter } from '@/features/invoices/outboundShipment';
import { OutboundShipmentListPage } from '@/features/invoices/OutboundShipmentListPage';

const searchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(500).catch(50),
  sortKey: z.string().catch('invoiceNumber'),
  sortDesc: z.boolean().catch(true),
  search: z.string().optional().catch(undefined),
  status: z.nativeEnum(InvoiceNodeStatus).optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/distribution/outbound-shipment')({
  validateSearch: search => searchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    const storeId = getStoreId();
    if (storeId) {
      return context.queryClient.ensureQueryData(
        invoiceListQueryOptions(storeId, 'outbound-shipment', outboundFilter(deps), deps),
      );
    }
  },
  component: OutboundShipmentListPage,
});
