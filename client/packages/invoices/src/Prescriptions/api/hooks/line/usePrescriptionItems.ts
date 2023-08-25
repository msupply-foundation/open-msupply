import { useCallback } from 'react';
import { ArrayUtils } from '@openmsupply-client/common';
import { isA } from '../../../../utils';
import { PrescriptionRowFragment } from '../../operations.generated';
import { usePrescriptionLineSelector } from './usePrescriptionLine';
import { StockOutLineFragment } from '../../../../StockOut';

export const usePrescriptionItem = () => {
  const selectLines = useCallback((invoice: PrescriptionRowFragment) => {
    const forListView = (line: StockOutLineFragment) => isA.stockOutLine(line);
    const { lines } = invoice;
    const stockLines = lines.nodes.filter(forListView);

    return Object.entries(
      ArrayUtils.groupBy(stockLines, line => line.item.id)
    ).map(([itemId, lines]) => {
      return { id: itemId, itemId, lines };
    });
  }, []);

  return usePrescriptionLineSelector(selectLines);
};
