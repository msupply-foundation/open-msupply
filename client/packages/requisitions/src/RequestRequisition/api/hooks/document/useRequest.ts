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
  const query = useQuery({
    queryKey: api.keys.detail(id),
    queryFn: () => api.get.byId(id),
    refetchOnMount: false,
    gcTime: 0
  });

  return {
    ...query,
    invalidateQueries: () => queryClient.invalidateQueries({
      queryKey: api.keys.base()
    }),
  };
};
