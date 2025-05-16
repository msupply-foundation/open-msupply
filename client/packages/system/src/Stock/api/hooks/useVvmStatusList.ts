import { useQuery } from '@openmsupply-client/common';
import { useStockGraphQL } from '../useStockGraphQL';
import { STOCK_LINE, VVM_STATUS } from './keys';

export const useVvmStatusList = () => {
  const { stockApi, storeId } = useStockGraphQL();

  const queryFn = async () => {
    const result = await stockApi.vvmStatus({ storeId });
    if (result.activeVvmStatuses.__typename === 'VvmstatusConnector')
      return result.activeVvmStatuses;
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: [VVM_STATUS, STOCK_LINE],
    queryFn,
  });

  return {
    query: { data: data?.nodes ?? [], isLoading, isError },
  };
};
