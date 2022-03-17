import { useCallback } from 'react';
import { ArrayUtils } from '@openmsupply-client/common';
import { useOutboundSelector } from './../document/useOutboundSelector';
import { isA } from '../../../../utils';
import {
  OutboundFragment,
  OutboundLineFragment,
} from './../../operations.generated';

export const useOutboundItems = () => {
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
