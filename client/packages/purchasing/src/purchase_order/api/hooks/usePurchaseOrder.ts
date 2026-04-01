import { useState, useEffect, useMemo } from 'react';
import {
  FnUtils,
  InsertPurchaseOrderInput,
  PurchaseOrderLineNode,
  useConfirmationModal,
  useMutation,
  useNotification,
  useParams,
  useQuery,
  useTranslation,
  RecordPatch,
  useDebounceCallback,
  LIST_KEY,
  useUrlQuery,
} from '@openmsupply-client/common';

import { isPurchaseOrderDisabled } from '../../../utils';
import { usePurchaseOrderGraphQL } from '../usePurchaseOrderGraphQL';
import { PurchaseOrderFragment } from '../operations.generated';
import { parseUpdateInput } from './utils';
import { PURCHASE_ORDER } from './keys';

const DEBOUNCED_TIME = 1000;

export type PurchaseOrderLineInsertFromCsvInput = Partial<
  PurchaseOrderLineNode & { purchaseOrderId: string; itemCode: string }
>;

export const usePurchaseOrder = (id?: string) => {
  const { purchaseOrderId = id } = useParams();
  const { queryClient } = usePurchaseOrderGraphQL();

  // QUERY
  const { data, isFetching, isError, isLoading } = useGetById(purchaseOrderId);

  const isDisabled = data ? isPurchaseOrderDisabled(data) : false;

  const { filteredLines, itemFilter, setItemFilter } = useFilteredLines(data);

  // DRAFT STATE
  const [draft, setDraft] = useState<PurchaseOrderFragment | undefined>();

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const handleDraftChange = (input: Partial<PurchaseOrderFragment>) => {
    if (!draft) return;
    setDraft({ ...draft, ...input });
  };

  // UPDATE
  const {
    mutateAsync: updateMutation,
    isPending: isUpdating,
    error: updateError,
  } = useUpdate();

  const update = async (input: Partial<PurchaseOrderFragment>) => {
    if (!purchaseOrderId) return;
    const result = await updateMutation({ id: purchaseOrderId, ...input });

    const { updatePurchaseOrder } = result || {};
    return updatePurchaseOrder;
  };

  const handleDebounceUpdate = useDebounceCallback(update, [], DEBOUNCED_TIME);

  const handleChange = (input: Partial<PurchaseOrderFragment>) => {
    if (!draft) return;
    handleDraftChange(input);
    handleDebounceUpdate(input);
  };

  // CREATE
  const {
    mutateAsync: createMutation,
    isPending: isCreating,
    error: createError,
  } = useCreate();

  const create = async (supplierId: string) => {
    const id = FnUtils.generateUUID();
    const result = await createMutation({ id, supplierId });
    return result;
  };

  const { addFromMasterList, isPending: isAdding } = useAddFromMasterList();

  return {
    query: { data, isFetching, isError, isLoading },
    lines: { filteredLines, itemFilter, setItemFilter },
    create: { create, isCreating, createError },
    update: { update, isUpdating, updateError },
    masterList: { addFromMasterList, isAdding },
    isDisabled,
    draft,
    handleChange,
    invalidateQueries: () => queryClient.invalidateQueries({
      queryKey: [PURCHASE_ORDER]
    }),
  };
};

const useGetById = (purchaseOrderId: string | undefined) => {
  const { purchaseOrderApi, storeId } = usePurchaseOrderGraphQL();

  const queryFn = async (): Promise<PurchaseOrderFragment | undefined> => {
    const result = await purchaseOrderApi.purchaseOrderById({
      purchaseOrderId: purchaseOrderId ?? '',
      storeId,
    });

    if (result?.purchaseOrder?.__typename === 'PurchaseOrderNode') {
      return result.purchaseOrder;
    }

    throw new Error(`Could not find purchase order ${purchaseOrderId}`);
  };

  return useQuery({
    queryKey: [PURCHASE_ORDER, LIST_KEY, purchaseOrderId, storeId],
    queryFn,
    enabled: !!purchaseOrderId,
  });
};

const useCreate = () => {
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();

  const mutationFn = async (input: InsertPurchaseOrderInput) => {
    return await purchaseOrderApi.insertPurchaseOrder({
      input,
      storeId,
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: [PURCHASE_ORDER]
    }),
  });
};

const useUpdate = () => {
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();

  const mutationFn = async (input: RecordPatch<PurchaseOrderFragment>) => {
    return await purchaseOrderApi.updatePurchaseOrder({
      input: parseUpdateInput(input),
      storeId,
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: [PURCHASE_ORDER]
    }),
  });
};

const useAddFromMasterList = () => {
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();
  const t = useTranslation();
  const { error } = useNotification();

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-add-from-master-list'),
  });

  const mutationState = useMutation({
    mutationFn: (vars: Parameters<typeof purchaseOrderApi.addToPurchaseOrderFromMasterList>[0]) => purchaseOrderApi.addToPurchaseOrderFromMasterList(vars),

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: [PURCHASE_ORDER]
    })
  });

  const addFromMasterList = async (
    masterListId: string,
    purchaseOrderId: string
  ) => {
    getConfirmation({
      onConfirm: async () => {
        try {
          const result = await mutationState.mutateAsync({
            input: {
              masterListId,
              purchaseOrderId,
            },
            storeId,
          });
          if (
            result.addToPurchaseOrderFromMasterList.__typename ===
            'AddToPurchaseOrderFromMasterListError'
          ) {
            const errorType =
              result.addToPurchaseOrderFromMasterList.error.__typename;

            switch (errorType) {
              case 'CannotEditPurchaseOrder': {
                return error(t('label.cannot-edit-purchase-order'))();
              }
              case 'RecordNotFound': {
                return error(t('messages.record-not-found'))();
              }
              case 'MasterListNotFoundForThisStore': {
                return error(t('error.master-list-not-found'))();
              }
              default:
                return error(t('label.cannot-add-item-to-purchase-order'))();
            }
          }
        } catch (e) {
          // for non structured errors
          console.error('Mutation error:', e);
          return error(t('label.cannot-add-item-to-purchase-order'))();
        }
      },
    });
  };

  return { ...mutationState, addFromMasterList };
};

// Filters by item code or name
const useFilteredLines = (data: PurchaseOrderFragment | undefined) => {
  const { urlQuery, updateQuery } = useUrlQuery({
    skipParse: ['codeOrName'],
  });

  const itemFilter = urlQuery?.['codeOrName'] as string;

  const setItemFilter = (filterValue: string) => {
    updateQuery({
      codeOrName: filterValue,
    });
  };

  const filteredLines = useMemo(() => {
    if (!data) return [];

    const lines = data.lines.nodes || [];

    return lines.filter(line => {
      if (!itemFilter) return true;
      const {
        item: { code, name },
      } = line;
      return (
        code?.toLowerCase().includes(itemFilter.toLowerCase()) ||
        name?.toLowerCase().includes(itemFilter.toLowerCase())
      );
    });
  }, [data, itemFilter]);

  return { filteredLines, itemFilter, setItemFilter };
};
