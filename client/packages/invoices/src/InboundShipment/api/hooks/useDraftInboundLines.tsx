import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  useConfirmOnLeaving,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { useItem } from '@openmsupply-client/system';
import { DraftInboundLine } from '../../../types';
import { CreateDraft } from '../../DetailView/modals/utils';
import { useDeleteInboundLines } from './line/useDeleteInboundLines';
import { mapErrorToMessageAndSetContext } from './mapErrorToMessageAndSetContext';
import { ScannedBatchData } from '../../DetailView';
import { useInboundShipment } from './document/useInboundShipment';
import { useSaveInboundLines } from './utils';
import { getInboundStockLines } from '../../../utils';

export type PatchDraftLineInput = Partial<DraftInboundLine> & { id: string };

export const useDraftInboundLines = (
  itemId?: string,
  scannedBatchData?: ScannedBatchData
) => {
  const t = useTranslation();
  const { error } = useNotification();

  const [draftLines, setDraftLines] = useState<DraftInboundLine[]>([]);

  const {
    query: { data },
    isExternal,
  } = useInboundShipment();
  const id = data?.id ?? '';

  // Derive lines from the same data source, filtering by itemId if provided
  const lines = useMemo(() => {
    if (!data) return undefined;
    return itemId
      ? data.lines.nodes.filter(({ item }) => itemId === item.id)
      : getInboundStockLines(data.lines.nodes);
  }, [data, itemId]);

  const { mutateAsync, isPending: isLoading } = useSaveInboundLines(isExternal);
  const { mutateAsync: deleteMutation } = useDeleteInboundLines(isExternal);

  const { isDirty, setIsDirty } = useConfirmOnLeaving(
    'inbound-shipment-line-edit'
  );
  const {
    byId: { data: item },
  } = useItem(itemId ?? '');

  useEffect(() => {
    // Don't overwrite the user's in-progress edits with a background refetch
    // from React Query (e.g. triggered by window focus). isDirty is cleared by
    // saveLines before the modal closes, so the effect still runs correctly
    // after a successful save.
    if (isDirty) return;

    if (lines && item) {
      const drafts = lines.map(line =>
        CreateDraft.stockInLine({
          item,
          invoiceId: line.invoiceId,
          seed: line,
          // From scanned barcode:
          batch: scannedBatchData?.batch,
          expiryDate: scannedBatchData?.expiryDate,
        })
      );
      if (drafts.length === 0 && item) {
        drafts.push(
          CreateDraft.stockInLine({
            item,
            invoiceId: id,
            // From scanned barcode:
            batch: scannedBatchData?.batch,
            expiryDate: scannedBatchData?.expiryDate,
          })
        );
      }
      setDraftLines(drafts);
    } else {
      setDraftLines([]);
    }
  }, [lines, item, id, isDirty]);

  const addDraftLine = useCallback((initialPatch?: Partial<DraftInboundLine>) => {
    if (item) {
      const newLine = CreateDraft.stockInLine({
        item,
        invoiceId: id,
      });
      const line = { ...newLine, ...initialPatch };
      setIsDirty(true);
      setDraftLines(draftLines => [...draftLines, line]);
    }
  }, [item, id, setIsDirty]);

  const duplicateDraftLine = useCallback(
    (lineId: string) => {
      if (!item) return;

      setDraftLines(prevLines => {
        const sourceLine = prevLines.find(line => line.id === lineId);
        if (!sourceLine) return prevLines;

        const { id: _id, ...seedWithoutId } = sourceLine;
        const newLine = CreateDraft.stockInLine({
          item,
          invoiceId: id,
          seed: seedWithoutId as typeof sourceLine,
        });
        // Mark as new so it gets inserted rather than updated
        newLine.isCreated = true;
        newLine.isUpdated = false;

        setIsDirty(true);
        return [...prevLines, newLine];
      });
    },
    [item, id, setIsDirty]
  );

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

  const removeDraftLine = useCallback(
    (lineId: string) => {
      setDraftLines(draftLines => {
        const batch = draftLines.find(line => line.id === lineId);
        if (!batch) return draftLines;
        if (batch.isCreated) {
          const newLines = draftLines.filter(line => line.id !== lineId);
          if (newLines.length === 0 && item) {
            return [CreateDraft.stockInLine({ item, invoiceId: id })];
          }
          return newLines;
        } else {
          setIsDirty(true);
          return draftLines.map(line =>
            line.id === lineId ? { ...line, isDeleted: true } : line
          );
        }
      });
    },
    [item, id, setIsDirty]
  );

  const saveLines = async () => {
    if (isDirty) {
      const linesToDelete = draftLines.filter(line => line.isDeleted);
      if (linesToDelete.length > 0) {
        const response = await deleteMutation(linesToDelete);

        linesToDelete.forEach((lineToDelete, index) => {
          const responseForLine =
            response.batchInboundShipment.deleteInboundShipmentLines?.[index];
          if (!responseForLine) {
            error(t('error.something-wrong'))();
            return;
          }

          const errorMessage = mapErrorToMessageAndSetContext(
            responseForLine,
            [lineToDelete],
            t
          );
          if (errorMessage) error(errorMessage)();
        });
      }

      const linesToSave = draftLines.filter(line => !line.isDeleted);
      if (linesToSave.length > 0) {
        const { errorMessage } = await mutateAsync(linesToSave);
        if (errorMessage) throw new Error(errorMessage);
      }

      setIsDirty(false);
    }
  };

  // Used by scanning modal for updating one line at a time. Modal manages own
  // draft state, so we pass that in here
  const saveSingleLine = async (line: Partial<DraftInboundLine>) => {
    await mutateAsync([line as DraftInboundLine]);
  };

  return {
    draftLines: draftLines.filter(line => !line.isDeleted),
    addDraftLine,
    duplicateDraftLine,
    updateDraftLine,
    removeDraftLine,
    isPending: isLoading,
    saveLines,
    saveSingleLine,
  };
};
