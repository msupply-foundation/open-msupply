import { useCallback, useEffect, useState } from 'react';
import { useInbound } from '.';
import { useConfirmOnLeaving, useNotification } from '@common/hooks';
import { DraftInboundLine } from '../../../types';
import { InboundLineFragment } from '../operations.generated';
import { CreateDraft } from '../../DetailView/modals/utils';
import { useDeleteInboundLines } from './line/useDeleteInboundLines';
import { mapErrorToMessageAndSetContext } from './mapErrorToMessageAndSetContext';
import { useTranslation } from '@common/intl';
import { ScannedBatchData } from '../../DetailView';

type InboundLineItem = InboundLineFragment['item'];

export type PatchDraftLineInput = Partial<DraftInboundLine> & { id: string };

export const useDraftInboundLines = (
  item: InboundLineItem | null,
  scannedBatchData?: ScannedBatchData
) => {
  const t = useTranslation();
  const { error } = useNotification();

  const [draftLines, setDraftLines] = useState<DraftInboundLine[]>([]);

  const { id } = useInbound.document.fields('id');
  const { data: lines } = useInbound.lines.list(item?.id ?? '');
  const { mutateAsync, isLoading } = useInbound.lines.save();
  const { mutateAsync: deleteMutation } = useDeleteInboundLines();

  const { isDirty, setIsDirty } = useConfirmOnLeaving(
    'inbound-shipment-line-edit'
  );

  useEffect(() => {
    if (lines && item) {
      const drafts = lines.map(line =>
        CreateDraft.stockInLine({
          item: line.item,
          invoiceId: line.invoiceId,
          seed: line,
          // From scanned barcode:
          batch: scannedBatchData?.batch,
          expiryDate: scannedBatchData?.expiryDate,
        })
      );
      if (drafts.length === 0)
        drafts.push(CreateDraft.stockInLine({ item, invoiceId: id }));
      setDraftLines(drafts);
    } else {
      setDraftLines([]);
    }
  }, [lines, item, id]);

  const addDraftLine = () => {
    if (item) {
      const newLine = CreateDraft.stockInLine({
        item,
        invoiceId: id,
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
    if (batch.isCreated) {
      setDraftLines(draftLines => {
        const newLines = draftLines.filter(line => line.id !== id);
        if (newLines.length === 0 && item) {
          return [CreateDraft.stockInLine({ item, invoiceId: id })];
        }
        return newLines;
      });
    } else {
      const deletedBatch = { ...batch, isDeleted: true };
      try {
        const response = await deleteMutation([deletedBatch]);

        const responseForLine =
          response.batchInboundShipment.deleteInboundShipmentLines?.[0];

        if (!responseForLine) {
          error(t('error.something-wrong'))();
          return;
        }
        const errorMessage = mapErrorToMessageAndSetContext(
          responseForLine,
          [deletedBatch],
          t
        );
        if (errorMessage) error(errorMessage)();
      } catch {
        error(t('error.something-wrong'))();
      }
    }
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
