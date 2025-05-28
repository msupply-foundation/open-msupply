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

    const stockLines = uniqBy(historicalStockLines.nodes, 'id').filter(
      stockLine => !stockLine.onHold
    );

    setDraftLines(
      stockLines.map(stockLine =>
        createDraftPrescriptionLineFromStockLine({ stockLine, invoiceId: '' })
      )
    );
  }, [historicalStockLines]);

  return { draftLines, setDraftLines };
};
