import React from 'react';

import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  LoadingButton,
  PlusCircleIcon,
} from '@openmsupply-client/common';

export const AppBarButtonsComponent = () => {
  const t = useTranslation('common');

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <LoadingButton
          startIcon={<PlusCircleIcon />}
          onClick={() => {}}
          isLoading={false}
        >
          {t('button.add-new-indicator')}
        </LoadingButton>
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
