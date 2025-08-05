import {
  FnUtils,
  InsertPurchaseOrderInput,
  PurchaseOrderNodeType,
  SortUtils,
  useConfirmationModal,
  useMutation,
  useNotification,
  useParams,
  useQuery,
  useTranslation,
  useUrlQuery,
  setNullableInput,
} from '@openmsupply-client/common';
import { usePurchaseOrderGraphQL } from '../usePurchaseOrderGraphQL';
import { LIST, PURCHASE_ORDER } from './keys';
import { PurchaseOrderFragment } from '../operations.generated';
import { useMemo } from 'react';
import { usePurchaseOrderColumns } from '../../DetailView/columns';

export type UpdatePurchaseOrderInput = {
  additionalInstructions?: string | null;
  advancePaidDate?: string | null;
  agentCommission?: number | null;
  authorisingOfficer1?: string | null;
  authorisingOfficer2?: string | null;
  comment?: string | null;
  communicationsCharge?: number | null;
  confirmedDatetime?: string | null;
  contractSignedDate?: string | null;
  currencyId?: string | null;
  documentCharge?: number | null;
  donorId?: string | null;
  foreignExchangeRate?: number | null;
  freightCharge?: number | null;
  freightConditions?: string | null;
  headingMessage?: string | null;
  id: string;
  insuranceCharge?: number | null;
  receivedAtPortDate?: string | null;
  reference?: string | null;
  requestedDeliveryDate?: string | null;
  sentDatetime?: string | null;
  shippingMethod?: string | null;
  status?: PurchaseOrderNodeType | null;
  supplierAgent?: string | null;
  supplierDiscountPercentage?: number | null;
  supplierId?: string | null;
};

export const usePurchaseOrder = (id?: string) => {
  const { purchaseOrderId = id } = useParams();

  const { purchaseOrderApi, storeId } = usePurchaseOrderGraphQL();

  const queryKey = [PURCHASE_ORDER, LIST, storeId];

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

  const { sortedAndFilteredLines, itemFilter, setItemFilter } =
    useFilteredAndSortedLines(data);

  // UPDATE
  const {
    mutateAsync: updateMutation,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdate();

  const update = async (input: Omit<UpdatePurchaseOrderInput, 'id'>) => {
    if (!purchaseOrderId) return;
    const result = await updateMutation({ id: purchaseOrderId, ...input });
    return result;
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

  const mutationFn = async (input: UpdatePurchaseOrderInput) => {
    return await purchaseOrderApi.updatePurchaseOrder({
      input: {
        ...input,
        donorId: setNullableInput('donorId', input),
        confirmedDatetime: setNullableInput('confirmedDatetime', input),
        contractSignedDate: setNullableInput('contractSignedDate', input),
        advancePaidDate: setNullableInput('advancePaidDate', input),
        receivedAtPortDate: setNullableInput('receivedAtPortDate', input),
        sentDatetime: setNullableInput('sentDatetime', input),
        requestedDeliveryDate: setNullableInput('requestedDeliveryDate', input),
      },
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
        queryClient.invalidateQueries([PURCHASE_ORDER, LIST, storeId]),
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
