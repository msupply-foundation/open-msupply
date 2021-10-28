import React from 'react';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { LocaleKey } from '../../intl/intlHelpers';
import { BasicModal } from '../../ui/components/modals/BasicModal';
import { ModalTitle } from '../../ui/components/modals/ModalTitle';

export interface ButtonProps {
  icon?: React.ReactElement;
  labelKey?: LocaleKey;
  onClick?: () => void;
  visible?: boolean;
}

export interface ModalProps {
  cancelButton?: JSX.Element;
  height?: number;
  nextButton?: JSX.Element;
  okButton?: JSX.Element;
  width?: number;
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
  const showDialog = () => setOpen(true);
  const hideDialog = () => setOpen(false);

  const handleClose = () => {
    onClose && onClose();
    hideDialog();
  };

  const ModalComponent: React.FC<ModalProps> = ({
    cancelButton,
    children,
    height,
    nextButton,
    okButton,
    width,
  }) => (
    <BasicModal open={open} onClose={handleClose} width={width} height={height}>
      <ModalTitle title={title} />
      <DialogContent>{children}</DialogContent>
      <DialogActions sx={{ justifyContent: 'center', marginBottom: '45px' }}>
        {cancelButton}
        {okButton}
        {nextButton}
      </DialogActions>
    </BasicModal>
  );

  const Modal = React.useMemo(() => ModalComponent, [open]);

  return { hideDialog, Modal, open, showDialog };
};
