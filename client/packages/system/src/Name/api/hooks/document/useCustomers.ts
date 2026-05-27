import { useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

// Merge note: RC removed the filterBy param and hardcoded first:1000 because
// server-side customer search now lives in useCustomersInfinite (via
// InfiniteSearchPicker).  The underlying api.get.customers() was also
// refactored from ListParams { filterBy } to a standalone type that uses
// `filter` (NameFilterInput) instead.  Keeping the RC version.
export const useCustomers = () => {
  const api = useNameApi();

  return useQuery({
    queryKey: [...api.keys.list(), 'customers'],

    queryFn: () =>
      api.get.customers({
        first: 1000,
      })
  });
};
