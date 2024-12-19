import { useEffect, useCallback } from 'react';
import {
  InvoiceLineNodeType,
  InvoiceNodeStatus,
  SortUtils,
  uniqBy,
} from '@openmsupply-client/common';
import { useHistoricalStockLines } from '@openmsupply-client/system';
import { usePrescription } from '../../api';
import { DraftItem } from '../../../..';
import { DraftStockOutLine } from '../../../types';
import {
  createDraftStockOutLine,
  createDraftStockOutLineFromStockLine,
  issueStock,
  updateNotes,
} from '../../../StockOut/utils';

export interface UseDraftPrescriptionLinesControl {
  updateNotes: (note: string) => void;
  updateQuantity: (batchId: string, packs: number) => void;
  isLoading: boolean;
}

export const useDraftPrescriptionLines = (
  item: DraftItem | null,
  draftLines: DraftStockOutLine[],
  updateDraftLines: (lines: DraftStockOutLine[]) => void,
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
    if (draftLines.length > 0)
      // Draft lines already in state from previous rendering
      return;

    // Stock lines (data.nodes) are coming from availableStockLines from
    // itemNode these are filtered by totalNumberOfPacks > 0 but it's possible
    // to issue all of the packs from the batch in picked status, need to make
    // sure these are not hidden
    const invoiceLineStockLines = (lines ?? []).flatMap(l =>
      l.stockLine ? [l.stockLine] : []
    );
    const stockLines = uniqBy([...data.nodes, ...invoiceLineStockLines], 'id');

    const noStockLines = stockLines.length == 0;

    if (noStockLines || !item) {
      return updateDraftLines([]);
    }

    const rows = stockLines
      .map(batch => {
        const invoiceLine = lines?.find(
          ({ stockLine }) => stockLine?.id === batch.id
        );
        if (invoiceLine && invoiceId && status) {
          return createDraftStockOutLine({
            invoiceLine,
            invoiceId,
            stockLine: batch,
            invoiceStatus: status,
          });
        } else {
          return createDraftStockOutLineFromStockLine({
            stockLine: batch,
            invoiceId: invoiceId ?? '',
          });
        }
      })
      .sort(SortUtils.byExpiryAsc);

    if (status === InvoiceNodeStatus.New) {
      let placeholder = lines?.find(
        ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
      );
      if (!placeholder) {
        placeholder = draftLines.find(
          ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
        );
      }
      if (placeholder) {
        const placeholderItem = lines?.find(l => l.item.id === item.id)?.item;
        if (!!placeholderItem) placeholder.item = placeholderItem;
        rows.push(
          createDraftStockOutLine({
            invoiceId: invoiceId ?? '',
            invoiceLine: placeholder,
            invoiceStatus: status,
          })
        );
      } else {
        // Commented out for now until placeholders are implemented for
        // prescriptions
        // rows.push(createStockOutPlaceholderRow(invoiceId, item.id));
      }
    }

    updateDraftLines(rows);
  }, [data, item, prescriptionData]);

  const onChangeRowQuantity = useCallback(
    (batchId: string, packs: number) => {
      updateDraftLines(issueStock(draftLines, batchId, packs));
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
