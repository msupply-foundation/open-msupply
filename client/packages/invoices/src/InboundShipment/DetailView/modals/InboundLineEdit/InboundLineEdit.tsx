import React, { useCallback, useState, useEffect } from 'react';
import {
  Divider,
  useTranslation,
  BasicSpinner,
  DialogButton,
  useDialog,
  useNotification,
  ModalMode,
  useConfirmOnLeaving,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  useSimplifiedTabletUI,
  Box,
  ButtonWithIcon,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import { InboundLineEditForm } from './InboundLineEditForm';
import { InboundLineFragment, useInbound } from '../../../api';
import { DraftInboundLine } from '../../../../types';
import { CreateDraft } from '../utils';
import { TabLayout } from './TabLayout';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import { QuantityTable } from './TabTables';

type InboundLineItem = InboundLineFragment['item'];
interface InboundLineEditProps {
  item: InboundLineItem | null;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
  isDisabled?: boolean;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier?: boolean;
  hasVvmStatusesEnabled?: boolean;
  hasItemVariantsEnabled?: boolean;
}

const useDraftInboundLines = (item: InboundLineItem | null) => {
  const { data: lines } = useInbound.lines.list(item?.id ?? '');
  const { id } = useInbound.document.fields('id');
  const { mutateAsync, isLoading } = useInbound.lines.save();
  const [draftLines, setDraftLines] = useState<DraftInboundLine[]>([]);
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
    [setDraftLines, setIsDirty]
  );

  const saveLines = async () => {
    if (isDirty) {
      const { errorMessage } = await mutateAsync(draftLines);

      if (errorMessage) {
        throw new Error(errorMessage);
      }

      setIsDirty(false);
    }
  };

  return {
    draftLines,
    addDraftLine,
    updateDraftLine,
    isLoading,
    saveLines,
  };
};

export const InboundLineEdit = ({
  item,
  mode,
  isOpen,
  onClose,
  isDisabled = false,
  currency,
  isExternalSupplier,
  hasVvmStatusesEnabled = false,
  hasItemVariantsEnabled = false,
}: InboundLineEditProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const [currentItem, setCurrentItem] = useState<InboundLineItem | null>(item);
  const { next: nextItem, disabled: nextDisabled } = useInbound.document.next(
    currentItem?.id ?? ''
  );

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const { draftLines, addDraftLine, updateDraftLine, isLoading, saveLines } =
    useDraftInboundLines(currentItem);
  const okNextDisabled =
    (mode === ModalMode.Update && nextDisabled) || !currentItem;
  const zeroNumberOfPacks = draftLines.some(line => line.numberOfPacks === 0);
  const simplifiedTabletView = useSimplifiedTabletUI();

  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  const tableContent = simplifiedTabletView ? (
    <>
      <QuantityTable
        isDisabled={isDisabled}
        lines={draftLines}
        updateDraftLine={updateDraftLine}
        item={currentItem}
        hasItemVariantsEnabled={hasItemVariantsEnabled}
        hasVvmStatusesEnabled={hasVvmStatusesEnabled}
      />
      <Box flex={1} justifyContent="flex-start" display="flex" margin={3}>
        <ButtonWithIcon
          disabled={isDisabled}
          color="primary"
          variant="outlined"
          onClick={addDraftLine}
          label={`${t('label.add-batch')} (+)`}
          Icon={<PlusCircleIcon />}
        />
      </Box>
    </>
  ) : (
    <TabLayout
      draftLines={draftLines}
      addDraftLine={addDraftLine}
      updateDraftLine={updateDraftLine}
      isDisabled={isDisabled}
      currency={currency}
      isExternalSupplier={isExternalSupplier}
      item={currentItem}
      hasItemVariantsEnabled={hasItemVariantsEnabled}
      hasVvmStatusesEnabled={!!hasVvmStatusesEnabled}
    />
  );

  return (
    <TableProvider
      createStore={createTableStore}
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
            variant="next-and-ok"
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
                error((e as Error).message)();
              }
            }}
          />
        }
        height={700}
        width={1200}
        enableAutocomplete /* Required for previously entered batches to be remembered and suggested in future shipments */
      >
        {isLoading ? (
          <BasicSpinner messageKey="saving" />
        ) : (
          <>
            <InboundLineEditForm
              disabled={mode === ModalMode.Update}
              item={currentItem}
              onChangeItem={setCurrentItem}
            />
            <Divider margin={5} />
            {tableContent}
          </>
        )}
      </Modal>
    </TableProvider>
  );
};
