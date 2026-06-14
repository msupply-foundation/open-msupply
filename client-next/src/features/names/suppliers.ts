import { NameNodeType, type NameFilterInput } from '@/gql/schema';

// Built from URL search state. Shared by the page and the route loader so their
// query keys match (loader prefetch hits the same cache entry). Kept out of the
// component file so it isn't a non-component export (fast-refresh).
export function suppliersFilter(s: { search?: string }): NameFilterInput {
  return {
    isSupplier: true,
    type: { equalAny: [NameNodeType.Facility, NameNodeType.Store] },
    ...(s.search ? { codeOrName: { like: s.search } } : {}),
  };
}
