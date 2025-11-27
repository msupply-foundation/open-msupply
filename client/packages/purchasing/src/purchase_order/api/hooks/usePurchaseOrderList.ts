import {
  FilterBy,
  LIST_KEY,
  PurchaseOrderSortFieldInput,
  SortBy,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import { usePurchaseOrderGraphQL } from '../usePurchaseOrderGraphQL';
import { PURCHASE_ORDER } from './keys';
import {
  PurchaseOrderFragment,
  PurchaseOrderRowFragment,
} from '../operations.generated';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<PurchaseOrderFragment>;
  filterBy: FilterBy | null;
};

export const usePurchaseOrderList = (queryParams?: ListParams) => {
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();

  const {
    sortBy = {
      key: 'number',
      direction: 'desc',
    },
    first,
    offset,
    filterBy,
  } = queryParams ?? {};

  const queryKey = [
    PURCHASE_ORDER,
    LIST_KEY,
    storeId,
    sortBy,
    first,
    offset,
    filterBy,
  ];

  const queryFn = async (): Promise<{
    nodes: PurchaseOrderRowFragment[];
    totalCount: number;
  }> => {
    const filter = {
      ...filterBy,
    };

    const sortKey = (sortBy.key ||
      PurchaseOrderSortFieldInput.Number) as PurchaseOrderSortFieldInput;
    const query = await purchaseOrderApi.purchaseOrders({
      storeId,
      first: first,
      offset: offset,
      key: sortKey,
      desc: sortBy.direction === 'desc',
      filter,
    });
    const { nodes, totalCount } = query?.purchaseOrders;
    return { nodes, totalCount };
  };

  const { data, isFetching, isError } = useQuery({
    queryKey,
    queryFn,
    keepPreviousData: true,
  });

  const deleteMutationFn = async (ids: string[]) => {
    try {
      for (const id of ids) {
        await purchaseOrderApi.deletePurchaseOrder({
          id,
          storeId,
        });
      }
    } catch (error) {
      console.error('Error deleting one or more purchase orders:', error);
      throw error;
    }
  };

  const {
    mutate: deletePurchaseOrders,
    isLoading: isDeleting,
    isError: deleteError,
  } = useMutation({
    mutationFn: deleteMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([PURCHASE_ORDER, LIST_KEY]);
    },
  });

  return {
    query: { data, isFetching, isError },
    delete: {
      deletePurchaseOrders,
      isDeleting,
      deleteError,
    },
  };
};
