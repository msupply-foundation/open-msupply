import React, { FC } from 'react';
import Dialog, { DialogProps as MuiDialogProps } from '@mui/material/Dialog';
import { IntlUtils } from '@common/intl';

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
  const isRtl = IntlUtils.useRtl();
  return (
    <Dialog
      PaperProps={{
        sx: {
          borderRadius: '20px',
          minHeight: `${height}px`,
          minWidth: `${width}px`,
          direction: isRtl ? 'rtl' : 'ltr',
        },
        ...PaperProps,
      }}
      {...dialogProps}
    >
      {dialogProps.children}
    </Dialog>
  );
};
