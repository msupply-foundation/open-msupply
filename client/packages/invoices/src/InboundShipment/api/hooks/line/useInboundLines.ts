import { useCallback } from 'react';
import { isA } from './../../../../utils';
import { InboundFragment } from '../../operations.generated';
import { useQuery } from '@openmsupply-client/common';
import { useInboundId } from '../document/useInbound';
import { useInboundApi } from '../utils/useInboundApi';

export const useInboundSelector = <T = InboundFragment>(
  select?: (data: InboundFragment) => T
) => {
  const invoiceId = useInboundId();
  const api = useInboundApi();

  return useQuery(
    api.keys.detail(invoiceId),
    () => api.get.byId(invoiceId),
    { select }
  );
};

export const useInboundLines = (itemId?: string) => {
  const selectItems = useCallback(
    (invoice: InboundFragment) => {
      return itemId
        ? invoice.lines.nodes.filter(({ item }) => itemId === item.id)
        : invoice.lines.nodes.filter(line => isA.stockInLine(line));
    },
    [itemId]
  );

  return useInboundSelector(selectItems);
};
