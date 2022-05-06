import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useItemApi } from './../useItemApi';

interface UseServiceItemsOptions {
  refetchOnMount?: boolean;
}
// This hook is sparsely used but it's main use case is for a list of
// service charges.
// In that case, it's best not to have every row in the list refetch
// the set of service items.
// So, using a subset of useQuery options to help.
// Passing through the full UseQueryOptions is a good option but is
// a little annoying with typings.
export const useServiceItems = ({
  refetchOnMount,
}: UseServiceItemsOptions = {}) => {
  const queryParams = useQueryParamsStore();
  const api = useItemApi();

  return useQuery(
    api.keys.paramList(queryParams.paramList()),
    () => api.get.serviceItems(queryParams.paramList()),
    { refetchOnMount }
  );
};
