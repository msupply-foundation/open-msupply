import React, { PropsWithChildren, ReactNode } from 'react';
import {
  Grid,
  BasicModal,
  Typography,
  InfoIcon,
} from '@openmsupply-client/common';

interface ConfirmationModalLayoutProps extends PropsWithChildren {
  isOpen: boolean;
  title: string;
  message: string;
  buttons?: ReactNode;
}

export const ConfirmationModalLayout = ({
  isOpen,
  title,
  message,
  children,
  buttons,
}: ConfirmationModalLayoutProps) => {
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
          {buttons}
        </Grid>
      </Grid>
    </BasicModal>
  );
};
