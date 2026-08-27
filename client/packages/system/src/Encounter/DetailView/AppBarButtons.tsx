import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  Typography,
  useDetailPanel,
} from '@openmsupply-client/common';

interface AppBarButtonsProp {
  logicalStatus?: string | null;
}

export const AppBarButtonsComponent: FC<AppBarButtonsProp> = ({
  logicalStatus,
}) => {
  const { OpenButton } = useDetailPanel();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1} flexWrap="nowrap">
        {!!logicalStatus && (
          <Typography color={'secondary.main'} padding={1} fontWeight={'bold'}>
            {logicalStatus}
          </Typography>
        )}
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
