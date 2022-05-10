import {
  useParams,
  UseQueryResult,
  useQuery,
} from '@openmsupply-client/common';
import { RequestFragment } from '../../operations.generated';
import { useRequestApi } from '../utils/useRequestApi';

export const useRequestNumber = () => {
  const { requisitionNumber = '' } = useParams();
  return requisitionNumber;
};

export const useRequest = (): UseQueryResult<RequestFragment> => {
  const requestNumber = useRequestNumber();
  const api = useRequestApi();
  return useQuery(
    api.keys.detail(requestNumber),
    () => api.get.byNumber(requestNumber),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
