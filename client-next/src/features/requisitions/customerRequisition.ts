import {
  RequisitionNodeType,
  type RequisitionFilterInput,
  type RequisitionNodeStatus,
} from '@/gql/schema';

export interface CustomerRequisitionSearch {
  search?: string;
  status?: RequisitionNodeStatus;
}

// Built from URL search state. Shared by the page and the route loader so their
// query keys match (loader prefetch hits the same cache entry). Kept out of the
// component file so it isn't a non-component export (fast-refresh).
export function customerRequisitionFilter(
  s: CustomerRequisitionSearch,
): RequisitionFilterInput {
  return {
    type: { equalTo: RequisitionNodeType.Response },
    ...(s.search ? { otherPartyName: { like: s.search } } : {}),
    ...(s.status ? { status: { equalTo: s.status } } : {}),
  };
}
