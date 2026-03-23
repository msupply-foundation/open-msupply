import {
  FilterBy,
  InvoiceSortFieldInput,
  InvoiceTypeInput,
  SortBy,
  useQuery,
} from '@openmsupply-client/common';
import { useInboundGraphQL } from '../../useInboundGraphQL';
import { useInboundDelete } from './useInboundDelete';
import { LIST, INBOUND } from './keys';
import { InboundRowFragment } from '../../operations.generated';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<InboundRowFragment>;
  filterBy: FilterBy | null;
  type?: InvoiceTypeInput[];
};

const sortFieldMap: Record<string, InvoiceSortFieldInput> = {
  createdDatetime: InvoiceSortFieldInput.CreatedDatetime,
  otherPartyName: InvoiceSortFieldInput.OtherPartyName,
  comment: InvoiceSortFieldInput.Comment,
  invoiceNumber: InvoiceSortFieldInput.InvoiceNumber,
  theirReference: InvoiceSortFieldInput.TheirReference,
  status: InvoiceSortFieldInput.Status,
  deliveredDatetime: InvoiceSortFieldInput.DeliveredDatetime,
};

export const useInboundList = (queryParams?: ListParams) => {
  const { inboundApi, storeId } = useInboundGraphQL();

  const {
    sortBy = {
      key: 'invoiceNumber',
      direction: 'desc',
    },
    first,
    offset,
    filterBy,
    type,
  } = queryParams ?? {};

  const queryKey = [
    LIST,
    INBOUND,
    storeId,
    sortBy,
    first,
    offset,
    filterBy,
    type,
  ];

  const queryFn = async (): Promise<{
    nodes: InboundRowFragment[];
    totalCount: number;
  }> => {
    const filter = {
      ...filterBy,
    };

    const sortKey =
      sortFieldMap[String(sortBy.key)] || InvoiceSortFieldInput.InvoiceNumber;

    const query = await inboundApi.invoices({
      storeId,
      first: first,
      offset: offset,
      key: sortKey,
      desc: sortBy.direction === 'desc',
      filter,
      type,
    });
    if (!query?.invoices) throw new Error('No data returned from query');
    return query?.invoices;
  };

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey,
    queryFn,
    keepPreviousData: true,
    enabled: !!queryParams,
  });

  const {
    mutateAsync: deleteMutation,
    isLoading: isDeleting,
    error: deleteError,
  } = useInboundDelete();

  const deleteInbounds = async (selectedRows: InboundRowFragment[]) => {
    await deleteMutation(selectedRows);
  };

  return {
    query: { data, isLoading, isFetching, isError, refetch },
    delete: { deleteInbounds, isDeleting, deleteError },
  };
};
