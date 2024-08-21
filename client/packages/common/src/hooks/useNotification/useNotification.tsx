import React from 'react';
import { IconButton } from '@mui/material';
import { CloseIcon } from '../../ui/icons';
import { OptionsObject, SnackbarKey, useSnackbar } from 'notistack';

interface NotificationHook {
  error: (message: string, options?: OptionsObject) => () => void;
  info: (message: string, options?: OptionsObject) => () => void;
  success: (message: string, options?: OptionsObject) => () => void;
  warning: (message: string, options?: OptionsObject) => () => void;
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

  const error = (message: string, options?: OptionsObject) => () =>
    enqueueSnackbar(message, {
      variant: 'error',
      action,
      ...options,
    });
  const info = (message: string, options?: OptionsObject) => () =>
    enqueueSnackbar(message, {
      variant: 'info',
      action,
      ...options,
    });
  const success = (message: string, options?: OptionsObject) => () =>
    enqueueSnackbar(message, {
      variant: 'success',
      action,
      ...options,
    });

  const warning = (message: string, options?: OptionsObject) => () =>
    enqueueSnackbar(message, {
      variant: 'warning',
      action,
      ...options,
    });

  return { error, info, success, warning };
};
