import { useMemo, useCallback } from 'react';
import {
  RouteBuilder,
  useQueryParams,
  useNavigate,
  useAuthState,
  useTranslation,
  useNotification,
  useQueryClient,
  InvoiceNodeStatus,
  useQuerySelector,
  useParams,
  useOmSupplyApi,
  UseQueryResult,
  useQuery,
  FieldSelectorControl,
  useFieldsSelector,
  groupBy,
  getColumnSorter,
  getDataSorter,
  useSortBy,
  useMutation,
  UseMutationResult,
  useTableStore,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { Invoice, InvoiceLine, InvoiceItem } from '../../types';
import { getOutboundQueries } from './api';
import { useOutboundColumns } from '../DetailView/columns';
import {
  getSdk,
  DeleteOutboundShipmentLinesMutation,
  OutboundShipmentRowFragment,
} from './operations.generated';
import { canDeleteInvoice } from '../../utils';

export const useOutboundApi = () => {
  const { client } = useOmSupplyApi();
  const sdk = getSdk(client);
  const { storeId } = useAuthState();
  const queries = getOutboundQueries(sdk, storeId);
  return { ...queries, storeId };
};

export const useOutboundDetailQueryKey = (): ['invoice', string] => {
  const { id = '' } = useParams();
  return ['invoice', id];
};

export const useOutbounds = () => {
  const queryParams = useQueryParams<OutboundShipmentRowFragment>({
    initialSortBy: { key: 'otherPartyName' },
  });
  const api = useOutboundApi();

  return {
    ...useQuery(['invoice', 'list', api.storeId, queryParams], () =>
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

export const useOutbound = (): UseQueryResult<Invoice> => {
  const { id = '' } = useParams();
  const api = useOutboundApi();
  const queryKey = useOutboundDetailQueryKey();

  return useQuery(queryKey, () => api.get.byId(id));
};

export const useUpdateOutbound = () => {
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  return useMutation(api.update, {
    onSuccess: () => {
      queryClient.invalidateQueries(['invoice']);
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
      queryClient.invalidateQueries(['invoice']);
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
      .filter(Boolean) as OutboundShipmentRowFragment[],
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

export const useOutboundFields = <KeyOfInvoice extends keyof Invoice>(
  keys: KeyOfInvoice | KeyOfInvoice[]
): FieldSelectorControl<Invoice, KeyOfInvoice> => {
  const { data } = useOutbound();
  const api = useOutboundApi();
  const queryKey = useOutboundDetailQueryKey();

  return useFieldsSelector(
    queryKey,
    () => api.get.byId(data?.id ?? ''),
    (patch: Partial<Invoice>) => api.update({ ...patch, id: data?.id ?? '' }),
    keys
  );
};

export const useIsOutboundDisabled = (): boolean => {
  const { status } = useOutboundFields('status');
  return (
    status === InvoiceNodeStatus.Shipped ||
    status === InvoiceNodeStatus.Verified ||
    status === InvoiceNodeStatus.Delivered
  );
};

const useOutboundSelector = <ReturnType>(
  select: (data: Invoice) => ReturnType
) => {
  const queryKey = useOutboundDetailQueryKey();
  const api = useOutboundApi();
  return useQuerySelector(queryKey, () => api.get.byId(queryKey[1]), select);
};

export const useOutboundLines = (
  itemId?: string
): UseQueryResult<InvoiceLine[], unknown> => {
  const selectLines = useCallback(
    (invoice: Invoice) => {
      return itemId
        ? invoice.lines.filter(
            ({ itemId: invoiceLineItemId }) => itemId === invoiceLineItemId
          )
        : invoice.lines;
    },
    [itemId]
  );

  return useOutboundSelector(selectLines);
};

export const useOutboundItems = (): UseQueryResult<InvoiceItem[]> => {
  const selectLines = useCallback((invoice: Invoice) => {
    const { lines } = invoice;

    return Object.entries(groupBy(lines, 'itemId')).map(([itemId, lines]) => {
      return { id: itemId, itemId, lines };
    });
  }, []);

  return useOutboundSelector(selectLines);
};

export const useOutboundRows = (isGrouped = true) => {
  const { sortBy, onChangeSortBy } = useSortBy<InvoiceLine | InvoiceItem>({
    key: 'itemName',
  });
  const { data: lines } = useOutboundLines();
  const { data: items } = useOutboundItems();
  const columns = useOutboundColumns({ onChangeSortBy, sortBy });

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
    const sorter = getDataSorter<InvoiceLine, keyof InvoiceLine>(
      sortBy.key as keyof InvoiceLine,
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
  const queryKey = useOutboundDetailQueryKey();
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  return useMutation(api.updateLines, {
    onSuccess: () => {
      queryClient.invalidateQueries(queryKey);
    },
  });
};

export const useDeleteInboundLine = (): UseMutationResult<
  DeleteOutboundShipmentLinesMutation,
  unknown,
  string[],
  { previous?: Invoice; ids: string[] }
> => {
  // TODO: Shouldn't need to get the invoice ID here from the params as the mutation
  // input object should not require the invoice ID. Waiting for an API change.
  const { id = '' } = useParams();
  const queryKey = useOutboundDetailQueryKey();
  const queryClient = useQueryClient();
  const api = useOutboundApi();

  return useMutation(api.deleteLines(id), {
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries(queryKey);

      const previous = queryClient.getQueryData<Invoice>(queryKey);

      if (previous) {
        queryClient.setQueryData<Invoice>(queryKey, {
          ...previous,
          lines: previous.lines.filter(
            ({ id: lineId }) => !ids.includes(lineId)
          ),
        });
      }

      return { previous, ids };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries(queryKey);
    },
  });
};

export const useDeleteSelectedLines = (): {
  onDelete: () => Promise<void>;
} => {
  const { success, info } = useNotification();
  const { items, lines } = useOutboundRows();
  const { mutate } = useDeleteInboundLine();
  const t = useTranslation('distribution');

  const { selectedRows } = useTableStore(state => {
    const { isGrouped } = state;

    if (isGrouped) {
      return {
        selectedRows: (
          Object.keys(state.rowState)
            .filter(id => state.rowState[id]?.isSelected)
            .map(selectedId => items?.find(({ id }) => selectedId === id))
            .filter(Boolean) as InvoiceItem[]
        )
          .map(({ lines }) => lines)
          .flat()
          .map(({ id }) => id),
      };
    } else {
      return {
        selectedRows: (
          Object.keys(state.rowState)
            .filter(id => state.rowState[id]?.isSelected)
            .map(selectedId => lines.find(({ id }) => selectedId === id))
            .filter(Boolean) as InvoiceLine[]
        ).map(({ id }) => id),
      };
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
