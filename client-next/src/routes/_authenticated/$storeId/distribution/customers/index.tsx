import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { nameListQueryOptions } from '@/features/names/queries';
import { customersFilter } from '@/features/names/customers';
import { CustomersListPage } from '@/features/names/CustomersListPage';

const searchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(500).catch(50),
  sortKey: z.string().catch('name'),
  sortDesc: z.boolean().catch(false),
  search: z.string().optional().catch(undefined),
});

export const Route = createFileRoute(
  '/_authenticated/$storeId/distribution/customers/',
)({
  validateSearch: search => searchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps, params }) => {
    const storeId = params.storeId;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        nameListQueryOptions(storeId, 'customers', customersFilter(deps), deps),
      );
    }
  },
  component: CustomersListPage,
});
