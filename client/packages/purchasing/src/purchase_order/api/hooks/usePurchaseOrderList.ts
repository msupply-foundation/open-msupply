import {
  FilterByWithBoolean,
  LIST_KEY,
  PurchaseOrderSortFieldInput,
  SortBy,
  useQuery,
  useTableStore,
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
  filterBy: FilterByWithBoolean | null;
};

export const usePurchaseOrderList = (queryParams: ListParams) => {
  const { purchaseOrderApi, storeId } = usePurchaseOrderGraphQL();

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
    PURCHASE_ORDER,
    LIST_KEY,
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

  return {
    query: { data, isLoading, isError },
    selectedRows,
  };
};
