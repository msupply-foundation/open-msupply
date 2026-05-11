import {
  useParams,
  UseQueryResult,
  useQuery,
} from '@openmsupply-client/common';
import { RequestFragment } from '../../.';
import { useRequestApi } from '../utils/useRequestApi';
import { useRequestRequisitionGraphql } from '../useRequestRequisitionGraphql';

export const useRequestId = () => {
  const { id = '' } = useParams();
  return id;
};

export const useRequest = (): UseQueryResult<RequestFragment> & {
  invalidateQueries: () => Promise<void>;
} => {
  const id = useRequestId();
  const api = useRequestApi();
  const { queryClient } = useRequestRequisitionGraphql();
  const query = useQuery(
    api.keys.detail(id),
    () => api.get.byId(id),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );

  return {
    ...query,
    invalidateQueries: () => queryClient.invalidateQueries(api.keys.base()),
  };
};
