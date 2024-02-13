import { useCallback } from 'react';
import { useOutboundSelector } from '../document/useOutboundSelector';
import { isA } from '../../../../utils';
import { OutboundFragment } from '../../operations.generated';
import { StockOutLineFragment } from '../../../../StockOut';

export const useOutboundLines = (itemId?: string) => {
  const selectLines = useCallback(
    (invoice: OutboundFragment) => {
      const forListView = (line: StockOutLineFragment) =>
        isA.stockOutLine(line) || isA.placeholderLine(line);
      return itemId
        ? invoice.lines.nodes.filter(({ item }) => itemId === item.id)
        : invoice.lines.nodes.filter(forListView);
    },
    [itemId]
  );

  return useOutboundSelector(selectLines);
};
