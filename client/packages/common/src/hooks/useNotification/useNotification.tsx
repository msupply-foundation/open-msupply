import React from 'react';
import { IconButton, Typography } from '@mui/material';
import { CloseIcon, InfoIcon } from '../../ui/icons';
import { OptionsObject, SnackbarKey, useSnackbar } from 'notistack';
import { PaperPopoverSection, usePaperClickPopover } from '@common/components';
import { useTranslation } from '@common/intl';

interface NotificationHook {
  error: (message: string, options?: OptionsObject) => () => void;
  errorWithDetail: (message: string, options?: OptionsObject) => () => void;
  info: (message: string, options?: OptionsObject) => () => void;
  success: (message: string, options?: OptionsObject) => () => void;
  warning: (message: string, options?: OptionsObject) => () => void;
}

export const useNotification = (): NotificationHook => {
  const t = useTranslation();
  const { PaperClickPopover } = usePaperClickPopover();
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

  const actionWithDetail = (key: SnackbarKey, message: string) => (
    <>
      <PaperClickPopover
        placement="top"
        width={300}
        Content={
          <PaperPopoverSection>
            <Typography variant="body1">{message}</Typography>
          </PaperPopoverSection>
        }
      >
        <IconButton size="small">
          <InfoIcon style={{ color: '#fff' }} />
        </IconButton>
      </PaperClickPopover>
      {action(key)}
    </>
  );

  const error = (message: string, options?: OptionsObject) => () =>
    enqueueSnackbar(message, {
      variant: 'error',
      action,
      ...options,
    });
  const errorWithDetail = (message: string, options?: OptionsObject) => () =>
    enqueueSnackbar(`${t('label.error-see-more')}:`, {
      variant: 'error',
      action: key => actionWithDetail(key, message),
      persist: true,
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

  return { error, errorWithDetail, info, success, warning };
};
