import React, { useCallback, useMemo } from 'react';
import { IconButton, Typography } from '@mui/material';
import { CloseIcon, InfoIcon } from '../../ui/icons';
import { OptionsObject, SnackbarKey, useSnackbar } from 'notistack';
import { PaperPopover, PaperPopoverSection } from '@common/components';
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
  const { closeSnackbar, enqueueSnackbar } = useSnackbar();

  const action = useCallback(
    (key: SnackbarKey) => (
      <IconButton
        size="small"
        sx={{ marginInlineStart: 2 }}
        onClick={() => {
          closeSnackbar(key);
        }}
      >
        <CloseIcon style={{ color: '#fff' }} />
      </IconButton>
    ),
    [closeSnackbar]
  );

  const actionWithDetail = useCallback(
    (key: SnackbarKey, message: string) => (
      <>
        <PaperPopover
          mode="click"
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
        </PaperPopover>
        {action(key)}
      </>
    ),
    [action]
  );

  const error = useCallback(
    (message: string, options?: OptionsObject) => () =>
      enqueueSnackbar(message, {
        variant: 'error',
        action,
        ...options,
      }),
    [enqueueSnackbar, action]
  );

  const errorWithDetail = useCallback(
    (message: string, options?: OptionsObject) => () =>
      enqueueSnackbar(t('error.something-wrong-info-icon'), {
        variant: 'error',
        action: key => actionWithDetail(key, message),
        autoHideDuration: 10000,
        ...options,
      }),
    [enqueueSnackbar, t, actionWithDetail]
  );

  const info = useCallback(
    (message: string, options?: OptionsObject) => () =>
      enqueueSnackbar(message, {
        variant: 'info',
        action,
        ...options,
      }),
    [enqueueSnackbar, action]
  );

  const success = useCallback(
    (message: string, options?: OptionsObject) => () =>
      enqueueSnackbar(message, {
        variant: 'success',
        action,
        ...options,
      }),
    [enqueueSnackbar, action]
  );

  const warning = useCallback(
    (message: string, options?: OptionsObject) => () =>
      enqueueSnackbar(message, {
        variant: 'warning',
        action,
        ...options,
      }),
    [enqueueSnackbar, action]
  );

  return useMemo(
    () => ({ error, errorWithDetail, info, success, warning }),
    [error, errorWithDetail, info, success, warning]
  );
};
