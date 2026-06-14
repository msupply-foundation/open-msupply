import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { InvoiceSortFieldInput, type InvoiceFilterInput } from '@/gql/schema';
import { invoicesSdk } from './api';

// Shared list params for any invoice-backed list page (outbound/inbound
// shipments, customer/supplier returns). Each page supplies its own `filter`
// (the invoice type) and a stable `listId` to segment the cache.
export interface ListParams {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDesc: boolean;
}

const SORT_FIELD: Record<string, InvoiceSortFieldInput> = {
  otherPartyName: InvoiceSortFieldInput.OtherPartyName,
  status: InvoiceSortFieldInput.Status,
  invoiceNumber: InvoiceSortFieldInput.InvoiceNumber,
  createdDatetime: InvoiceSortFieldInput.CreatedDatetime,
  deliveredDatetime: InvoiceSortFieldInput.DeliveredDatetime,
  comment: InvoiceSortFieldInput.Comment,
  theirReference: InvoiceSortFieldInput.TheirReference,
};

const toSortField = (key: string): InvoiceSortFieldInput =>
  SORT_FIELD[key] ?? InvoiceSortFieldInput.InvoiceNumber;

export const invoiceKeys = {
  // `filter` is part of the key so search/status changes refetch (not just
  // pagination/sort, which live in `params`).
  list: (
    storeId: string,
    listId: string,
    filter: InvoiceFilterInput,
    params: ListParams,
  ) => ['invoices', storeId, listId, filter, params] as const,
};

export const invoiceListQueryOptions = (
  storeId: string,
  listId: string,
  filter: InvoiceFilterInput,
  params: ListParams,
) =>
  queryOptions({
    queryKey: invoiceKeys.list(storeId, listId, filter, params),
    queryFn: async () => {
      const res = await invoicesSdk.invoices({
        storeId,
        first: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
        key: toSortField(params.sortKey),
        desc: params.sortDesc,
        filter,
      });
      return res.invoices;
    },
    placeholderData: keepPreviousData,
  });
