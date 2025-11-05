import { useCallback } from 'react';
import { isA, isInboundPlaceholderRow } from './../../../../utils';
import {
  InboundFragment,
  InboundLineFragment,
} from '../../operations.generated';
import { useQuery } from '@openmsupply-client/common';
import { useInboundId } from '../document/useInbound';
import { useInboundApi } from '../utils/useInboundApi';

export const useInboundSelector = <T = InboundFragment>(
  select?: (data: InboundFragment) => T
) => {
  const invoiceId = useInboundId();
  const api = useInboundApi();

  return useQuery(api.keys.detail(invoiceId), () => api.get.byId(invoiceId), {
    select,
  });
};

export const useInboundLines = (itemId?: string) => {
  const selectLines = useCallback(
    (invoice: InboundFragment) => {
      const forListView = (line: InboundLineFragment) =>
        isA.stockInLine(line) || isInboundPlaceholderRow(line);
      return itemId
        ? invoice.lines.nodes.filter(({ item }) => itemId === item.id)
        : invoice.lines.nodes.filter(forListView);
    },
    [itemId]
  );

  return useInboundSelector(selectLines);
};
