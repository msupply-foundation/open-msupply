import React, { FC, PropsWithChildren } from 'react';
import {
  useDialog,
  useTranslation,
  ModalMode,
  DialogButton,
} from '@openmsupply-client/common';

interface StocktakeLineEditModalProps {
  isOpen: boolean;
  isValid: boolean;
  mode: ModalMode | null;
  onCancel: () => void;
  onOk: () => void;
  onNext: () => void;
  hasNext: boolean;
}

export const StocktakeLineEditModal: FC<
  PropsWithChildren<StocktakeLineEditModalProps>
> = ({ isOpen, isValid, children, mode, onCancel, onOk, onNext, hasNext }) => {
  const { Modal } = useDialog({
    onClose: onCancel,
    isOpen,
    disableBackdrop: true,
  });
  const t = useTranslation();

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
          variant="next-and-ok"
          onClick={onNext}
          disabled={(!hasNext && mode === ModalMode.Update) || !isValid}
        />
      }
      okButton={
        <DialogButton variant="ok" onClick={onOk} disabled={!isValid} />
      }
      height={600}
      width={1125}
      fullWidthOnMobile
    >
      <>{children}</>
    </Modal>
  );
};
