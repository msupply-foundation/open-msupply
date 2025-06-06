import {
  useParams,
  UseQueryResult,
  useQuery,
} from '@openmsupply-client/common';
import { ResponseFragment } from '../../operations.generated';
import { useResponseApi } from '../utils/useResponseApi';

export const useResponseId = () => {
  const { id = '' } = useParams();
  return id;
};

export const useResponse = (): UseQueryResult<ResponseFragment> => {
  const responseId = useResponseId();
  const api = useResponseApi();
  return useQuery(
    api.keys.detail(responseId),
    () => api.get.byId(responseId),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
