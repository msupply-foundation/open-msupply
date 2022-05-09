import {
  useParams,
  UseQueryResult,
  useQuery,
} from '@openmsupply-client/common';
import { ResponseFragment } from '../../operations.generated';
import { useResponseApi } from '../utils/useResponseApi';

export const useResponseNumber = () => {
  const { requisitionNumber = '' } = useParams();
  return requisitionNumber;
};

export const useResponse = (): UseQueryResult<ResponseFragment> => {
  const responseNumber = useResponseNumber();
  const api = useResponseApi();
  return useQuery(
    api.keys.detail(responseNumber),
    () => api.get.byNumber(responseNumber),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
