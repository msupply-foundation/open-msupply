import React from 'react';
import {
  AppBarButtonsPortal,
  DialogButton,
  Grid,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

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
              RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.InternalOrder)
                .addPart(String(requisitionNumber))
                .build()
            )
          }
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
