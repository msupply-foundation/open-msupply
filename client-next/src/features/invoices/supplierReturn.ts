import {
  InvoiceNodeType,
  type InvoiceFilterInput,
  type InvoiceNodeStatus,
} from '@/gql/schema';

export interface SupplierReturnSearch {
  search?: string;
  status?: InvoiceNodeStatus;
}

// Built from URL search state. Shared by the page and the route loader so their
// query keys match (loader prefetch hits the same cache entry). Kept out of the
// component file so it isn't a non-component export (fast-refresh).
export function supplierReturnFilter(s: SupplierReturnSearch): InvoiceFilterInput {
  return {
    type: { equalTo: InvoiceNodeType.SupplierReturn },
    ...(s.search ? { otherPartyName: { like: s.search } } : {}),
    ...(s.status ? { status: { equalTo: s.status } } : {}),
  };
}
