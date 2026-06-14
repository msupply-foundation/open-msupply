import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { getStoreId } from '@/app/session';
import { NameNodeType } from '@/gql/schema';
import { nameListQueryOptions } from '@/features/names/queries';
import { CustomersListPage } from '@/features/names/CustomersListPage';

const searchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(500).catch(50),
  sortKey: z.string().catch('name'),
  sortDesc: z.boolean().catch(false),
});

export const Route = createFileRoute('/_authenticated/distribution/customers')({
  validateSearch: search => searchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    const storeId = getStoreId();
    if (storeId) {
      return context.queryClient.ensureQueryData(
        nameListQueryOptions(storeId, 'customers', { isCustomer: true, type: { equalAny: [NameNodeType.Facility, NameNodeType.Store] } }, deps),
      );
    }
  },
  component: CustomersListPage,
});
