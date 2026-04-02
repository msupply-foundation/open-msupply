import {
  FilterBy,
  InvoiceSortFieldInput,
  InvoiceTypeInput,
  SortBy,
  useQuery,
  useMutation,
} from '@openmsupply-client/common';
import { useInboundGraphQL } from '../../useInboundGraphQL';
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
  } = useDelete();

  const deleteInbounds = async (selectedRows: InboundRowFragment[]) => {
    await deleteMutation(selectedRows);
  };

  return {
    query: { data, isLoading, isFetching, isError, refetch },
    delete: { deleteInbounds, isDeleting, deleteError },
  };
};

const useDelete = () => {
  const { inboundApi, storeId, queryClient } = useInboundGraphQL();

  const mutationFn = async (
    invoices: InboundRowFragment[]
  ): Promise<string[]> => {
    const internal = invoices.filter(inv => !inv.purchaseOrder);
    const external = invoices.filter(inv => !!inv.purchaseOrder);
    const deletedIds: string[] = [];

    const extractIds = (
      result: { deleteInboundShipments?: { id: string }[] | null } | undefined
    ) =>
      result?.deleteInboundShipments?.map(({ id }: { id: string }) => id) ?? [];

    if (internal.length > 0) {
      const variables = {
        storeId,
        deleteInboundShipments: internal.map(inv => ({ id: inv.id })),
      };
      const result = (await inboundApi.deleteInboundShipments(variables))
        ?.batchInboundShipment;
      deletedIds.push(...extractIds(result));
    }

    if (external.length > 0) {
      const variables = {
        storeId,
        deleteInboundShipments: external.map(inv => ({ id: inv.id })),
      };
      const result = (
        await inboundApi.deleteInboundShipmentsExternal(variables)
      )?.batchInboundShipmentExternal;
      deletedIds.push(...extractIds(result));
    }

    if (deletedIds.length === 0) {
      throw new Error('Could not delete invoices');
    }

    return deletedIds;
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([LIST]),
  });
};
