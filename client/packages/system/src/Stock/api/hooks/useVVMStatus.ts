import { useQuery, VvmstatusNode } from '@openmsupply-client/common';
import { VVMSTATUS } from './keys';
import { useStockGraphQL } from '../useStockGraphQL';

export const useVVMStatus = () => {
  const { stockApi, storeId } = useStockGraphQL();

  const queryKey = [VVMSTATUS];

  const queryFn = async (): Promise<VvmstatusNode[]> => {
    const result = await stockApi.activeVvmStatuses({ storeId });
    return result.activeVvmStatuses.nodes;
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
};
