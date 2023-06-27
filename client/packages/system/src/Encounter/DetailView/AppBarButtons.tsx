import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  Typography,
  useDetailPanel,
} from '@openmsupply-client/common';

interface AppBarButtonsProp {
  status?: string | null;
}

export const AppBarButtonsComponent: FC<AppBarButtonsProp> = ({ status }) => {
  const { OpenButton } = useDetailPanel();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        {!!status && (
          <Typography color={'secondary.main'} padding={1} fontWeight={'bold'}>
            {status}
          </Typography>
        )}
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
