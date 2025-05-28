import { useEffect, useState } from 'react';
import { uniqBy } from '@openmsupply-client/common';
import { DraftPrescriptionLine } from 'packages/invoices/src/types';
import { useHistoricalStockLines } from 'packages/system/src';
import { createDraftPrescriptionLineFromStockLine } from 'packages/invoices/src/Prescriptions/api/hooks/utils';

export const useDraftLines = (itemId: string | null) => {
  const [draftLines, setDraftLines] = useState<DraftPrescriptionLine[]>([]);

  const { data: historicalStockLines } = useHistoricalStockLines({
    itemId: itemId ?? '',
  });

  useEffect(() => {
    if (!historicalStockLines) return;

    // Stock lines (data.nodes) are coming from availableStockLines from
    // itemNode these are filtered by totalNumberOfPacks > 0 but it's possible
    // to issue all of the packs from the batch in picked status, need to make
    // sure these are not hidden
    const stockLines = uniqBy(historicalStockLines.nodes, 'id').filter(
      stockLine => !stockLine.onHold
    );

    setDraftLines(
      stockLines.map(stockLine =>
        createDraftPrescriptionLineFromStockLine({ stockLine, invoiceId: '' })
      )
    );
  }, [historicalStockLines]);

  const updateQuantity = (id: string, numberOfPacks: number) => {
    setDraftLines(prevLines =>
      prevLines.map(line =>
        line.id === id ? { ...line, numberOfPacks } : line
      )
    );
  };

  return { draftLines, setDraftLines, updateQuantity };
};
