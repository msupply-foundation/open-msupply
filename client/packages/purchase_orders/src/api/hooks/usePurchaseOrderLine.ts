import {
  UpdatePurchaseOrderLineInput,
  useMutation,
  useNotification,
  usePatchState,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common/src';
import { usePurchaseOrderGraphQL } from '../usePurchaseOrderGraphQL';
import { LIST, PURCHASE_ORDER, PURCHASE_ORDER_LINE } from './keys';
import { PurchaseOrderLineFragment } from '../operations.generated';

export type DraftPurchaseOrderLine = Omit<
  PurchaseOrderLineFragment,
  '__typename' | 'item'
> & {
  purchaseOrderId: string;
  // TODO remove itemId - can extract from item
  itemId: string;
};

const defaultPurchaseOrderLine: DraftPurchaseOrderLine = {
  id: '',
  purchaseOrderId: '',
  itemId: '',
  requestedPackSize: 0,
  requestedNumberOfUnits: 0,
  expectedDeliveryDate: null,
  requestedDeliveryDate: null,
  authorisedNumberOfUnits: null,
};

export function usePurchaseOrderLine(id?: string) {
  const { data, isLoading, error } = useGet(id ?? '');

  const { patch, updatePatch, resetDraft, isDirty } =
    usePatchState<DraftPurchaseOrderLine>(data?.nodes[0] ?? {});

  const draft: DraftPurchaseOrderLine = data
    ? {
        ...defaultPurchaseOrderLine,
        ...data?.nodes[0],
        itemId: data?.nodes[0]?.item.id ?? '',
        ...patch,
      }
    : { ...defaultPurchaseOrderLine, ...patch, itemId: 'sa' };

  // UPDATE
  const {
    updatePurchaseOrderLine,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdate();

  const update = async () => {
    const input: UpdatePurchaseOrderLineInput = {
      id: draft.id,
      expectedDeliveryDate: draft.expectedDeliveryDate,
      itemId: draft.itemId,
      packSize: draft.requestedPackSize,
      requestedDeliveryDate: draft.requestedDeliveryDate,
      requestedQuantity: draft.requestedNumberOfUnits,
    };
    return await updatePurchaseOrderLine(input);
  };

  // CREATE
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const create = async () => {
    const result = await createMutation(draft);
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

  const mutationFn = async (draft: DraftPurchaseOrderLine) => {
    return await purchaseOrderApi.insertPurchaseOrderLine({
      storeId,
      input: {
        id: draft.id,
        itemId: draft.itemId,
        purchaseOrderId: draft.purchaseOrderId,
        packSize: draft.packSize,
        requestedQuantity: draft.requestedNumberOfUnits,
        requestedDeliveryDate: draft.requestedDeliveryDate,
        expectedDeliveryDate: draft.expectedDeliveryDate,
      },
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries([PURCHASE_ORDER, LIST, storeId]),
  });
};

const useUpdate = () => {
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();
  const t = useTranslation();
  const { error } = useNotification();

  const mutationState = useMutation(purchaseOrderApi.updatePurchaseOrderLine, {
    onSuccess: () =>
      queryClient.invalidateQueries([PURCHASE_ORDER, LIST, storeId]),
  });

  const updatePurchaseOrderLine = async (
    input: UpdatePurchaseOrderLineInput
  ) => {
    try {
      const result = await purchaseOrderApi.updatePurchaseOrderLine({
        storeId,
        input: {
          ...input,
        },
      });
      if (
        result.updatePurchaseOrderLine.__typename ===
        'UpdatePurchaseOrderLineError'
      ) {
        const errorType = result.updatePurchaseOrderLine.error.__typename;
        switch (errorType) {
          case 'CannotEditPurchaseOrder':
            return error(t('label.cannot-edit-purchase-order'))();
          case 'PurchaseOrderDoesNotExist':
            return error(t('label.purchase-order-does-not-exist'))();
          case 'PurchaseOrderLineNotFound':
            return error(t('label.purchase-order-line-not-found'))();
          case 'UpdatedLineDoesNotExist':
            return error(t('label.updated-line-does-not-exist'))();
          default:
            return error(t('label.cannot-update-purchase-order-line'))();
        }
      }
    } catch (e) {
      console.error('Error updating purchase order line:', e);
      return error(t('label.cannot-update-purchase-order-line'))();
    }
  };

  return { ...mutationState, updatePurchaseOrderLine };
};
