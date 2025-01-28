import React, { useState } from 'react';
import { Grid, Typography } from '@mui/material';
import { BasicModal } from '../BasicModal';
import { AlertIcon, CheckIcon, HelpIcon, InfoIcon } from '@common/icons';
import { DialogButton, LoadingButton } from '../../buttons';
import { Alert } from '@common/components';
import { useTranslation } from '@openmsupply-client/common';

interface ConfirmationModalProps {
  open: boolean;
  width?: number;
  height?: number;
  onConfirm: (() => void) | (() => Promise<void>) | undefined;
  onCancel: () => void;
  title: string;
  message: string;
  info?: string | undefined;
  iconType?: 'alert' | 'info' | 'help';
  buttonLabel?: string | undefined;
  cancelButtonLabel?: string | undefined;
}

const iconLookup = {
  alert: AlertIcon,
  help: HelpIcon,
  info: InfoIcon,
};

export const ConfirmationModal = ({
  open,
  width = 400,
  height = 200,
  onConfirm,
  title,
  message,
  info,
  onCancel,
  iconType = 'alert',
  buttonLabel,
  cancelButtonLabel,
}: ConfirmationModalProps) => {
  const [loading, setLoading] = useState(false);
  const Icon = iconLookup[iconType];
  const t = useTranslation();

  return (
    <BasicModal width={width} height={height} open={open}>
      <Grid container gap={1} flex={1} padding={4} flexDirection="column">
        <Grid container gap={1} flexDirection="row">
          <Grid item>
            <Icon color={iconType === 'alert' ? 'primary' : 'secondary'} />
          </Grid>
          <Grid item>
            <Typography variant="h6">{title}</Typography>
          </Grid>
        </Grid>
        {info && (
          <Grid item paddingY={1}>
            <Alert style={{ whiteSpace: 'pre-line' }} severity="info">
              {info}
            </Alert>
          </Grid>
        )}
        <Grid item>
          <Typography style={{ whiteSpace: 'pre-line' }}>{message}</Typography>
        </Grid>
        <Grid
          container
          gap={1}
          flexDirection="row"
          alignItems="flex-end"
          justifyContent="flex-end"
          flex={1}
          display="flex"
        >
          <Grid item>
            <DialogButton
              variant="cancel"
              customLabel={cancelButtonLabel}
              disabled={loading}
              onClick={onCancel}
            />
          </Grid>
          <Grid item>
            <LoadingButton
              autoFocus
              color="secondary"
              startIcon={<CheckIcon />}
              isLoading={loading}
              onClick={async () => {
                const result = onConfirm && onConfirm();
                if (result instanceof Promise) {
                  setLoading(true);
                  await result;
                  setLoading(false);
                }
              }}
              label={buttonLabel ? buttonLabel : t('button.ok')}
            />
          </Grid>
        </Grid>
      </Grid>
    </BasicModal>
  );
};
