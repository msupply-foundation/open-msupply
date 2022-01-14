import { useMemo, useCallback } from 'react';
import {
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
  useSortBy,
} from '@openmsupply-client/common';
import { Invoice, InvoiceLine, InvoiceItem } from '../../types';
import { OutboundApi } from './api';
import { useOutboundColumns } from '../DetailView/columns';

export const useOutboundDetailQueryKey = (): ['invoice', string] => {
  const { id = '' } = useParams();
  return ['invoice', id];
};

export const useOutbound = (): UseQueryResult<Invoice> => {
  const { id = '' } = useParams();
  const { api } = useOmSupplyApi();
  const queryKey = useOutboundDetailQueryKey();
  return useQuery(queryKey, () => OutboundApi.get.byId(api)(id));
};

export const useOutboundFields = <KeyOfInvoice extends keyof Invoice>(
  keys: KeyOfInvoice | KeyOfInvoice[]
): FieldSelectorControl<Invoice, KeyOfInvoice> => {
  const { id = '' } = useParams();
  const { api } = useOmSupplyApi();
  const queryKey = useOutboundDetailQueryKey();
  return useFieldsSelector(
    queryKey,
    () => OutboundApi.get.byId(api)(id),
    (patch: Partial<Invoice>) => OutboundApi.update(api)({ ...patch, id }),
    keys
  );
};

export const useIsOutboundDisabled = (): boolean => {
  const { status } = useOutboundFields('status');
  return (
    status === InvoiceNodeStatus.Verified ||
    status === InvoiceNodeStatus.Delivered
  );
};

const useOutboundSelector = <ReturnType>(
  select: (data: Invoice) => ReturnType
) => {
  const queryKey = useOutboundDetailQueryKey();
  const { api } = useOmSupplyApi();
  return useQuerySelector(
    queryKey,
    () => OutboundApi.get.byId(api)(queryKey[1]),
    select
  );
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
    return items?.sort(sorter);
  }, [items, sortBy.key, sortBy.isDesc]);

  const sortedLines = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return lines;
    const sorter = getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return lines?.sort(sorter);
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
