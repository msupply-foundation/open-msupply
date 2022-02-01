import React from 'react';
import { Backdrop, Fade, Grid, Modal, Paper, Typography } from '@mui/material';
import { DialogButton } from '../components/buttons';
import { AlertIcon } from '@common/icons';

export interface AlertModalProps {
  message: string;
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
    <Modal
      open={open}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
      }}
    >
      <Fade in={open}>
        <Paper
          sx={{
            bgcolor: 'background.paper',
            borderRadius: '16px',
            boxShadow: theme => theme.shadows[7],
            left: '50%',
            p: 4,
            position: 'absolute',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            '&:focus': {
              outline: 'none',
            },
          }}
        >
          <Grid container gap={1} flexDirection="column">
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
            <Grid item>
              <Typography>{message}</Typography>
            </Grid>
            <Grid item display="flex" justifyContent="flex-end" flex={1}>
              <DialogButton variant="ok" onClick={onOk} />
            </Grid>
          </Grid>
        </Paper>
      </Fade>
    </Modal>
  );
};
