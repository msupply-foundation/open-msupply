import {
  useParams,
  UseQueryResult,
  useQuery,
  useQueryClient,
} from '@openmsupply-client/common';
import { ResponseFragment } from '../../operations.generated';
import { useResponseApi } from '../utils/useResponseApi';

export const useResponseId = () => {
  const { id = '' } = useParams();
  return id;
};

export const useResponse = (): UseQueryResult<ResponseFragment> & {
  invalidateQueries: () => Promise<void>;
} => {
  const responseId = useResponseId();
  const api = useResponseApi();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: api.keys.detail(responseId),
    queryFn: () => api.get.byId(responseId),
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
