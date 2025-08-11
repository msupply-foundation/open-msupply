import {
  useMutation,
  usePatchState,
  useQuery,
} from '@openmsupply-client/common/src';
import { usePurchaseOrderGraphQL } from '../usePurchaseOrderGraphQL';
import { LIST, PURCHASE_ORDER, PURCHASE_ORDER_LINE } from './keys';
import { PurchaseOrderLineFragment } from '../operations.generated';

export type DraftPurchaseOrderLine = Omit<
  PurchaseOrderLineFragment,
  '__typename' | 'item'
> & {
  purchaseOrderId: string;
  itemId: string;
};

const defaultPurchaseOrderLine: DraftPurchaseOrderLine = {
  id: '',
  purchaseOrderId: '',
  itemId: '',
  requestedPackSize: 0,
  requestedNumberOfUnits: 0,
  adjustedNumberOfUnits: null,
  requestedDeliveryDate: null,
  expectedDeliveryDate: null,
};

export function usePurchaseOrderLine(id?: string) {
  const { data, isLoading, error } = useGet(id ?? '');

  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const {
    mutateAsync: updateMutation,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdate();

  const { patch, updatePatch, resetDraft, isDirty } =
    usePatchState<DraftPurchaseOrderLine>(data?.nodes[0] ?? {});

  const draft: DraftPurchaseOrderLine = data
    ? { ...defaultPurchaseOrderLine, ...data?.nodes[0], ...patch }
    : { ...defaultPurchaseOrderLine, ...patch };
  
  const create = async () => {
    const result = await createMutation(draft);
    resetDraft();
    return result;
  };

  const update = async () => {
    if (!data?.nodes[0]?.id) return;
    const result = await updateMutation({
      id: data.nodes[0].id,
      ...patch,
    });
    resetDraft();
    return result;
  };

  return {
    query: { data: data?.nodes[0], isLoading, error },
    create: { create, isCreating, createError },
    update: { update, isUpdating, updateError },
    draft,
    resetDraft,
    isDirty,
    updatePatch,
  };
}

const useGet = (id: string) => {
  const { purchaseOrderApi, storeId } = usePurchaseOrderGraphQL();

  const queryFn = async () => {
    const result = await purchaseOrderApi.purchaseOrderLine({
      id,
      storeId,
    });

    if (result.purchaseOrderLines.__typename === 'PurchaseOrderLineConnector') {
      return result.purchaseOrderLines;
    }
  };

  const query = useQuery({
    queryKey: [PURCHASE_ORDER_LINE, id],
    queryFn,
    enabled: id !== '',
  });

  return query;
};

const useCreate = () => {
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();

  const mutationFn = async ({
    purchaseOrderId,
    itemId,
    id,
  }: DraftPurchaseOrderLine) => {
    return await purchaseOrderApi.insertPurchaseOrderLine({
      storeId,
      input: {
        id,
        // TODO better way of handling non item id
        itemId: itemId,
        purchaseOrderId,
      },
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries([LIST, PURCHASE_ORDER, storeId]),
  });
};

const useUpdate = () => {
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();

  const mutationFn = async ({
    id,
    requestedPackSize,
    requestedNumberOfUnits,
    adjustedNumberOfUnits,
    requestedDeliveryDate,
    expectedDeliveryDate,
    itemId,
  }: Partial<DraftPurchaseOrderLine> & { id: string }) => {
    return await purchaseOrderApi.updatePurchaseOrderLine({
      storeId,
      input: {
        id,
        itemId,
        packSize: requestedPackSize,
        requestedQuantity: requestedNumberOfUnits,
        adjustedQuantity: adjustedNumberOfUnits,
        requestedDeliveryDate,
        expectedDeliveryDate,
      },
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries([LIST, PURCHASE_ORDER, storeId]),
  });
};
