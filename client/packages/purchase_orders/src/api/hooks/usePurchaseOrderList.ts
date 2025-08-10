import {
  FilterByWithBoolean,
  PurchaseOrderSortFieldInput,
  SortBy,
  useMutation,
  useQuery,
  useTableStore,
} from '@openmsupply-client/common';
import { usePurchaseOrderGraphQL } from '../usePurchaseOrderGraphQL';
import { LIST, PURCHASE_ORDER } from './keys';
import {
  PurchaseOrderFragment,
  PurchaseOrderRowFragment,
} from '../operations.generated';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<PurchaseOrderFragment>;
  filterBy: FilterByWithBoolean | null;
};

export const usePurchaseOrderList = (queryParams: ListParams) => {
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();

  const {
    sortBy = {
      key: 'number',
      direction: 'desc',
    },
    first,
    offset,
    filterBy,
  } = queryParams;

  const queryKey = [
    LIST,
    PURCHASE_ORDER,
    storeId,
    sortBy,
    first,
    offset,
    filterBy,
  ];

  const sortFieldMap: Record<string, PurchaseOrderSortFieldInput> = {
    createdDatetime: PurchaseOrderSortFieldInput.CreatedDatetime,
    status: PurchaseOrderSortFieldInput.Status,
    number: PurchaseOrderSortFieldInput.Number,
    // Add more as required
  };

  const queryFn = async (): Promise<{
    nodes: PurchaseOrderRowFragment[];
    totalCount: number;
  }> => {
    const filter = {
      ...filterBy,
    };

    const query = await purchaseOrderApi.purchaseOrders({
      storeId,
      first: first,
      offset: offset,
      key: sortFieldMap[sortBy.key] ?? PurchaseOrderSortFieldInput.Status,
      desc: sortBy.direction === 'desc',
      filter,
    });
    const { nodes, totalCount } = query?.purchaseOrders;
    return { nodes, totalCount };
  };

  const { data, isLoading, isError } = useQuery({ queryKey, queryFn });

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as PurchaseOrderFragment[],
  }));

  const deleteMutationFn = async (ids: string[]) => {
    const response = await (async () => []);
    // await purchaseOrderApi.deletePurchaseOrders({
    //   storeId,
    //   ids,
    // });
    // return response?.deletePurchaseOrders;
  };

  const {
    mutate: deletePurchaseOrders,
    isLoading: isDeleting,
    isError: deleteError,
  } = useMutation({
    mutationFn: deleteMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([LIST, PURCHASE_ORDER, storeId]);
    },
  });

  return {
    query: { data, isLoading, isError },
    selectedRows,
    delete: {
      deletePurchaseOrders,
      isDeleting,
      deleteError,
    },
  };
};
