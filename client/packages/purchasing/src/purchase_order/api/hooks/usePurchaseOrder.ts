import { useMemo, useState, useEffect } from 'react';
import {
  FnUtils,
  InsertPurchaseOrderInput,
  PurchaseOrderLineNode,
  SortUtils,
  useConfirmationModal,
  useMutation,
  useNotification,
  useParams,
  useQuery,
  useTranslation,
  useUrlQuery,
  RecordPatch,
  useDebounceCallback,
  LIST_KEY,
} from '@openmsupply-client/common';

import { isPurchaseOrderDisabled } from '../../../utils';
import { usePurchaseOrderColumns } from '../../DetailView/columns';
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

  const { purchaseOrderApi, storeId } = usePurchaseOrderGraphQL();

  const queryKey = [PURCHASE_ORDER, LIST_KEY, storeId];

  // QUERY
  const queryFn = async (): Promise<PurchaseOrderFragment | undefined> => {
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

  const isDisabled = data ? isPurchaseOrderDisabled(data) : false;

  const { sortedAndFilteredLines, itemFilter, setItemFilter } =
    useFilteredAndSortedLines(data);

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
    isLoading: isUpdating,
    error: updateError,
  } = useUpdate();

  const update = async (input: Partial<PurchaseOrderFragment>) => {
    if (!purchaseOrderId) return;
    const result = await updateMutation({ id: purchaseOrderId, ...input });
    return result;
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
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const create = async (supplierId: string) => {
    const id = FnUtils.generateUUID();
    const result = await createMutation({ id, supplierId });
    return result;
  };

  const { addFromMasterList, isLoading: isAdding } = useAddFromMasterList();

  return {
    query: { data, isLoading, isError },
    lines: { sortedAndFilteredLines, itemFilter, setItemFilter },
    create: { create, isCreating, createError },
    update: { update, isUpdating, updateError },
    masterList: { addFromMasterList, isAdding },
    isDisabled,
    draft,
    handleChange,
  };
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
    onSuccess: () => queryClient.invalidateQueries([PURCHASE_ORDER]),
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
    onSuccess: () => queryClient.invalidateQueries([PURCHASE_ORDER]),
  });
};

// Filters by item code or name, and sorts by the selected column
const useFilteredAndSortedLines = (
  data: PurchaseOrderFragment | undefined | void
) => {
  const { columns, sortBy } = usePurchaseOrderColumns();

  const { urlQuery, updateQuery } = useUrlQuery({
    skipParse: ['codeOrName'],
  });

  const itemFilter = urlQuery?.['codeOrName'] as string;

  const setItemFilter = (filterValue: string) => {
    updateQuery({
      codeOrName: filterValue,
    });
  };

  const sortedAndFilteredLines = useMemo(() => {
    if (!data) return [];

    const lines = data.lines.nodes || [];
    const currentSortColumn = columns.find(({ key }) => key === sortBy.key);

    if (!currentSortColumn?.getSortValue) return lines;

    const sorter = SortUtils.getColumnSorter(
      currentSortColumn?.getSortValue,
      !!sortBy.isDesc
    );

    return [...lines].sort(sorter).filter(line => {
      if (!itemFilter) return true;
      const {
        item: { code, name },
      } = line;
      return (
        code?.toLowerCase().includes(itemFilter.toLowerCase()) ||
        name?.toLowerCase().includes(itemFilter.toLowerCase())
      );
    });
  }, [data, columns, sortBy, itemFilter]);

  return { sortedAndFilteredLines, itemFilter, setItemFilter };
};

const useAddFromMasterList = () => {
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();
  const t = useTranslation();
  const { error } = useNotification();

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-add-from-master-list'),
  });

  const mutationState = useMutation(
    purchaseOrderApi.addToPurchaseOrderFromMasterList,
    {
      onSuccess: () =>
        queryClient.invalidateQueries([PURCHASE_ORDER, LIST_KEY, storeId]),
    }
  );

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
