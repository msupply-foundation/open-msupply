import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { NameNodeType } from '@/gql/schema';
import { nameListQueryOptions } from '@/features/names/queries';
import { SuppliersListPage } from '@/features/names/SuppliersListPage';

const searchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(500).catch(50),
  sortKey: z.string().catch('name'),
  sortDesc: z.boolean().catch(false),
});

export const Route = createFileRoute('/_authenticated/$storeId/replenishment/suppliers')({
  validateSearch: search => searchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps, params }) => {
    const storeId = params.storeId;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        nameListQueryOptions(storeId, 'suppliers', { isSupplier: true, type: { equalAny: [NameNodeType.Facility, NameNodeType.Store] } }, deps),
      );
    }
  },
  component: SuppliersListPage,
});
