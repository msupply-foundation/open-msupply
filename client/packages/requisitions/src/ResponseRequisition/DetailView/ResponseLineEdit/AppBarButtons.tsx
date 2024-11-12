import React from 'react';
import {
  AppBarButtonsPortal,
  DialogButton,
  Grid,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { AppRoute } from 'packages/config/src';

interface AppBarButtonsProps {
  requisitionNumber: number;
}

export const AppBarButtonsComponent = ({
  requisitionNumber,
}: AppBarButtonsProps) => {
  const navigate = useNavigate();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <DialogButton
          variant="close"
          onClick={() =>
            navigate(
              RouteBuilder.create(AppRoute.Distribution)
                .addPart(AppRoute.CustomerRequisition)
                .addPart(String(requisitionNumber))
                .build(),
              { replace: true }
            )
          }
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
