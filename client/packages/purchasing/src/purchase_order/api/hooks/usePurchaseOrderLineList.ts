import {
  FilterByWithBoolean,
  LIST_KEY,
  PurchaseOrderLineSortFieldInput,
  SortBy,
  useQuery,
} from '@openmsupply-client/common';
import { usePurchaseOrderGraphQL } from '../usePurchaseOrderGraphQL';
import { PURCHASE_ORDER } from './keys';
import { PurchaseOrderLineFragment } from '../operations.generated';

export type PurchaseOrderLineListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<PurchaseOrderLineFragment>;
  filterBy: FilterByWithBoolean | null;
};

export const usePurchaseOrderLineList = (
  queryParams: PurchaseOrderLineListParams
) => {
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

  const sortFieldMap: Record<string, PurchaseOrderLineSortFieldInput> = {
    itemName: PurchaseOrderLineSortFieldInput.ItemName,
    lineNumber: PurchaseOrderLineSortFieldInput.LineNumber,
    expectedDeliveryDate: PurchaseOrderLineSortFieldInput.ExpectedDeliveryDate,
    requestedDeliveryDate:
      PurchaseOrderLineSortFieldInput.RequestedDeliveryDate,
    purchaseOrderNumber: PurchaseOrderLineSortFieldInput.PurchaseOrderNumber,
  };

  const queryFn = async (): Promise<{
    nodes: PurchaseOrderLineFragment[];
    totalCount: number;
  }> => {
    const filter = {
      ...filterBy,
    };

    const query = await purchaseOrderApi.purchaseOrderLines({
      storeId,
      first: first,
      offset: offset,
      key:
        sortFieldMap[sortBy.key] ??
        PurchaseOrderLineSortFieldInput.PurchaseOrderNumber,
      desc: sortBy.direction === 'desc',
      filter,
    });
    const { nodes, totalCount } = query?.purchaseOrderLines;
    return { nodes, totalCount };
  };

  const { data, isLoading, isError } = useQuery({ queryKey, queryFn });

  return {
    query: { data, isLoading, isError },
  };
};
