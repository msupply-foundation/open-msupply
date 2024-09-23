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
import uniqBy from 'lodash/uniqBy';
import { useGetItemPricing } from '../../../api/hooks/utils';

export const useDraftOutboundLines = (
  item: DraftItem | null
): UseDraftStockOutLinesControl => {
  const {
    id: invoiceId,
    status,
    otherPartyId,
  } = useOutbound.document.fields(['id', 'status', 'otherPartyId']);
  const { data: lines, isLoading: outboundLinesLoading } =
    useOutbound.line.stockLines(item?.id ?? '');
  const { data, isLoading } = useStockLines(item?.id);
  const { isDirty, setIsDirty } = useDirtyCheck();
  const [draftStockOutLines, setDraftStockOutLines] = useState<
    DraftStockOutLine[]
  >([]);

  // Get default pricing for the item
  const { itemPrice, isFetched: priceFetched } = useGetItemPricing({
    nameId: otherPartyId,
    itemId: item?.id || '',
  });

  useConfirmOnLeaving(isDirty);

  useEffect(() => {
    // Check placed in since last else in the map is needed to show placeholder row,
    // but also causes a placeholder row to be created when there is no stock lines.
    if (!item) {
      return setDraftStockOutLines([]);
    }

    if (!data || !priceFetched) return;

    // Stock lines (data.nodes) are coming from availableStockLines from itemNode
    // these are filtered by totalNumberOfPacks > 0 but it's possible to issue all of the packs
    // from the batch in picked status, need to make sure these are not hidden
    const invoiceLineStockLines = (lines ?? []).flatMap(l =>
      l.stockLine ? [l.stockLine] : []
    );
    const stockLines = uniqBy([...data.nodes, ...invoiceLineStockLines], 'id');

    const noStockLines = stockLines.length == 0;

    if (noStockLines) {
      return setDraftStockOutLines([]);
    }

    setDraftStockOutLines(() => {
      const rows = stockLines
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
              defaultPricing: itemPrice,
            });
          }
        })
        .sort(SortUtils.byExpiryAsc);

      if (status === InvoiceNodeStatus.New) {
        const placeholder = lines?.find(
          ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
        );

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
  }, [data, lines, item, invoiceId, itemPrice, priceFetched]);

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
