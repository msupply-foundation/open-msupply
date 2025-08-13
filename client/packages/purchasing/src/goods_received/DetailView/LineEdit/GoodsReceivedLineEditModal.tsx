import { ModalMode, useDialog, useNotification } from '@common/hooks';
// import { GoodsReceivedFragment } from '../../api';
import { DialogButton, InlineSpinner } from '@common/components';
import { useTranslation, Box } from '@openmsupply-client/common';
import React, { useState } from 'react';
import { GoodsReceivedLineEdit } from './GoodsReceivedLineEdit';
// import { useGoodsReceivedLine } from '../../api/hooks/useGoodsReceivedLine';
import { ItemStockOnHandFragment } from '@openmsupply-client/system';
import { createDraftGoodsReceivedLine } from './utils';
import { GoodsReceivedFragment } from '../../api/operations.generated';
import { useGoodsReceivedLine } from '../../api';
interface GoodsReceivedLineEditModalProps {
  lineId: string | null;
  goodsReceived: GoodsReceivedFragment;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
}

export const GoodsReceivedLineEditModal = ({
  lineId,
  goodsReceived,
  mode,
  isOpen,
  onClose,
}: GoodsReceivedLineEditModalProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const lines = goodsReceived.lines.nodes;

  const [currentLine, setCurrentLine] = useState(
    lines.find(line => line.id === lineId) ?? undefined
  );

  const isUpdating = false; // remove me when adding update
  const {
    create: { create, isCreating },
    // update: { update, isUpdating },
    draft,
    updatePatch,
  } = useGoodsReceivedLine(currentLine?.id);

  const onChangeItem = (item: ItemStockOnHandFragment) => {
    const draftLine = createDraftGoodsReceivedLine(
      item,
      goodsReceived.id,
      currentLine?.purchaseOrderLineId ?? '' // TODO: Figure out how to pass this...
    );
    item &&
      updatePatch({
        ...draftLine,
        itemId: item.id,
      });
    setCurrentLine({
      ...draftLine,
      __typename: 'GoodsReceivedLineNode',
      itemName: item.name ?? '',
      lineNumber: 0, // draftLine.lineNumber ?? 0, TODO: Add line numbers
    });
  };

  const handleSave = async () => {
    try {
      if (mode === ModalMode.Create) {
        await create();
      } else if (mode === ModalMode.Update) {
        // await update();
        alert('Not implemented yet!');
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
        <GoodsReceivedLineEdit
          currentLine={currentLine}
          isUpdateMode={mode === ModalMode.Update}
          onChangeItem={onChangeItem}
          draft={draft}
          updatePatch={updatePatch}
        />
      )}
    </Modal>
  );
};
