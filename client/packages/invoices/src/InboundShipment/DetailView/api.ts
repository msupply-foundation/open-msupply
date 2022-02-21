import { useCallback } from 'react';
import {
  LocationResponse,
  MutateOptions,
  Item,
  UseMutationResult,
  InvoiceNodeStatus,
  useParams,
  useQueryClient,
  useMutation,
  InvoiceLineConnector,
  InvoicePriceResponse,
  ConnectorError,
  NameResponse,
  StockLineResponse,
  StockLineNode,
  UpdateInboundShipmentLineInput,
  InsertInboundShipmentLineInput,
  DeleteInboundShipmentLineInput,
  UpdateInboundShipmentInput,
  formatNaiveDate,
  useQuery,
  UpdateInboundShipmentStatusInput,
  UseQueryResult,
  useSortBy,
  getDataSorter,
  useDebounceCallback,
  ItemNode,
  ItemResponse,
  useQueryParams,
} from '@openmsupply-client/common';
import { Location, toItem } from '@openmsupply-client/system';
import { Invoice, InvoiceLine } from '../../types';
import { inboundLinesToSummaryItems } from '../../utils';
import { InboundShipmentItem } from './../../types';
import { DraftInboundLine } from './modals/InboundLineEdit';
import {
  DeleteInboundShipmentLinesMutation,
  InboundShipmentApi,
  InvoiceQuery,
  UpdateInboundShipmentMutation,
  useInboundShipmentApi,
} from '../api';

const otherPartyGuard = (otherParty: NameResponse) => {
  if (otherParty.__typename === 'NameNode') {
    return otherParty;
  } else if (otherParty.__typename === 'NodeError') {
    throw new Error(otherParty.error.description);
  }

  throw new Error('Unknown');
};

const pricingGuard = (pricing: InvoicePriceResponse) => {
  if (pricing.__typename === 'InvoicePricingNode') {
    return pricing;
  } else if (pricing.__typename === 'NodeError') {
    throw new Error(pricing.error.description);
  } else {
    throw new Error('Unknown');
  }
};

const invoiceGuard = (invoiceQuery: InvoiceQuery) => {
  if (invoiceQuery.invoice.__typename === 'InvoiceNode') {
    return invoiceQuery.invoice;
  }

  throw new Error(invoiceQuery.invoice.error.description);
};

const linesGuard = (invoiceLines: InvoiceLineConnector | ConnectorError) => {
  if (invoiceLines.__typename === 'InvoiceLineConnector') {
    return invoiceLines.nodes;
  }

  if (invoiceLines.__typename === 'ConnectorError') {
    throw new Error(invoiceLines.error.description);
  }

  throw new Error('Unknown');
};

const stockLineGuard = (stockLine: StockLineResponse): StockLineNode => {
  if (stockLine.__typename === 'StockLineNode') {
    return stockLine;
  }

  throw new Error('Unknown');
};

const locationGuard = (location: LocationResponse): Location => {
  if (location.__typename === 'LocationNode') {
    return location;
  }

  throw new Error('Unknown');
};

const itemGuard = (item: ItemResponse): ItemNode => {
  if (item.__typename === 'ItemNode') {
    return item;
  }

  throw new Error('Unknown');
};

const getPatchStatus = (
  patch: Partial<Invoice>
): UpdateInboundShipmentStatusInput | undefined => {
  switch (patch.status) {
    case InvoiceNodeStatus.Verified:
      return UpdateInboundShipmentStatusInput.Verified;
    case InvoiceNodeStatus.Delivered:
      return UpdateInboundShipmentStatusInput.Delivered;
    default:
      return undefined;
  }
};

const invoiceToInput = (
  patch: Partial<Invoice> & { id: string }
): UpdateInboundShipmentInput => {
  return {
    id: patch.id,
    colour: patch.colour,
    comment: patch.comment,
    status: getPatchStatus(patch),
    onHold: patch.onHold,
    otherPartyId: patch.otherParty?.id,
    theirReference: patch.theirReference,
  };
};

const createInsertLineInput = (
  line: DraftInboundLine
): InsertInboundShipmentLineInput => {
  return {
    id: line.id,
    itemId: line.itemId,
    batch: line.batch,
    costPricePerPack: line.costPricePerPack,
    sellPricePerPack: line.sellPricePerPack,
    expiryDate: line.expiryDate
      ? formatNaiveDate(new Date(line.expiryDate))
      : null,
    packSize: line.packSize,
    numberOfPacks: line.numberOfPacks,
    totalAfterTax: 0,
    totalBeforeTax: 0,
    invoiceId: line.invoiceId,
    locationId: line.location?.id,
  };
};

const createUpdateLineInput = (
  line: DraftInboundLine
): UpdateInboundShipmentLineInput => ({
  id: line.id,
  itemId: line.itemId,
  batch: line.batch,
  costPricePerPack: line.costPricePerPack,
  expiryDate: line.expiryDate
    ? formatNaiveDate(new Date(line.expiryDate))
    : null,
  sellPricePerPack: line.sellPricePerPack,
  packSize: line.packSize,
  numberOfPacks: line.numberOfPacks,
  invoiceId: line.invoiceId,
  locationId: line.location?.id,
});

interface Api<ReadType, UpdateType> {
  onRead: (id: string) => Promise<ReadType>;
  onUpdate: (val: UpdateType) => Promise<UpdateType>;
}

export const getSaveInboundShipmentLines =
  (api: InboundShipmentApi, storeId: string) => (lines: DraftInboundLine[]) => {
    const insertInboundShipmentLines = lines
      .filter(({ isCreated }) => isCreated)
      .map(createInsertLineInput);
    const updateInboundShipmentLines = lines
      .filter(({ isCreated, isUpdated }) => !isCreated && isUpdated)
      .map(createUpdateLineInput);

    return api.upsertInboundShipment({
      storeId,
      input: {
        insertInboundShipmentLines,
        updateInboundShipmentLines,
      },
    });
  };

export const getInboundShipmentDetailViewApi = (
  api: InboundShipmentApi,
  storeId: string
): Api<Invoice, Invoice> => ({
  onRead: async (id: string): Promise<Invoice> => {
    const result = await api.invoice({ id, storeId });

    const invoice = invoiceGuard(result);
    const lineNodes = linesGuard(invoice.lines);
    const lines: InvoiceLine[] = lineNodes.map(line => {
      const stockLine = line.stockLine
        ? stockLineGuard(line.stockLine)
        : undefined;
      const location = line.location ? locationGuard(line.location) : undefined;
      const item = line.item ? itemGuard(line.item) : undefined;

      return {
        ...line,
        stockLine,
        location,
        stockLineId: stockLine?.id ?? '',
        invoiceId: invoice.id,
        unitName: item?.unitName ?? '',
      };
    });

    return {
      ...invoice,
      lines,
      pricing: pricingGuard(invoice.pricing),
      otherParty: otherPartyGuard(invoice.otherParty),
    };
  },
  onUpdate: async (patch: Invoice): Promise<Invoice> => {
    const result = await api.upsertInboundShipment({
      storeId,
      input: { updateInboundShipments: [invoiceToInput(patch)] },
    });

    const { batchInboundShipment } = result;

    if (batchInboundShipment.__typename === 'BatchInboundShipmentResponse') {
      const { updateInboundShipments } = batchInboundShipment;
      if (
        updateInboundShipments?.[0]?.__typename ===
        'UpdateInboundShipmentResponseWithId'
      ) {
        return patch;
      }
    }

    throw new Error(':shrug');
  },
});

export const useInboundShipment = (): UseQueryResult<Invoice, unknown> => {
  const { id = '' } = useParams();
  const api = useInboundShipmentApi();
  const { storeId } = useQueryParams({ initialSortBy: { key: 'id' } });
  const queries = getInboundShipmentDetailViewApi(api, storeId);
  return useQuery(['invoice', id], () => {
    return queries.onRead(id);
  });
};

export const useInboundShipmentSelector = <T = Invoice>(
  select?: (data: Invoice) => T
): UseQueryResult<T, unknown> => {
  const { id = '' } = useParams();
  const api = useInboundShipmentApi();
  const { storeId } = useQueryParams({ initialSortBy: { key: 'id' } });
  const queries = getInboundShipmentDetailViewApi(api, storeId);
  return useQuery(
    ['invoice', id],
    () => {
      return queries.onRead(id);
    },
    { select, notifyOnChangeProps: ['data'] }
  );
};

const getUpdateInbound =
  (api: InboundShipmentApi, storeId: string) =>
  async (patch: Partial<Invoice> & { id: string }) =>
    api.updateInboundShipment({ storeId, input: invoiceToInput(patch) });

const useOptimisticInboundUpdate = () => {
  const api = useInboundShipmentApi();
  const { storeId } = useQueryParams({ initialSortBy: { key: 'id' } });
  const queries = getInboundShipmentDetailViewApi(api, storeId);
  const queryClient = useQueryClient();
  const { id } = useParams();
  return useMutation(queries.onUpdate, {
    onMutate: async (patch: Partial<Invoice>) => {
      await queryClient.cancelQueries(['invoice', id]);

      const previous = queryClient.getQueryData<Invoice>(['invoice', id]);

      if (previous) {
        queryClient.setQueryData<Invoice>(['invoice', id], {
          ...previous,
          ...patch,
        });
      }

      return { previous, patch };
    },
    onSettled: () => queryClient.invalidateQueries(['invoice', id]),
    onError: (_, __, context) => {
      queryClient.setQueryData(['invoice', id], context?.previous);
    },
  });
};

export const useInboundFields = <KeyOfInvoice extends keyof Invoice>(
  keyOrKeys: KeyOfInvoice | KeyOfInvoice[],
  timeout = 1000
): { [k in KeyOfInvoice]: Invoice[k] } & {
  update: (
    variables: Partial<Invoice>,
    options?:
      | MutateOptions<
          UpdateInboundShipmentMutation,
          unknown,
          Partial<Invoice>,
          {
            previous: Invoice | undefined;
            patch: Partial<Invoice>;
          }
        >
      | undefined
  ) => Promise<void>;
} => {
  const queryClient = useQueryClient();
  const { id = '' } = useParams();
  const api = useInboundShipmentApi();
  const select = useCallback(
    (invoice: Invoice) => {
      if (Array.isArray(keyOrKeys)) {
        const mapped = keyOrKeys.reduce((acc, val) => {
          acc[val] = invoice[val];
          return acc;
        }, {} as { [k in KeyOfInvoice]: Invoice[k] });

        return mapped;
      } else {
        return { [keyOrKeys]: invoice[keyOrKeys] } as {
          [k in KeyOfInvoice]: Invoice[k];
        };
      }
    },
    [keyOrKeys]
  );
  const { data } = useInboundShipmentSelector(select);
  const { storeId } = useQueryParams({ initialSortBy: { key: 'id' } });

  const { mutate } = useMutation(
    (patch: Partial<Invoice>) =>
      getUpdateInbound(api, storeId)({ id, ...patch }),
    {
      onMutate: async (patch: Partial<Invoice>) => {
        await queryClient.cancelQueries(['invoice', id]);

        const previous = queryClient.getQueryData<Invoice>(['invoice', id]);

        if (previous) {
          queryClient.setQueryData<Invoice>(['invoice', id], {
            ...previous,
            ...patch,
          });
        }

        return { previous, patch };
      },
      onSettled: () => queryClient.invalidateQueries(['invoice', id]),
      onError: (_, __, context) => {
        queryClient.setQueryData(['invoice', id], context?.previous);
      },
    }
  );

  const update = useDebounceCallback(mutate, [], timeout);

  // When data is undefined, just return an empty object instead of undefined.
  // This allows the caller to use, for example, const { comment } = useInboundFields('comment')
  // and the comment is undefined when the invoice has not been fetched yet.
  const returnVal = data ?? ({} as { [k in KeyOfInvoice]: Invoice[k] });

  return { ...returnVal, update };
};

export const useIsInboundEditable = (): boolean => {
  const { status } = useInboundFields('status');
  return status === 'NEW' || status === 'SHIPPED' || status === 'DELIVERED';
};

export const useInboundLines = (itemId?: string): InvoiceLine[] => {
  const selectItems = useCallback(
    (invoice: Invoice) => {
      return itemId
        ? invoice.lines.filter(
            ({ itemId: invoiceLineItemId }) => itemId === invoiceLineItemId
          )
        : invoice.lines;
    },
    [itemId]
  );

  const { data } = useInboundShipmentSelector(selectItems);

  return data ?? [];
};

export const useInboundItems = () => {
  const { sortBy, onChangeSortBy } = useSortBy<InboundShipmentItem>({
    key: 'itemName',
  });

  const selectItems = useCallback((invoice: Invoice) => {
    return inboundLinesToSummaryItems(invoice.lines).sort(
      getDataSorter(sortBy.key as keyof InboundShipmentItem, !!sortBy.isDesc)
    );
  }, []);

  const { data } = useInboundShipmentSelector(selectItems);

  return { data, sortBy, onSort: onChangeSortBy };
};

export const useNextItem = (currentItemId: string): Item | null => {
  const { data } = useInboundItems();

  if (!data) return null;
  const currentIndex = data.findIndex(({ itemId }) => itemId === currentItemId);
  const nextItem = data?.[(currentIndex + 1) % data.length];
  if (!nextItem) return null;

  return toItem(nextItem);
};

export const useSaveInboundLines = () => {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const api = useInboundShipmentApi();
  const { storeId } = useQueryParams({ initialSortBy: { key: 'id' } });

  return useMutation(getSaveInboundShipmentLines(api, storeId), {
    onSettled: () => queryClient.invalidateQueries(['invoice', id]),
  });
};

export const useDraftInbound = () => {
  const { data, isLoading } = useInboundShipment();

  const { mutateAsync: optimisticUpdate } = useOptimisticInboundUpdate();

  const updateInvoice = async (patch: Partial<Invoice>) => {
    if (!data) return;
    else return optimisticUpdate({ ...data, ...patch });
  };

  return {
    updateInvoice,
    draft: data,
    isLoading,
  };
};

const getCreateDeleteInboundLineInput =
  (invoiceId: string) =>
  (id: string): DeleteInboundShipmentLineInput => {
    return { id, invoiceId };
  };

const getDeleteInboundLinesQuery =
  (api: InboundShipmentApi, invoiceId: string, storeId: string) =>
  (ids: string[]) => {
    const createDeleteLineInput = getCreateDeleteInboundLineInput(invoiceId);
    return api.deleteInboundShipmentLines({
      storeId,
      input: { deleteInboundShipmentLines: ids.map(createDeleteLineInput) },
    });
  };

export const useDeleteInboundLine = (): UseMutationResult<
  DeleteInboundShipmentLinesMutation,
  unknown,
  string[],
  { previous?: Invoice; ids: string[] }
> => {
  // TODO: Shouldn't need to get the invoice ID here from the params as the mutation
  // input object should not require the invoice ID. Waiting for an API change.
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const api = useInboundShipmentApi();
  const { storeId } = useQueryParams({ initialSortBy: { key: 'id' } });
  const mutation = getDeleteInboundLinesQuery(api, id, storeId);
  return useMutation(mutation, {
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries(['invoice', id]);

      const previous = queryClient.getQueryData<Invoice>(['invoice', id]);

      if (previous) {
        queryClient.setQueryData<Invoice>(['invoice', id], {
          ...previous,
          lines: previous.lines.filter(
            ({ id: lineId }) => !ids.includes(lineId)
          ),
        });
      }

      return { previous, ids };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['invoice', id], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['invoice', id]);
    },
  });
};
