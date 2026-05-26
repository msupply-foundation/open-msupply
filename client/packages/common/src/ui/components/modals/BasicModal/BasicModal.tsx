import React from 'react';
import Dialog, { DialogProps as MuiDialogProps } from '@mui/material/Dialog';
import { useIntlUtils } from '@common/intl';
import { SxProps, Theme } from '@mui/material';

interface DialogProps extends MuiDialogProps {
  height?: number;
  width?: number;
  sx?: SxProps<Theme>;
  alignModal?: 'center' | 'start' | 'end';
}

export const BasicModal = ({
  PaperProps,
  width = 500,
  height = 400,
  sx,
  fullScreen,
  alignModal,
  ...dialogProps
}: DialogProps) => {
  const { isRtl } = useIntlUtils();
  // Pull data-testid off the dialog spread so it only lands on the visible
  // Paper element, not also on the portaled Dialog root (which would cause
  // strict-mode locator failures).
  const { 'data-testid': testId, ...restDialogProps } = dialogProps as {
    'data-testid'?: string;
  } & typeof dialogProps;
  return (
    <Dialog
      fullScreen={fullScreen}
      PaperProps={{
        dir: isRtl ? 'rtl' : 'ltr',
        ...(testId ? { 'data-testid': testId } : {}),
        sx: {
          borderRadius: fullScreen ? undefined : '20px',
          minHeight: `${height}px`,
          minWidth: `min(${width}px, calc(100vw - 64px))`,
          ...sx,
        },
        ...PaperProps,
      }}
      sx={{
        '& .MuiDialog-container': {
          justifyContent: alignModal,
        },
      }}
      {...restDialogProps}
    >
      {restDialogProps.children}
    </Dialog>
  );
};
