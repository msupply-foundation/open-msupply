import React, { FC } from 'react';
import Dialog, { DialogProps as MuiDialogProps } from '@mui/material/Dialog';
import { IntlUtils } from '@common/intl';
import { SxProps, Theme } from '@mui/material';

interface DialogProps extends MuiDialogProps {
  height?: number;
  width?: number;
  sx?: SxProps<Theme>;
}

export const BasicModal: FC<DialogProps> = ({
  PaperProps,
  width = 500,
  height = 400,
  sx,
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
          ...sx,
        },
        ...PaperProps,
      }}
      {...dialogProps}
    >
      {dialogProps.children}
    </Dialog>
  );
};
