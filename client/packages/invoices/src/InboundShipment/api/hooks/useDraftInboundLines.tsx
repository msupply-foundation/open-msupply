import { useCallback, useEffect, useState } from 'react';
import { useInbound } from '.';
import { useConfirmOnLeaving } from '@common/hooks';
import { DraftInboundLine } from '../../../types';
import { InboundLineFragment } from '../operations.generated';
import { CreateDraft } from '../../DetailView/modals/utils';
import { useDeleteInboundLines } from './line/useDeleteInboundLines';

type InboundLineItem = InboundLineFragment['item'];

export type PatchDraftLineInput = Partial<DraftInboundLine> & { id: string };

export const useDraftInboundLines = (item: InboundLineItem | null) => {
  const [draftLines, setDraftLines] = useState<DraftInboundLine[]>([]);

  const { id } = useInbound.document.fields('id');
  const { data: lines } = useInbound.lines.list(item?.id ?? '');
  const { mutateAsync, isLoading } = useInbound.lines.save();
  const { mutateAsync: deleteMutation } = useDeleteInboundLines();

  const { isDirty, setIsDirty } = useConfirmOnLeaving(
    'inbound-shipment-line-edit'
  );

  const defaultPackSize = item?.defaultPackSize || 1;

  useEffect(() => {
    if (lines && item) {
      const drafts = lines.map(line =>
        CreateDraft.stockInLine({
          item: line.item,
          invoiceId: line.invoiceId,
          seed: line,
          defaultPackSize,
        })
      );
      if (drafts.length === 0)
        drafts.push(
          CreateDraft.stockInLine({ item, invoiceId: id, defaultPackSize })
        );
      setDraftLines(drafts);
    } else {
      setDraftLines([]);
    }
  }, [lines, item, id, defaultPackSize]);

  const addDraftLine = () => {
    if (item) {
      const newLine = CreateDraft.stockInLine({
        item,
        invoiceId: id,
        defaultPackSize,
      });
      setIsDirty(true);
      setDraftLines(draftLines => [...draftLines, newLine]);
    }
  };

  const updateDraftLine = useCallback(
    (patch: PatchDraftLineInput) => {
      setDraftLines(draftLines => {
        const batch = draftLines.find(line => line.id === patch.id);

        if (!batch) return draftLines;

        const newBatch = { ...batch, ...patch, isUpdated: true };
        const index = draftLines.indexOf(batch);
        draftLines[index] = newBatch;
        setIsDirty(true);
        return [...draftLines];
      });
    },
    [setDraftLines, setIsDirty]
  );

  const removeDraftLine = async (id: string) => {
    const batch = draftLines.find(line => line.id === id);
    if (!batch) return;
    const deletedBatch = { ...batch, isDeleted: true };
    await deleteMutation([deletedBatch]);
  };

  const saveLines = async () => {
    if (isDirty) {
      const { errorMessage } = await mutateAsync(draftLines);
      if (errorMessage) throw new Error(errorMessage);
      setIsDirty(false);
    }
  };

  return {
    draftLines,
    addDraftLine,
    updateDraftLine,
    removeDraftLine,
    isLoading,
    saveLines,
  };
};
