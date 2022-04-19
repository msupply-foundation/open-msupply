import React, { FC, useState, useMemo } from 'react';
import {
  AlertModalContext,
  AlertModalControllerState,
  AlertModalState,
} from './AlertModalContext';
import { Grid, Typography } from '@mui/material';
import { DialogButton } from '../../buttons';
import { AlertIcon } from '@common/icons';
import { BasicModal } from '@common/components';
import { PropsWithChildrenOnly } from '@common/types';

const AlertModal = ({
  open,
  title,
  message,
  onClick,
}: {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  onClick: () => void;
}) => (
  <BasicModal open={open} width={400} height={150}>
    <Grid padding={4} container gap={1} flexDirection="column">
      <Grid container gap={1}>
        <Grid item>
          <AlertIcon color="primary" />
        </Grid>
        <Grid item>
          <Typography id="transition-modal-title" variant="h6" component="span">
            {title}
          </Typography>
        </Grid>
      </Grid>
      <Grid item>{message}</Grid>
      <Grid item display="flex" justifyContent="flex-end" flex={1}>
        <DialogButton variant="ok" onClick={onClick} autoFocus />
      </Grid>
    </Grid>
  </BasicModal>
);

export const AlertModalProvider: FC<PropsWithChildrenOnly> = ({ children }) => {
  const [alertModalState, setState] = useState<AlertModalState>({
    important: false,
    open: false,
    message: '',
    title: '',
    iconType: 'alert',
  });
  const { open, message, title, onOk } = alertModalState;

  const alertModalController: AlertModalControllerState = useMemo(
    () => ({
      setState,
      setMessage: (message: string | React.ReactNode) =>
        setState(state => ({ ...state, message })),
      setTitle: (title: string) => setState(state => ({ ...state, title })),
      setOnOk: () => {},
      setOpen: (open: boolean) => setState(state => ({ ...state, open })),
      ...alertModalState,
      setImportant: (important: boolean) =>
        setState(state => ({ ...state, important })),
    }),
    [setState, alertModalState]
  );

  return (
    <AlertModalContext.Provider value={alertModalController}>
      {children}
      <AlertModal
        open={open}
        message={message}
        title={title}
        onClick={() => {
          alertModalController.setOpen(false);
          onOk && onOk();
        }}
      />
    </AlertModalContext.Provider>
  );
};
