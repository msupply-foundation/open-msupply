import React from 'react';
import {
  AppBarButtonsPortal,
  DialogButton,
  Grid,
  useNavigate,
} from '@openmsupply-client/common';

interface AppBarButtonsProps {
  baseRoute: string;
}

export const AppBarButtonsComponent = ({ baseRoute }: AppBarButtonsProps) => {
  const navigate = useNavigate();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <DialogButton variant="close" onClick={() => navigate(baseRoute)} />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
