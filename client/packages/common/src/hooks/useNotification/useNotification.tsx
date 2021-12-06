import React from 'react';
import { IconButton } from '@mui/material';
import { CloseIcon } from '../../ui/icons';
import { SnackbarKey, useSnackbar } from 'notistack';

interface NotificationHook {
  error: (message: string) => () => void;
  info: (message: string) => () => void;
  success: (message: string) => () => void;
  warning: (message: string) => () => void;
}

export const useNotification = (): NotificationHook => {
  const { closeSnackbar, enqueueSnackbar } = useSnackbar();

  const action = (key: SnackbarKey) => (
    <IconButton
      size="small"
      onClick={() => {
        closeSnackbar(key);
      }}
    >
      <CloseIcon style={{ color: '#fff' }} />
    </IconButton>
  );

  const error = (message: string) => () =>
    enqueueSnackbar(message, {
      variant: 'error',
      action,
    });
  const info = (message: string) => () =>
    enqueueSnackbar(message, {
      variant: 'info',
      action,
    });
  const success = (message: string) => () =>
    enqueueSnackbar(message, {
      variant: 'success',
      action,
    });

  const warning = (message: string) => () =>
    enqueueSnackbar(message, {
      variant: 'warning',
      action,
    });

  return { error, info, success, warning };
};
