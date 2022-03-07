import React from 'react';
import { Grid, Typography } from '@mui/material';
import { DialogButton } from '../../buttons';
import { AlertIcon } from '@common/icons';
import { BasicModal } from '@common/components';

export interface AlertModalProps {
  message: React.ReactNode;
  open: boolean;
  onOk: () => void;
  title: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  message,
  onOk,
  open,
  title,
}) => {
  return (
    <BasicModal open={open} width={400} height={150}>
      <Grid padding={4} container gap={1} flexDirection="column">
        <Grid container gap={1}>
          <Grid item>
            <AlertIcon color="primary" />
          </Grid>
          <Grid item>
            <Typography
              id="transition-modal-title"
              variant="h6"
              component="span"
            >
              {title}
            </Typography>
          </Grid>
        </Grid>
        <Grid item>{message}</Grid>
        <Grid item display="flex" justifyContent="flex-end" flex={1}>
          <DialogButton variant="ok" onClick={onOk} autoFocus />
        </Grid>
      </Grid>
    </BasicModal>
  );
};
