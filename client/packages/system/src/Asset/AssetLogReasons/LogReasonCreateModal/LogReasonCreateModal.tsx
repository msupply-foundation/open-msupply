import React, { FC } from 'react';
import {
  ModalMode,
  useDialog,
  Grid,
  DialogButton,
  useTranslation,
} from '@openmsupply-client/common';
import { AssetLogReasonFragment } from '../../api';

interface LogReasonCreateModalProps {
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;

  location: AssetLogReasonFragment | null;
}

export const LogReasonCreateModal: FC<LogReasonCreateModalProps> = ({
  mode,
  isOpen,
  onClose,
}) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation('inventory');

  return (
    <Modal
      okButton={
        <DialogButton variant="ok" disabled={false} onClick={async () => {}} />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          variant="next"
          disabled={false}
          onClick={async () => {}}
        />
      }
      title={
        mode === ModalMode.Create
          ? t('label.create-location')
          : t('label.edit-location')
      }
    >
      <Grid flexDirection="column" display="flex" gap={2}></Grid>
    </Modal>
  );
};
