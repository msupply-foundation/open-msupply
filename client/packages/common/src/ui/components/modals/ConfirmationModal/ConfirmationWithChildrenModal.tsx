import React, { PropsWithChildren } from 'react';
import {
  Grid,
  BasicModal,
  DialogButton,
  Typography,
  InfoIcon,
} from '@openmsupply-client/common';

interface ConfirmationWithChildrenModalProps extends PropsWithChildren {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  title: string;
  message: string;
  canSave?: boolean;
}

export const ConfirmationWithChildrenModal = ({
  isOpen,
  title,
  message,
  children,
  onClose,
  onSave,
  canSave = true,
}: ConfirmationWithChildrenModalProps) => {
  return (
    <BasicModal width={400} height={200} open={isOpen}>
      <Grid container gap={1} flex={1} padding={4} flexDirection="column">
        <Grid container gap={1} flexDirection="row">
          <Grid item>
            <InfoIcon color="secondary" />
          </Grid>
          <Grid item>
            <Typography variant="h6">{title}</Typography>
          </Grid>
        </Grid>
        <Grid item>
          <Typography style={{ whiteSpace: 'pre-line' }}>{message}</Typography>
        </Grid>
        <Grid item margin={2}>
          {children}
        </Grid>
        <Grid
          container
          gap={1}
          flexDirection="row"
          alignItems="flex-end"
          justifyContent="center"
          flex={1}
          display="flex"
          marginTop={2}
        >
          <Grid item>
            <DialogButton variant="cancel" onClick={onClose} />
          </Grid>
          <Grid item>
            <DialogButton
              variant="ok"
              disabled={canSave}
              onClick={async () => {
                await onSave();
                onClose();
              }}
            />
          </Grid>
        </Grid>
      </Grid>
    </BasicModal>
  );
};
