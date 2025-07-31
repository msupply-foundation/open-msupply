import {
  FnUtils,
  InsertPurchaseOrderInput,
  PurchaseOrderNodeType,
  SortUtils,
  useMutation,
  useParams,
  useQuery,
  useUrlQuery,
  setNullableInput,
} from '@openmsupply-client/common';
import { usePurchaseOrderGraphQL } from '../usePurchaseOrderGraphQL';
import { LIST, PURCHASE_ORDER } from './keys';
import { PurchaseOrderFragment } from '../operations.generated';
import { useMemo } from 'react';
import { usePurchaseOrderColumns } from '../../DetailView/columns';

export type UpdatePurchaseOrderInput = {
  advancePaidDate?: string | null;
  comment?: string | null;
  confirmedDatetime?: string | null;
  contractSignedDate?: string | null;
  currencyId?: string | null;
  donorLinkId?: string | null;
  foreignExchangeRate?: number | null;
  id: string;
  receivedAtPortDate?: string | null;
  reference?: string | null;
  requestedDeliveryDate?: string | null;
  sentDatetime?: string | null;
  shippingMethod?: string | null;
  status?: PurchaseOrderNodeType | null;
  supplierDiscountPercentage?: number | null;
  supplierId?: string | null;
};

export const usePurchaseOrder = (id?: string) => {
  const { purchaseOrderId = id } = useParams();

  const { purchaseOrderApi, storeId } = usePurchaseOrderGraphQL();

  const queryKey = [LIST, PURCHASE_ORDER, storeId, purchaseOrderId];

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

  return {
    query: { data, isLoading, isError },
    lines: { sortedAndFilteredLines, itemFilter, setItemFilter },
    create: { create, isCreating, createError },
    update: { update, isUpdating, updateError },
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
    onSuccess: () => queryClient.invalidateQueries([LIST, PURCHASE_ORDER]),
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
