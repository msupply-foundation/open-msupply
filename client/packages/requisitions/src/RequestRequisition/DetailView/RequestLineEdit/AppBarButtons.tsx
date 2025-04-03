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
  requisitionId: string;
}

export const AppBarButtonsComponent = ({
  requisitionId,
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
                .addPart(requisitionId)
                .build()
            )
          }
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
