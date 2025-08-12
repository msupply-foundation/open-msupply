import { ModalMode, useDialog, useNotification } from '@common/hooks';
import { PurchaseOrderFragment } from '../../api';
import { DialogButton, InlineSpinner } from '@common/components';
import { useTranslation, Box } from '@openmsupply-client/common';
import React, { useEffect, useState } from 'react';
import { PurchaseOrderLineEdit } from './PurchaseOrderLineEdit';
import { usePurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';
import { ItemStockOnHandFragment } from '@openmsupply-client/system';
import { createDraftPurchaseOrderLine } from './utils';
interface PurchaseOrderLineEditModalProps {
  lineId: string | null;
  purchaseOrder: PurchaseOrderFragment;
  mode: ModalMode | null;
  isOpen: boolean;
  openNext: () => void;
  onClose: () => void;
}

export const PurchaseOrderLineEditModal = ({
  lineId,
  purchaseOrder,
  mode,
  isOpen,
  onClose,
  openNext,
}: PurchaseOrderLineEditModalProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const lines = purchaseOrder.lines.nodes;

  const [currentLine, setCurrentLine] = useState(
    lines.find(line => line.id === lineId) ?? undefined
  );

  console.log('currentLine:', currentLine);

  const {
    create: { create, isCreating },
    update: { update, isUpdating },
    draft,
    updatePatch,
  } = usePurchaseOrderLine(currentLine?.id);

  useEffect(() => {
    if (lineId) {
      const line = lines.find(line => line.id === lineId);
      setCurrentLine(line ?? undefined);
    } else {
      setCurrentLine(undefined);
    }
  }, [lineId]);

  const onChangeItem = (item: ItemStockOnHandFragment) => {
    const draftLine = createDraftPurchaseOrderLine(item, purchaseOrder.id);
    item &&
      updatePatch({
        ...draftLine,
        itemId: item.id,
      });
    setCurrentLine({
      ...draftLine,
      __typename: 'PurchaseOrderLineNode',
      item: item,
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

  const hasNext =
    lines.findIndex(line => line.id === lineId) < lines.length - 2;

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
          disabled={!currentLine}
          onClick={async () => {
            const success = await handleSave();
            if (success) onClose();
          }}
        />
      }
      nextButton={
        <DialogButton
          variant="next-and-ok"
          disabled={!hasNext}
          onClick={async () => {
            await handleSave();
            openNext();
          }}
        />
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
          currentLine={currentLine}
          isUpdateMode={mode === ModalMode.Update}
          onChangeItem={onChangeItem}
          draft={draft}
          updatePatch={updatePatch}
          status={purchaseOrder.status}
        />
      )}
    </Modal>
  );
};
