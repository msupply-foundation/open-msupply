import React, { FC } from 'react';
import {
  useDialog,
  useTranslation,
  ModalMode,
  DialogButton,
} from '@openmsupply-client/common';

interface StocktakeLineEditModalProps {
  isOpen: boolean;
  mode: ModalMode | null;
  onCancel: () => void;
  onOk: () => void;
  onNext: () => void;
}

export const StocktakeLineEditModal: FC<StocktakeLineEditModalProps> = ({
  isOpen,
  children,
  mode,
  onCancel,
  onOk,
  onNext,
}) => {
  const { Modal } = useDialog({ onClose: onCancel, isOpen });
  const t = useTranslation('inventory');

  return (
    <Modal
      title={
        mode === ModalMode.Create
          ? t('heading.add-item')
          : t('heading.edit-item')
      }
      cancelButton={<DialogButton variant="cancel" onClick={onCancel} />}
      nextButton={
        <DialogButton
          variant="next"
          onClick={onNext}
          disabled={mode !== ModalMode.Update}
        />
      }
      okButton={<DialogButton variant="ok" onClick={onOk} />}
      height={600}
      width={1024}
    >
      <>{children}</>
    </Modal>
  );
};
