import { InboundShipmentItem } from './../../types';
import { toItem } from './DetailView';
import { DraftInboundLine } from './modals/InboundLineEdit/InboundLineEdit';
import { useCallback } from 'react';
import {
  LocationResponse,
  MutateOptions,
  Item,
  UseMutationResult,
  DeleteInboundShipmentLinesMutation,
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
import { Location } from '@openmsupply-client/system';
import { Invoice, InvoiceLine } from '../../types';
import { inboundLinesToSummaryItems } from '../../utils';

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
    color: patch.color,
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
): Api<Invoice, Invoice> => ({
  onRead: async (id: string): Promise<Invoice> => {
    const result = await api.invoice({ id });

    const invoice = invoiceGuard(result);
    const lineNodes = linesGuard(invoice.lines);
    const lines: InvoiceLine[] = lineNodes.map(line => {
      const stockLine = line.stockLine
        ? stockLineGuard(line.stockLine)
        : undefined;

      const expiryDate = line.expiryDate
        ? new Date(line.expiryDate)
        : undefined;
      const location = line.location ? locationGuard(line.location) : undefined;

      return {
        ...line,
        stockLine,
        location,
        expiryDate,
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
  onUpdate: async (patch: Invoice): Promise<Invoice> => {
    const result = await api.upsertInboundShipment({
      updateInboundShipments: [invoiceToInput(patch)],
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
  const { api } = useOmSupplyApi();
  const queries = getInboundShipmentDetailViewApi(api);
  return useQuery(['invoice', id], () => {
    return queries.onRead(id);
  });
};

export const useInboundShipmentSelector = <T = Invoice>(
  select?: (data: Invoice) => T
): UseQueryResult<T, unknown> => {
  const { id = '' } = useParams();
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

  const { mutate } = useMutation(
    (patch: Partial<Invoice>) => getUpdateInbound(api)({ id, ...patch }),
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
  const { sortBy, onChangeSortBy } = useSortBy<InboundShipmentItem>({
    key: 'itemName',
  });
  const onSort = (column: Column<InboundShipmentItem>) => {
    onChangeSortBy({
      key: column.key,
      isDesc: sortBy.key === column.key ? !sortBy.isDesc : false,
    });
  };
  const selectItems = useCallback((invoice: Invoice) => {
    return inboundLinesToSummaryItems(invoice.lines).sort(
      getDataSorter(sortBy.key as keyof InboundShipmentItem, !!sortBy.isDesc)
    );
  }, []);

  const { data } = useInboundShipmentSelector(selectItems);

  return { data, sortBy, onSort };
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
  const { api } = useOmSupplyApi();

  return useMutation(getSaveInboundShipmentLines(api), {
    onSettled: () => queryClient.invalidateQueries(['invoice', id]),
  });
};

export const useDraftInbound = () => {
  const { data } = useInboundShipment();

  const { mutateAsync: optimisticUpdate } = useOptimisticInboundUpdate();

  const updateInvoice = async (patch: Partial<Invoice>) => {
    if (!data) return;
    else return optimisticUpdate({ ...data, ...patch });
  };

  return {
    updateInvoice,
    draft: data,
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
  { previous?: Invoice; ids: string[] }
> => {
  // TODO: Shouldn't need to get the invoice ID here from the params as the mutation
  // input object should not require the invoice ID. Waiting for an API change.
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const { api } = useOmSupplyApi();
  const mutation = getDeleteInboundLinesQuery(api, id);
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
