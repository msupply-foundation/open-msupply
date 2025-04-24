import { useEffect, useCallback } from 'react';
import { DateUtils, SortUtils, uniqBy } from '@openmsupply-client/common';
import { useHistoricalStockLines } from '@openmsupply-client/system';
import { usePrescription } from '../../api';
import { DraftItem } from '../../../..';
import { DraftPrescriptionLine } from '../../../types';
import {
  createDraftPrescriptionLine,
  createDraftPrescriptionLineFromStockLine,
  createPrescriptionPlaceholderRow,
  issuePrescriptionStock,
  updateNotes,
} from '../../api/hooks/utils';

export interface UseDraftPrescriptionLinesControl {
  updateNotes: (note: string) => void;
  updateQuantity: (batchId: string, packs: number) => void;
  isLoading: boolean;
}

export const useDraftPrescriptionLines = (
  item: DraftItem | null,
  draftLines: DraftPrescriptionLine[],
  updateDraftLines: (lines: DraftPrescriptionLine[]) => void,
  date?: Date | null
): UseDraftPrescriptionLinesControl => {
  const {
    query: { data: prescriptionData },
  } = usePrescription();
  const { id: invoiceId, status } = prescriptionData ?? {};

  const lines = prescriptionData?.lines.nodes.filter(
    line => item?.id === line.item.id
  );
  const { data, isLoading } = useHistoricalStockLines({
    itemId: item?.id ?? '',
    datetime: date ? date.toISOString() : undefined,
  });

  useEffect(() => {
    if (!data) return;

    // Stock lines (data.nodes) are coming from availableStockLines from
    // itemNode these are filtered by totalNumberOfPacks > 0 but it's possible
    // to issue all of the packs from the batch in picked status, need to make
    // sure these are not hidden
    const invoiceLineStockLines = (lines ?? []).flatMap(l =>
      l.stockLine ? [l.stockLine] : []
    );
    const stockLines = uniqBy(
      [...data.nodes, ...invoiceLineStockLines],
      'id'
    ).filter(stockLine => !stockLine.onHold); // Filter out on hold stock lines

    const noStockLines = stockLines.length == 0;

    const placeholderLine = createPrescriptionPlaceholderRow(
      invoiceId ?? '',
      item?.id ?? ''
    );

    if (noStockLines || !item) {
      return updateDraftLines([placeholderLine]);
    }

    const rows = stockLines
      .map(batch => {
        const invoiceLine = lines?.find(
          ({ stockLine }) => stockLine?.id === batch.id
        );
        if (invoiceLine && invoiceId && status) {
          return createDraftPrescriptionLine({
            invoiceLine,
            invoiceId,
            stockLine: batch,
            invoiceStatus: status,
          });
        } else {
          return createDraftPrescriptionLineFromStockLine({
            stockLine: batch,
            invoiceId: invoiceId ?? '',
          });
        }
      })
      .filter(stockLine => !stockLine.location?.onHold)
      .sort(SortUtils.byExpiryAsc);

    const allStockLinesExpired = stockLines.every(
      stockLine =>
        stockLine.expiryDate && DateUtils.isExpired(stockLine.expiryDate)
    );

    // In cases where there are no valid stock lines to allocate we should
    // append a placeholder line in case of user setting prescribed quantity
    if (allStockLinesExpired) {
      rows.push(placeholderLine);
    }

    updateDraftLines(rows);
  }, [data, item, prescriptionData]);

  const onChangeRowQuantity = useCallback(
    (batchId: string, packs: number) => {
      updateDraftLines(issuePrescriptionStock(draftLines, batchId, packs));
    },
    [draftLines]
  );

  const onUpdateNote = useCallback(
    (note: string) => {
      updateDraftLines(updateNotes(draftLines, note));
    },
    [draftLines]
  );

  return {
    isLoading,
    updateQuantity: onChangeRowQuantity,
    updateNotes: onUpdateNote,
  };
};
