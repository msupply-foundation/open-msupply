import React, { useState } from 'react';
import { Grid, Typography } from '@mui/material';
import { BasicModal } from '../BasicModal';
import { AlertIcon, HelpIcon, InfoIcon } from '@common/icons';
import { DialogButton, LoadingButton } from '../../buttons';

interface ConfirmationModalProps {
  open: boolean;
  width?: number;
  height?: number;
  onConfirm: (() => void) | (() => Promise<void>) | undefined;
  onCancel: () => void;
  title: string;
  message: string;
  iconType?: 'alert' | 'info' | 'help';
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
  onCancel,
  iconType = 'alert',
}: ConfirmationModalProps) => {
  const [loading, setLoading] = useState(false);
  const Icon = iconLookup[iconType];

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
              disabled={loading}
              onClick={onCancel}
            />
          </Grid>
          <Grid item>
            <LoadingButton
              autoFocus
              color="secondary"
              isLoading={loading}
              onClick={async () => {
                const result = onConfirm && onConfirm();
                if (result instanceof Promise) {
                  setLoading(true);
                  await result;
                  setLoading(false);
                }
                onCancel();
              }}
            >
              OK
            </LoadingButton>
          </Grid>
        </Grid>
      </Grid>
    </BasicModal>
  );
};
