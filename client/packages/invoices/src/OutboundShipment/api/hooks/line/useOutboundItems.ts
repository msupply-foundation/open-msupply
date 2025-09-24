import { useCallback } from 'react';
import { ArrayUtils } from '@openmsupply-client/common';
import { useOutboundSelector } from './../document/useOutboundSelector';
import { isA } from '../../../../utils';
import { OutboundFragment } from './../../operations.generated';
import { StockOutLineFragment } from '../../../../StockOut';

export const useOutboundItems = () => {
  const selectLines = useCallback((invoice: OutboundFragment) => {
    const forListView = (line: StockOutLineFragment) =>
      isA.stockOutLine(line) || isA.placeholderLine(line);
    const { lines } = invoice;
    const stockLines = lines.nodes.filter(forListView);

    return Object.entries(
      ArrayUtils.groupBy(stockLines, line => line.item.id)
    ).map(([_, lines]) => {
      return lines[0]!.item;
    });
  }, []);

  return useOutboundSelector(selectLines);
};
