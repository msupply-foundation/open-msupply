import React from 'react';
import {
  ModalMode,
  useDialog,
  DialogButton,
  BasicSpinner,
  useTranslation,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';

interface ResponseLineEditProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode | null;
  item: ItemRowFragment | null;
}

export const ResponseLineEdit = ({
  isOpen,
  onClose,
  mode,
}: ResponseLineEditProps) => {
  const t = useTranslation();
  const { Modal } = useDialog({ onClose, isOpen });

  return (
    <Modal
      title={
        mode === ModalMode.Create
          ? t('heading.add-item')
          : t('heading.edit-item')
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={<DialogButton variant="next" onClick={() => {}} />}
      okButton={<DialogButton variant="ok" onClick={onClose} />}
      height={600}
      width={1024}
    >
      <BasicSpinner messageKey="saving" />
    </Modal>
  );
};
