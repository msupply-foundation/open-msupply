import {
  UpdatePurchaseOrderLineInput,
  LIST_KEY,
  useMutation,
  useNotification,
  usePatchState,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common/src';
import { usePurchaseOrderGraphQL } from '../usePurchaseOrderGraphQL';
import { PURCHASE_ORDER, PURCHASE_ORDER_LINE } from './keys';
import { PurchaseOrderLineFragment } from '../operations.generated';

export type DraftPurchaseOrderLine = Omit<
  PurchaseOrderLineFragment,
  '__typename' | 'item'
> & {
  purchaseOrderId: string;
  itemId: string;
};

export type DraftPurchaseOrderLineFromCSV = Omit<
  DraftPurchaseOrderLine,
  'id' | 'itemId'
> & {
  itemCode: string;
};

const defaultPurchaseOrderLine: DraftPurchaseOrderLine = {
  id: '',
  purchaseOrderId: '',
  itemId: '',
  requestedPackSize: 0,
  requestedNumberOfUnits: 0,
  expectedDeliveryDate: null,
  requestedDeliveryDate: null,
  adjustedNumberOfUnits: null,
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
    : { ...defaultPurchaseOrderLine, ...patch, itemId: '' };

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
      requestedPackSize: draft.requestedPackSize,
      requestedDeliveryDate: draft.requestedDeliveryDate,
      requestedNumberOfUnits: draft.requestedNumberOfUnits,
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

  // CREATE FROM CSV

  const { mutateAsync, invalidateQueries } = useLineInsertFromCSV();

  return {
    query: { data: data?.nodes[0], isLoading, error },
    create: { create, isCreating, createError },
    update: { update, isUpdating, updateError },
    createFromCSV: { mutateAsync, invalidateQueries },
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
    queryKey: [PURCHASE_ORDER, PURCHASE_ORDER_LINE, id],
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
        requestedPackSize: draft.requestedPackSize,
        requestedNumberOfUnits: draft.requestedNumberOfUnits,
        requestedDeliveryDate: draft.requestedDeliveryDate,
        expectedDeliveryDate: draft.expectedDeliveryDate,
      },
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries([PURCHASE_ORDER, LIST_KEY, storeId]),
  });
};

const useUpdate = () => {
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();
  const t = useTranslation();
  const { error } = useNotification();

  const mutationState = useMutation(purchaseOrderApi.updatePurchaseOrderLine);

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
      queryClient.invalidateQueries([PURCHASE_ORDER]);
    } catch (e) {
      console.error('Error updating purchase order line:', e);
      return error(t('label.cannot-update-purchase-order-line'))();
    }
  };

  return { ...mutationState, updatePurchaseOrderLine };
};

export const useLineInsertFromCSV = () => {
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();
  const t = useTranslation();

  const { mutateAsync } = useMutation(
    async (line: Partial<DraftPurchaseOrderLineFromCSV>) => {
      const result = await purchaseOrderApi.insertPurchaseOrderLineFromCsv({
        storeId,
        input: {
          itemCode: line.itemCode ?? '',
          purchaseOrderId: line.purchaseOrderId ?? '',
          requestedPackSize: line.requestedPackSize ?? 0.0,
          requestedNumberOfUnits: line.requestedNumberOfUnits ?? 0,
        },
      });
      if (result.insertPurchaseOrderLineFromCsv.__typename === 'IdResponse') {
        return result.insertPurchaseOrderLineFromCsv.id;
      }

      switch (result.insertPurchaseOrderLineFromCsv.error.__typename) {
        case 'PackSizeCodeCombinationExists':
          const itemCode = result.insertPurchaseOrderLineFromCsv.error.itemCode;
          const requestedPackSize =
            result.insertPurchaseOrderLineFromCsv.error.requestedPackSize;
          throw new Error(
            t('error.line-combination-error', { itemCode, requestedPackSize })
          );
        case 'CannnotFindItemByCode':
          throw new Error(t('error.cannot-find-item-by-code'));
        case 'CannotEditPurchaseOrder':
          throw new Error(t('error.cannot-edit-purchase-order'));
        case 'ForeignKeyError':
          throw new Error(t('error.foreign-key-error'));
        case 'PurchaseOrderLineWithIdExists':
          throw new Error(t('error.purchase-order-line-already-exists'));
        default:
          throw new Error(t('error.unknown-insert-error'));
      }
    }
  );

  return {
    mutateAsync,
    invalidateQueries: () => queryClient.invalidateQueries([PURCHASE_ORDER]),
  };
};
