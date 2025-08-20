import { useCallback } from 'react';
import { usePatchState } from '@openmsupply-client/common';
import { ItemStockOnHandFragment } from '@openmsupply-client/system/src';
import { createDraftGoodsReceivedLine } from './utils';
import { DraftGoodsReceivedLine } from './useGoodsReceivedLine';
import { useGoodsReceived } from './useGoodsReceived';

export type PatchDraftLineInput = Partial<DraftGoodsReceivedLine> & {
  id: string;
};

export const useDraftGoodsReceivedLines = (purchaseOrderLineId?: string) => {
  const {
    query: { data: goodsReceivedData },
  } = useGoodsReceived();

  const allLines: DraftGoodsReceivedLine[] =
    goodsReceivedData?.lines.nodes.map(line => ({
      ...line,
      itemId: line.item.id,
      goodsReceivedId: goodsReceivedData?.id ?? '',
      purchaseOrderLineId: line.purchaseOrderLineId,
    })) ?? [];

  const { patch, updatePatch, resetDraft, isDirty } = usePatchState<{
    lines: DraftGoodsReceivedLine[];
  }>({ lines: allLines });

  const draftLines = patch.lines ?? allLines;

  const selectedDraftLines = draftLines.filter(
    line => line.purchaseOrderLineId === purchaseOrderLineId
  );

  const linesForPurchaseOrderLine = selectedDraftLines;

  const addDraftLine = useCallback(() => {
    if (!goodsReceivedData || !purchaseOrderLineId) return;

    const templateLine = linesForPurchaseOrderLine?.[0];
    if (!templateLine) return;

    const newLine: DraftGoodsReceivedLine = createDraftGoodsReceivedLine(
      templateLine?.item as ItemStockOnHandFragment,
      goodsReceivedData.id,
      purchaseOrderLineId
    );
    updatePatch({ lines: [...draftLines, newLine] });
  }, [
    goodsReceivedData,
    purchaseOrderLineId,
    linesForPurchaseOrderLine,
    draftLines,
    updatePatch,
  ]);

  const updateDraftLine = useCallback(
    (patch: PatchDraftLineInput) => {
      const updatedLines = draftLines.map(line =>
        line.id === patch.id ? { ...line, ...patch } : line
      );
      updatePatch({ lines: updatedLines });
    },
    [draftLines, updatePatch]
  );

  const removeDraftLine = useCallback(
    (id: string) => {
      const updatedLines = draftLines.filter(line => line.id !== id);
      updatePatch({ lines: updatedLines });
    },
    [draftLines, updatePatch]
  );

  return {
    draftLines, // All lines for saving
    selectedDraftLines, // Only lines for the selected purchaseOrderLineId
    addDraftLine,
    updateDraftLine,
    removeDraftLine,
    resetDraft,
    isDirty,
  };
};
