import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useDetailPanel,
  ReportContext,
} from '@openmsupply-client/common';
import { ReportSelector } from '@openmsupply-client/system';
import { StockMovementFragment } from '../api';

interface AppBarButtonsProps {
  movement: StockMovementFragment;
}

export const AppBarButtonsComponent = ({ movement }: AppBarButtonsProps) => {
  const { OpenButton } = useDetailPanel();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ReportSelector
          context={ReportContext.StockMovement}
          dataId={movement.id}
          extraArguments={{ relocationIds: [movement.id] }}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
