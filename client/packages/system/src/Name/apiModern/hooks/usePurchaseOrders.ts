import { useQuery } from '@openmsupply-client/common';
import { usePurchaseOrdersGraphQL } from '../usePurchaseOrdersGraphQL';
import { PURCHASE_ORDERS } from './keys';

export const usePurchaseOrders = () => {
  const { purchaseOrdersApi, storeId } = usePurchaseOrdersGraphQL();

  const queryFn = async () => {
    const result = await purchaseOrdersApi.purchaseOrders({ storeId });
    if (result.purchaseOrders.__typename === 'PurchaseOrderConnector')
      return result.purchaseOrders;
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: [PURCHASE_ORDERS],
    queryFn,
  });

  return { data: data?.nodes ?? [], isLoading, isError };
};
