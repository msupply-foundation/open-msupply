import React, { FC } from 'react';
import Dialog, { DialogProps as MuiDialogProps } from '@mui/material/Dialog';

interface DialogProps extends MuiDialogProps {
  height?: number;
  width?: number;
}

export const BasicModal: FC<DialogProps> = ({
  PaperProps,
  width = 500,
  height = 400,
  ...dialogProps
}) => {
  return (
    <Dialog
      PaperProps={{
        sx: {
          borderRadius: '20px',
          minHeight: `${height || '400'}px`,
          minWidth: `${width || '500'}px`,
        },
        ...PaperProps,
      }}
      {...dialogProps}
    >
      {dialogProps.children}
    </Dialog>
  );
};
