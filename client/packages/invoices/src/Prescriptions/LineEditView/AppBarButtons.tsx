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
  invoiceId: string;
}

export const AppBarButtonsComponent = ({
  invoiceId,
}: AppBarButtonsProps) => {
  const navigate = useNavigate();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <DialogButton
          variant="close"
          onClick={() =>
            navigate(
              RouteBuilder.create(AppRoute.Dispensary)
                .addPart(AppRoute.Prescription)
                .addPart(invoiceId)
                .build()
            )
          }
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
