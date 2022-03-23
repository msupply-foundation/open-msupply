import { useCallback } from 'react';
import { useOutboundSelector } from '../document/useOutboundSelector';
import { isA } from '../../../../utils';
import {
  OutboundFragment,
  OutboundLineFragment,
} from '../../operations.generated';

export const useOutboundLines = (itemId?: string) => {
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
