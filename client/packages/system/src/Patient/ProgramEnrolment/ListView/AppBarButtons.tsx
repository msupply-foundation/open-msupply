import React, { FC } from 'react';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
} from '@openmsupply-client/common';

export const AppBarButtons: FC = ({}) => {
  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={'Add Program'}
          onClick={() => {}}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
