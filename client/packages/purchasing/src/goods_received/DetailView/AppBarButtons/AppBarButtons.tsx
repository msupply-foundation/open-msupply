import React, { memo, ReactElement } from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useDetailPanel,
} from '@openmsupply-client/common';
// import { useGoodsReceived } from '../../api/hooks';

// interface AppBarButtonProps {}

export const AppBarButtonsComponent = (): ReactElement => {
  const { OpenButton } = useDetailPanel();

  //   const {
  //     query: { data, isLoading },
  //   } = useGoodsReceived();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        {/* Add Buttons as needed */}
        {/* <AddItem /> */}
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = memo(AppBarButtonsComponent);
