import { useEffect, useState } from 'react';
import { Item } from '@openmsupply-client/common';
import { useStockLines } from '@openmsupply-client/system';
import { BatchRow } from '../../../../types';
import { sortByExpiry } from '../utils';
import { useOutboundLines } from '../../../api';

const createPlaceholderRow = (): BatchRow => ({
  availableNumberOfPacks: 0,
  batch: 'Placeholder',
  costPricePerPack: 0,
  id: 'placeholder',
  itemId: 'placeholder',
  onHold: false,
  packSize: 1,
  sellPricePerPack: 0,
  storeId: '',
  totalNumberOfPacks: 0,
  numberOfPacks: 0,
});

export const useBatchRows = (item: Item | null) => {
  const { data: lines, isLoading: outboundLinesLoading } = useOutboundLines(
    item?.id ?? ''
  );
  const { data, isLoading } = useStockLines(item?.code ?? '');

  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);

  useEffect(() => {
    if (!item) {
      return setBatchRows([]);
    }

    if (!data) return;

    setBatchRows(() => {
      if (!lines) return [];
      const rows = data
        .map(batch => {
          const matchingInvoiceRow = lines.find(
            ({ stockLineId }) => stockLineId === batch.id
          );
          return {
            ...batch,
            numberOfPacks: matchingInvoiceRow?.numberOfPacks ?? 0,
            availableNumberOfPacks:
              batch.availableNumberOfPacks +
              (matchingInvoiceRow?.numberOfPacks ?? 0),
          };
        })
        .sort(sortByExpiry);

      rows.push(createPlaceholderRow());
      return rows;
    });
  }, [data, lines]);

  return {
    batchRows,
    isLoading: isLoading || outboundLinesLoading,
    setBatchRows,
  };
};
