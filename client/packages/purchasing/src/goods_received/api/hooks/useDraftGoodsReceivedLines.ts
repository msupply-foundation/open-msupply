import { useCallback, useEffect, useState } from 'react';
import { DraftGoodsReceivedLine } from './useGoodsReceivedLine';
import { FnUtils } from '@common/utils';
import { useGoodsReceived } from './useGoodsReceived';

export type PatchDraftLineInput = Partial<DraftGoodsReceivedLine> & {
  id: string;
};

export const useDraftGoodsReceivedLines = (purchaseOrderLineId?: string) => {
  const {
    query: { data: goodsReceivedData },
  } = useGoodsReceived();

  const linesForPurchaseOrderLine = goodsReceivedData?.lines.nodes.filter(
    line => line.purchaseOrderLineId === purchaseOrderLineId
  );

  const initialDraftLines: DraftGoodsReceivedLine[] =
    linesForPurchaseOrderLine?.map(line => ({
      ...line,
      itemId: line.item.id,
      item: {
        __typename: 'ItemNode',
        id: line.item.id,
        name: line.item.name,
      },
      goodsReceivedId: goodsReceivedData?.id ?? '',
      purchaseOrderLineId: line.purchaseOrderLineId,
    })) ?? [];

  const [draftLines, setDraftLines] =
    useState<DraftGoodsReceivedLine[]>(initialDraftLines);

  useEffect(() => {
    setDraftLines(initialDraftLines);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goodsReceivedData?.id, purchaseOrderLineId]);

  const addDraftLine = useCallback(() => {
    if (!goodsReceivedData || !purchaseOrderLineId) return;

    const templateLine = linesForPurchaseOrderLine?.[0];
    const newLine: DraftGoodsReceivedLine = {
      id: FnUtils.generateUUID(),
      itemId: templateLine?.item.id ?? '',
      item: templateLine?.item,
      goodsReceivedId: templateLine?.goodsReceivedId ?? '',
      purchaseOrderLineId: templateLine?.purchaseOrderLineId ?? '',
      lineNumber: 0,
      receivedPackSize: 0,
      batch: '',
      comment: '',
      expiryDate: null,
      manufacturerLinkId: null,
      numberOfPacksReceived: 0,
    };
    setDraftLines(prev => [...prev, newLine]);
  }, [goodsReceivedData, purchaseOrderLineId, linesForPurchaseOrderLine]);

  const updateDraftLine = useCallback((patch: PatchDraftLineInput) => {
    setDraftLines(draftLines => {
      const line = draftLines.find(line => line.id === patch.id);
      if (!line) return draftLines;

      const newLine = { ...line, ...patch };
      const index = draftLines.indexOf(line);
      const newLines = [...draftLines];
      newLines[index] = newLine;
      return newLines;
    });
  }, []);

  const removeDraftLine = useCallback((id: string) => {
    setDraftLines(prev => prev.filter(line => line.id !== id));
  }, []);

  return {
    draftLines,
    addDraftLine,
    updateDraftLine,
    removeDraftLine,
  };
};
