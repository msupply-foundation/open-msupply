import { useSnackbar } from 'notistack';

interface NotificationHook {
  error: (message: string) => () => void;
  info: (message: string) => () => void;
  success: (message: string) => () => void;
  warning: (message: string) => () => void;
}

export const useNotification = (): NotificationHook => {
  const { enqueueSnackbar } = useSnackbar();

  const error = (message: string) => () =>
    enqueueSnackbar(message, {
      variant: 'error',
    });
  const info = (message: string) => () =>
    enqueueSnackbar(message, {
      variant: 'info',
    });
  const success = (message: string) => () =>
    enqueueSnackbar(message, {
      variant: 'success',
    });

  const warning = (message: string) => () =>
    enqueueSnackbar(message, {
      variant: 'warning',
    });

  return { error, info, success, warning };
};
