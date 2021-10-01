import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { LocaleKey, useTranslation } from '../../intl/intlHelpers';
import { ArrowRightIcon, CheckIcon, XCircleIcon } from '../../ui/icons';
import { DialogButton } from '../../ui/components/buttons/DialogButton';

export interface ButtonProps {
  icon?: React.ReactElement;
  labelKey?: LocaleKey;
  onClick?: () => void;
  visible?: boolean;
}
export interface DialogButtonOverrides {
  cancel?: ButtonProps;
  ok?: ButtonProps;
  okAndNext?: ButtonProps;
}

interface DialogButtonProps {
  cancel: ButtonProps;
  ok: ButtonProps;
  okAndNext: ButtonProps;
}

export interface DialogProps {
  body: React.ReactElement;
  buttonOverrides: DialogButtonOverrides;
  title?: LocaleKey;
}

interface DialogState {
  showDialog: () => void;
  hideDialog: () => void;
  Modal: React.ReactElement;
}

export const useDialog = (dialogProps: DialogProps): DialogState => {
  const { body, buttonOverrides, title } = dialogProps;
  const [open, setOpen] = React.useState(false);
  const t = useTranslation();
  const showDialog = () => setOpen(true);
  const hideDialog = () => setOpen(false);

  const dialogButtonProps: DialogButtonProps = {
    cancel: {
      icon: <XCircleIcon />,
      labelKey: 'button.cancel',
      onClick: hideDialog,
      visible: true,
      ...buttonOverrides.cancel,
    },
    ok: {
      icon: <CheckIcon />,
      labelKey: 'button.ok',
      onClick: hideDialog,
      visible: true,
      ...buttonOverrides.ok,
    },
    okAndNext: {
      icon: <ArrowRightIcon />,
      labelKey: 'button.ok-and-next',
      visible: false,
      ...buttonOverrides.okAndNext,
    },
  };

  const Modal = (
    <Dialog
      open={open}
      onClose={dialogButtonProps.cancel.onClick}
      PaperProps={{
        sx: { borderRadius: '20px', minHeight: '400px', minWidth: '500px' },
      }}
    >
      {title && <DialogTitle>{t(title)}</DialogTitle>}
      <DialogContent>{body}</DialogContent>
      <DialogActions sx={{ justifyContent: 'center' }}>
        <DialogButton color="secondary" {...dialogButtonProps.cancel} />
        <DialogButton {...dialogButtonProps.ok} />
        <DialogButton {...dialogButtonProps.okAndNext} />
      </DialogActions>
    </Dialog>
  );

  return { Modal, showDialog, hideDialog };
};
