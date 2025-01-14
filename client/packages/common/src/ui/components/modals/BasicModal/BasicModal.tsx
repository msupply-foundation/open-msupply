import React, { FC } from 'react';
import Dialog, { DialogProps as MuiDialogProps } from '@mui/material/Dialog';
import { useIntlUtils } from '@common/intl';
import { SxProps, Theme, useMediaQuery } from '@mui/material';

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
  const { isRtl } = useIntlUtils();
  const fullScreen = useMediaQuery('(max-height: 850px)');
  return (
    <Dialog
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? undefined : '20px',
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
