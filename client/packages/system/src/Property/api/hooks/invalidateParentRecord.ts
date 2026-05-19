import { PropertyParentTableEnum, QueryClient } from '@openmsupply-client/common';

// After a property value mutation, the value lives on the parent record's
// GraphQL fragment (e.g. NameNode.propertyValues / ItemNode.propertyValues),
// not in a per-record property query. Invalidate the parent's whole query
// scope so the detail page re-fetches via its existing DataLoader path.
//
// We use a coarse top-level prefix invalidation rather than chasing every
// specific cache key — react-query's predicate match handles the rest.
export const invalidateParentRecord = (
  queryClient: QueryClient,
  table: PropertyParentTableEnum,
  _recordId: string | undefined
) => {
  switch (table) {
    case PropertyParentTableEnum.Name:
      return queryClient.invalidateQueries({ queryKey: ['name'] });
    case PropertyParentTableEnum.Item:
      return queryClient.invalidateQueries({ queryKey: ['item'] });
    case PropertyParentTableEnum.InvoiceLine:
      return queryClient.invalidateQueries({ queryKey: ['invoice'] });
    default:
      return Promise.resolve();
  }
};
