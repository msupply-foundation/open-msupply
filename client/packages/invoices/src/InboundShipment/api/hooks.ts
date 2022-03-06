import { useMemo, useCallback } from 'react';
import {
  useIsGrouped,
  getColumnSorter,
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
import { inboundLinesToSummaryItems, isInboundDisabled } from './../../utils';
import { InboundItem } from './../../types';
import { getInboundQueries, ListParams } from './api';
import { useInboundShipmentColumns } from '../DetailView/ContentArea';
import {
  getSdk,
  InboundFragment,
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

const useInboundNumber = () => {
  const { invoiceNumber = '' } = useParams();
  return invoiceNumber;
};

export const useInbound = () => {
  const invoiceNumber = useInboundNumber();
  const api = useInboundApi();
  return useQuery(api.keys.detail(invoiceNumber), () =>
    api.get.byNumber(invoiceNumber)
  );
};

export const useIsInboundDisabled = (): boolean => {
  const { data } = useInbound();
  if (!data) return true;
  return isInboundDisabled(data);
};

export const useInboundSelector = <T = InboundFragment>(
  select?: (data: InboundFragment) => T
) => {
  const invoiceNumber = useInboundNumber();
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
  const invoiceNumber = useInboundNumber();
  const api = useInboundApi();
  return useFieldsSelector(
    api.keys.detail(invoiceNumber),
    () => api.get.byNumber(invoiceNumber),
    patch => mutateAsync({ ...patch, id: data?.id ?? '' }),
    keyOrKeys
  );
};

export const useInboundLines = (itemId?: string) => {
  const selectItems = useCallback(
    (invoice: InboundFragment) => {
      return itemId
        ? invoice.lines.nodes.filter(({ item }) => itemId === item.id)
        : invoice.lines.nodes;
    },
    [itemId]
  );

  return useInboundSelector(selectItems);
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
  const invoiceNumber = useInboundNumber();
  const api = useInboundApi();
  return useMutation(api.upsertLines, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(invoiceNumber)),
  });
};

export const useDeleteInboundLines = () => {
  const inboundNumber = useInboundNumber();
  const queryClient = useQueryClient();
  const api = useInboundApi();
  const queryKey = api.keys.detail(inboundNumber);

  return useMutation(api.deleteLines, {
    onMutate: async lines => {
      await queryClient.cancelQueries(queryKey);
      const previous = queryClient.getQueryData<InboundFragment>(queryKey);
      if (previous) {
        const nodes = previous.lines.nodes.filter(
          ({ id: lineId }) => !lines.find(({ id }) => lineId === id)
        );
        queryClient.setQueryData<InboundFragment>(queryKey, {
          ...previous,
          lines: {
            __typename: 'InvoiceLineConnector',
            nodes,
            totalCount: nodes.length,
          },
        });
      }
      return { previous, lines };
    },
    onError: (_error, _vars, ctx) => {
      // Having issues typing this correctly. If typing ctx in the args list,
      // then TS infers the wrong type for the useMutation call and all
      // hell breaks loose.
      const context = ctx as {
        previous: InboundFragment;
        lines: { id: string; invoiceId: string }[];
      };
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries(queryKey),
  });
};

export const useDeleteSelectedLines = (): {
  onDelete: () => Promise<void>;
} => {
  const { success, info } = useNotification();
  const { items, lines } = useInboundRows();
  const { mutate } = useDeleteInboundLines();
  const t = useTranslation('replenishment');

  const selectedRows = useTableStore(state => {
    const { isGrouped } = state;

    if (isGrouped) {
      return items
        ?.filter(({ id }) => state.rowState[id]?.isSelected)
        .map(({ lines }) => lines.flat())
        .flat();
    } else {
      return lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    }
  });

  const onDelete = async () => {
    if (selectedRows && selectedRows?.length > 0) {
      const number = selectedRows?.length;
      const onSuccess = success(t('messages.deleted-lines', { number }));
      mutate(selectedRows, {
        onSuccess,
      });
    } else {
      const infoSnack = info(t('label.select-rows-to-delete-them'));
      infoSnack();
    }
  };

  return { onDelete };
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

  const selectedRows = useTableStore(
    state =>
      rows?.nodes.filter(({ id }) => state.rowState[id]?.isSelected) ?? []
  );

  const deleteAction = () => {
    const number = selectedRows?.length;
    if (selectedRows && number > 0) {
      const canDeleteRows = selectedRows.every(
        ({ status }) => status === InvoiceNodeStatus.New
      );
      if (!canDeleteRows) {
        const cannotDeleteSnack = info(t('messages.cant-delete-invoices'));
        cannotDeleteSnack();
      } else {
        mutate(selectedRows, {
          onSettled: () => queryClient.invalidateQueries(api.keys.base()),
        });
        const deletedMessage = t('messages.deleted-invoices', { number });
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

export const useInboundRows = () => {
  const { isGrouped, toggleIsGrouped } = useIsGrouped('inboundShipment');
  const { data: lines } = useInboundLines();
  const { data: items } = useInboundItems();
  const { columns, onChangeSortBy, sortBy } = useInboundShipmentColumns();

  const sortedItems = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return items;
    const sorter = getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return [...(items ?? [])].sort(sorter);
  }, [items, sortBy.key, sortBy.isDesc]);

  const sortedLines = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return lines;
    const sorter = getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return [...(lines ?? [])].sort(sorter);
  }, [lines, sortBy.key, sortBy.isDesc]);

  const rows = isGrouped ? sortedItems : sortedLines;

  return {
    isGrouped,
    toggleIsGrouped,
    columns,
    rows,
    lines: sortedLines,
    items: sortedItems,
    onChangeSortBy,
    sortBy,
  };
};
