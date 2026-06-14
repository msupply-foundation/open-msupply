import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import {
  RequisitionSortFieldInput,
  type RequisitionFilterInput,
} from '@/gql/schema';
import { requisitionsSdk } from './api';

// Shared list params for any requisition-backed list page (customer
// requisitions = RESPONSE, internal orders = REQUEST). Each page supplies its
// own `filter` (the requisition type) and a stable `listId` for the cache.
export interface ListParams {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDesc: boolean;
}

const SORT_FIELD: Record<string, RequisitionSortFieldInput> = {
  otherPartyName: RequisitionSortFieldInput.OtherPartyName,
  status: RequisitionSortFieldInput.Status,
  requisitionNumber: RequisitionSortFieldInput.RequisitionNumber,
  createdDatetime: RequisitionSortFieldInput.CreatedDatetime,
  comment: RequisitionSortFieldInput.Comment,
  theirReference: RequisitionSortFieldInput.TheirReference,
};

const toSortField = (key: string): RequisitionSortFieldInput =>
  SORT_FIELD[key] ?? RequisitionSortFieldInput.CreatedDatetime;

export const requisitionKeys = {
  list: (storeId: string, listId: string, params: ListParams) =>
    ['requisitions', storeId, listId, params] as const,
};

export const requisitionListQueryOptions = (
  storeId: string,
  listId: string,
  filter: RequisitionFilterInput,
  params: ListParams,
) =>
  queryOptions({
    queryKey: requisitionKeys.list(storeId, listId, params),
    queryFn: async () => {
      const res = await requisitionsSdk.requisitions({
        storeId,
        first: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
        key: toSortField(params.sortKey),
        desc: params.sortDesc,
        filter,
      });
      return res.requisitions;
    },
    placeholderData: keepPreviousData,
  });
