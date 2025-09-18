import {
  UpdatePurchaseOrderLineInput,
  useMutation,
  usePatchState,
  useQuery,
  useTranslation,
  setNullableInput,
  PurchaseOrderLineStatusNode,
  InsertPurchaseOrderLineInput,
} from '@openmsupply-client/common';
import { usePurchaseOrderGraphQL } from '../usePurchaseOrderGraphQL';
import { PURCHASE_ORDER, PURCHASE_ORDER_LINE } from './keys';
import { PurchaseOrderLineFragment } from '../operations.generated';

export type DraftPurchaseOrderLine = Omit<
  PurchaseOrderLineFragment,
  '__typename' | 'item'
> & {
  purchaseOrderId: string;
  itemId: string;
  discountPercentage: number;
  numberOfPacks: number;
  requestedNumberOfPacks?: number;
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
  requestedPackSize: 1,
  requestedNumberOfUnits: 0,
  expectedDeliveryDate: null,
  requestedDeliveryDate: null,
  adjustedNumberOfUnits: null,
  lineNumber: 0,
  pricePerUnitBeforeDiscount: 0,
  pricePerUnitAfterDiscount: 0,
  manufacturer: null,
  note: null,
  unit: null,
  supplierItemCode: null,
  comment: null,
  // These values not actually saved to DB
  discountPercentage: 0,
  numberOfPacks: 0,
  requestedNumberOfPacks: 0,
  status: PurchaseOrderLineStatusNode.New,
  receivedNumberOfUnits: 0,
};

export function usePurchaseOrderLine(id?: string | null) {
  const { data, isLoading, error } = useGet(id ?? '');

  const { patch, updatePatch, resetDraft, isDirty } =
    usePatchState<DraftPurchaseOrderLine>({});

  // The discount percentage is calculated from the price fields, but we want to
  // insert it into the draft so it can be independently manipulated (with the
  // other fields updated accordingly -- see the column definitions for how that
  // works)
  const initialDiscountPercentage =
    data?.nodes[0]?.pricePerUnitBeforeDiscount &&
    data?.nodes[0]?.pricePerUnitAfterDiscount
      ? ((data?.nodes[0]?.pricePerUnitBeforeDiscount -
          data?.nodes[0]?.pricePerUnitAfterDiscount) /
          (data?.nodes[0]?.pricePerUnitBeforeDiscount || 1)) *
        100
      : 0;

  // Number of packs is not in the DB, so we derived it from the draft
  const adjustedUnits = data?.nodes[0]?.adjustedNumberOfUnits;
  const requestedUnits = data?.nodes[0]?.requestedNumberOfUnits ?? 0;
  const requestedPackSize = data?.nodes[0]?.requestedPackSize ?? 1;
  const initialNumberOfPacks =
    (adjustedUnits ?? requestedUnits) / requestedPackSize;

  const draft: DraftPurchaseOrderLine = data
    ? {
        ...defaultPurchaseOrderLine,
        ...data?.nodes[0],
        itemId: data?.nodes[0]?.item.id ?? '',
        discountPercentage: initialDiscountPercentage,
        numberOfPacks: initialNumberOfPacks,
        ...patch,
      }
    : { ...defaultPurchaseOrderLine, ...patch };

  // CREATE
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const create = async (input?: InsertPurchaseOrderLineInput) => {
    if (input) return await createMutation(input);

    const parsedInput: InsertPurchaseOrderLineInput = {
      id: draft.id,
      itemIdOrCode: draft.itemId,
      purchaseOrderId: draft.purchaseOrderId,
      requestedPackSize: draft.requestedPackSize,
      requestedNumberOfUnits: draft.requestedNumberOfUnits,
      requestedDeliveryDate: draft.requestedDeliveryDate,
      expectedDeliveryDate: draft.expectedDeliveryDate,
      pricePerUnitAfterDiscount: draft.pricePerUnitAfterDiscount,
      pricePerUnitBeforeDiscount: draft.pricePerUnitBeforeDiscount,
      manufacturerId: draft.manufacturer?.id,
      note: draft.note,
      unit: draft.unit,
      supplierItemCode: draft.supplierItemCode,
      comment: draft.comment,
    };

    const result = await createMutation(parsedInput);
    resetDraft();
    return result;
  };

  // UPDATE
  const {
    updatePurchaseOrderLine,
    isLoading: isUpdating,
    error: updateError,
    updatePurchaseOrderLineThrowError,
  } = useUpdate();

  const update = async () => {
    const input: UpdatePurchaseOrderLineInput = {
      id: draft.id,
      expectedDeliveryDate: draft.expectedDeliveryDate,
      itemId: draft.itemId,
      requestedPackSize: draft.requestedPackSize,
      requestedDeliveryDate: draft.requestedDeliveryDate,
      requestedNumberOfUnits: draft.requestedNumberOfUnits,
      adjustedNumberOfUnits: draft.adjustedNumberOfUnits,
      pricePerUnitBeforeDiscount: draft.pricePerUnitBeforeDiscount,
      pricePerUnitAfterDiscount: draft.pricePerUnitAfterDiscount,
      manufacturerId: setNullableInput('id', draft.manufacturer),
      note: setNullableInput('note', draft),
      unit: draft.unit,
      supplierItemCode: setNullableInput('supplierItemCode', draft),
      comment: setNullableInput('comment', draft),
      status: draft.status,
    };
    const result = await updatePurchaseOrderLine(input);
    resetDraft();
    return result;
  };

  const updateLines = async (
    selectedRows: PurchaseOrderLineFragment[],
    input: Partial<UpdatePurchaseOrderLineInput>
  ) => {
    return await Promise.allSettled(
      selectedRows.map(row =>
        updatePurchaseOrderLineThrowError({
          id: row.id,
          ...input,
        })
      )
    );
  };

  // DELETE
  const {
    mutateAsync: deleteMutation,
    isLoading: isDeletingLines,
    error: deleteError,
  } = useDeleteLines();

  const deleteLines = async (ids: string[]) => {
    await deleteMutation(ids);
    resetDraft();
  };

  return {
    query: { data: data?.nodes[0], isLoading, error },
    create: { create, isCreating, createError },
    update: { update, isUpdating, updateError },
    delete: { deleteLines, isDeletingLines, deleteError },
    draft,
    resetDraft,
    isDirty,
    updatePatch,
    updateLines,
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
  const t = useTranslation();
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();

  const mutationFn = async (input: InsertPurchaseOrderLineInput) => {
    const result = await purchaseOrderApi.insertPurchaseOrderLine({
      storeId,
      input,
    });

    if (
      result.insertPurchaseOrderLine.__typename ===
      'InsertPurchaseOrderLineError'
    ) {
      const errorType = result.insertPurchaseOrderLine.error.__typename;
      let errorMessage: string;

      switch (errorType) {
        case 'CannnotFindItemByCode':
          errorMessage = t('error.cannot-find-item-by-code');
          break;
        case 'CannotEditPurchaseOrder':
          errorMessage = t('label.cannot-edit-purchase-order');
          break;
        case 'ForeignKeyError':
          errorMessage = t('error.database-error');
          break;
        case 'PackSizeCodeCombinationExists':
          errorMessage = t('error.pack-size-code-combinations-exists');
          break;
        case 'PurchaseOrderLineWithIdExists':
          errorMessage = t('error.purchase-order-line-already-exists');
          break;
        default:
          errorMessage = t('label.cannot-add-purchase-order-line');
      }

      throw new Error(errorMessage);
    }

    return result;
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([PURCHASE_ORDER]),
  });
};

const useUpdate = () => {
  const t = useTranslation();
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();
  const mutationState = useMutation(purchaseOrderApi.updatePurchaseOrderLine);

  const updatePurchaseOrderLine = async (
    input: UpdatePurchaseOrderLineInput
  ): Promise<{ success: boolean; error?: string }> => {
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
        let errorMessage: string;

        switch (errorType) {
          case 'CannotEditPurchaseOrder':
            errorMessage = t('label.cannot-edit-purchase-order');
            break;
          case 'PurchaseOrderDoesNotExist':
            errorMessage = t('label.purchase-order-does-not-exist');
            break;
          case 'PurchaseOrderLineNotFound':
            errorMessage = t('label.purchase-order-line-not-found');
            break;
          case 'UpdatedLineDoesNotExist':
            errorMessage = t('label.updated-line-does-not-exist');
            break;
          case 'ItemCannotBeOrdered':
            errorMessage = t('error.item-cannot-be-ordered-on-line');
            break;
          default:
            errorMessage = t('label.cannot-update-purchase-order-line');
        }

        return { success: false, error: errorMessage };
      }
      queryClient.invalidateQueries([PURCHASE_ORDER]);
      return { success: true };
    } catch (e) {
      console.error('Error updating purchase order line:', e);
      const errorMessage = t('label.cannot-update-purchase-order-line');
      return { success: false, error: errorMessage };
    }
  };

  const updatePurchaseOrderLineThrowError = async (
    input: UpdatePurchaseOrderLineInput
  ) => {
    const result = await updatePurchaseOrderLine(input);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  return {
    ...mutationState,
    updatePurchaseOrderLine,
    updatePurchaseOrderLineThrowError,
  };
};

const useDeleteLines = () => {
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();

  const mutationFn = async (ids: string[]) => {
    return purchaseOrderApi.deletePurchaseOrderLines({
      storeId,
      ids,
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([PURCHASE_ORDER]);
    },
  });
};
