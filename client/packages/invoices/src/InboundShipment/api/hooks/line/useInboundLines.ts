import { useCallback } from 'react';
import { isA } from './../../../../utils';
import { InboundFragment } from '../../operations.generated';
import { useInboundSelector } from './index';

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
