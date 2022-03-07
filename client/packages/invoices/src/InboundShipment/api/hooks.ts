import { useCallback } from 'react';
import {
  useQueryParams,
  useTableStore,
  useTranslation,
  useNotification,
  useNavigate,
  getDataSorter,
  useSortBy,
  FieldSelectorControl,
  useQueryClient,
  useParams,
  useQuery,
  useAuthContext,
  useOmSupplyApi,
  useMutation,
  useFieldsSelector,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import { inboundLinesToSummaryItems } from './../../utils';
import { InboundItem } from './../../types';
import { getInboundQueries, ListParams } from './api';
import {
  getSdk,
  InboundFragment,
  InboundLineFragment,
  InboundRowFragment,
} from './operations.generated';

export const useInboundApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['inbound'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };

  const { client } = useOmSupplyApi();
  const queries = getInboundQueries(getSdk(client), storeId);
  return { ...queries, storeId, keys };
};

const useInvoiceNumber = () => {
  const { invoiceNumber = '' } = useParams();
  return invoiceNumber;
};

export const useInbound = () => {
  const invoiceNumber = useInvoiceNumber();
  const api = useInboundApi();
  return useQuery(api.keys.detail(invoiceNumber), () =>
    api.get.byNumber(invoiceNumber)
  );
};

export const useIsInboundEditable = (): boolean => {
  const { status } = useInboundFields('status');
  return status === 'NEW' || status === 'SHIPPED' || status === 'DELIVERED';
};

export const useInboundSelector = <T = InboundFragment>(
  select?: (data: InboundFragment) => T
) => {
  const invoiceNumber = useInvoiceNumber();
  const api = useInboundApi();

  return useQuery(
    api.keys.detail(invoiceNumber),
    () => api.get.byNumber(invoiceNumber),
    { select }
  );
};

export const useInboundFields = <KeyOfInvoice extends keyof InboundFragment>(
  keyOrKeys: KeyOfInvoice | KeyOfInvoice[]
): FieldSelectorControl<InboundFragment, KeyOfInvoice> => {
  const { data } = useInbound();
  const { mutateAsync } = useUpdateInbound();
  const invoiceNumber = useInvoiceNumber();
  const api = useInboundApi();
  return useFieldsSelector(
    api.keys.detail(invoiceNumber),
    () => api.get.byNumber(invoiceNumber),
    patch => mutateAsync({ ...patch, id: data?.id ?? '' }),
    keyOrKeys
  );
};

export const useInboundLines = (itemId?: string): InboundLineFragment[] => {
  const selectItems = useCallback(
    (invoice: InboundFragment) => {
      return itemId
        ? invoice.lines.nodes.filter(({ item }) => itemId === item.id)
        : invoice.lines.nodes;
    },
    [itemId]
  );

  const { data } = useInboundSelector(selectItems);

  return data ?? [];
};

export const useInboundItems = () => {
  const { sortBy, onChangeSortBy } = useSortBy<InboundItem>({
    key: 'itemName',
  });

  const selectItems = useCallback((invoice: InboundFragment) => {
    return inboundLinesToSummaryItems(invoice.lines.nodes).sort(
      getDataSorter(sortBy.key as keyof InboundItem, !!sortBy.isDesc)
    );
  }, []);

  const { data } = useInboundSelector(selectItems);

  return { data, sortBy, onSort: onChangeSortBy };
};

export const useNextItem = (currentItemId: string): ItemRowFragment | null => {
  const { data } = useInboundItems();

  if (!data) return null;
  const currentIndex = data.findIndex(({ itemId }) => itemId === currentItemId);
  const nextItem = data?.[(currentIndex + 1) % data.length];
  if (!nextItem) return null;

  return nextItem.lines[0].item;
};

export const useSaveInboundLines = () => {
  const queryClient = useQueryClient();
  const invoiceNumber = useInvoiceNumber();
  const api = useInboundApi();
  return useMutation(api.upsertLines, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(invoiceNumber)),
  });
};

export const useDeleteInboundLine = () => {
  // TODO: Shouldn't need to get the invoice ID here from the params as the mutation
  // input object should not require the invoice ID. Waiting for an API change.
  const { data } = useInbound();
  const invoiceNumber = useInvoiceNumber();
  const queryClient = useQueryClient();
  const api = useInboundApi();

  return useMutation((ids: string[]) => api.deleteLines(data?.id ?? '', ids), {
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries(api.keys.detail(invoiceNumber));

      const previous = queryClient.getQueryData<InboundFragment>(
        api.keys.detail(invoiceNumber)
      );

      if (previous) {
        const filteredLines = previous.lines.nodes.filter(
          ({ id: lineId }) => !ids.includes(lineId)
        );
        queryClient.setQueryData<InboundFragment>(
          api.keys.detail(invoiceNumber),
          {
            ...previous,
            lines: {
              __typename: 'InvoiceLineConnector',
              nodes: filteredLines,
              totalCount: filteredLines.length,
            },
          }
        );
      }

      return { previous, ids };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(
        api.keys.detail(invoiceNumber),
        context?.previous
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries(api.keys.detail(invoiceNumber));
    },
  });
};

export const useInbounds = () => {
  const queryParams = useQueryParams<InboundRowFragment>({
    initialSortBy: { key: 'otherPartyName' },
  });
  const api = useInboundApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list({
        first: queryParams.first,
        offset: queryParams.offset,
        sortBy: queryParams.sortBy,
        filterBy: queryParams.filter.filterBy,
      })
    ),
    ...queryParams,
  };
};

export const useInsertInbound = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useInboundApi();
  return useMutation(api.insert, {
    onSuccess: invoiceNumber => {
      navigate(String(invoiceNumber));
      return queryClient.invalidateQueries(api.keys.base());
    },
  });
};

export const useUpdateInbound = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();
  return useMutation(api.update, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};

export const useDeleteSelectedInbounds = () => {
  const queryClient = useQueryClient();
  const { data: rows } = useInbounds();
  const api = useInboundApi();
  const { mutate } = useMutation(api.delete);
  const t = useTranslation('replenishment');

  const { success, info } = useNotification();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as InboundRowFragment[],
  }));

  const deleteAction = () => {
    const numberSelected = selectedRows.length;
    if (selectedRows && numberSelected > 0) {
      const canDeleteRows = selectedRows.every(
        ({ status }) => status === InvoiceNodeStatus.New
      );
      if (!canDeleteRows) {
        const cannotDeleteSnack = info(t('messages.cant-delete-invoices'));
        cannotDeleteSnack();
      } else {
        mutate(selectedRows, {
          onSuccess: () => queryClient.invalidateQueries(['invoice']),
        });
        const deletedMessage = t('messages.deleted-invoices', {
          number: numberSelected,
        });
        const successSnack = success(deletedMessage);
        successSnack();
      }
    } else {
      const selectRowsSnack = info(t('messages.select-rows-to-delete'));
      selectRowsSnack();
    }
  };

  return deleteAction;
};
