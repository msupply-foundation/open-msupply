import React, { FC, useCallback, useState, useEffect } from 'react';
import {
  Divider,
  useTranslation,
  BasicSpinner,
  DialogButton,
  useDialog,
  useNotification,
  ModalMode,
  useDirtyCheck,
  useConfirmOnLeaving,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  useKeyboardHeightAdjustment,
} from '@openmsupply-client/common';
import { InboundLineEditForm } from './InboundLineEditForm';
import { InboundLineFragment, useInbound } from '../../../api';
import { DraftInboundLine } from '../../../../types';
import { CreateDraft } from '../utils';
import { TabLayout } from './TabLayout';

type InboundLineItem = InboundLineFragment['item'];
interface InboundLineEditProps {
  item: InboundLineItem | null;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
  isDisabled?: boolean;
}

const useDraftInboundLines = (item: InboundLineItem | null) => {
  const { data: lines } = useInbound.lines.list(item?.id ?? '');
  const { id } = useInbound.document.fields('id');
  const { mutateAsync, isLoading } = useInbound.lines.save();
  const [draftLines, setDraftLines] = useState<DraftInboundLine[]>([]);
  const { isDirty, setIsDirty } = useDirtyCheck();
  useConfirmOnLeaving(isDirty);

  useEffect(() => {
    if (lines && item) {
      const drafts = lines.map(line =>
        CreateDraft.stockInLine({
          item: line.item,
          invoiceId: line.invoiceId,
          seed: line,
        })
      );
      if (drafts.length === 0)
        drafts.push(CreateDraft.stockInLine({ item, invoiceId: id }));
      setDraftLines(drafts);
    } else {
      setDraftLines([]);
    }
  }, [lines, item]);

  const addDraftLine = () => {
    if (item) {
      const newLine = CreateDraft.stockInLine({ item, invoiceId: id });
      setIsDirty(true);
      setDraftLines(draftLines => [...draftLines, newLine]);
    }
  };

  const updateDraftLine = useCallback(
    (patch: Partial<DraftInboundLine> & { id: string }) => {
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
    [draftLines, setDraftLines]
  );

  const saveLines = async () => {
    if (isDirty) await mutateAsync(draftLines);
    setIsDirty(false);
  };

  return {
    draftLines,
    addDraftLine,
    updateDraftLine,
    isLoading,
    saveLines,
  };
};

export const InboundLineEdit: FC<InboundLineEditProps> = ({
  item,
  mode,
  isOpen,
  onClose,
  isDisabled = false,
}) => {
  const t = useTranslation('replenishment');
  const { error } = useNotification();
  const [currentItem, setCurrentItem] = useState<InboundLineItem | null>(item);
  const { next: nextItem, disabled: nextDisabled } = useInbound.document.next(
    currentItem?.id ?? ''
  );
  const { Modal } = useDialog({ isOpen, onClose });
  const height = useKeyboardHeightAdjustment(600);
  const { draftLines, addDraftLine, updateDraftLine, isLoading, saveLines } =
    useDraftInboundLines(currentItem);
  const okNextDisabled =
    (mode === ModalMode.Update && nextDisabled) || !currentItem;
  const zeroNumberOfPacks = draftLines.some(line => line.numberOfPacks === 0);

  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  return (
    <TableProvider
      createStore={createTableStore()}
      queryParamsStore={createQueryParamsStore({
        initialSortBy: { key: 'expiryDate' },
      })}
    >
      <Modal
        title={
          mode === ModalMode.Create
            ? t('heading.add-item')
            : t('heading.edit-item')
        }
        cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
        nextButton={
          <DialogButton
            variant="next"
            disabled={okNextDisabled || zeroNumberOfPacks}
            onClick={async () => {
              await saveLines();
              if (mode === ModalMode.Update && nextItem) {
                setCurrentItem(nextItem);
              } else if (mode === ModalMode.Create) setCurrentItem(null);
              else onClose();
              // Returning true here triggers the slide animation
              return true;
            }}
          />
        }
        okButton={
          <DialogButton
            variant="ok"
            disabled={!currentItem || zeroNumberOfPacks}
            onClick={async () => {
              try {
                await saveLines();
                onClose();
              } catch (e) {
                error((error as unknown as Error).message);
              }
            }}
          />
        }
        height={height}
        width={1024}
      >
        {isLoading ? (
          <BasicSpinner messageKey="saving" />
        ) : (
          <form
            autoComplete={
              'on' /* Required for previously entered batches to be remembered and suggested in future shipments */
            }
          >
            <InboundLineEditForm
              disabled={mode === ModalMode.Update}
              item={currentItem}
              onChangeItem={setCurrentItem}
            />
            <Divider margin={5} />
            <TabLayout
              draftLines={draftLines}
              addDraftLine={addDraftLine}
              updateDraftLine={updateDraftLine}
              isDisabled={isDisabled}
            />
          </form>
        )}
      </Modal>
    </TableProvider>
  );
};
