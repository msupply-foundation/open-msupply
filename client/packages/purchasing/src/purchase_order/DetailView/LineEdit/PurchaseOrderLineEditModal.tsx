import React, { useState } from 'react';
import { PurchaseOrderFragment } from '../../api';
import { DialogButton, InlineSpinner } from '@common/components';
import {
  Box,
  ModalMode,
  useDialog,
  useNotification,
} from '@openmsupply-client/common';
import { ItemStockOnHandFragment } from '@openmsupply-client/system';
import { PurchaseOrderLineEdit } from './PurchaseOrderLineEdit';
import { usePurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';
import { createDraftPurchaseOrderLine } from './utils';

interface PurchaseOrderLineEditModalProps {
  lineId: string | null;
  purchaseOrder: PurchaseOrderFragment;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
  isDisabled: boolean;
}

export const PurchaseOrderLineEditModal = ({
  lineId,
  purchaseOrder,
  mode,
  isOpen,
  onClose,
  isDisabled,
}: PurchaseOrderLineEditModalProps) => {
  const { error } = useNotification();

  const lines = purchaseOrder.lines.nodes;
  const [currentLine, setCurrentLine] = useState(
    lines.find(line => line.id === lineId) ?? undefined
  );

  const {
    create: { create, isCreating },
    update: { update, isUpdating },
    draft,
    updatePatch,
  } = usePurchaseOrderLine(currentLine?.id);

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

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  return (
    <Modal
      title=""
      contentProps={{ sx: { padding: 0 } }}
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
          update={updatePatch}
          // status={purchaseOrder.status} // TODO: The things that show on confirmed status
          isDisabled={isDisabled}
          lines={lines}
        />
      )}
    </Modal>
  );
};
