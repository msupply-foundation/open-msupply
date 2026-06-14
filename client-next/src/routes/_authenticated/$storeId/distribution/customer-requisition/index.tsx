import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { RequisitionNodeStatus } from '@/gql/schema';
import { requisitionListQueryOptions } from '@/features/requisitions/queries';
import { customerRequisitionFilter } from '@/features/requisitions/customerRequisition';
import { CustomerRequisitionListPage } from '@/features/requisitions/CustomerRequisitionListPage';

const searchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(500).catch(50),
  sortKey: z.string().catch('createdDatetime'),
  sortDesc: z.boolean().catch(true),
  search: z.string().optional().catch(undefined),
  status: z.nativeEnum(RequisitionNodeStatus).optional().catch(undefined),
});

export const Route = createFileRoute(
  '/_authenticated/$storeId/distribution/customer-requisition/',
)({
  validateSearch: search => searchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps, params }) => {
    const storeId = params.storeId;
    if (storeId) {
      return context.queryClient.ensureQueryData(
        requisitionListQueryOptions(storeId, 'customer-requisition', customerRequisitionFilter(deps), deps),
      );
    }
  },
  component: CustomerRequisitionListPage,
});
