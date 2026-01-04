import { useCallback } from 'react';
import { inboundLinesToSummaryItems, isA } from '../../../../utils';
import {
  InboundFragment,
  InboundLineFragment,
} from '../../operations.generated';
import { useInboundSelector } from './useInboundLines';

export const useInboundItems = () => {
  const selectItems = useCallback((invoice: InboundFragment) => {
    const forListView = (line: InboundLineFragment) => isA.stockInLine(line);
    const { lines } = invoice;
    const stockLines = lines.nodes.filter(forListView);

    const items = inboundLinesToSummaryItems(stockLines);

    return items;
  }, []);

  return useInboundSelector(selectItems);
};
