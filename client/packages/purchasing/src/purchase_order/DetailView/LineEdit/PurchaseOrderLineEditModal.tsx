import React from 'react';
import { ModalMode, useDialog, useNotification } from '@common/hooks';
import { PurchaseOrderFragment } from '../../api';
import { DialogButton, InlineSpinner } from '@common/components';
import { useTranslation, Box } from '@openmsupply-client/common';
import { PurchaseOrderLineEdit } from './PurchaseOrderLineEdit';
import { usePurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';
import { ItemStockOnHandFragment } from '@openmsupply-client/system';
import { createDraftPurchaseOrderLine } from './utils';
interface PurchaseOrderLineEditModalProps {
  lineId: string | null;
  purchaseOrder: PurchaseOrderFragment;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
  hasNext: boolean;
  openNext: () => void;
}

export const PurchaseOrderLineEditModal = ({
  lineId,
  purchaseOrder,
  mode,
  isOpen,
  onClose,
  hasNext,
  openNext,
}: PurchaseOrderLineEditModalProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const isUpdateMode = mode === ModalMode.Update;

  const {
    create: { create, isCreating },
    update: { update, isUpdating },
    draft,
    updatePatch,
  } = usePurchaseOrderLine(lineId);

  const onChangeItem = (item: ItemStockOnHandFragment) => {
    const draftLine = createDraftPurchaseOrderLine(item, purchaseOrder.id);
    item &&
      updatePatch({
        ...draftLine,
        itemId: item.id,
      });
  };

  const handleSave = async () => {
    try {
      if (mode === ModalMode.Create) {
        await create();
      } else if (mode === ModalMode.Update) {
        await update();
      }
      return true;
    } catch (e: unknown) {
      if (e instanceof Error) {
        error(e.message)();
      } else {
        error('unknown error')();
      }
      return false;
    }
  };

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  return (
    <Modal
      title={
        mode === ModalMode.Create
          ? t('heading.add-item')
          : t('heading.edit-item')
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="ok"
          disabled={!draft}
          onClick={async () => {
            const success = await handleSave();
            if (success) onClose();
          }}
        />
      }
      nextButton={
        isUpdateMode ? (
          <DialogButton
            variant="next-and-ok"
            disabled={!hasNext}
            onClick={async () => {
              await handleSave();
              openNext();
              return true;
            }}
          />
        ) : undefined
      }
      height={700}
      width={1200}
      enableAutocomplete
    >
      {isCreating || isUpdating ? (
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
          draft={draft}
          isUpdateMode={isUpdateMode}
          onChangeItem={onChangeItem}
          updatePatch={updatePatch}
          status={purchaseOrder.status}
        />
      )}
    </Modal>
  );
};
