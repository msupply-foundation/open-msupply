import React from 'react';
import {
  useTranslation,
  Box,
  useDialog,
  useNotification,
  DialogButton,
  InlineSpinner,
} from '@openmsupply-client/common';
import { useGoodsReceivedLine } from '../../api';
import { useDraftGoodsReceivedLines } from '../../api/hooks/useDraftGoodsReceivedLines';
import { GoodsReceivedLineEdit } from './GoodsReceivedLineEdit';

interface GoodsReceivedLineEditModalProps {
  lineId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const GoodsReceivedLineEditModal = ({
  lineId,
  isOpen,
  onClose,
}: GoodsReceivedLineEditModalProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const {
    draft,
    saveGoodsReceivedLines: { saveGoodsReceivedLines, isSaving },
  } = useGoodsReceivedLine(lineId);

  const { draftLines, addDraftLine, updateDraftLine, removeDraftLine } =
    useDraftGoodsReceivedLines(draft?.purchaseOrderLineId);

  const handleOkClick = async () => {
    try {
      if (!draft) return;

      const lines = draftLines.map(line => ({
        id: line.id,
        batch: line.batch,
        comment: line.comment,
        expiryDate: line.expiryDate,
        manufacturerId: line.manufacturerLinkId,
        numberOfPacksReceived: line.numberOfPacksReceived,
        receivedPackSize: line.receivedPackSize,
      }));

      const result = await saveGoodsReceivedLines({
        goodsReceivedId: draft.goodsReceivedId,
        purchaseOrderLineId: draft.purchaseOrderLineId,
        lines,
      });

      if (result.saveGoodsReceivedLines.id !== null) onClose();
    } catch (e: unknown) {
      if (e instanceof Error) error(e.message)();
      else error(t('error.cant-save'))();
      return false;
    }
  };

  console.info('draftliens', draftLines);

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  return (
    <Modal
      title={t('heading.edit-item')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="ok"
          disabled={!draft || isSaving}
          onClick={handleOkClick}
        />
      }
      height={700}
      width={1200}
      enableAutocomplete
    >
      {isSaving ? (
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
          draft={draft}
          draftLines={draftLines}
          addDraftLine={addDraftLine}
          updateDraftLine={updateDraftLine}
          removeDraftLine={removeDraftLine}
        />
      )}
    </Modal>
  );
};
