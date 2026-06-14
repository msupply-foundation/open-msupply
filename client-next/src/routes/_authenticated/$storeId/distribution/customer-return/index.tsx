import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InvoiceNodeStatus } from '@/gql/schema';
import { invoiceListQueryOptions } from '@/features/invoices/queries';
import { customerReturnFilter } from '@/features/invoices/customerReturn';
import { CustomerReturnListPage } from '@/features/invoices/CustomerReturnListPage';

const searchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(500).catch(50),
  sortKey: z.string().catch('createdDatetime'),
  sortDesc: z.boolean().catch(true),
  search: z.string().optional().catch(undefined),
  status: z.nativeEnum(InvoiceNodeStatus).optional().catch(undefined),
});

export const Route = createFileRoute(
  '/_authenticated/$storeId/distribution/customer-return/',
)({
  validateSearch: search => searchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps, params }) => {
    const storeId = params.storeId;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        invoiceListQueryOptions(storeId, 'customer-return', customerReturnFilter(deps), deps),
      );
    }
  },
  component: CustomerReturnListPage,
});
