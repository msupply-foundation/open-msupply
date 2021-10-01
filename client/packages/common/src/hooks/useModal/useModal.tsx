import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { LocaleKey, useTranslation } from '../../intl/intlHelpers';
import { ArrowRightIcon, CheckIcon, XCircleIcon } from '../../ui/icons';
import { DialogButton } from '../../ui/components/buttons/DialogButton';
export interface ModalProps {
  body: JSX.Element;
  onCancel?: (reason: string) => void;
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
  const { body, onCancel, onOk, onOkAndNext, title } = modalProps;
  const [open, setOpen] = React.useState(false);
  const t = useTranslation();

  const showModal = () => setOpen(true);

  const hideModal = () => setOpen(false);

  const handleCancel = (_: Event, reason: string) => {
    onCancel && onCancel(reason);
    hideModal();
  };

  const handleOk = () => onOk && onOk();

  const handleOkAndNext = () => onOkAndNext && onOkAndNext();

  const Modal = (
    <Dialog
      open={open}
      onClose={handleCancel}
      PaperProps={{
        sx: { borderRadius: '20px', minHeight: '400px', minWidth: '500px' },
      }}
    >
      {title && <DialogTitle>{t(title)}</DialogTitle>}
      <DialogContent>{body}</DialogContent>
      <DialogActions>
        <DialogButton
          color="secondary"
          labelKey="button.cancel"
          onClick={hideModal}
          icon={<XCircleIcon />}
        />
        {onOk && (
          <DialogButton
            labelKey="button.ok"
            onClick={handleOk}
            icon={<CheckIcon />}
          />
        )}
        {onOkAndNext && (
          <DialogButton
            labelKey="button.ok-and-next"
            onClick={handleOkAndNext}
            icon={<ArrowRightIcon />}
          />
        )}
      </DialogActions>
    </Dialog>
  );

  return { Modal, showModal, hideModal };
};
