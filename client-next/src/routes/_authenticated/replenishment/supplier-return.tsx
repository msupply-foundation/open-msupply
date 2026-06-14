import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { getStoreId } from '@/app/session';
import { InvoiceNodeType } from '@/gql/schema';
import { invoiceListQueryOptions } from '@/features/invoices/queries';
import { SupplierReturnListPage } from '@/features/invoices/SupplierReturnListPage';

const searchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(500).catch(50),
  sortKey: z.string().catch('createdDatetime'),
  sortDesc: z.boolean().catch(true),
});

export const Route = createFileRoute('/_authenticated/replenishment/supplier-return')({
  validateSearch: search => searchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    const storeId = getStoreId();
    if (storeId) {
      return context.queryClient.ensureQueryData(
        invoiceListQueryOptions(storeId, 'supplier-return', { type: { equalTo: InvoiceNodeType.SupplierReturn } }, deps),
      );
    }
  },
  component: SupplierReturnListPage,
});
