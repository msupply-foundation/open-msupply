import { isOutboundDisabled } from './../../utils';
import { useMemo, useCallback } from 'react';
import {
  InvoiceLineNodeType,
  RouteBuilder,
  useQueryParams,
  useNavigate,
  useTranslation,
  useNotification,
  useQueryClient,
  useQuerySelector,
  useParams,
  useGql,
  UseQueryResult,
  useQuery,
  FieldSelectorControl,
  useFieldsSelector,
  ArrayUtils,
  SortUtils,
  useSortBy,
  useMutation,
  useTableStore,
  useAuthContext,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { OutboundItem } from '../../types';
import { getOutboundQueries, ListParams } from './api';
import { useOutboundColumns } from '../DetailView/columns';
import {
  getSdk,
  OutboundRowFragment,
  OutboundFragment,
  OutboundLineFragment,
} from './operations.generated';
import { canDeleteInvoice, isA } from '../../utils';

export const useOutboundApi = () => {
  const keys = {
    base: () => ['outbound'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };

  const { client } = useGql();
  const sdk = getSdk(client);
  const { storeId } = useAuthContext();
  const queries = getOutboundQueries(sdk, storeId);
  return { ...queries, storeId, keys };
};

export const useOutboundNumber = () => {
  const { invoiceNumber = '' } = useParams();
  return invoiceNumber;
};

export const useOutbounds = () => {
  const queryParams = useQueryParams<OutboundRowFragment>({
    initialSortBy: { key: 'otherPartyName' },
  });
  const api = useOutboundApi();

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

export const useOutbound = (): UseQueryResult<OutboundFragment> => {
  const outboundNumber = useOutboundNumber();
  const api = useOutboundApi();

  return useQuery(api.keys.detail(outboundNumber), () =>
    api.get.byNumber(outboundNumber)
  );
};

export const useUpdateOutbound = () => {
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  return useMutation(api.update, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};

export const useCreateOutbound = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useOutboundApi();
  return useMutation(api.insert, {
    onSuccess: invoiceNumber => {
      const route = RouteBuilder.create(AppRoute.Distribution)
        .addPart(AppRoute.OutboundShipment)
        .addPart(String(invoiceNumber))
        .build();
      navigate(route, { replace: true });
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};

export const useDeleteSelectedOutbounds = () => {
  const queryClient = useQueryClient();
  const { data: rows } = useOutbounds();
  const api = useOutboundApi();
  const { mutate } = useMutation(api.delete);
  const t = useTranslation('replenishment');

  const { success, info } = useNotification();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as OutboundRowFragment[],
  }));

  const deleteAction = () => {
    const numberSelected = selectedRows.length;
    if (selectedRows && numberSelected > 0) {
      const canDeleteRows = selectedRows.every(canDeleteInvoice);
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

export const useOutboundFields = <KeyOfOutbound extends keyof OutboundFragment>(
  keys: KeyOfOutbound | KeyOfOutbound[]
): FieldSelectorControl<OutboundFragment, KeyOfOutbound> => {
  const outboundNumber = useOutboundNumber();
  const { data } = useOutbound();
  const api = useOutboundApi();
  const queryKey = api.keys.detail(outboundNumber);

  return useFieldsSelector(
    queryKey,
    () => api.get.byNumber(outboundNumber),
    (patch: Partial<OutboundFragment>) =>
      api.update({ ...patch, id: data?.id ?? '' }),
    keys
  );
};

export const useIsOutboundDisabled = (): boolean => {
  const { data } = useOutbound();
  if (!data) return true;
  return isOutboundDisabled(data);
};

const useOutboundSelector = <ReturnType>(
  select: (data: OutboundFragment) => ReturnType
) => {
  const outboundNumber = useOutboundNumber();
  const api = useOutboundApi();
  return useQuerySelector(
    api.keys.detail(outboundNumber),
    () => api.get.byNumber(outboundNumber),
    select
  );
};

export const useOutboundLines = (
  itemId?: string
): UseQueryResult<OutboundLineFragment[], unknown> => {
  const selectLines = useCallback(
    (invoice: OutboundFragment) => {
      const forListView = (line: OutboundLineFragment) =>
        isA.stockOutLine(line) || isA.placeholderLine(line);
      return itemId
        ? invoice.lines.nodes.filter(({ item }) => itemId === item.id)
        : invoice.lines.nodes.filter(forListView);
    },
    [itemId]
  );

  return useOutboundSelector(selectLines);
};
export const useOutboundItems = (): UseQueryResult<OutboundItem[]> => {
  const selectLines = useCallback((invoice: OutboundFragment) => {
    const forListView = (line: OutboundLineFragment) =>
      isA.stockOutLine(line) || isA.placeholderLine(line);
    const { lines } = invoice;
    const stockLines = lines.nodes.filter(forListView);

    return Object.entries(
      ArrayUtils.groupBy(stockLines, line => line.item.id)
    ).map(([itemId, lines]) => {
      return { id: itemId, itemId, lines };
    });
  }, []);

  return useOutboundSelector(selectLines);
};

export const useOutboundServiceLines = () => {
  const selectLines = useCallback((invoice: OutboundFragment) => {
    return invoice.lines.nodes.filter(isA.serviceLine);
  }, []);

  return useOutboundSelector(selectLines);
};

export const useOutboundRows = (isGrouped = true) => {
  const { sortBy, onChangeSortBy } = useSortBy<
    OutboundLineFragment | OutboundItem
  >({
    key: 'itemName',
  });
  const { data: lines } = useOutboundLines();
  const { data: items } = useOutboundItems();
  const columns = useOutboundColumns({ onChangeSortBy, sortBy });

  const sortedItems = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return items;
    const sorter = SortUtils.getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return [...(items ?? [])].sort(sorter);
  }, [items, sortBy.key, sortBy.isDesc]);

  const sortedLines = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return lines;
    const sorter = SortUtils.getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return [...(lines ?? [])].sort(sorter);
  }, [lines, sortBy.key, sortBy.isDesc]);

  const rows = isGrouped ? sortedItems : sortedLines;

  return {
    rows,
    lines: sortedLines,
    items: sortedItems,
    onChangeSortBy,
    sortBy,
  };
};

export const useSaveOutboundLines = () => {
  const outboundNumber = useOutboundNumber();
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  return useMutation(api.updateLines, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.detail(outboundNumber));
    },
  });
};

export const useDeleteInboundLines = () => {
  const outboundNumber = useOutboundNumber();
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  const queryKey = api.keys.detail(outboundNumber);

  return useMutation(api.deleteLines, {
    onMutate: async lines => {
      await queryClient.cancelQueries(queryKey);
      const previous = queryClient.getQueryData<OutboundFragment>(queryKey);
      if (previous) {
        const nodes = previous.lines.nodes.filter(
          ({ id: lineId }) => !lines.find(({ id }) => lineId === id)
        );
        queryClient.setQueryData<OutboundFragment>(queryKey, {
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
        previous: OutboundFragment;
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
  const { items, lines } = useOutboundRows();
  const { mutate } = useDeleteInboundLines();
  const t = useTranslation('distribution');

  const selectedRows = useTableStore(state => {
    const { isGrouped } = state;

    return isGrouped
      ? items
          ?.filter(({ id }) => state.rowState[id]?.isSelected)
          .map(({ lines }) => lines.flat())
          .flat()
      : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
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

export const useUpdateOutboundTax = () => {
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  const { lines } = useOutboundFields('lines');
  const { mutateAsync, ...mutateState } = useMutation(api.updateTax, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });

  const updateServiceLineTax = useCallback(
    (tax: number) =>
      mutateAsync({
        tax,
        lines: lines.nodes ?? [],
        type: InvoiceLineNodeType.Service,
      }),
    [lines.nodes, mutateAsync]
  );

  const updateStockLineTax = useCallback(
    (tax: number) =>
      mutateAsync({
        tax,
        lines: lines.nodes ?? [],
        type: InvoiceLineNodeType.StockOut,
      }),
    [lines.nodes, mutateAsync]
  );

  return { ...mutateState, updateStockLineTax, updateServiceLineTax };
};
