import { useEffect, useState, useCallback } from 'react';
import {
  InvoiceLineNodeType,
  InvoiceNodeStatus,
  useConfirmOnLeaving,
  useDirtyCheck,
  SortUtils,
} from '@openmsupply-client/common';
import { useStockLines } from '@openmsupply-client/system';
import { useOutbound } from '../../../api';
import { DraftItem } from '../../../..';
import { DraftStockOutLine } from '../../../../types';
import {
  UseDraftStockOutLinesControl,
  createDraftStockOutLine,
  createDraftStockOutLineFromStockLine,
  createStockOutPlaceholderRow,
  issueStock,
} from '../../../../StockOut/utils';

export const useDraftOutboundLines = (
  item: DraftItem | null
): UseDraftStockOutLinesControl => {
  const { id: invoiceId, status } = useOutbound.document.fields([
    'id',
    'status',
  ]);
  const { data: lines, isLoading: outboundLinesLoading } =
    useOutbound.line.stockLines(item?.id ?? '');
  const { data, isLoading } = useStockLines(item?.id);
  const { isDirty, setIsDirty } = useDirtyCheck();
  const [draftStockOutLines, setDraftStockOutLines] = useState<
    DraftStockOutLine[]
  >([]);
  const noStockLines = !data?.nodes.length;

  useConfirmOnLeaving(isDirty);

  useEffect(() => {
    // Check placed in since last else in the map is needed to show placeholder row,
    // but also causes a placeholder row to be created when there is no stock lines.
    if (!item || noStockLines) {
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
          const placeHolderItem = lines?.find(l => l.item.id === item.id)?.item;
          if (!!placeHolderItem) placeholder.item = placeHolderItem;
          rows.push(
            createDraftStockOutLine({ invoiceId, invoiceLine: placeholder })
          );
        } else {
          rows.push(createStockOutPlaceholderRow(invoiceId, item.id));
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

  return {
    draftStockOutLines,
    isLoading: isLoading || outboundLinesLoading,
    setDraftStockOutLines,
    updateQuantity: onChangeRowQuantity,
  };
};
