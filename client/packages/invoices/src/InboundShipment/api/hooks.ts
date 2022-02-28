import { useCallback } from 'react';
import { toItem } from '@openmsupply-client/system';
import {
  Item,
  getDataSorter,
  useSortBy,
  FieldSelectorControl,
  useQueryClient,
  useParams,
  useQuery,
  useAuthState,
  useOmSupplyApi,
  useMutation,
  useFieldsSelector,
} from '@openmsupply-client/common';
import { inboundLinesToSummaryItems } from './../../utils';
import { Invoice, InvoiceLine, InboundShipmentItem } from './../../types';
import { getSdk } from './operations.generated';
import { getInboundQueries } from './api';

export const useInboundApi = () => {
  const { storeId } = useAuthState();
  const { client } = useOmSupplyApi();
  const queries = getInboundQueries(getSdk(client), storeId);
  return { ...queries, storeId };
};

export const useInbound = () => {
  const { id = '' } = useParams();
  const api = useInboundApi();
  return useQuery(['invoice', id], () => api.get.byId(id));
};

export const useIsInboundEditable = (): boolean => {
  const { status } = useInboundFields('status');
  return status === 'NEW' || status === 'SHIPPED' || status === 'DELIVERED';
};

export const useInboundShipmentSelector = <T = Invoice>(
  select?: (data: Invoice) => T
) => {
  const { id = '' } = useParams();
  const api = useInboundApi();

  return useQuery(['invoice', id], () => api.get.byId(id), {
    select,
  });
};

export const useInboundFields = <KeyOfInvoice extends keyof Invoice>(
  keyOrKeys: KeyOfInvoice | KeyOfInvoice[]
): FieldSelectorControl<Invoice, KeyOfInvoice> => {
  const { data } = useInbound();
  const { id = '' } = useParams();
  const api = useInboundApi();
  return useFieldsSelector(
    ['invoice', id],
    () => api.get.byId(id),
    (patch: Partial<Invoice>) => api.update({ ...patch, id: data?.id ?? '' }),
    keyOrKeys
  );
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
  const api = useInboundApi();
  return useMutation(api.upsertLines, {
    onSettled: () => queryClient.invalidateQueries(['invoice', id]),
  });
};

export const useDeleteInboundLine = () => {
  // TODO: Shouldn't need to get the invoice ID here from the params as the mutation
  // input object should not require the invoice ID. Waiting for an API change.
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const api = useInboundApi();

  return useMutation((ids: string[]) => api.deleteLines(id, ids), {
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
