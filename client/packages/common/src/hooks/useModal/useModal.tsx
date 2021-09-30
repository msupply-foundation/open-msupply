import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { LocaleKey, useTranslation } from '../../intl/intlHelpers';
import { ButtonSetBuilder } from '../../ui/forms/utils/ButtonSetBuilder';

export interface ModalProps {
  body: JSX.Element;
  onCancel?: () => void;
  onOk?: () => void;
  onOkAndNext?: () => void;
  title?: LocaleKey;
}

interface ModalState {
  showModal: () => void;
  hideModal: () => void;
  Modal: JSX.Element;
}

export const useModal = (modalProps: ModalProps): ModalState => {
  const { body, title } = modalProps;
  const [open, setOpen] = React.useState(false);
  const t = useTranslation();

  const showModal = () => setOpen(true);

  const hideModal = () => setOpen(false);

  const buttonSetBuilder = new ButtonSetBuilder();
  buttonSetBuilder.addButton({
    labelKey: 'button.cancel',
    onClick: hideModal,
  });
  buttonSetBuilder.addButton({ labelKey: 'button.ok', onClick: hideModal });
  const buttons = buttonSetBuilder.build();

  const Modal = (
    <Dialog
      open={open}
      onClose={hideModal}
      PaperProps={{
        sx: { borderRadius: '20px', minHeight: '400px', minWidth: '400px' },
      }}
    >
      {title && <DialogTitle>{t(title)}</DialogTitle>}
      <DialogContent>{body}</DialogContent>
      <DialogActions>{buttons}</DialogActions>
    </Dialog>
  );

  return { Modal, showModal, hideModal };
};
