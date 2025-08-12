import {
  useMutation,
  usePatchState,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common/src';
import { LIST } from 'packages/purchasing/src/goods_received/api';
import { PurchaseOrderLineFragment } from 'packages/purchasing/src/purchase_order/api';
import { PURCHASE_ORDER_LINE, PURCHASE_ORDER } from 'packages/purchasing/src/purchase_order/api/hooks/keys';
import { usePurchaseOrderGraphQL } from 'packages/purchasing/src/purchase_order/api/usePurchaseOrderGraphQL';

export type DraftPurchaseOrderLine = Omit<
  PurchaseOrderLineFragment,
  '__typename' | 'item'
> & {
  purchaseOrderId: string;
  itemId: string;
  requestedPackSize: number | undefined;
  requestedNumberOfUnits: number | undefined;
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
};

export function usePurchaseOrderLine(id?: string) {
  const { data, isLoading, error } = useGet(id ?? '');

  // CREATE
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

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

  // CREATE FROM CSV

  const { mutateAsync, invalidateQueries } = useLineInsertFromCSV();

  return {
    query: { data: data?.nodes[0], isLoading, error },
    create: { create, isCreating, createError },
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

export const useLineInsertFromCSV = () => {
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();
  const t = useTranslation();

  const { mutateAsync } = useMutation(
    async (line: Partial<DraftPurchaseOrderLineFromCSV>) => {
      const result = await purchaseOrderApi.insertPurchaseOrderLineFromCsv({
        storeId,
        input: {
          itemCode: line.itemCode ?? '',
          purchaseOrderId: line['purchaseOrderId'] ?? '',
          requestedPackSize: line['requestedPackSize'] ?? 0.0,
          requestedNumberOfUnits: line['requestedNumberOfUnits'] ?? 0,
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
    invalidateQueries: () =>
      queryClient.invalidateQueries([LIST, PURCHASE_ORDER, storeId]),
  };
};
