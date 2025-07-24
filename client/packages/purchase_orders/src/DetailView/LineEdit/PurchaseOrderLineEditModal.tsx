import { ModalMode, useDialog, useNotification } from '@common/hooks';
import { PurchaseOrderFragment } from '../../api';
import { DialogButton, InlineSpinner } from '@common/components';
import { useTranslation, Box } from '@openmsupply-client/common';
import React, { useState } from 'react';
import { PurchaseOrderLineEdit } from './PurchaseOrderLineEdit';
import { usePurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';
import { ItemWithStatsFragment } from '@openmsupply-client/system';
import { createDraftPurchaseOrderLine } from './utils';
interface PurchaseOrderLineEditModalProps {
  itemId: string | null;
  purchaseOrder: PurchaseOrderFragment;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseOrderLineEditModal = ({
  itemId,
  purchaseOrder,
  mode,
  isOpen,
  onClose,
}: PurchaseOrderLineEditModalProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const lines = purchaseOrder.lines.nodes;

  const [currentItem, setCurrentItem] = useState(
    lines.find(line => line.item.id === itemId) ?? undefined
  );

  const {
    create: { create, isCreating },
    draft,
    updatePatch,
  } = usePurchaseOrderLine(currentItem?.item.id);

  const deletePreviousLine = () => {
    const shouldDelete = shouldDeleteLine(mode, currentItem?.id, false);
    if (currentItem?.id && shouldDelete) {
      // TODO implement line delete
    }
  };

  const onChangeItem = (item: ItemWithStatsFragment) => {
    if (mode === ModalMode.Create) {
      deletePreviousLine();
    }
    const draftLine = createDraftPurchaseOrderLine(item, purchaseOrder.id);
    item &&
      updatePatch({
        ...draftLine,
      });
    setCurrentItem({
      ...draftLine,
      __typename: 'PurchaseOrderLineNode',
      item: item,
    });
  };

  const handleSave = async () => {
    try {
      await create();
      updatePatch(draft);
      return true;
      // TODO add proper error handling by returning type errors from API
    } catch (e: unknown) {
      if (e instanceof Error) {
        error(e.message)();
      } else {
        error('unknown error')();
      }
      return false;
    }
  };

  // TODO handle next item workflow
  // const onSave = async () => {
  //   const success = await handleSave();
  //   if (!success) return false;
  //   // if (mode === ModalMode.Update && false setCurrentItem(next);
  //   // else if (mode === ModalMode.Create) setCurrentItem(undefined);
  //   // else onClose();
  //   onClose();
  //   return true;
  // };

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  return (
    <Modal
      title={
        mode === ModalMode.Create
          ? t('heading.add-item')
          : t('heading.edit-item')
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      // TODO add next button functionality
      // nextButton={<DialogButton variant="next-and-ok" onClick={onSave} />}
      okButton={
        <DialogButton
          variant="ok"
          disabled={!currentItem}
          onClick={async () => {
            const success = await handleSave();
            if (success) onClose();
          }}
        />
      }
      height={700}
      width={1200}
      enableAutocomplete
    >
      {isCreating ? (
        <Box
          display="flex"
          flex={1}
          height={300}
          justifyContent="center"
          alignItems="center"
        >
          <InlineSpinner />
        </Box>
      ) : (
        <PurchaseOrderLineEdit
          currentItem={currentItem}
          isUpdateMode={mode === ModalMode.Update}
          lines={lines}
          onChangeItem={onChangeItem}
        ></PurchaseOrderLineEdit>
      )}
    </Modal>
  );
};

export const shouldDeleteLine = (
  mode: ModalMode | null,
  draftId?: string,
  isDisabled?: boolean
): boolean => {
  if (mode === ModalMode.Create) return true;
  if (!draftId || isDisabled || mode === ModalMode.Update) return false;
  return false;
};
