import {
  FilterByWithBoolean,
  PurchaseOrderSortFieldInput,
  SortBy,
  useQuery,
  useTableStore,
} from '@openmsupply-client/common';
import { usePurchaseOrderGraphQL } from '../usePurchaseOrderGraphQL';
import { LIST, PURCHASE_ORDER } from './keys';
import { PurchaseOrderFragment } from '../operations.generated';

export const usePurchaseOrder = (purchaseOrderId: string) => {
  const { purchaseOrderApi, storeId } = usePurchaseOrderGraphQL();

  const queryKey = [LIST, PURCHASE_ORDER, storeId, purchaseOrderId];

  const queryFn = async (): Promise<PurchaseOrderFragment | void> => {
    const result = await purchaseOrderApi.purchaseOrderById({
      purchaseOrderId,
      storeId,
    });
    const purchaseOrder = result?.purchaseOrder;
    if (purchaseOrder.__typename === 'PurchaseOrderNode') return purchaseOrder;
    else {
      console.error('No purchase order found', purchaseOrderId);
      throw new Error(`Could not find purchase order ${purchaseOrderId}`);
    }
  };

  const { data, isLoading, isError } = useQuery({ queryKey, queryFn });

  return {
    query: { data, isLoading, isError },
  };
};
