import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InvoiceNodeType } from '@/gql/schema';
import { invoiceListQueryOptions } from '@/features/invoices/queries';
import { CustomerReturnListPage } from '@/features/invoices/CustomerReturnListPage';

const searchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(500).catch(50),
  sortKey: z.string().catch('createdDatetime'),
  sortDesc: z.boolean().catch(true),
});

export const Route = createFileRoute('/_authenticated/$storeId/distribution/customer-return')({
  validateSearch: search => searchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps, params }) => {
    const storeId = params.storeId;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        invoiceListQueryOptions(storeId, 'customer-return', { type: { equalTo: InvoiceNodeType.CustomerReturn } }, deps),
      );
    }
  },
  component: CustomerReturnListPage,
});
