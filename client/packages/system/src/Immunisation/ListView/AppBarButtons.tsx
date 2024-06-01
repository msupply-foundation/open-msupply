import React from 'react';
import {
  DownloadIcon,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  LoadingButton,
  EnvUtils,
  Platform,
} from '@openmsupply-client/common';

export const AppBarButtons = () => {
  const t = useTranslation('inventory');

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <LoadingButton
          disabled={EnvUtils.platform === Platform.Android}
          startIcon={<DownloadIcon />}
          variant="outlined"
          isLoading={false}
          onClick={() => {}}
        >
          {t('button.add-immunisation')}
        </LoadingButton>
      </Grid>
    </AppBarButtonsPortal>
  );
};
