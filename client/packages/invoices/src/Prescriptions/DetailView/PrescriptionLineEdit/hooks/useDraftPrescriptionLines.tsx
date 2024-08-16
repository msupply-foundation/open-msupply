import { useEffect, useState, useCallback } from 'react';
import {
  InvoiceLineNodeType,
  InvoiceNodeStatus,
  useConfirmOnLeaving,
  useDirtyCheck,
  SortUtils,
} from '@openmsupply-client/common';
import { useStockLines } from '@openmsupply-client/system';
import { usePrescription } from '../../../api';
import { DraftItem } from '../../../..';
import { DraftStockOutLine } from '../../../../types';
import {
  UseDraftStockOutLinesControl,
  createDraftStockOutLine,
  createDraftStockOutLineFromStockLine,
  issueStock,
  updateNotes,
} from '../../../../StockOut/utils';

export interface UseDraftPrescriptionLinesControl
  extends UseDraftStockOutLinesControl {
  updateNotes: (note: string) => void;
}

export const useDraftPrescriptionLines = (
  item: DraftItem | null
): UseDraftPrescriptionLinesControl => {
  const { id: invoiceId, status } = usePrescription.document.fields([
    'id',
    'status',
  ]);
  const { data: lines, isLoading: prescriptionLinesLoading } =
    usePrescription.line.stockLines(item?.id ?? '');
  const { data, isLoading } = useStockLines(item?.id);
  const { isDirty, setIsDirty } = useDirtyCheck();
  const [draftStockOutLines, setDraftStockOutLines] = useState<
    DraftStockOutLine[]
  >([]);

  useConfirmOnLeaving(isDirty);

  useEffect(() => {
    if (!item) {
      return setDraftStockOutLines([]);
    }

    if (!data) return;

    setDraftStockOutLines(() => {
      const rows = data.nodes
        .map(batch => {
          const invoiceLine = lines?.find(
            ({ stockLine }) => stockLine?.id === batch.id
          );
          if (invoiceLine) {
            return createDraftStockOutLine({
              invoiceLine,
              invoiceId,
            });
          } else {
            return createDraftStockOutLineFromStockLine({
              stockLine: batch,
              invoiceId,
            });
          }
        })
        .sort(SortUtils.byExpiryAsc);

      if (status === InvoiceNodeStatus.New) {
        let placeholder = lines?.find(
          ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
        );
        if (!placeholder) {
          placeholder = draftStockOutLines.find(
            ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
          );
        }
        if (placeholder) {
          const placeholderItem = lines?.find(l => l.item.id === item.id)?.item;
          if (!!placeholderItem) placeholder.item = placeholderItem;
          rows.push(
            createDraftStockOutLine({ invoiceId, invoiceLine: placeholder })
          );
        } else {
          // Commented out for now until placeholders are implemented for prescriptions
          // rows.push(createStockOutPlaceholderRow(invoiceId, item.id));
        }
      }

      return rows;
    });
  }, [data, lines, item, invoiceId]);

  const onChangeRowQuantity = useCallback(
    (batchId: string, value: number) => {
      setIsDirty(true);
      setDraftStockOutLines(issueStock(draftStockOutLines, batchId, value));
    },
    [draftStockOutLines]
  );

  const onUpdateNote = useCallback(
    (note: string) => {
      setIsDirty(true);
      setDraftStockOutLines(updateNotes(draftStockOutLines, note));
    },
    [draftStockOutLines]
  );

  return {
    draftStockOutLines,
    isLoading: isLoading || prescriptionLinesLoading,
    setDraftStockOutLines,
    updateQuantity: onChangeRowQuantity,
    updateNotes: onUpdateNote,
  };
};
