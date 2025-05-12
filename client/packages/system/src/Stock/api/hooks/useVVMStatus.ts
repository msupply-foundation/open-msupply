import {
  useAuthContext,
  useGql,
  useQuery,
  VvmstatusNode,
} from '@openmsupply-client/common';
import { getSdk } from '../../api/operations.generated';
import { VVMSTATUS } from './keys';

export const useVVMStatusGraphQl = () => {
  const { client } = useGql();
  const api = getSdk(client);
  const { storeId } = useAuthContext();

  return { api, storeId };
};

export const useVVMStatus = () => {
  const { api, storeId } = useVVMStatusGraphQl();

  const queryKey = [VVMSTATUS];

  const queryFn = async (): Promise<VvmstatusNode[]> => {
    const result = await api.activeVvmStatuses({ storeId });
    return result.activeVvmStatuses.nodes;
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
};
