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

  const isUpdating = false; // remove me when adding update
  const { draft, updatePatch } = useGoodsReceivedLine(lineId);

  const handleSave = async () => {
    try {
      // await update();
      alert('Not implemented yet!');
      return true;
    } catch (e: unknown) {
      if (e instanceof Error) error(e.message)();
      else error('unknown error')();
      return false;
    }
  };

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  return (
    <Modal
      title={t('heading.edit-item')}
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
      height={700}
      width={1200}
      enableAutocomplete
    >
      {isUpdating ? (
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
          isUpdateMode
          draft={draft}
          updatePatch={updatePatch}
        />
      )}
    </Modal>
  );
};
