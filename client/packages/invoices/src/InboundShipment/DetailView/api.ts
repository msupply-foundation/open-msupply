import { toItem } from './DetailView';
import { DraftInboundLine } from './modals/InboundLineEdit/InboundLineEdit';
import { useCallback } from 'react';
import {
  InvoiceNodeStatus,
  UpdateInboundShipmentMutation,
  useParams,
  useOmSupplyApi,
  Column,
  useQueryClient,
  useMutation,
  InvoiceLineConnector,
  InvoiceQuery,
  InvoicePriceResponse,
  ConnectorError,
  NameResponse,
  OmSupplyApi,
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
} from '@openmsupply-client/common';

import {
  Invoice,
  InvoiceLine,
  InboundShipment,
  InboundShipmentRow,
  OutboundShipmentSummaryItem,
} from '../../types';
import {
  flattenInboundItems,
  placeholderInbound,
  inboundLinesToSummaryItems,
} from '../../utils';

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

const getPatchStatus = (patch: Partial<Invoice>) => {
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
    // color: patch.color,
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
    expiryDate: line.expiryDate,
    packSize: line.packSize,
    numberOfPacks: line.numberOfPacks,
    totalAfterTax: 0,
    totalBeforeTax: 0,
    invoiceId: line.invoiceId,
  };
};

const createDeleteInboundLineInput = (
  line: InboundShipmentRow
): DeleteInboundShipmentLineInput => {
  return {
    id: line.id,
    invoiceId: line.invoiceId,
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
});

interface Api<ReadType, UpdateType> {
  onRead: (id: string) => Promise<ReadType>;
  onUpdate: (val: UpdateType) => Promise<UpdateType>;
}

export const getSaveInboundShipmentLines =
  (api: OmSupplyApi) => (lines: DraftInboundLine[]) => {
    const insertInboundShipmentLines = lines
      .filter(({ isCreated }) => isCreated)
      .map(createInsertLineInput);
    const updateInboundShipmentLines = lines
      .filter(({ isCreated, isUpdated }) => !isCreated && isUpdated)
      .map(createUpdateLineInput);

    return api.upsertInboundShipment({
      insertInboundShipmentLines,
      updateInboundShipmentLines,
    });
  };

export const getInboundShipmentDetailViewApi = (
  api: OmSupplyApi
): Api<Invoice, InboundShipment> => ({
  onRead: async (id: string): Promise<Invoice> => {
    const result = await api.invoice({ id });

    const invoice = invoiceGuard(result);

    const lineNodes = linesGuard(invoice.lines);

    const lines: InvoiceLine[] = lineNodes.map(line => {
      const stockLine = line.stockLine
        ? stockLineGuard(line.stockLine)
        : undefined;

      return {
        ...line,
        stockLine,
        stockLineId: stockLine?.id ?? '',
        invoiceId: invoice.id,
      };
    });

    return {
      ...invoice,
      lines,
      pricing: pricingGuard(invoice.pricing),
      otherParty: otherPartyGuard(invoice.otherParty),
    };
  },
  onUpdate: async (patch: InboundShipment): Promise<InboundShipment> => {
    const rows = flattenInboundItems(patch.items);
    const deleteLines = rows.filter(({ isDeleted }) => isDeleted);

    const result = await api.upsertInboundShipment({
      updateInboundShipments: [invoiceToInput(patch)],
      deleteInboundShipmentLines: deleteLines.map(createDeleteInboundLineInput),
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
  const { id } = useParams();

  const { api } = useOmSupplyApi();
  const queries = getInboundShipmentDetailViewApi(api);
  return useQuery(['invoice', id], () => {
    return queries.onRead(id);
  });
};

export const useInboundShipmentSelector = <T = Invoice>(
  select?: (data: Invoice) => T
): UseQueryResult<T, unknown> => {
  const { id } = useParams();
  const { api } = useOmSupplyApi();
  const queries = getInboundShipmentDetailViewApi(api);
  return useQuery(
    ['invoice', id],
    () => {
      return queries.onRead(id);
    },
    { select, notifyOnChangeProps: ['data'] }
  );
};

const getUpdateInbound =
  (api: ReturnType<typeof useOmSupplyApi>['api']) =>
  async (patch: Partial<Invoice> & { id: string }) => {
    return api.updateInboundShipment({ input: invoiceToInput(patch) });
  };

const useOptimisticInboundUpdate = () => {
  const { api } = useOmSupplyApi();
  const queries = getInboundShipmentDetailViewApi(api);
  const queryClient = useQueryClient();
  const { id } = useParams();
  return useMutation(queries.onUpdate, {
    onMutate: async (patch: Partial<InboundShipment>) => {
      await queryClient.cancelQueries(['invoice', id]);

      const previousInbound: Invoice = queryClient.getQueryData([
        'invoice',
        id,
      ]);

      queryClient.setQueryData(['invoice', id], {
        ...previousInbound,
        ...patch,
      });

      return { previousInbound, patch };
    },
    onSettled: () => queryClient.invalidateQueries(['invoice', id]),
    onError: (_, __, context) => {
      queryClient.setQueryData(['invoice', id], context.previousInbound);
    },
  });
};

export const useInboundFields = <KeyOfInvoice extends keyof Invoice>(
  keyOrKeys: KeyOfInvoice | KeyOfInvoice[],
  timeout = 1000
): { [k in KeyOfInvoice]: Invoice[k] } & {
  update: (
    patch: Partial<Invoice>
  ) => Promise<Promise<UpdateInboundShipmentMutation>>;
} => {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const { api } = useOmSupplyApi();
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

  const { mutateAsync } = useMutation(
    (patch: Partial<InboundShipment>) =>
      getUpdateInbound(api)({ id, ...patch }),
    {
      onMutate: async (patch: Partial<InboundShipment>) => {
        await queryClient.cancelQueries(['invoice', id]);

        const previousInbound: Invoice = queryClient.getQueryData([
          'invoice',
          id,
        ]);

        queryClient.setQueryData(['invoice', id], {
          ...previousInbound,
          ...patch,
        });

        return { previousInbound, patch };
      },
      onSettled: () => queryClient.invalidateQueries(['invoice', id]),
      onError: (_, __, context) => {
        queryClient.setQueryData(['invoice', id], context.previousInbound);
      },
    }
  );

  const update = useDebounceCallback(mutateAsync, [], timeout);

  return { ...data, update };
};

export const useIsInboundEditable = (): boolean => {
  const { status } = useInboundFields('status');
  return status === 'NEW' || status === 'ALLOCATED';
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
  const { sortBy, onChangeSortBy } = useSortBy<OutboundShipmentSummaryItem>({
    key: 'itemName',
  });
  const onSort = (column: Column<OutboundShipmentSummaryItem>) => {
    onChangeSortBy({
      key: column.key,
      isDesc: sortBy.key === column.key ? !sortBy.isDesc : false,
    });
  };
  const selectItems = useCallback(
    (invoice: Invoice) => {
      return inboundLinesToSummaryItems(invoice.lines).sort(
        getDataSorter(
          sortBy.key as keyof OutboundShipmentSummaryItem,
          !!sortBy.isDesc
        )
      );
    },
    [sortBy]
  );

  const { data } = useInboundShipmentSelector(selectItems);

  return { data, sortBy, onSort };
};

export const useNextItem = (currentItemId: string) => {
  const { data } = useInboundItems();

  if (!data) return null;

  const currentIndex = data?.findIndex(
    ({ itemId }) => itemId === currentItemId
  );
  const nextItem = data[(currentIndex + 1) % data.length];

  return toItem(nextItem);
};

export const useSaveInboundLines = () => {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const { api } = useOmSupplyApi();

  return useMutation(getSaveInboundShipmentLines(api), {
    onSettled: () => queryClient.invalidateQueries(['invoice', id]),
  });
};

export const useDraftInbound = () => {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const { api } = useOmSupplyApi();
  const queries = getInboundShipmentDetailViewApi(api);

  const { data } = useInboundShipment();

  const draft = data ? { ...data, items: [] } : placeholderInbound;
  const { mutateAsync: optimisticUpdate } = useOptimisticInboundUpdate();
  const { isLoading: isAddingItem, mutateAsync } = useMutation(
    queries.onUpdate,
    {
      onSettled: () => queryClient.invalidateQueries(['invoice', id]),
    }
  );

  const updateInvoice = async (patch: Partial<InboundShipment>) => {
    return optimisticUpdate({ ...data, ...patch, items: [] });
  };

  const upsertItem = async (item: OutboundShipmentSummaryItem) => {
    const itemIdx = draft.items.findIndex(i => i.id === item.id);
    if (itemIdx >= 0) draft.items[itemIdx] = item;
    else draft.items.push(item);

    const result = await mutateAsync(draft);

    return result;
  };

  return {
    isAddingItem,
    updateInvoice,
    upsertItem,
    draft,
  };
};

const getCreateDeleteInboundLineInput =
  (invoiceId: string) =>
  (id: string): DeleteInboundShipmentLineInput => {
    return { id, invoiceId };
  };

const getDeleteInboundLinesQuery =
  (api: OmSupplyApi, invoiceId: string) => (ids: string[]) => {
    const createDeleteLineInput = getCreateDeleteInboundLineInput(invoiceId);
    return api.deleteInboundShipmentLines({
      input: ids.map(createDeleteLineInput),
    });
  };

export const useDeleteInboundLine = (): UseMutationResult<
  DeleteInboundShipmentLinesMutation,
  unknown,
  string[],
  { previous: Invoice; ids: string[] }
> => {
  // TODO: Shouldn't need to get the invoice ID here from the params as the mutation
  // input object should not require the invoice ID. Waiting for an API change.
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { api } = useOmSupplyApi();
  const mutation = getDeleteInboundLinesQuery(api, id);
  return useMutation(mutation, {
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries(['invoice', id]);
      const previous = queryClient.getQueryData<Invoice>(['invoice', id]);
      queryClient.setQueryData<Invoice>(['invoice', id], old => ({
        ...old,
        lines: old.lines.filter(({ id: lineId }) => !ids.includes(lineId)),
      }));
      return { previous, ids };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['invoice', id], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['invoice', id]);
    },
  });
};
