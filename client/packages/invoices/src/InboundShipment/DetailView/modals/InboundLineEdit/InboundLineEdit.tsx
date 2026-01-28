import React, { useState, useEffect } from 'react';
import {
  Divider,
  useTranslation,
  BasicSpinner,
  DialogButton,
  useDialog,
  useNotification,
  ModalMode,
  useSimplifiedTabletUI,
  Box,
  ButtonWithIcon,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import { InboundLineEditForm } from './InboundLineEditForm';
import { InboundLineFragment, useDraftInboundLines } from '../../../api';
import { TabLayout } from './TabLayout';
import {
  CurrencyRowFragment,
  ItemRowFragment,
} from '@openmsupply-client/system';
import { QuantityTable } from './TabTables';
import { isInboundPlaceholderRow } from '../../../../utils';
import { ScannedBatchData } from '../../DetailView';
import { useNextItem } from '../../../../useNextItem';
import { AccordionLayout } from './AccordionLayout';

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
  scannedBatchData?: ScannedBatchData;
  getSortedItems: () => ItemRowFragment[];
}

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
  scannedBatchData,
  getSortedItems,
}: InboundLineEditProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const [currentItem, setCurrentItem] = useState<ItemRowFragment | null>(item);
  const { next: nextItem, disabled: nextDisabled } = useNextItem(
    getSortedItems,
    currentItem?.id ?? ''
  );

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const {
    draftLines,
    addDraftLine,
    updateDraftLine,
    removeDraftLine,
    isLoading,
    saveLines,
  } = useDraftInboundLines(currentItem?.id, scannedBatchData);
  const okNextDisabled =
    (mode === ModalMode.Update && nextDisabled) || !currentItem;
  const manualLinesWithZeroNumberOfPacks = draftLines.some(
    // should be able to save with `0` lines if they're from a transfer
    l => !l.linkedInvoiceId && isInboundPlaceholderRow(l)
  );
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
        removeDraftLine={removeDraftLine}
        item={currentItem}
        hasItemVariantsEnabled={hasItemVariantsEnabled}
        hasVvmStatusesEnabled={hasVvmStatusesEnabled}
      />
      <Box flex={1} justifyContent="flex-start" display="flex" margin={10}>
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
    // replace tablayout with accordion layout
    // <TabLayout
    //   draftLines={draftLines}
    //   addDraftLine={addDraftLine}
    //   updateDraftLine={updateDraftLine}
    //   removeDraftLine={removeDraftLine}
    //   isDisabled={isDisabled}
    //   currency={currency}
    //   isExternalSupplier={isExternalSupplier}
    //   item={currentItem}
    //   hasItemVariantsEnabled={hasItemVariantsEnabled}
    //   hasVvmStatusesEnabled={!!hasVvmStatusesEnabled}
    // />
    <Box sx={{ mt: 10 }}>
      <AccordionLayout
        draftLines={draftLines}
        addDraftLine={addDraftLine}
        updateDraftLine={updateDraftLine}
        removeDraftLine={removeDraftLine}
        isDisabled={isDisabled}
        currency={currency}
        isExternalSupplier={isExternalSupplier}
        item={currentItem}
        hasItemVariantsEnabled={hasItemVariantsEnabled}
        hasVvmStatusesEnabled={!!hasVvmStatusesEnabled}
      />
    </Box>
  );

  return (
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
          disabled={okNextDisabled || manualLinesWithZeroNumberOfPacks}
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
          disabled={!currentItem || manualLinesWithZeroNumberOfPacks}
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
  );
};
