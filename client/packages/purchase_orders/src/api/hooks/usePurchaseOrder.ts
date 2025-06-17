import {
  FnUtils,
  InsertPurchaseOrderInput,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import { usePurchaseOrderGraphQL } from '../usePurchaseOrderGraphQL';
import { LIST, PURCHASE_ORDER } from './keys';
import { PurchaseOrderFragment } from '../operations.generated';

export const usePurchaseOrder = (purchaseOrderId?: string) => {
  const { purchaseOrderApi, storeId } = usePurchaseOrderGraphQL();

  const queryKey = [LIST, PURCHASE_ORDER, storeId, purchaseOrderId];

  // QUERY

  const queryFn = async (): Promise<PurchaseOrderFragment | void> => {
    if (!purchaseOrderId) return;

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

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn,
    enabled: !!purchaseOrderId,
  });

  // UPDATE

  // CREATE

  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const create = async (supplierId: string) => {
    const id = FnUtils.generateUUID();

    const result = await createMutation({ id, supplierId });
    // resetDraft();
    return result;
  };

  return {
    query: { data, isLoading, isError },
    create: { create, isCreating, createError },
  };
};

const useCreate = () => {
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();

  const mutationFn = async (
    input: InsertPurchaseOrderInput
  ): Promise<string> => {
    const result =
      (await purchaseOrderApi.insertPurchaseOrder({
        input,
        storeId,
      })) || {};

    const { insertPurchaseOrder } = result;

    if (insertPurchaseOrder.id) return insertPurchaseOrder.id;

    throw new Error('Could not insert purchase order');
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([PURCHASE_ORDER]),
  });
};
