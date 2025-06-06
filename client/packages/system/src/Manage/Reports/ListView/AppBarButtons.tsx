import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  ButtonWithIcon,
  useTranslation,
  PlusCircleIcon,
} from '@openmsupply-client/common';

export const AppBarButtonsComponent = () => {
  const t = useTranslation();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.install-reports')}
          onClick={() => {
            // TODO add modal with upsert report
          }}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
