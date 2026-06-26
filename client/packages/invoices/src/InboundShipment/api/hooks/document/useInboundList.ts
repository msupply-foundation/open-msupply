import {
  FilterBy,
  InvoiceSortFieldInput,
  InvoiceTypeInput,
  SortBy,
  useQuery,
  useMutation,
  keepPreviousData,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { useInboundGraphQL } from '../../useInboundGraphQL';
import { LIST, INBOUND } from './keys';
import { InboundRowFragment } from '../../operations.generated';
import { DeleteResponseNode } from '../../mapInboundDeleteError';

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
    placeholderData: keepPreviousData,
    enabled: !!queryParams,
  });

  const {
    mutateAsync: deleteMutation,
    isPending: isDeleting,
    error: deleteError,
  } = useDelete();

  const deleteInbounds = async (selectedRows: InboundRowFragment[]) =>
    deleteMutation(selectedRows);

  return {
    query: { data, isLoading, isFetching, isError, refetch },
    delete: { deleteInbounds, isDeleting, deleteError },
  };
};

const useDelete = () => {
  const { inboundApi, storeId, queryClient } = useInboundGraphQL();

  const mutationFn = async (
    invoices: InboundRowFragment[]
  ): Promise<DeleteResponseNode[]> => {
    const internal = invoices.filter(inv => !inv.purchaseOrder);
    const external = invoices.filter(inv => !!inv.purchaseOrder);
    const nodes: DeleteResponseNode[] = [];

    if (internal.length > 0) {
      const variables = {
        storeId,
        deleteInboundShipments: internal.map(inv => ({ id: inv.id })),
      };
      const result = (await inboundApi.deleteInboundShipments(variables))
        ?.batchInboundShipment;
      nodes.push(...(result?.deleteInboundShipments ?? []));
    }

    if (external.length > 0) {
      const variables = {
        storeId,
        deleteInboundShipments: external.map(inv => ({ id: inv.id })),
      };
      const result = (
        await inboundApi.deleteInboundShipmentsExternal(variables)
      )?.batchInboundShipmentExternal;
      nodes.push(...(result?.deleteInboundShipments ?? []));
    }

    return nodes;
  };

  return useMutation({
    mutationFn,
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: [LIST],
      }),
  });
};

export const useDuplicate = () => {
  const { inboundApi, storeId, queryClient } = useInboundGraphQL();
  const t = useTranslation();
  const { error } = useNotification();

  const {
    mutateAsync,
    isPending: isDuplicating,
    error: duplicateError,
  } = useMutation({
    mutationFn: (id: string) =>
      inboundApi.duplicateInboundShipment({ id, storeId }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [LIST],
      }),
  });

  const duplicate = async (id: string) => {
    try {
      const duplicated = (await mutateAsync(id))?.duplicateInboundShipment;

      if (duplicated?.__typename === 'DuplicateInboundShipmentNode') {
        return {
          id: duplicated.invoice.id,
          invoiceNumber: duplicated.invoice.invoiceNumber,
          skippedItemCount: duplicated.skippedItemCount,
        };
      }

      if (
        duplicated?.__typename === 'DuplicateInboundShipmentError' &&
        duplicated.error.__typename === 'SupplierIsInactive'
      ) {
        error(t('error.duplicate-supplier-inactive'))();
        return undefined;
      }

      error(t('error.failed-to-duplicate-shipment', { message: '' }))();
      return undefined;
    } catch (e) {
      error(
        t('error.failed-to-duplicate-shipment', {
          message: (e as Error).message,
        })
      )();
      return undefined;
    }
  };

  return { duplicate, isDuplicating, duplicateError };
};
