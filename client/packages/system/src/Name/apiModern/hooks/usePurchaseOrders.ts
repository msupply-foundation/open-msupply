import { useQuery } from '@openmsupply-client/common';
import { usePurchaseOrdersGraphQL } from '../usePurchaseOrdersGraphQL';
import { PURCHASE_ORDERS } from './keys';

export const usePurchaseOrders = (supplierName: string) => {
  const { purchaseOrdersApi, storeId } = usePurchaseOrdersGraphQL();

  const queryFn = async () => {
    const result = await purchaseOrdersApi.purchaseOrders({
      storeId,
      supplierName,
    });
    if (result.purchaseOrders.__typename === 'PurchaseOrderConnector')
      return result.purchaseOrders;
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: [PURCHASE_ORDERS, storeId, supplierName],
    queryFn,
  });

  return { data: data?.nodes ?? [], isLoading, isError };
};
