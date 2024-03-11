import React from 'react';
import {
  useNotification,
  Box,
  useDialog,
  useTranslation,
  DialogButton,
} from '@openmsupply-client/common';

interface ImportAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportAssetModal = ({
  isOpen,
  onClose,
}: ImportAssetModalProps) => {
  const t = useTranslation('coldchain');
  const { error } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose });

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      title={t('heading.import-cold-chain-equipment')}
      width={700}
      height={100}
      cancelButton={<DialogButton variant="cancel" onClick={handleClose} />}
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            try {
              console.info('clicked');
            } catch (e) {
              error('error');
            }
          }}
        />
      }
    >
      <Box>modal!</Box>
    </Modal>
  );
};
