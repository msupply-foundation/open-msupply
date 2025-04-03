import {
  useParams,
  UseQueryResult,
  useQuery,
} from '@openmsupply-client/common';
import { RequestFragment } from '../../.';
import { useRequestApi } from '../utils/useRequestApi';

export const useRequestId = () => {
  const { requisitionId = '' } = useParams();
  return requisitionId;
};

export const useRequest = (): UseQueryResult<RequestFragment> => {
  const requisitionId = useRequestId();
  const api = useRequestApi();
  return useQuery(
    api.keys.detail(requisitionId),
    () => api.get.byId(requisitionId),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
