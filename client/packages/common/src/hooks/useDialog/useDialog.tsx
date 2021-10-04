import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { LocaleKey, useTranslation } from '../../intl/intlHelpers';

export interface ButtonProps {
  icon?: React.ReactElement;
  labelKey?: LocaleKey;
  onClick?: () => void;
  visible?: boolean;
}

export interface ModalProps {
  cancelButton?: JSX.Element;
  nextButton?: JSX.Element;
  okButton?: JSX.Element;
}
export interface DialogProps {
  onClose?: () => void;
  title: LocaleKey;
}

interface DialogState {
  Modal: React.FC<ModalProps>;
  hideDialog: () => void;
  open: boolean;
  showDialog: () => void;
}

export const useDialog = (dialogProps: DialogProps): DialogState => {
  const { onClose, title } = dialogProps;
  const [open, setOpen] = React.useState(false);
  const t = useTranslation();
  const showDialog = () => setOpen(true);
  const hideDialog = () => setOpen(false);

  const handleClose = () => {
    onClose && onClose();
    hideDialog();
  };

  const Modal: React.FC<ModalProps> = ({
    cancelButton,
    children,
    nextButton,
    okButton,
  }) => (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: { borderRadius: '20px', minHeight: '400px', minWidth: '500px' },
      }}
    >
      <DialogTitle
        sx={{
          color: theme => theme.typography.body1.color,
          fontSize: theme => theme.typography.body1.fontSize,
          fontWeight: 'bold',
        }}
      >
        {t(title)}
      </DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions sx={{ justifyContent: 'center' }}>
        {cancelButton}
        {okButton}
        {nextButton}
      </DialogActions>
    </Dialog>
  );

  return { hideDialog, Modal, open, showDialog };
};
