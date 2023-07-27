import { useCallback } from 'react';
import { isA } from './../../../../utils';
import { useQuery } from '@openmsupply-client/common';
import { PrescriptionRowFragment } from '../../operations.generated';
import { usePrescriptionNumber } from '../utils/usePrescriptionNumber';
import { usePrescriptionApi } from '../utils/usePrescriptionApi';

export const usePrescriptionLineSelector = <T = PrescriptionRowFragment>(
  select?: (data: PrescriptionRowFragment) => T
) => {
  const invoiceNumber = usePrescriptionNumber();
  const api = usePrescriptionApi();

  return useQuery(
    api.keys.detail(invoiceNumber),
    () => api.get.byNumber(invoiceNumber),
    { select }
  );
};

export const usePrescriptionLine = (itemId?: string) => {
  const selectItems = useCallback(
    (invoice: PrescriptionRowFragment) => {
      console.log('invoice: ', invoice);
      return itemId
        ? invoice.lines.nodes.filter(({ item }) => itemId === item.id)
        : invoice.lines.nodes.filter(line => isA.stockOutLine(line));
    },
    [itemId]
  );

  return usePrescriptionLineSelector(selectItems);
};
